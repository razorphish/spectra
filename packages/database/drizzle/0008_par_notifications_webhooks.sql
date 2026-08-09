-- @spectra-migration: idempotent
-- Production access (PAR) catalog families, users.principal_kind_id, PAR columns,
-- notifications, sandbox outbound webhook requests, optional notification_outbox.

-- ---------------------------------------------------------------------------
-- Catalog: production_access_request_states, user_principal, webhook_request_states
-- ---------------------------------------------------------------------------
INSERT INTO "spectra"."catalog" ("id","family","name","description","created_by","updated_by") VALUES
('a0000040-0000-4000-8000-000000000001','production_access_request_states','pending','PAR awaiting review','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000040-0000-4000-8000-000000000002','production_access_request_states','needs_information','PAR blocked on staff request','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000040-0000-4000-8000-000000000003','production_access_request_states','approved','PAR approved','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000040-0000-4000-8000-000000000004','production_access_request_states','rejected','PAR rejected or revoked','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000050-0000-4000-8000-000000000001','user_principal','portal','Integrator/developer identity','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000050-0000-4000-8000-000000000002','user_principal','staff','Operator / admin-ui identity','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000050-0000-4000-8000-000000000003','user_principal','internal','Internal / dogfood identity','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000060-0000-4000-8000-000000000001','webhook_request_states','pending','Outbound webhook URL pending staff review','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000060-0000-4000-8000-000000000002','webhook_request_states','approved','Staff approved callback URL','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000060-0000-4000-8000-000000000003','webhook_request_states','rejected','Staff rejected callback URL','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000060-0000-4000-8000-000000000004','webhook_request_states','disabled','Subscription disabled','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb)
ON CONFLICT ("family", "name") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "principal_kind_id" uuid REFERENCES "spectra"."catalog"("id") ON DELETE restrict;
--> statement-breakpoint
UPDATE "spectra"."users" SET "principal_kind_id" = 'a0000050-0000-4000-8000-000000000001'::uuid WHERE "principal_kind_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ALTER COLUMN "principal_kind_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_principal_kind_id_idx" ON "spectra"."users" ("principal_kind_id");
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "submitted_by_user_id" uuid REFERENCES "spectra"."users"("id") ON DELETE restrict;
--> statement-breakpoint
UPDATE "spectra"."production_access_requests" par
SET "submitted_by_user_id" = (par."created_by"->>'userId')::uuid
WHERE par."submitted_by_user_id" IS NULL AND par."created_by"->>'userId' IS NOT NULL;
--> statement-breakpoint
DELETE FROM "spectra"."production_access_requests" WHERE "submitted_by_user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ALTER COLUMN "submitted_by_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "integration_id" uuid REFERENCES "spectra"."integrations"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "customer_status_message" text;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "staff_internal_notes" text;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "public_reference_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_access_requests_public_reference_token_uq"
	ON "spectra"."production_access_requests" ("public_reference_token")
	WHERE "public_reference_token" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "approved_m2m_oauth_client_id" uuid REFERENCES "spectra"."m2m_oauth_clients"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "approved_production_org_id" uuid REFERENCES "spectra"."orgs"("id") ON DELETE set null;
--> statement-breakpoint
UPDATE "spectra"."production_access_requests" SET "status_id" = 'a0000040-0000-4000-8000-000000000001'::uuid
	WHERE "status_id" IN ('a0000001-0000-4000-8000-000000000001'::uuid);
--> statement-breakpoint
UPDATE "spectra"."production_access_requests" SET "status_id" = 'a0000040-0000-4000-8000-000000000003'::uuid
	WHERE "status_id" IN ('a0000001-0000-4000-8000-000000000002'::uuid);
--> statement-breakpoint
UPDATE "spectra"."production_access_requests" SET "status_id" = 'a0000040-0000-4000-8000-000000000004'::uuid
	WHERE "status_id" IN ('a0000001-0000-4000-8000-000000000003'::uuid,'a0000001-0000-4000-8000-000000000004'::uuid);
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" DROP CONSTRAINT IF EXISTS "production_access_requests_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ALTER COLUMN "application_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD CONSTRAINT "production_access_requests_application_id_applications_id_fk"
	FOREIGN KEY ("application_id") REFERENCES "spectra"."applications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" DROP CONSTRAINT IF EXISTS "production_access_requests_app_xor_integration_chk";
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD CONSTRAINT "production_access_requests_app_xor_integration_chk" CHECK (
	("application_id" IS NOT NULL AND "integration_id" IS NULL)
	OR ("application_id" IS NULL AND "integration_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_access_requests_integration_open_uq"
	ON "spectra"."production_access_requests" ("integration_id")
	WHERE "integration_id" IS NOT NULL AND "deleted_at" IS NULL
		AND "status_id" IN ('a0000040-0000-4000-8000-000000000001'::uuid,'a0000040-0000-4000-8000-000000000002'::uuid);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_access_requests_application_open_uq"
	ON "spectra"."production_access_requests" ("application_id")
	WHERE "application_id" IS NOT NULL AND "deleted_at" IS NULL
		AND "status_id" IN ('a0000040-0000-4000-8000-000000000001'::uuid,'a0000040-0000-4000-8000-000000000002'::uuid);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_access_requests_integration_id_idx" ON "spectra"."production_access_requests" ("integration_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_access_requests_submitted_by_user_id_idx" ON "spectra"."production_access_requests" ("submitted_by_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL REFERENCES "spectra"."users"("id") ON DELETE cascade,
	"org_id" uuid REFERENCES "spectra"."orgs"("id") ON DELETE set null,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_uq" ON "spectra"."notifications" ("dedupe_key") WHERE "dedupe_key" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_read_created_idx" ON "spectra"."notifications" ("recipient_user_id", "read_at", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_category_created_idx" ON "spectra"."notifications" ("recipient_user_id", "category", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_outbound_webhook_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "spectra"."orgs"("id") ON DELETE cascade,
	"application_id" uuid REFERENCES "spectra"."applications"("id") ON DELETE cascade,
	"integration_id" uuid REFERENCES "spectra"."integrations"("id") ON DELETE cascade,
	"callback_url" text NOT NULL,
	"description" text,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"signing_secret_hash" text,
	"approved_by_user_id" uuid REFERENCES "spectra"."users"("id") ON DELETE set null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	CONSTRAINT "sandbox_outbound_webhook_requests_target_chk" CHECK (
		("application_id" IS NOT NULL AND "integration_id" IS NULL)
		OR ("application_id" IS NULL AND "integration_id" IS NOT NULL)
	)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_outbound_webhook_requests_org_id_idx" ON "spectra"."sandbox_outbound_webhook_requests" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_outbound_webhook_requests_integration_id_idx" ON "spectra"."sandbox_outbound_webhook_requests" ("integration_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_outbound_webhook_requests_status_id_idx" ON "spectra"."sandbox_outbound_webhook_requests" ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_outbox_dedupe_key_uq" ON "spectra"."notification_outbox" ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_processed_at_idx" ON "spectra"."notification_outbox" ("processed_at");
--> statement-breakpoint
INSERT INTO "spectra"."platform_settings" ("key","value") VALUES
('production_access.integrator_portal_enabled', 'true'::jsonb),
('production_access.staff_console_enabled', 'true'::jsonb),
('production_access.integrator_credentials_ui_enabled', 'true'::jsonb),
('production_access.review_sla_business_days', '5'::jsonb),
('production_access.reveal_client_secret_to_staff', 'false'::jsonb)
ON CONFLICT ("key") DO NOTHING;
