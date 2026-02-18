import { eq, ilike, asc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { organizations, organizationLocations, organizationPersons } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PaginationParams } from "../schemas/common.js";

export async function listOrganizations(eventId: string, params: PaginationParams) {
  const db = getDb();
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(organizations.eventId, eventId)];
  if (search) conditions.push(ilike(organizations.name, `%${search}%`));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.organizations.findMany({
      where,
      with: {
        organizationLocations: { with: { location: true } },
        organizationPersons: { with: { person: true } },
      },
      orderBy: [asc(organizations.name)],
      offset,
      limit,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(organizations).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getOrganization(eventId: string, id: string) {
  const db = getDb();
  const row = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, id), eq(organizations.eventId, eventId)),
    with: {
      organizationLocations: { with: { location: true } },
      organizationPersons: { with: { person: true } },
    },
  });
  if (!row) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Organization not found");
  return row;
}

export async function createOrganization(eventId: string, data: {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  color?: string | null;
  locationIds: string[];
  personIds: string[];
}) {
  const db = getDb();
  const { locationIds, personIds, ...orgData } = data;

  const result = await db.insert(organizations).values({ ...orgData, eventId }).returning();
  const org = result[0];

  if (locationIds.length > 0) {
    await db.insert(organizationLocations).values(
      locationIds.map((locationId) => ({ organizationId: org.id, locationId })),
    );
  }

  if (personIds.length > 0) {
    await db.insert(organizationPersons).values(
      personIds.map((personId) => ({ organizationId: org.id, personId })),
    );
  }

  return getOrganization(eventId, org.id);
}

export async function updateOrganization(eventId: string, id: string, data: Partial<{
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  color: string | null;
  locationIds: string[];
  personIds: string[];
}>) {
  const db = getDb();
  const { locationIds, personIds, ...orgData } = data;

  if (Object.keys(orgData).length > 0) {
    const result = await db.update(organizations).set(orgData)
      .where(and(eq(organizations.id, id), eq(organizations.eventId, eventId))).returning();
    if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Organization not found");
  }

  if (locationIds !== undefined) {
    await db.delete(organizationLocations).where(eq(organizationLocations.organizationId, id));
    if (locationIds.length > 0) {
      await db.insert(organizationLocations).values(
        locationIds.map((locationId) => ({ organizationId: id, locationId })),
      );
    }
  }

  if (personIds !== undefined) {
    await db.delete(organizationPersons).where(eq(organizationPersons.organizationId, id));
    if (personIds.length > 0) {
      await db.insert(organizationPersons).values(
        personIds.map((personId) => ({ organizationId: id, personId })),
      );
    }
  }

  return getOrganization(eventId, id);
}

export async function deleteOrganization(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(organizations)
    .where(and(eq(organizations.id, id), eq(organizations.eventId, eventId)))
    .returning({ id: organizations.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Organization not found");
}
