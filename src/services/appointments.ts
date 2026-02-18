import { eq, ilike, asc, desc, sql, and, gte, lte } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import {
  appointments, appointmentProviders, appointmentActivities, appointmentCostItems,
  persons, organizations, locations,
} from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import { getDistanceBetweenLocations } from "./distance.js";
import { logger } from "../logger.js";

interface AppointmentListParams {
  page: number;
  limit: number;
  search?: string;
  patientId?: string;
  organizationId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "datetime" | "title" | "patient" | "organization";
  order?: "asc" | "desc";
}

// WHY: Drizzle's relational .findMany() only sorts by columns on the root
// table. "patient" and "organization" are on joined tables, so we sort the
// fetched page in JS after the query. This is fine - we're sorting max 100 rows.
const DB_SORT_COLUMNS: Record<string, any> = {
  datetime: appointments.datetime,
  title: appointments.title,
};

export async function listAppointments(eventId: string, params: AppointmentListParams) {
  const db = getDb();
  const { page, limit, search, patientId, organizationId, dateFrom, dateTo, sort = "datetime", order = "desc" } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(appointments.eventId, eventId)];
  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    for (const term of terms) {
      conditions.push(ilike(appointments.title, `%${term}%`));
    }
  }
  if (patientId) conditions.push(eq(appointments.patientPersonId, patientId));
  if (organizationId) conditions.push(eq(appointments.organizationId, organizationId));
  if (dateFrom) conditions.push(gte(appointments.datetime, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(appointments.datetime, new Date(dateTo)));

  const where = and(...conditions);
  const dbSortCol = DB_SORT_COLUMNS[sort];
  const sortDir = order === "asc" ? asc : desc;

  const [data, countResult, chargesResult] = await Promise.all([
    db.query.appointments.findMany({
      where,
      with: {
        organization: true,
        location: true,
        patient: true,
        appointmentProviders: { with: { person: true } },
        appointmentActivities: { with: { activity: true } },
        costItems: true,
        documentAppointments: true,
      },
      orderBy: dbSortCol ? [sortDir(dbSortCol)] : [desc(appointments.datetime)],
      offset,
      limit,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(appointments).where(where),
    db.select({
      totalCharges: sql<string>`coalesce(sum(case when ${appointmentCostItems.type} = 'charge' then ${appointmentCostItems.amount} else 0 end), 0)`,
      totalCredits: sql<string>`coalesce(sum(case when ${appointmentCostItems.type} != 'charge' then ${appointmentCostItems.amount} else 0 end), 0)`,
    })
      .from(appointmentCostItems)
      .where(sql`${appointmentCostItems.appointmentId} in (select ${appointments.id} from ${appointments} where ${where})`),
  ]);

  // Sort by joined fields in JS when DB can't handle it
  if (sort === "patient" || sort === "organization") {
    const mult = order === "asc" ? 1 : -1;
    data.sort((a: any, b: any) => {
      const aName: string = (sort === "patient" ? a.patient?.name : a.organization?.name) || "";
      const bName: string = (sort === "patient" ? b.patient?.name : b.organization?.name) || "";
      return mult * aName.localeCompare(bName);
    });
  }

  const total = countResult[0].count;
  const totalCharges = parseFloat(chargesResult[0]?.totalCharges || "0");
  const totalCredits = parseFloat(chargesResult[0]?.totalCredits || "0");
  return { data, total, page, limit, hasMore: offset + data.length < total, totalCharges, totalCredits };
}

export async function getAppointment(eventId: string, id: string) {
  const db = getDb();
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.eventId, eventId)),
    with: {
      organization: true,
      location: true,
      patient: true,
      appointmentProviders: { with: { person: true } },
      appointmentActivities: { with: { activity: true } },
      costItems: { orderBy: [asc(appointmentCostItems.createdAt)] },
    },
  });
  if (!row) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment not found");
  return row;
}

export async function createAppointment(eventId: string, data: {
  title?: string | null;
  datetime: string;
  notes?: string | null;
  organizationId?: string | null;
  locationId?: string | null;
  patientPersonId?: string | null;
  drivingDistanceMiles?: string | null;
  drivingDistanceRoundTrip: boolean;
  providerIds: string[];
  activityIds: string[];
  insuranceStatus?: "pending" | "submitted" | "denied" | "paid" | null;
}) {
  const db = getDb();
  const { providerIds, activityIds, datetime, ...appointmentData } = data;

  // Auto-generate title if not provided
  let title = appointmentData.title;
  if (!title) {
    title = await generateAppointmentTitle(appointmentData.patientPersonId, appointmentData.organizationId, datetime);
  }

  const result = await db.insert(appointments).values({
    ...appointmentData,
    eventId,
    title,
    datetime: new Date(datetime),
  }).returning();
  const appointment = result[0];

  await syncJunctionTables(appointment.id, providerIds, activityIds);

  // Auto-calculate driving distance (non-fatal)
  await tryCalculateDistance(appointment.id, appointmentData.locationId, appointmentData.patientPersonId);

  return getAppointment(eventId, appointment.id);
}

