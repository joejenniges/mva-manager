import { eq, ilike, asc, sql, and, or } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { chargeCodes } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listChargeCodes(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(chargeCodes.eventId, eventId)];
  if (search) {
    conditions.push(or(
      ilike(chargeCodes.code, `%${search}%`),
      ilike(chargeCodes.description, `%${search}%`),
    )!);
  }
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(chargeCodes).where(where).orderBy(asc(chargeCodes.code)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(chargeCodes).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getChargeCode(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select().from(chargeCodes)
    .where(and(eq(chargeCodes.id, id), eq(chargeCodes.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Charge code not found");
  return row[0];
}

export async function createChargeCode(eventId: string, data: { code: string; description: string }) {
  const db = getDb();
  const result = await db.insert(chargeCodes).values({ ...data, eventId }).returning();
  return result[0];
}

export async function updateChargeCode(eventId: string, id: string, data: Partial<{ code: string; description: string }>) {
  const db = getDb();
  const result = await db.update(chargeCodes).set(data)
    .where(and(eq(chargeCodes.id, id), eq(chargeCodes.eventId, eventId))).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Charge code not found");
  return result[0];
}

export async function deleteChargeCode(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(chargeCodes)
    .where(and(eq(chargeCodes.id, id), eq(chargeCodes.eventId, eventId)))
    .returning({ id: chargeCodes.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Charge code not found");
}
