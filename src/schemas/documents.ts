import { z } from "zod";

export const DocumentMetadataSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  documentTypeId: z.string().uuid().nullable().optional(),
  appointmentIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().uuid()).default([]),
  ),
  personIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().uuid()).default([]),
  ),
  organizationIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().uuid()).default([]),
  ),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  documentTypeId: z.string().uuid().nullable().optional(),
  appointmentIds: z.array(z.string().uuid()).optional(),
  personIds: z.array(z.string().uuid()).optional(),
  organizationIds: z.array(z.string().uuid()).optional(),
});

export const DocumentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  documentTypeId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  excludeAppointmentId: z.string().uuid().optional(),
  unorganized: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const LinkAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const DocumentAppointmentParam = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
});
