import { eq, asc, ilike, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { appointmentTemplates, appointmentTemplateActivities } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listAppointmentTemplates(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(appointmentTemplates.eventId, eventId)];
  if (search) conditions.push(ilike(appointmentTemplates.name, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.appointmentTemplates.findMany({
      where,
      orderBy: [asc(appointmentTemplates.name)],
      offset,
      limit,
      with: {
        organization: { columns: { id: true, name: true, color: true } },
        location: { columns: { id: true, title: true } },
        appointmentTemplateActivities: {
          with: { activity: { columns: { id: true, title: true, color: true } } },
        },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(appointmentTemplates).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getAppointmentTemplate(eventId: string, id: string) {
  const db = getDb();
  const row = await db.query.appointmentTemplates.findFirst({
    where: and(eq(appointmentTemplates.id, id), eq(appointmentTemplates.eventId, eventId)),
    with: {
      organization: { columns: { id: true, name: true, color: true } },
      location: { columns: { id: true, title: true } },
      appointmentTemplateActivities: {
        with: { activity: { columns: { id: true, title: true, color: true } } },
      },
    },
  });
  if (!row) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment template not found");
  return row;
}

export async function createAppointmentTemplate(eventId: string, data: {
  name: string;
  organizationId?: string | null;
  locationId?: string | null;
  notes?: string | null;
  activityIds?: string[];
}) {
  const db = getDb();
  const { activityIds, ...values } = data;

  const result = await db.insert(appointmentTemplates).values({ ...values, eventId }).returning();
  const template = result[0];

  if (activityIds?.length) {
    await db.insert(appointmentTemplateActivities).values(
      activityIds.map((activityId) => ({ templateId: template.id, activityId }))
    );
  }

  return getAppointmentTemplate(eventId, template.id);
}

export async function updateAppointmentTemplate(eventId: string, id: string, data: {
  name?: string;
  organizationId?: string | null;
  locationId?: string | null;
  notes?: string | null;
  activityIds?: string[];
}) {
  const db = getDb();
  const { activityIds, ...values } = data;

  if (Object.keys(values).length > 0) {
    const result = await db.update(appointmentTemplates).set(values)
      .where(and(eq(appointmentTemplates.id, id), eq(appointmentTemplates.eventId, eventId))).returning();
    if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment template not found");
  }

  if (activityIds !== undefined) {
    await db.delete(appointmentTemplateActivities).where(eq(appointmentTemplateActivities.templateId, id));
    if (activityIds.length > 0) {
      await db.insert(appointmentTemplateActivities).values(
        activityIds.map((activityId) => ({ templateId: id, activityId }))
      );
    }
  }

  return getAppointmentTemplate(eventId, id);
}

export async function deleteAppointmentTemplate(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(appointmentTemplates)
    .where(and(eq(appointmentTemplates.id, id), eq(appointmentTemplates.eventId, eventId)))
    .returning({ id: appointmentTemplates.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment template not found");
}
