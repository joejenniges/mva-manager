import { z } from "zod";

export const CreateAppointmentTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  organizationId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  activityIds: z.array(z.string().uuid()).optional(),
});

export const UpdateAppointmentTemplateSchema = CreateAppointmentTemplateSchema.partial();

export const CalendarQuery = z.object({
  start: z.string(), // ISO date
  end: z.string(),   // ISO date
});
