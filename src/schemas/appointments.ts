import { z } from "zod";

export const CreateAppointmentSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  datetime: z.string().datetime(),
  notes: z.string().max(10000).nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  patientPersonId: z.string().uuid().nullable().optional(),
  drivingDistanceMiles: z.string().nullable().optional(),
  drivingDistanceRoundTrip: z.boolean().default(true),
  providerIds: z.array(z.string().uuid()).default([]),
  activityIds: z.array(z.string().uuid()).default([]),
  insuranceStatus: z.enum(["pending", "submitted", "denied", "paid"]).nullable().optional(),
});

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

export const AppointmentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().optional(),
  patientId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  documentFilter: z.enum(["all", "none", "any"]).default("all"),
  balanceFilter: z.enum(["all", "no_charges", "outstanding", "paid"]).default("all"),
  sort: z.enum(["datetime", "title", "patient", "organization"]).default("datetime"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateCostItemSchema = z.object({
  description: z.string().max(500).nullable().optional(),
  billingCode: z.string().max(50).nullable().optional(),
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  type: z.enum(["charge", "payment", "adjustment", "write_off", "patient_payment"]),
});

export const UpdateCostItemSchema = CreateCostItemSchema.partial();

export const BulkCreateCostItemsSchema = z.object({
  items: z.array(CreateCostItemSchema).min(1).max(100),
});
