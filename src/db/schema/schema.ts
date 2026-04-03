import { pgTable, uuid, varchar, text, date, integer, boolean, numeric, timestamp, primaryKey, pgEnum, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// WHY: Single schema file instead of per-entity files. drizzle-kit runs in CJS
// mode and can't resolve cross-file .js imports that TypeScript ESM requires.
// Consolidating avoids the problem entirely and is the common Drizzle pattern.

// =============================================================================
// Users & Sessions
// =============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// WHY: Per-event RBAC. Admin users (from ADMIN_EMAILS env) get full access
// implicitly. Non-admin users need a row here per event they can access.
// Empty edit/delete arrays = read-only. No row = no visibility.
export const userEventAccess = pgTable("user_event_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  permissions: jsonb("permissions").notNull().$type<{ edit: string[]; delete: string[] }>(),
  // WHY: Links user to their patient record for this event. Persons are event-scoped
  // (same physical person = separate DB row per event), so the mapping is per user-event pair.
  // Dashboard uses this to know whose appointments/financials/mileage to show.
  defaultPersonId: uuid("default_person_id").references(() => persons.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("user_event_access_user_event_idx").on(t.userId, t.eventId),
]);

// =============================================================================
// Events (the accident/case - top-level scope)
// =============================================================================

// WHY: "Event" now means the incident (vehicle accident) that spawns multiple
// appointments. What was previously called "event" (doctor visits) is now
// "appointment". Every scoped entity gets an event_id FK.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 200 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// =============================================================================
// Locations
// =============================================================================

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 200 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// =============================================================================
// Distance Cache
// =============================================================================

// WHY canonical ordering (A < B): driving distance A->B ~= B->A for practical
// purposes. One row per pair halves cache size and avoids duplicate Geocodio calls.
export const distances = pgTable("distances", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationAId: uuid("location_a_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  locationBId: uuid("location_b_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  distanceMiles: numeric("distance_miles", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: numeric("duration_minutes", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("distances_location_pair_idx").on(t.locationAId, t.locationBId),
]);

// =============================================================================
// Person Roles & Persons
// =============================================================================

export const personRoles = pgTable("person_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#6b7280"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  notes: text("notes"),
  isPatient: boolean("is_patient").notNull().default(false),
  color: varchar("color", { length: 7 }),
  homeLocationId: uuid("home_location_id").references(() => locations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const personPersonRoles = pgTable("person_person_roles", {
  personId: uuid("person_id").notNull().references(() => persons.id, { onDelete: "cascade" }),
  personRoleId: uuid("person_role_id").notNull().references(() => personRoles.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.personId, t.personRoleId] }),
]);

// =============================================================================
// Organizations
// =============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  notes: text("notes"),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const organizationLocations = pgTable("organization_locations", {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.locationId] }),
]);

export const organizationPersons = pgTable("organization_persons", {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  personId: uuid("person_id").notNull().references(() => persons.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.personId] }),
]);

// =============================================================================
// Activities
// =============================================================================

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#6b7280"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// =============================================================================
// Appointments (formerly "events" -- doctor visits)
// =============================================================================

export const insuranceStatusEnum = pgEnum("insurance_status", ["pending", "submitted", "denied", "paid"]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  datetime: timestamp("datetime", { withTimezone: true, mode: "date" }).notNull(),
  notes: text("notes"),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  patientPersonId: uuid("patient_person_id").references(() => persons.id, { onDelete: "set null" }),
  drivingDistanceMiles: numeric("driving_distance_miles", { precision: 10, scale: 2 }),
  drivingDistanceRoundTrip: boolean("driving_distance_round_trip").notNull().default(true),
  insuranceStatus: insuranceStatusEnum("insurance_status"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const appointmentProviders = pgTable("appointment_providers", {
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  personId: uuid("person_id").notNull().references(() => persons.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.appointmentId, t.personId] }),
]);

export const appointmentActivities = pgTable("appointment_activities", {
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.appointmentId, t.activityId] }),
]);

export const costItemTypeEnum = pgEnum("cost_item_type", [
  "charge",
  "payment",
  "adjustment",
  "write_off",
  "patient_payment",
]);

export const appointmentCostItems = pgTable("appointment_cost_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 500 }),
  billingCode: varchar("billing_code", { length: 50 }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: costItemTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// =============================================================================
// Documents
// =============================================================================

export const documentTypes = pgTable("document_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#6b7280"),
  namingTemplate: varchar("naming_template", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  storedFilename: varchar("stored_filename", { length: 255 }).notNull().unique(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  title: varchar("title", { length: 500 }),
  documentTypeId: uuid("document_type_id").references(() => documentTypes.id, { onDelete: "set null" }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const documentAppointments = pgTable("document_appointments", {
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.documentId, t.appointmentId] }),
]);

export const documentPersons = pgTable("document_persons", {
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  personId: uuid("person_id").notNull().references(() => persons.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.documentId, t.personId] }),
]);

export const documentOrganizations = pgTable("document_organizations", {
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.documentId, t.organizationId] }),
]);

// =============================================================================
// Charge Codes
// =============================================================================

export const chargeCodes = pgTable("charge_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// =============================================================================
// Appointment Templates
// =============================================================================

export const appointmentTemplates = pgTable("appointment_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const appointmentTemplateActivities = pgTable("appointment_template_activities", {
  templateId: uuid("template_id").notNull().references(() => appointmentTemplates.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.templateId, t.activityId] }),
]);

// =============================================================================
// Relations
// =============================================================================

