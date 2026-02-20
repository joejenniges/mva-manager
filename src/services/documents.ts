import { eq, ilike, desc, sql, and, or, notExists } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { documents, documentTypes, documentAppointments, documentPersons, documentOrganizations } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";

interface DocumentListParams {
  page: number;
  limit: number;
  search?: string;
  documentTypeId?: string;
  appointmentId?: string;
  excludeAppointmentId?: string;
  unorganized?: boolean;
}

export async function listDocuments(eventId: string, params: DocumentListParams) {
  const db = getDb();
  const { page, limit, search, documentTypeId, appointmentId, excludeAppointmentId, unorganized } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(documents.eventId, eventId)];
  if (search) {
    conditions.push(
      or(ilike(documents.title, `%${search}%`), ilike(documents.originalFilename, `%${search}%`))!
    );
  }
  if (documentTypeId) conditions.push(eq(documents.documentTypeId, documentTypeId));

  // Filter by appointment association
  if (appointmentId) {
    const subquery = db.select({ documentId: documentAppointments.documentId })
      .from(documentAppointments)
      .where(eq(documentAppointments.appointmentId, appointmentId));
    conditions.push(sql`${documents.id} IN (${subquery})`);
  }

  // Exclude docs already linked to a specific appointment (for the picker)
  if (excludeAppointmentId) {
    conditions.push(
      notExists(
        db.select({ x: sql`1` })
          .from(documentAppointments)
          .where(and(
            eq(documentAppointments.documentId, documents.id),
            eq(documentAppointments.appointmentId, excludeAppointmentId),
          ))
      )
    );
  }

  // Unorganized = no appointment associations
  if (unorganized) {
    conditions.push(
      notExists(
        db.select({ x: sql`1` })
          .from(documentAppointments)
          .where(eq(documentAppointments.documentId, documents.id))
      )
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.documents.findMany({
      where,
      with: {
        documentType: true,
        documentAppointments: { with: { appointment: true } },
        documentPersons: { with: { person: true } },
        documentOrganizations: { with: { organization: true } },
      },
      orderBy: [desc(documents.createdAt)],
      offset,
      limit,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(documents).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getDocument(eventId: string, id: string) {
  const db = getDb();
  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.eventId, eventId)),
    with: {
      documentType: true,
      documentAppointments: { with: { appointment: true } },
      documentPersons: { with: { person: true } },
      documentOrganizations: { with: { organization: true } },
    },
  });
  if (!row) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document not found");
  return row;
}

export async function createDocument(eventId: string, file: {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}, meta: {
  title?: string | null;
  documentTypeId?: string | null;
  appointmentIds: string[];
  personIds: string[];
  organizationIds: string[];
}, userId: string) {
  const db = getDb();

  const result = await db.insert(documents).values({
    originalFilename: file.originalname,
    storedFilename: file.filename,
    mimeType: file.mimetype,
    fileSize: file.size,
    title: meta.title,
    documentTypeId: meta.documentTypeId,
    uploadedByUserId: userId,
    eventId,
  }).returning();
  const doc = result[0];

  // Junction tables
  if (meta.appointmentIds.length > 0) {
    await db.insert(documentAppointments).values(
      meta.appointmentIds.map((appointmentId) => ({ documentId: doc.id, appointmentId })),
    );
  }
  if (meta.personIds.length > 0) {
    await db.insert(documentPersons).values(
      meta.personIds.map((personId) => ({ documentId: doc.id, personId })),
    );
  }
  if (meta.organizationIds.length > 0) {
    await db.insert(documentOrganizations).values(
      meta.organizationIds.map((organizationId) => ({ documentId: doc.id, organizationId })),
    );
  }

  return getDocument(eventId, doc.id);
}

export async function updateDocument(eventId: string, id: string, data: Partial<{
  title: string | null;
  documentTypeId: string | null;
  appointmentIds: string[];
  personIds: string[];
  organizationIds: string[];
}>) {
  const db = getDb();
  const { appointmentIds, personIds, organizationIds, ...docData } = data;

  if (Object.keys(docData).length > 0) {
    const result = await db.update(documents).set(docData)
      .where(and(eq(documents.id, id), eq(documents.eventId, eventId))).returning();
    if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document not found");
  }

  if (appointmentIds !== undefined) {
    await db.delete(documentAppointments).where(eq(documentAppointments.documentId, id));
    if (appointmentIds.length > 0) {
      await db.insert(documentAppointments).values(
        appointmentIds.map((appointmentId) => ({ documentId: id, appointmentId })),
      );
    }
  }

  if (personIds !== undefined) {
    await db.delete(documentPersons).where(eq(documentPersons.documentId, id));
    if (personIds.length > 0) {
      await db.insert(documentPersons).values(
        personIds.map((personId) => ({ documentId: id, personId })),
      );
    }
  }

  if (organizationIds !== undefined) {
    await db.delete(documentOrganizations).where(eq(documentOrganizations.documentId, id));
    if (organizationIds.length > 0) {
      await db.insert(documentOrganizations).values(
        organizationIds.map((organizationId) => ({ documentId: id, organizationId })),
      );
    }
  }

  return getDocument(eventId, id);
}

export async function deleteDocument(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(documents)
    .where(and(eq(documents.id, id), eq(documents.eventId, eventId)))
    .returning({ storedFilename: documents.storedFilename });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document not found");
  return result[0].storedFilename;
}

export async function addDocumentAppointmentLink(eventId: string, documentId: string, appointmentId: string) {
  const db = getDb();
  await getDocument(eventId, documentId);
  await db.insert(documentAppointments).values({ documentId, appointmentId }).onConflictDoNothing();
  return getDocument(eventId, documentId);
}

export async function removeDocumentAppointmentLink(eventId: string, documentId: string, appointmentId: string) {
  const db = getDb();
  const result = await db.delete(documentAppointments)
    .where(and(eq(documentAppointments.documentId, documentId), eq(documentAppointments.appointmentId, appointmentId)))
    .returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document-appointment link not found");
}

export async function getDocumentFile(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select({
    storedFilename: documents.storedFilename,
    mimeType: documents.mimeType,
    originalFilename: documents.originalFilename,
  }).from(documents).where(and(eq(documents.id, id), eq(documents.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document not found");
  return row[0];
}
