CREATE SCHEMA IF NOT EXISTS "spectra";
--> statement-breakpoint
CREATE TABLE "spectra"."application_scopes" (
	"application_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	CONSTRAINT "application_scopes_application_id_scope_id_pk" PRIMARY KEY("application_id","scope_id")
);
--> statement-breakpoint
CREATE TABLE "spectra"."applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"secret_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."org_memberships" (
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "org_memberships_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "spectra"."orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."production_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" text NOT NULL,
	"documents" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."redirect_uris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oauth_client_id" uuid NOT NULL,
	"uri" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."scope_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"status" text NOT NULL,
	"requested_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"tier" text NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"application_id" uuid,
	"s3_bucket" text NOT NULL,
	"s3_key" text NOT NULL,
	"status" text NOT NULL,
	"bytes_expected" text,
	"content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectra"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD CONSTRAINT "application_scopes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD CONSTRAINT "application_scopes_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "spectra"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD CONSTRAINT "applications_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "spectra"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "spectra"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD CONSTRAINT "oauth_clients_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "spectra"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD CONSTRAINT "org_memberships_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "spectra"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD CONSTRAINT "production_access_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."redirect_uris" ADD CONSTRAINT "redirect_uris_oauth_client_id_oauth_clients_id_fk" FOREIGN KEY ("oauth_client_id") REFERENCES "spectra"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD CONSTRAINT "scope_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD CONSTRAINT "scope_requests_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "spectra"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD CONSTRAINT "scope_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "spectra"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD CONSTRAINT "scope_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "spectra"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD CONSTRAINT "uploads_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "spectra"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD CONSTRAINT "uploads_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_clients_client_id_uq" ON "spectra"."oauth_clients" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scopes_name_version_uq" ON "spectra"."scopes" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "spectra"."users" USING btree ("email");
--> statement-breakpoint
-- Copy application data from public (legacy) into spectra when upgrading.
INSERT INTO "spectra"."users" SELECT * FROM "public"."users" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');
--> statement-breakpoint
INSERT INTO "spectra"."orgs" SELECT * FROM "public"."orgs" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orgs');
--> statement-breakpoint
INSERT INTO "spectra"."applications" SELECT * FROM "public"."applications" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications');
--> statement-breakpoint
INSERT INTO "spectra"."oauth_clients" SELECT * FROM "public"."oauth_clients" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'oauth_clients');
--> statement-breakpoint
INSERT INTO "spectra"."scopes" SELECT * FROM "public"."scopes" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scopes');
--> statement-breakpoint
INSERT INTO "spectra"."redirect_uris" SELECT * FROM "public"."redirect_uris" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'redirect_uris');
--> statement-breakpoint
INSERT INTO "spectra"."org_memberships" SELECT * FROM "public"."org_memberships" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_memberships');
--> statement-breakpoint
INSERT INTO "spectra"."application_scopes" SELECT * FROM "public"."application_scopes" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'application_scopes');
--> statement-breakpoint
INSERT INTO "spectra"."scope_requests" SELECT * FROM "public"."scope_requests" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scope_requests');
--> statement-breakpoint
INSERT INTO "spectra"."production_access_requests" SELECT * FROM "public"."production_access_requests" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_access_requests');
--> statement-breakpoint
INSERT INTO "spectra"."audit_logs" SELECT * FROM "public"."audit_logs" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs');
--> statement-breakpoint
INSERT INTO "spectra"."platform_settings" SELECT * FROM "public"."platform_settings" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_settings');
--> statement-breakpoint
INSERT INTO "spectra"."uploads" SELECT * FROM "public"."uploads" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uploads');
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."application_scopes" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."scope_requests" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."uploads" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."redirect_uris" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."oauth_clients" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."org_memberships" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."production_access_requests" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."applications" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."audit_logs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."scopes" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."platform_settings" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."orgs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."users" CASCADE;
