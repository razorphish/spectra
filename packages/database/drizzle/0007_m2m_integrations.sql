-- @spectra-migration: idempotent

-- M2M integrations: org-scoped server integrations + OAuth2 client_credentials clients + issuance log.

CREATE TABLE IF NOT EXISTS "spectra"."integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "spectra"."orgs"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_org_id_idx" ON "spectra"."integrations" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_status_id_idx" ON "spectra"."integrations" ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."m2m_oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL REFERENCES "spectra"."integrations"("id") ON DELETE CASCADE,
	"client_id" text NOT NULL,
	"secret_hash" text NOT NULL,
	"granted_scopes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "m2m_oauth_clients_client_id_uq" ON "spectra"."m2m_oauth_clients" ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "m2m_oauth_clients_integration_active_uq"
	ON "spectra"."m2m_oauth_clients" ("integration_id")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "m2m_oauth_clients_integration_id_idx" ON "spectra"."m2m_oauth_clients" ("integration_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."m2m_token_issuance_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jti" text NOT NULL,
	"m2m_oauth_client_id" uuid NOT NULL REFERENCES "spectra"."m2m_oauth_clients"("id") ON DELETE CASCADE,
	"org_id" uuid NOT NULL REFERENCES "spectra"."orgs"("id") ON DELETE CASCADE,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "m2m_token_issuance_log_jti_uq" ON "spectra"."m2m_token_issuance_log" ("jti");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "m2m_token_issuance_log_client_issued_idx"
	ON "spectra"."m2m_token_issuance_log" ("m2m_oauth_client_id", "issued_at");
