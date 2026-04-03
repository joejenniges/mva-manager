import { z } from "zod";

export const CreateChargeCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
});

export const UpdateChargeCodeSchema = CreateChargeCodeSchema.partial();
