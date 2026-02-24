import { eq, ilike, asc, desc, sql, and, inArray } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { events, userEventAccess } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import { geocodeAddress } from "./geocoding.js";

interface EventListParams {
  page: number;
  limit: number;
  search?: string;
}

export async function listEvents(params: EventListParams, userId?: string) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) conditions.push(ilike(events.title, `%${search}%`));

  // Non-admins: filter to events they have access to
  if (userId) {
    const accessRows = await db
      .select({ eventId: userEventAccess.eventId })
      .from(userEventAccess)
      .where(eq(userEventAccess.userId, userId));
    const eventIds = accessRows.map((r) => r.eventId);
    if (eventIds.length === 0) {
      return { data: [], total: 0, page, limit, hasMore: false };
    }
    conditions.push(inArray(events.id, eventIds));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(events).where(where).orderBy(desc(events.date)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getEvent(id: string) {
  const db = getDb();
  const row = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Event not found");
  return row[0];
}

export async function createEvent(data: {
  title: string;
  date: string;
  notes?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: string | null;
  lng?: string | null;
}) {
  const db = getDb();

  // Auto-geocode if address provided but no lat/lng
  if (data.address && !data.lat && !data.lng) {
    const coords = await geocodeAddress(data.address, data.city ?? undefined, data.state ?? undefined, data.zip ?? undefined);
    if (coords) {
      data.lat = coords.lat;
      data.lng = coords.lng;
    }
  }

  const result = await db.insert(events).values(data).returning();
  return result[0];
}

export async function updateEvent(id: string, data: Partial<{
  title: string;
  date: string;
  notes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: string | null;
  lng: string | null;
}>) {
  const db = getDb();

  // Re-geocode if address changed and no explicit lat/lng provided
  if (data.address !== undefined && data.lat === undefined && data.lng === undefined) {
    const existing = await getEvent(id);
    const address = data.address ?? existing.address;
    const city = data.city ?? existing.city;
    const state = data.state ?? existing.state;
    const zip = data.zip ?? existing.zip;
    if (address) {
      const coords = await geocodeAddress(address, city ?? undefined, state ?? undefined, zip ?? undefined);
      if (coords) {
        data.lat = coords.lat;
        data.lng = coords.lng;
      }
    }
  }

  const result = await db.update(events).set(data).where(eq(events.id, id)).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Event not found");
  return result[0];
}

export async function deleteEvent(id: string) {
  const db = getDb();
  const result = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Event not found");
}
