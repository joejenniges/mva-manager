import { eq, ilike, asc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { activities } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listActivities(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(activities.eventId, eventId)];
  if (search) conditions.push(ilike(activities.title, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(activities).where(where).orderBy(asc(activities.title)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(activities).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getActivity(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select().from(activities)
    .where(and(eq(activities.id, id), eq(activities.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Activity not found");
  return row[0];
}

export async function createActivity(eventId: string, data: { title: string; color: string }) {
  const db = getDb();
  const result = await db.insert(activities).values({ ...data, eventId }).returning();
  return result[0];
}

export async function updateActivity(eventId: string, id: string, data: Partial<{ title: string; color: string }>) {
  const db = getDb();
  const result = await db.update(activities).set(data)
    .where(and(eq(activities.id, id), eq(activities.eventId, eventId))).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Activity not found");
  return result[0];
}

export async function deleteActivity(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(activities)
    .where(and(eq(activities.id, id), eq(activities.eventId, eventId)))
    .returning({ id: activities.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Activity not found");
}
