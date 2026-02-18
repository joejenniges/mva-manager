import { z } from "zod";

export const UuidParam = z.object({
  id: z.string().uuid(),
});

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type PaginationParams = z.infer<typeof PaginationQuery>;
