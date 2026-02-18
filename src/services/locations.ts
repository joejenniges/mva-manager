import { eq, ilike, asc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { locations } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import { geocodeAddress } from "./geocoding.js";
import { invalidateDistancesForLocation } from "./distance.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listLocations(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(locations.eventId, eventId)];
  if (search) conditions.push(ilike(locations.title, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(locations).where(where).orderBy(asc(locations.title)).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(locations).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getLocation(eventId: string, id: string) {
  const db = getDb();
  const row = await db.select().from(locations)
    .where(and(eq(locations.id, id), eq(locations.eventId, eventId))).limit(1);
  if (row.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Location not found");
  return row[0];
}

export async function createLocation(eventId: string, data: { title: string; address?: string | null; city?: string | null; state?: string | null; zip?: string | null; lat?: string | null; lng?: string | null }) {
  const db = getDb();

  // Auto-geocode if address provided but no lat/lng
  if (data.address && !data.lat && !data.lng) {
    const coords = await geocodeAddress(data.address, data.city ?? undefined, data.state ?? undefined, data.zip ?? undefined);
    if (coords) {
      data.lat = coords.lat;
      data.lng = coords.lng;
    }
  }

  const result = await db.insert(locations).values({ ...data, eventId }).returning();
  return result[0];
}

export async function updateLocation(eventId: string, id: string, data: Partial<{ title: string; address: string | null; city: string | null; state: string | null; zip: string | null; lat: string | null; lng: string | null }>) {
  const db = getDb();

  // Grab old coords before update so we can detect changes
  const existing = await getLocation(eventId, id);

  // Re-geocode if address changed and no explicit lat/lng provided
  if (data.address !== undefined && data.lat === undefined && data.lng === undefined) {
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

  const result = await db.update(locations).set(data)
    .where(and(eq(locations.id, id), eq(locations.eventId, eventId))).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Location not found");

  // Invalidate distance cache if coordinates changed
  const updated = result[0];
  if (updated.lat !== existing.lat || updated.lng !== existing.lng) {
    await invalidateDistancesForLocation(id);
  }

  return updated;
}

export async function deleteLocation(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(locations)
    .where(and(eq(locations.id, id), eq(locations.eventId, eventId)))
    .returning({ id: locations.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Location not found");
}
