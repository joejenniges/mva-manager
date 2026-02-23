import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { appointments, persons } from "../db/schema/index.js";
import { eq, and, sql, isNotNull, lte } from "drizzle-orm";

const MileageQuery = z.object({
  patientId: z.string().uuid().optional(),
  completedOnly: z.enum(["true", "false"]).optional(),
});

const router = Router();
router.use(requireAuth);

router.get("/", validate(MileageQuery, "query"), async (req, res, next) => {
  try {
    const eventId = res.locals.eventId as string;
    const { patientId, completedOnly } = res.locals.query as z.infer<typeof MileageQuery>;
    const db = getDb();

    const conditions = [
      eq(appointments.eventId, eventId),
      isNotNull(appointments.drivingDistanceMiles),
    ];
    if (patientId) conditions.push(eq(appointments.patientPersonId, patientId));
    if (completedOnly === "true") conditions.push(lte(appointments.datetime, new Date()));

    // Per-patient breakdown
    const rows = await db
      .select({
        patientId: appointments.patientPersonId,
        patientName: persons.name,
        patientColor: persons.color,
        appointmentCount: sql<number>`count(*)::int`,
        totalMiles: sql<string>`sum(${appointments.drivingDistanceMiles})`,
        roundTripMiles: sql<string>`sum(case when ${appointments.drivingDistanceRoundTrip} then ${appointments.drivingDistanceMiles} * 2 else ${appointments.drivingDistanceMiles} end)`,
      })
      .from(appointments)
      .leftJoin(persons, eq(appointments.patientPersonId, persons.id))
      .where(and(...conditions))
      .groupBy(appointments.patientPersonId, persons.name, persons.color)
      .orderBy(persons.name);

    // Grand totals (raw sum across all patient appointments)
    const totals = await db
      .select({
        appointmentCount: sql<number>`count(*)::int`,
        totalMiles: sql<string>`coalesce(sum(${appointments.drivingDistanceMiles}), 0)`,
        roundTripMiles: sql<string>`coalesce(sum(case when ${appointments.drivingDistanceRoundTrip} then ${appointments.drivingDistanceMiles} * 2 else ${appointments.drivingDistanceMiles} end), 0)`,
      })
      .from(appointments)
      .where(and(...conditions));

    // WHY: Deduped "actual car trips" -- when multiple patients share a ride
    // (e.g., Joe and Julie go to the chiropractor together), the same physical
    // trip appears as two appointment rows. Dedup by (date, miles, roundTrip)
    // so each car trip is counted once.
    const where = and(...conditions);
    const tripTotals = await db.execute<{
      tripCount: number;
      totalMiles: string;
      roundTripMiles: string;
    }>(sql`
      select
        count(*)::int as "tripCount",
        coalesce(sum(miles), 0) as "totalMiles",
        coalesce(sum(case when rt then miles * 2 else miles end), 0) as "roundTripMiles"
      from (
        select distinct
          date_trunc('day', ${appointments.datetime}) as trip_date,
          ${appointments.drivingDistanceMiles} as miles,
          ${appointments.drivingDistanceRoundTrip} as rt
        from ${appointments}
        where ${where}
      ) unique_trips
    `);

    res.json({
      patients: rows.map((r) => ({
        patientId: r.patientId,
        patientName: r.patientName || "No Patient",
        patientColor: r.patientColor,
        appointmentCount: r.appointmentCount,
        totalMiles: parseFloat(r.totalMiles || "0"),
        roundTripMiles: parseFloat(r.roundTripMiles || "0"),
      })),
      totals: {
        appointmentCount: totals[0]?.appointmentCount || 0,
        totalMiles: parseFloat(totals[0]?.totalMiles || "0"),
        roundTripMiles: parseFloat(totals[0]?.roundTripMiles || "0"),
      },
      tripTotals: {
        tripCount: tripTotals.rows[0]?.tripCount || 0,
        totalMiles: parseFloat(tripTotals.rows[0]?.totalMiles || "0"),
        roundTripMiles: parseFloat(tripTotals.rows[0]?.roundTripMiles || "0"),
      },
    });
  } catch (err) { next(err); }
});

export { router as mileageRouter };
