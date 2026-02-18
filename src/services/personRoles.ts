import { eq, ilike, asc, desc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { personRoles } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listPersonRoles(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(personRoles.eventId, eventId)];
  if (search) conditions.push(ilike(personRoles.title, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(personRoles).where(where).orderBy(asc(personRoles.title)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(personRoles).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getPersonRole(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select().from(personRoles)
    .where(and(eq(personRoles.id, id), eq(personRoles.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person role not found");
  return row[0];
}

export async function createPersonRole(eventId: string, data: { title: string; color: string }) {
  const db = getDb();
  const result = await db.insert(personRoles).values({ ...data, eventId }).returning();
  return result[0];
}

export async function updatePersonRole(eventId: string, id: string, data: Partial<{ title: string; color: string }>) {
  const db = getDb();
  const result = await db.update(personRoles).set(data)
    .where(and(eq(personRoles.id, id), eq(personRoles.eventId, eventId))).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person role not found");
  return result[0];
}

export async function deletePersonRole(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(personRoles)
    .where(and(eq(personRoles.id, id), eq(personRoles.eventId, eventId)))
    .returning({ id: personRoles.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person role not found");
}
