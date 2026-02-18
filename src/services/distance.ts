import Geocodio, { DistanceMode } from "geocodio-library-node";
import { and, eq, or } from "drizzle-orm";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { getDb } from "../db/connection.js";
import { distances, locations } from "../db/schema/index.js";

interface RouteResult {
  distanceMiles: number;
  durationMinutes: number;
}

const geocoder = config.geocodioApiKey ? new Geocodio(config.geocodioApiKey) : null;

/**
 * Raw Geocodio driving distance call. Same signature as the old OSRM version
 * so the /api/v1/distance route keeps working without changes.
 */
export async function calculateDrivingDistance(
  fromLat: string,
  fromLng: string,
  toLat: string,
  toLng: string,
): Promise<RouteResult | null> {
  if (!geocoder) {
    logger.warn("Geocodio API key not configured, skipping distance calculation");
    return null;
  }

  try {
    const response = await geocoder.distance(
      { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      [{ lat: parseFloat(toLat), lng: parseFloat(toLng) }],
      { mode: DistanceMode.Driving },
    );

    const dest = response.destinations?.[0];
    if (!dest) return null;

    return {
      distanceMiles: dest.distance_miles,
      durationMinutes: dest.duration_seconds != null ? dest.duration_seconds / 60 : 0,
    };
  } catch (err) {
    logger.error({ err }, "Geocodio distance calculation failed");
    return null;
  }
}

/**
 * Cache-aware distance lookup between two locations by ID.
 * Checks distances table first. On miss, looks up coordinates from locations
 * table, calls Geocodio, stores result in cache.
 *
 * WHY canonical UUID ordering: A->B and B->A are the same trip for practical
 * purposes. We always store the smaller UUID as location_a_id so there's only
 * one cache row per pair.
 */
export async function getDistanceBetweenLocations(
  locationId1: string,
  locationId2: string,
): Promise<RouteResult | null> {
  if (locationId1 === locationId2) return null;

  const [aId, bId] = locationId1 < locationId2
    ? [locationId1, locationId2]
    : [locationId2, locationId1];

  const db = getDb();

  // Check cache
  const cachedRows = await db.select()
    .from(distances)
    .where(and(
      eq(distances.locationAId, aId),
      eq(distances.locationBId, bId),
    ))
    .limit(1);
  const cached = cachedRows[0];

  if (cached) {
    logger.debug({ aId, bId }, "Distance cache hit");
    return {
      distanceMiles: parseFloat(cached.distanceMiles),
      durationMinutes: cached.durationMinutes ? parseFloat(cached.durationMinutes) : 0,
    };
  }

  // Cache miss -- look up coordinates
  const [locA, locB] = await Promise.all([
    db.select({ lat: locations.lat, lng: locations.lng }).from(locations).where(eq(locations.id, aId)).limit(1),
    db.select({ lat: locations.lat, lng: locations.lng }).from(locations).where(eq(locations.id, bId)).limit(1),
  ]);

  if (!locA[0]?.lat || !locA[0]?.lng || !locB[0]?.lat || !locB[0]?.lng) {
    logger.debug("Missing coordinates for distance calculation");
    return null;
  }

  const result = await calculateDrivingDistance(locA[0].lat, locA[0].lng, locB[0].lat, locB[0].lng);
  if (!result) return null;

  // Store in cache
  try {
    await db.insert(distances).values({
      locationAId: aId,
      locationBId: bId,
      distanceMiles: result.distanceMiles.toFixed(2),
      durationMinutes: result.durationMinutes.toFixed(2),
    });
    logger.debug({ aId, bId, miles: result.distanceMiles }, "Distance cached");
  } catch (err) {
    // Unique constraint violation = concurrent insert, that's fine
    logger.debug({ err }, "Distance cache insert failed (likely concurrent)");
  }

  return result;
}

/**
 * Delete all cached distances referencing a location.
 * Called when a location's address/coordinates change.
 */
export async function invalidateDistancesForLocation(locationId: string): Promise<void> {
  const db = getDb();
  const deleted = await db.delete(distances)
    .where(or(
      eq(distances.locationAId, locationId),
      eq(distances.locationBId, locationId),
    ))
    .returning({ id: distances.id });

  if (deleted.length > 0) {
    logger.info({ locationId, count: deleted.length }, "Invalidated cached distances for location");
  }
}