export async function updateAppointment(eventId: string, id: string, data: Partial<{
  title: string | null;
  datetime: string;
  notes: string | null;
  organizationId: string | null;
  locationId: string | null;
  patientPersonId: string | null;
  drivingDistanceMiles: string | null;
  drivingDistanceRoundTrip: boolean;
  providerIds: string[];
  activityIds: string[];
  insuranceStatus: "pending" | "submitted" | "denied" | "paid" | null;
}>) {
  const db = getDb();
  const { providerIds, activityIds, datetime, ...appointmentData } = data;

  const updateValues: any = { ...appointmentData };
  if (datetime !== undefined) {
    updateValues.datetime = new Date(datetime);
  }

  if (Object.keys(updateValues).length > 0) {
    const result = await db.update(appointments).set(updateValues)
      .where(and(eq(appointments.id, id), eq(appointments.eventId, eventId))).returning();
    if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment not found");
  }

  if (providerIds !== undefined || activityIds !== undefined) {
    await syncJunctionTables(id, providerIds, activityIds);
  }

  // Recalculate distance if location or patient changed
  if (data.locationId !== undefined || data.patientPersonId !== undefined) {
    const current = await db.select({
      locationId: appointments.locationId,
      patientPersonId: appointments.patientPersonId,
    }).from(appointments).where(eq(appointments.id, id)).limit(1);

    if (current[0]) {
      await tryCalculateDistance(id, current[0].locationId, current[0].patientPersonId);
    }
  }

  return getAppointment(eventId, id);
}

export async function deleteAppointment(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.eventId, eventId)))
    .returning({ id: appointments.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment not found");
}

// --- Cost Items ---

export async function createCostItem(eventId: string, appointmentId: string, data: {
  description?: string | null;
  billingCode?: string | null;
  amount: string;
  type: string;
}) {
  const db = getDb();
  // Verify appointment exists and belongs to event
  const appointment = await db.select({ id: appointments.id }).from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.eventId, eventId))).limit(1);
  if (appointment.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Appointment not found");

  const result = await db.insert(appointmentCostItems).values({
    appointmentId,
    ...data,
    type: data.type as any,
  }).returning();
  return result[0];
}

export async function updateCostItem(id: string, data: Partial<{
  description: string | null;
  billingCode: string | null;
  amount: string;
  type: string;
}>) {
  const db = getDb();
  const updateValues: any = { ...data };
  const result = await db.update(appointmentCostItems).set(updateValues).where(eq(appointmentCostItems.id, id)).returning();
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Cost item not found");
  return result[0];
}

export async function deleteCostItem(id: string) {
  const db = getDb();
  const result = await db.delete(appointmentCostItems).where(eq(appointmentCostItems.id, id)).returning({ id: appointmentCostItems.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Cost item not found");
}

// --- Helpers ---

// WHY non-fatal: distance is nice-to-have. If Geocodio is down or coords are
// missing, the appointment still saves. User sees null distance and can retry later.
async function tryCalculateDistance(
  appointmentId: string,
  locationId: string | null | undefined,
  patientPersonId: string | null | undefined,
): Promise<void> {
  const db = getDb();

  if (!locationId || !patientPersonId) {
    await db.update(appointments).set({ drivingDistanceMiles: null }).where(eq(appointments.id, appointmentId));
    return;
  }

  try {
    const patient = await db.select({ homeLocationId: persons.homeLocationId })
      .from(persons).where(eq(persons.id, patientPersonId)).limit(1);

    const homeLocationId = patient[0]?.homeLocationId;
    if (!homeLocationId) {
      await db.update(appointments).set({ drivingDistanceMiles: null }).where(eq(appointments.id, appointmentId));
      return;
    }

    const result = await getDistanceBetweenLocations(locationId, homeLocationId);
    if (result) {
      await db.update(appointments).set({
        drivingDistanceMiles: result.distanceMiles.toFixed(2),
      }).where(eq(appointments.id, appointmentId));
    } else {
      await db.update(appointments).set({ drivingDistanceMiles: null }).where(eq(appointments.id, appointmentId));
    }
  } catch (err) {
    logger.error({ err, appointmentId }, "Failed to calculate driving distance");
  }
}

async function syncJunctionTables(
  appointmentId: string,
  providerIds: string[] | undefined,
  activityIds: string[] | undefined,
) {
  const db = getDb();

  if (providerIds !== undefined) {
    await db.delete(appointmentProviders).where(eq(appointmentProviders.appointmentId, appointmentId));
    if (providerIds.length > 0) {
      await db.insert(appointmentProviders).values(
        providerIds.map((personId) => ({ appointmentId, personId })),
      );
    }
  }

  if (activityIds !== undefined) {
    await db.delete(appointmentActivities).where(eq(appointmentActivities.appointmentId, appointmentId));
    if (activityIds.length > 0) {
      await db.insert(appointmentActivities).values(
        activityIds.map((activityId) => ({ appointmentId, activityId })),
      );
    }
  }
}

async function generateAppointmentTitle(
  patientPersonId: string | null | undefined,
  organizationId: string | null | undefined,
  datetime: string,
): Promise<string> {
  const db = getDb();
  const parts: string[] = [];

  if (patientPersonId) {
    const p = await db.select({ name: persons.name }).from(persons).where(eq(persons.id, patientPersonId)).limit(1);
    if (p.length > 0) parts.push(p[0].name);
  }

  if (organizationId) {
    const o = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (o.length > 0) parts.push(o[0].name);
  }

  const date = new Date(datetime);
  parts.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

  return parts.join(" - ");
}
