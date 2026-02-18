CREATE TYPE "public"."cost_item_type" AS ENUM('charge', 'payment', 'adjustment', 'write_off', 'patient_payment');--> statement-breakpoint
CREATE TYPE "public"."insurance_status" AS ENUM('pending', 'submitted', 'denied', 'paid');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"color" varchar(7) DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_activities" (
	"appointment_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "appointment_activities_appointment_id_activity_id_pk" PRIMARY KEY("appointment_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "appointment_cost_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"description" varchar(500),
	"billing_code" varchar(50),
	"amount" numeric(10, 2) NOT NULL,
	"type" "cost_item_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_providers" (
	"appointment_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "appointment_providers_appointment_id_person_id_pk" PRIMARY KEY("appointment_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "appointment_template_activities" (
	"template_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "appointment_template_activities_template_id_activity_id_pk" PRIMARY KEY("template_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "appointment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"organization_id" uuid,
	"location_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(500),
	"datetime" timestamp with time zone NOT NULL,
	"notes" text,
	"organization_id" uuid,
	"location_id" uuid,
	"patient_person_id" uuid,
	"driving_distance_miles" numeric(10, 2),
	"driving_distance_round_trip" boolean DEFAULT true NOT NULL,
	"insurance_status" "insurance_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_a_id" uuid NOT NULL,
	"location_b_id" uuid NOT NULL,
	"distance_miles" numeric(10, 2) NOT NULL,
	"duration_minutes" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_appointments" (
	"document_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	CONSTRAINT "document_appointments_document_id_appointment_id_pk" PRIMARY KEY("document_id","appointment_id")
);
--> statement-breakpoint
CREATE TABLE "document_organizations" (
	"document_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	CONSTRAINT "document_organizations_document_id_organization_id_pk" PRIMARY KEY("document_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "document_persons" (
	"document_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "document_persons_document_id_person_id_pk" PRIMARY KEY("document_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"color" varchar(7) DEFAULT '#6b7280' NOT NULL,
	"naming_template" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"original_filename" varchar(500) NOT NULL,
	"stored_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"title" varchar(500),
	"document_type_id" uuid,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_stored_filename_unique" UNIQUE("stored_filename")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"address" varchar(500),
	"city" varchar(200),
	"state" varchar(50),
	"zip" varchar(20),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"address" varchar(500),
	"city" varchar(200),
	"state" varchar(50),
	"zip" varchar(20),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_locations" (
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "organization_locations_organization_id_location_id_pk" PRIMARY KEY("organization_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "organization_persons" (
	"organization_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "organization_persons_organization_id_person_id_pk" PRIMARY KEY("organization_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"notes" text,
	"color" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_person_roles" (
	"person_id" uuid NOT NULL,
	"person_role_id" uuid NOT NULL,
	CONSTRAINT "person_person_roles_person_id_person_role_id_pk" PRIMARY KEY("person_id","person_role_id")
);
--> statement-breakpoint
CREATE TABLE "person_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"color" varchar(7) DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"notes" text,
	"is_patient" boolean DEFAULT false NOT NULL,
	"color" varchar(7),
	"home_location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_activities" ADD CONSTRAINT "appointment_activities_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_activities" ADD CONSTRAINT "appointment_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_cost_items" ADD CONSTRAINT "appointment_cost_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_providers" ADD CONSTRAINT "appointment_providers_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_providers" ADD CONSTRAINT "appointment_providers_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_template_activities" ADD CONSTRAINT "appointment_template_activities_template_id_appointment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."appointment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_template_activities" ADD CONSTRAINT "appointment_template_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_templates" ADD CONSTRAINT "appointment_templates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_templates" ADD CONSTRAINT "appointment_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_templates" ADD CONSTRAINT "appointment_templates_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_person_id_persons_id_fk" FOREIGN KEY ("patient_person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distances" ADD CONSTRAINT "distances_location_a_id_locations_id_fk" FOREIGN KEY ("location_a_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distances" ADD CONSTRAINT "distances_location_b_id_locations_id_fk" FOREIGN KEY ("location_b_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_appointments" ADD CONSTRAINT "document_appointments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_appointments" ADD CONSTRAINT "document_appointments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_organizations" ADD CONSTRAINT "document_organizations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_organizations" ADD CONSTRAINT "document_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_persons" ADD CONSTRAINT "document_persons_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_persons" ADD CONSTRAINT "document_persons_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_persons" ADD CONSTRAINT "organization_persons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_persons" ADD CONSTRAINT "organization_persons_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_person_roles" ADD CONSTRAINT "person_person_roles_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_person_roles" ADD CONSTRAINT "person_person_roles_person_role_id_person_roles_id_fk" FOREIGN KEY ("person_role_id") REFERENCES "public"."person_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_home_location_id_locations_id_fk" FOREIGN KEY ("home_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "distances_location_pair_idx" ON "distances" USING btree ("location_a_id","location_b_id");