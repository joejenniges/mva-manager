import { eq, ilike, asc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { documentTypes } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listDocumentTypes(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(documentTypes.eventId, eventId)];
  if (search) conditions.push(ilike(documentTypes.title, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(documentTypes).where(where).orderBy(asc(documentTypes.title)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(documentTypes).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getDocumentType(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select().from(documentTypes)
    .where(and(eq(documentTypes.id, id), eq(documentTypes.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document type not found");
  return row[0];
}

export async function createDocumentType(eventId: string, data: { title: string; color: string; namingTemplate?: string | null }) {
  const db = getDb();
  const result = await db.insert(documentTypes).values({ ...data, eventId }).returning();
  return result[0];
}

export async function updateDocumentType(eventId: string, id: string, data: Partial<{ title: string; color: string; namingTemplate: string | null }>) {
  const db = getDb();
  const result = await db.update(documentTypes).set(data)
    .where(and(eq(documentTypes.id, id), eq(documentTypes.eventId, eventId))).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document type not found");
  return result[0];
}

export async function deleteDocumentType(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(documentTypes)
    .where(and(eq(documentTypes.id, id), eq(documentTypes.eventId, eventId)))
    .returning({ id: documentTypes.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Document type not found");
}
