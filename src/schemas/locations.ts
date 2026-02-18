import { z } from "zod";

export const CreateLocationSchema = z.object({
  title: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  lat: z.string().nullable().optional(),
  lng: z.string().nullable().optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();
