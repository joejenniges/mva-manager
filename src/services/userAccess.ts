import { eq, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { userEventAccess, events, persons } from "../db/schema/index.js";
import type { EventPermissions } from "../types.js";

export async function getUserEventAccess(userId: string, eventId: string): Promise<EventPermissions | null> {
  const db = getDb();
  const row = await db
    .select({ permissions: userEventAccess.permissions })
    .from(userEventAccess)
    .where(and(eq(userEventAccess.userId, userId), eq(userEventAccess.eventId, eventId)))
    .limit(1);

  if (row.length === 0) return null;
  return row[0].permissions as EventPermissions;
}

export async function getUserAccessibleEventIds(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ eventId: userEventAccess.eventId })
    .from(userEventAccess)
    .where(eq(userEventAccess.userId, userId));

  return rows.map((r) => r.eventId);
}

export async function checkUserHasAnyAccess(userId: string): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select({ id: userEventAccess.id })
    .from(userEventAccess)
    .where(eq(userEventAccess.userId, userId))
    .limit(1);

  return row.length > 0;
}

export async function setUserEventAccess(
  userId: string,
  eventId: string,
  permissions: EventPermissions,
  defaultPersonId?: string | null,
) {
  const db = getDb();
  const result = await db
    .insert(userEventAccess)
    .values({ userId, eventId, permissions, defaultPersonId: defaultPersonId ?? null })
    .onConflictDoUpdate({
      target: [userEventAccess.userId, userEventAccess.eventId],
      set: { permissions, defaultPersonId: defaultPersonId ?? null, updatedAt: new Date() },
    })
    .returning();

  return result[0];
}

export async function removeUserEventAccess(userId: string, eventId: string) {
  const db = getDb();
  const result = await db
    .delete(userEventAccess)
    .where(and(eq(userEventAccess.userId, userId), eq(userEventAccess.eventId, eventId)))
    .returning({ id: userEventAccess.id });

  return result.length > 0;
}

export async function listUserEventAccess(userId: string) {
  const db = getDb();
  return db
    .select({
      id: userEventAccess.id,
      eventId: userEventAccess.eventId,
      eventTitle: events.title,
      permissions: userEventAccess.permissions,
      defaultPersonId: userEventAccess.defaultPersonId,
      defaultPersonName: persons.name,
    })
    .from(userEventAccess)
    .innerJoin(events, eq(userEventAccess.eventId, events.id))
    .leftJoin(persons, eq(userEventAccess.defaultPersonId, persons.id))
    .where(eq(userEventAccess.userId, userId));
}
