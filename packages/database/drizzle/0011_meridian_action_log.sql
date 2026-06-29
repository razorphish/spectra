-- @spectra-migration: idempotent
-- Meridian (AI Driver): append-only audit of every driver action (one row per run).
-- Frozen append-only log — no updated_at/deleted_at/status_id/updated_by (audit-column
-- exemption documented on the table def). No foreign keys: model ids/verdicts are text/jsonb,
-- so this stands alone regardless of other migrations. See docs/meridian/charter.md.

CREATE TABLE IF NOT EXISTS "spectra"."meridian_action_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"task_class" text NOT NULL,
	"phase" text NOT NULL,
	"executor_model" text NOT NULL,
	"executor_tier" text NOT NULL,
	"escalations" integer DEFAULT 0 NOT NULL,
	"tokens_spent" integer DEFAULT 0 NOT NULL,
	"l0_results" jsonb,
	"judge_verdicts" jsonb,
	"decision" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"branch" text,
	"pr_url" text,
	"commit_sha" text,
	"applied_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meridian_action_log_phase_chk" CHECK ("phase" in ('shadow','assisted','gated_auto','broad_auto')),
	CONSTRAINT "meridian_action_log_tier_chk" CHECK ("executor_tier" in ('small','mid','frontier')),
	CONSTRAINT "meridian_action_log_decision_chk" CHECK ("decision" in ('accepted','rejected','aborted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meridian_action_log_run_id_uq" ON "spectra"."meridian_action_log" ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meridian_action_log_task_created_idx" ON "spectra"."meridian_action_log" ("task_class", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meridian_action_log_decision_idx" ON "spectra"."meridian_action_log" ("decision");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meridian_action_log_created_at_idx" ON "spectra"."meridian_action_log" ("created_at");
