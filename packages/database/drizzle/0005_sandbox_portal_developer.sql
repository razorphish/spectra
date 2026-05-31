-- @spectra-migration: idempotent

-- Sandbox developer portal: application metadata, global unique app names,
-- OAuth display fields, and per-user developer org mapping.

CREATE TABLE IF NOT EXISTS "spectra"."user_developer_context" (
	"user_id" uuid PRIMARY KEY NOT NULL REFERENCES "spectra"."users"("id") ON DELETE CASCADE,
	"org_id" uuid NOT NULL REFERENCES "spectra"."orgs"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_developer_context_org_id_uq"
	ON "spectra"."user_developer_context" ("org_id")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "company_website_url" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "privacy_policy_url" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "application_tos_url" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "support_email" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "support_phone" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "development_contacts" text;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "logo_upload_id" uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "spectra_tos_accepted_at" timestamp with time zone;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_logo_upload_id_uploads_id_fk'
  ) THEN
    ALTER TABLE "spectra"."applications"
      ADD CONSTRAINT "applications_logo_upload_id_uploads_id_fk"
      FOREIGN KEY ("logo_upload_id") REFERENCES "spectra"."uploads"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "applications_name_lower_active_uq"
	ON "spectra"."applications" (lower(trim("name")))
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "oauth_client_type" text DEFAULT 'confidential' NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "oauth_grant_type" text DEFAULT 'authorization_code' NOT NULL;
