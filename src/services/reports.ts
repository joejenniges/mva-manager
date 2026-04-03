import { and, eq, inArray, asc } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { appointments, appointmentCostItems } from "../db/schema/index.js";

export async function getReportAppointments(eventId: string, appointmentIds: string[]) {
  const db = getDb();

  const data = await db.query.appointments.findMany({
    where: and(
      eq(appointments.eventId, eventId),
      inArray(appointments.id, appointmentIds),
    ),
    with: {
      organization: true,
      location: true,
      patient: true,
      costItems: { orderBy: [asc(appointmentCostItems.createdAt)] },
    },
    orderBy: [asc(appointments.datetime)],
  });

  return data;
}
