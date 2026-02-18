import { z } from "zod";

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(10000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  lat: z.string().nullable().optional(),
  lng: z.string().nullable().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const EventListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
});
