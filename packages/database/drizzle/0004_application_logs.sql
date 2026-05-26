-- @spectra-migration: idempotent
CREATE TABLE IF NOT EXISTS "spectra"."application_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"module" text,
	"action" text,
	"metadata" jsonb,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_logs_created_at_idx" ON "spectra"."application_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_logs_level_idx" ON "spectra"."application_logs" USING btree ("level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_logs_module_idx" ON "spectra"."application_logs" USING btree ("module");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_logs_action_idx" ON "spectra"."application_logs" USING btree ("action");