export const userEventAccessRelations = relations(userEventAccess, ({ one }) => ({
  user: one(users, { fields: [userEventAccess.userId], references: [users.id] }),
  event: one(events, { fields: [userEventAccess.eventId], references: [events.id] }),
  defaultPerson: one(persons, { fields: [userEventAccess.defaultPersonId], references: [persons.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  eventAccess: many(userEventAccess),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  appointments: many(appointments),
  appointmentTemplates: many(appointmentTemplates),
  persons: many(persons),
  personRoles: many(personRoles),
  organizations: many(organizations),
  locations: many(locations),
  activities: many(activities),
  documents: many(documents),
  documentTypes: many(documentTypes),
  chargeCodes: many(chargeCodes),
  userEventAccess: many(userEventAccess),
}));

export const distancesRelations = relations(distances, ({ one }) => ({
  locationA: one(locations, { fields: [distances.locationAId], references: [locations.id], relationName: "distanceA" }),
  locationB: one(locations, { fields: [distances.locationBId], references: [locations.id], relationName: "distanceB" }),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  event: one(events, { fields: [persons.eventId], references: [events.id] }),
  homeLocation: one(locations, {
    fields: [persons.homeLocationId],
    references: [locations.id],
  }),
  personPersonRoles: many(personPersonRoles),
}));

export const personRolesRelations = relations(personRoles, ({ one, many }) => ({
  event: one(events, { fields: [personRoles.eventId], references: [events.id] }),
  personPersonRoles: many(personPersonRoles),
}));

export const personPersonRolesRelations = relations(personPersonRoles, ({ one }) => ({
  person: one(persons, { fields: [personPersonRoles.personId], references: [persons.id] }),
  personRole: one(personRoles, { fields: [personPersonRoles.personRoleId], references: [personRoles.id] }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  event: one(events, { fields: [organizations.eventId], references: [events.id] }),
  organizationLocations: many(organizationLocations),
  organizationPersons: many(organizationPersons),
}));

export const organizationLocationsRelations = relations(organizationLocations, ({ one }) => ({
  organization: one(organizations, { fields: [organizationLocations.organizationId], references: [organizations.id] }),
  location: one(locations, { fields: [organizationLocations.locationId], references: [locations.id] }),
}));

export const organizationPersonsRelations = relations(organizationPersons, ({ one }) => ({
  organization: one(organizations, { fields: [organizationPersons.organizationId], references: [organizations.id] }),
  person: one(persons, { fields: [organizationPersons.personId], references: [persons.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  event: one(events, { fields: [locations.eventId], references: [events.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  event: one(events, { fields: [activities.eventId], references: [events.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  event: one(events, { fields: [appointments.eventId], references: [events.id] }),
  organization: one(organizations, { fields: [appointments.organizationId], references: [organizations.id] }),
  location: one(locations, { fields: [appointments.locationId], references: [locations.id] }),
  patient: one(persons, { fields: [appointments.patientPersonId], references: [persons.id] }),
  appointmentProviders: many(appointmentProviders),
  appointmentActivities: many(appointmentActivities),
  costItems: many(appointmentCostItems),
  documentAppointments: many(documentAppointments),
}));

export const appointmentProvidersRelations = relations(appointmentProviders, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentProviders.appointmentId], references: [appointments.id] }),
  person: one(persons, { fields: [appointmentProviders.personId], references: [persons.id] }),
}));

export const appointmentActivitiesRelations = relations(appointmentActivities, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentActivities.appointmentId], references: [appointments.id] }),
  activity: one(activities, { fields: [appointmentActivities.activityId], references: [activities.id] }),
}));

export const appointmentCostItemsRelations = relations(appointmentCostItems, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentCostItems.appointmentId], references: [appointments.id] }),
}));

export const documentTypesRelations = relations(documentTypes, ({ one, many }) => ({
  event: one(events, { fields: [documentTypes.eventId], references: [events.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  event: one(events, { fields: [documents.eventId], references: [events.id] }),
  documentType: one(documentTypes, { fields: [documents.documentTypeId], references: [documentTypes.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedByUserId], references: [users.id] }),
  documentAppointments: many(documentAppointments),
  documentPersons: many(documentPersons),
  documentOrganizations: many(documentOrganizations),
}));

export const documentAppointmentsRelations = relations(documentAppointments, ({ one }) => ({
  document: one(documents, { fields: [documentAppointments.documentId], references: [documents.id] }),
  appointment: one(appointments, { fields: [documentAppointments.appointmentId], references: [appointments.id] }),
}));

export const documentPersonsRelations = relations(documentPersons, ({ one }) => ({
  document: one(documents, { fields: [documentPersons.documentId], references: [documents.id] }),
  person: one(persons, { fields: [documentPersons.personId], references: [persons.id] }),
}));

export const documentOrganizationsRelations = relations(documentOrganizations, ({ one }) => ({
  document: one(documents, { fields: [documentOrganizations.documentId], references: [documents.id] }),
  organization: one(organizations, { fields: [documentOrganizations.organizationId], references: [organizations.id] }),
}));

export const chargeCodesRelations = relations(chargeCodes, ({ one }) => ({
  event: one(events, { fields: [chargeCodes.eventId], references: [events.id] }),
}));

export const appointmentTemplatesRelations = relations(appointmentTemplates, ({ one, many }) => ({
  event: one(events, { fields: [appointmentTemplates.eventId], references: [events.id] }),
  organization: one(organizations, { fields: [appointmentTemplates.organizationId], references: [organizations.id] }),
  location: one(locations, { fields: [appointmentTemplates.locationId], references: [locations.id] }),
  appointmentTemplateActivities: many(appointmentTemplateActivities),
}));

export const appointmentTemplateActivitiesRelations = relations(appointmentTemplateActivities, ({ one }) => ({
  template: one(appointmentTemplates, { fields: [appointmentTemplateActivities.templateId], references: [appointmentTemplates.id] }),
  activity: one(activities, { fields: [appointmentTemplateActivities.activityId], references: [activities.id] }),
}));
