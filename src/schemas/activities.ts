import { z } from "zod";

export const CreateActivitySchema = z.object({
  title: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
});

export const UpdateActivitySchema = CreateActivitySchema.partial();
