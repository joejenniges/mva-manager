import { z } from "zod";

export const ENTITY_TYPES = [
  "appointments", "persons", "organizations", "locations",
  "documents", "templates", "activities", "person_roles", "doc_types", "events",
] as const;

export const AddUserSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  name: z.string().min(1).max(255).optional(),
});

export const SetPermissionsSchema = z.object({
  permissions: z.object({
    edit: z.array(z.enum(ENTITY_TYPES)).default([]),
    delete: z.array(z.enum(ENTITY_TYPES)).default([]),
  }),
});

export const UserIdParam = z.object({
  userId: z.string().uuid(),
});

export const UserEventParam = z.object({
  userId: z.string().uuid(),
  eventId: z.string().uuid(),
});
