import { z } from "zod";

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  locationIds: z.array(z.string().uuid()).default([]),
  personIds: z.array(z.string().uuid()).default([]),
});

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();
