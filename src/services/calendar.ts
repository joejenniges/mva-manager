import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { appointments } from "../db/schema/index.js";

export async function getCalendarAppointments(eventId: string, start: string, end: string) {
  const db = getDb();

  const data = await db.query.appointments.findMany({
    where: and(
      eq(appointments.eventId, eventId),
      gte(appointments.datetime, new Date(start)),
      lte(appointments.datetime, new Date(end)),
    ),
    columns: {
      id: true,
      title: true,
      datetime: true,
    },
    with: {
      organization: { columns: { id: true, name: true, color: true } },
      patient: { columns: { id: true, name: true } },
      appointmentActivities: {
        with: { activity: { columns: { id: true, title: true, color: true } } },
      },
    },
  });

  return data;
}
