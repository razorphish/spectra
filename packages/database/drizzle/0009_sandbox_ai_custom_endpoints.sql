-- @spectra-migration: idempotent
-- GAP-12: pricing_profiles before runtime_tenants (FK default_pricing_profile_id); then runtime_tenants, endpoints, versions, requests, usage_events.
-- Sandbox AI: runtime_tenants, ai_llm_models, developer AI endpoints/versions,
-- production approval requests, usage_events; catalog families; OAuth scope; platform_settings defaults.

-- ---------------------------------------------------------------------------
-- Catalog rows
-- ---------------------------------------------------------------------------
INSERT INTO "spectra"."catalog" ("id","family","name","description","created_by","updated_by") VALUES
('a0000070-0000-4000-8000-000000000001','developer_ai_endpoint_lifecycle','draft','Custom endpoint draft','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000070-0000-4000-8000-000000000002','developer_ai_endpoint_lifecycle','active','Custom endpoint active','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000070-0000-4000-8000-000000000003','developer_ai_endpoint_lifecycle','archived','Custom endpoint archived','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000080-0000-4000-8000-000000000001','ai_endpoint_production_request_states','pending_review','Awaiting staff review','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000080-0000-4000-8000-000000000002','ai_endpoint_production_request_states','needs_information','Staff requested more info','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000080-0000-4000-8000-000000000003','ai_endpoint_production_request_states','awaiting_user','Waiting on developer response','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000080-0000-4000-8000-000000000004','ai_endpoint_production_request_states','approved','Staff approved for production','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000080-0000-4000-8000-000000000005','ai_endpoint_production_request_states','rejected','Staff rejected','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000090-0000-4000-8000-000000000001','custom_endpoint_trust_tier','standard','Default trust tier','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000090-0000-4000-8000-000000000002','custom_endpoint_trust_tier','low','Low trust / more human gates','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000090-0000-4000-8000-000000000003','custom_endpoint_trust_tier','elevated','Elevated trust','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb)
ON CONFLICT ("family", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "spectra"."scopes" ("id","name","version","tier","requires_approval") VALUES
('b0000001-0000-4000-8000-000000000001','custom_endpoints:invoke','1','platform',true)
ON CONFLICT ("name", "version") DO NOTHING;
--> statement-breakpoint
INSERT INTO "spectra"."platform_settings" ("key","value") VALUES
('sandbox.ai.endpoints_enabled', 'false'::jsonb),
('sandbox.ai.default_llm_model_id', 'null'::jsonb),
('sandbox.ai.default_pricing_profile_id', 'null'::jsonb),
('sandbox.ai.precheck_enabled', 'false'::jsonb),
('sandbox.ai.approval_automation_enabled', 'false'::jsonb),
('sandbox.ai.machine_auto_approve_enabled', 'false'::jsonb)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."pricing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_profiles_status_id_idx" ON "spectra"."pricing_profiles" ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."runtime_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "spectra"."orgs"("id") ON DELETE CASCADE,
	"default_pricing_profile_id" uuid REFERENCES "spectra"."pricing_profiles"("id") ON DELETE SET NULL,
	"custom_endpoint_trust_tier_id" uuid REFERENCES "spectra"."catalog"("id") ON DELETE SET NULL,
	"display_name" text,
	"external_tenant_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "runtime_tenants_org_id_active_uq"
	ON "spectra"."runtime_tenants" ("org_id")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "runtime_tenants_org_external_ref_uq"
	ON "spectra"."runtime_tenants" ("org_id", "external_tenant_ref")
	WHERE "external_tenant_ref" IS NOT NULL AND "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runtime_tenants_org_id_idx" ON "spectra"."runtime_tenants" ("org_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."ai_llm_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"provider" text NOT NULL,
	"api_base_url" text,
	"model_name" text NOT NULL,
	"max_tokens" integer,
	"json_schema" jsonb,
	"prompt_hints" jsonb,
	"secret_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_llm_models_status_id_idx" ON "spectra"."ai_llm_models" ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."developer_ai_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"org_id" uuid REFERENCES "spectra"."orgs"("id") ON DELETE CASCADE,
	"slug" text NOT NULL,
	"created_by_user_id" uuid NOT NULL REFERENCES "spectra"."users"("id") ON DELETE restrict,
	"pricing_profile_id" uuid REFERENCES "spectra"."pricing_profiles"("id") ON DELETE SET NULL,
	"approved_production_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_ai_endpoints_tenant_slug_active_uq"
	ON "spectra"."developer_ai_endpoints" ("tenant_id", "slug")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_ai_endpoints_tenant_id_status_idx" ON "spectra"."developer_ai_endpoints" ("tenant_id", "status_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_ai_endpoints_org_id_idx" ON "spectra"."developer_ai_endpoints" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_ai_endpoints_approved_version_idx" ON "spectra"."developer_ai_endpoints" ("approved_production_version_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."developer_ai_endpoint_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL REFERENCES "spectra"."developer_ai_endpoints"("id") ON DELETE CASCADE,
	"revision" integer NOT NULL,
	"user_prompt" text NOT NULL,
	"model_id" uuid REFERENCES "spectra"."ai_llm_models"("id") ON DELETE SET NULL,
	"spec" jsonb NOT NULL,
	"spec_sha256" text,
	"llm_raw_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_ai_endpoint_versions_endpoint_revision_uq"
	ON "spectra"."developer_ai_endpoint_versions" ("endpoint_id", "revision");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_ai_endpoint_versions_endpoint_id_idx" ON "spectra"."developer_ai_endpoint_versions" ("endpoint_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'developer_ai_endpoints_approved_production_version_id_fk'
  ) THEN
    ALTER TABLE "spectra"."developer_ai_endpoints"
      ADD CONSTRAINT "developer_ai_endpoints_approved_production_version_id_fk"
      FOREIGN KEY ("approved_production_version_id") REFERENCES "spectra"."developer_ai_endpoint_versions"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."ai_endpoint_production_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL REFERENCES "spectra"."developer_ai_endpoints"("id") ON DELETE CASCADE,
	"endpoint_version_id" uuid NOT NULL REFERENCES "spectra"."developer_ai_endpoint_versions"("id") ON DELETE CASCADE,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"staff_visible_rejection_reason" text,
	"staff_reason_code" text,
	"internal_staff_notes" text,
	"user_follow_up" jsonb,
	"related_integration_id" uuid REFERENCES "spectra"."integrations"("id") ON DELETE SET NULL,
	"stepfunctions_execution_arn" text,
	"staff_task_token_ref" text,
	"precheck_summary" jsonb,
	"approved_spec_sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_endpoint_production_requests_endpoint_id_idx" ON "spectra"."ai_endpoint_production_requests" ("endpoint_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_endpoint_production_requests_status_id_idx" ON "spectra"."ai_endpoint_production_requests" ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"endpoint_id" uuid REFERENCES "spectra"."developer_ai_endpoints"("id") ON DELETE SET NULL,
	"dimension" text NOT NULL,
	"quantity" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"m2m_client_id" text,
	"integration_id" uuid REFERENCES "spectra"."integrations"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_events_tenant_occurred_idx" ON "spectra"."usage_events" ("tenant_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_events_endpoint_occurred_idx" ON "spectra"."usage_events" ("endpoint_id", "occurred_at");
