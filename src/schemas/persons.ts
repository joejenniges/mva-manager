import { z } from "zod";
import { PaginationQuery } from "./common.js";

export const PersonListQuery = PaginationQuery.extend({
  isPatient: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export type PersonListParams = z.infer<typeof PersonListQuery>;

export const CreatePersonSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  isPatient: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  homeLocationId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.string().uuid()).default([]),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();
