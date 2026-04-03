import { z } from "zod";

export const ReportAppointmentsBody = z.object({
  appointmentIds: z.array(z.string().uuid()).min(1, "At least one appointment is required").max(1000),
});
