import { Router } from "express";
import { eq, and, sql, gte, lte, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";
import {
  userEventAccess,
  persons,
  appointments,
  appointmentCostItems,
  organizations,
} from "../db/schema/index.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const eventId = res.locals.eventId as string;

    // Look up user's defaultPersonId for this event
    const [accessRow] = await db
      .select({ defaultPersonId: userEventAccess.defaultPersonId })
      .from(userEventAccess)
      .where(and(eq(userEventAccess.userId, userId), eq(userEventAccess.eventId, eventId)))
      .limit(1);

    const patientId = accessRow?.defaultPersonId;

    // No patient linked — return empty shell
    if (!patientId) {
      res.json({
        patient: null,
        appointments: { thisWeek: [] },
        financials: { totalCharges: 0, totalPayments: 0, balance: 0 },
        mileage: { totalMiles: 0, roundTripMiles: 0 },
      });
      return;
    }

    // Get patient info
    const [patient] = await db
      .select({ id: persons.id, name: persons.name, color: persons.color })
      .from(persons)
      .where(eq(persons.id, patientId))
      .limit(1);

    // Week boundaries (Monday through Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Today boundaries for isToday flag
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    // This week's appointments for the patient
    const weekAppointments = await db
      .select({
        id: appointments.id,
        title: appointments.title,
        datetime: appointments.datetime,
        organizationName: organizations.name,
      })
      .from(appointments)
      .leftJoin(organizations, eq(appointments.organizationId, organizations.id))
      .where(
        and(
          eq(appointments.eventId, eventId),
          eq(appointments.patientPersonId, patientId),
          gte(appointments.datetime, weekStart),
          lte(appointments.datetime, weekEnd),
        ),
      )
      .orderBy(appointments.datetime);

    const thisWeek = weekAppointments.map((a) => ({
      id: a.id,
      title: a.title,
      datetime: a.datetime.toISOString(),
      organizationName: a.organizationName,
      isToday: a.datetime >= todayStart && a.datetime < todayEnd,
    }));

    // Financial totals: join appointments to cost items for this patient
    const financialRows = await db
      .select({
        totalCharges: sql<string>`coalesce(sum(case when ${appointmentCostItems.type} = 'charge' then ${appointmentCostItems.amount} else 0 end), 0)`,
        totalPayments: sql<string>`coalesce(sum(case when ${appointmentCostItems.type} in ('payment', 'patient_payment', 'adjustment', 'write_off') then ${appointmentCostItems.amount} else 0 end), 0)`,
      })
      .from(appointmentCostItems)
      .innerJoin(appointments, eq(appointmentCostItems.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.eventId, eventId),
          eq(appointments.patientPersonId, patientId),
        ),
      );

    const totalCharges = parseFloat(financialRows[0]?.totalCharges || "0");
    const totalPayments = parseFloat(financialRows[0]?.totalPayments || "0");

    // Mileage totals for this patient
    const mileageRows = await db
      .select({
        totalMiles: sql<string>`coalesce(sum(${appointments.drivingDistanceMiles}), 0)`,
        roundTripMiles: sql<string>`coalesce(sum(case when ${appointments.drivingDistanceRoundTrip} then ${appointments.drivingDistanceMiles} * 2 else ${appointments.drivingDistanceMiles} end), 0)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.eventId, eventId),
          eq(appointments.patientPersonId, patientId),
          isNotNull(appointments.drivingDistanceMiles),
        ),
      );

    res.json({
      patient: patient || null,
      appointments: { thisWeek },
      financials: {
        totalCharges,
        totalPayments,
        balance: totalCharges - totalPayments,
      },
      mileage: {
        totalMiles: parseFloat(mileageRows[0]?.totalMiles || "0"),
        roundTripMiles: parseFloat(mileageRows[0]?.roundTripMiles || "0"),
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as dashboardRouter };
