-- @spectra-migration: idempotent
-- G10: Nine tenant-scoped sandbox MRP fixture tables for allowlisted `sandbox_mrp_fixture_read` invoke specs.

CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"sku" text NOT NULL,
	"description" text,
	"unit_of_measure" text,
	"item_type" text NOT NULL,
	"default_lead_time_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_items_tenant_sku_active_uq"
	ON "spectra"."sandbox_mrp_items" ("tenant_id", "sku")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_items_tenant_id_idx" ON "spectra"."sandbox_mrp_items" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"supplier_code" text NOT NULL,
	"name" text NOT NULL,
	"contact_notes" text,
	"default_lead_time_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_suppliers_tenant_code_active_uq"
	ON "spectra"."sandbox_mrp_suppliers" ("tenant_id", "supplier_code")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_suppliers_tenant_id_idx" ON "spectra"."sandbox_mrp_suppliers" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_bom_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"parent_item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"child_item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"quantity_per" real NOT NULL,
	"scrap_factor" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_bom_lines_tenant_parent_idx" ON "spectra"."sandbox_mrp_bom_lines" ("tenant_id", "parent_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_bom_lines_tenant_child_idx" ON "spectra"."sandbox_mrp_bom_lines" ("tenant_id", "child_item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"site_code" text NOT NULL,
	"quantity_on_hand" integer NOT NULL,
	"quantity_allocated" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_inv_bal_tenant_item_site_active_uq"
	ON "spectra"."sandbox_mrp_inventory_balances" ("tenant_id", "item_id", "site_code")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_inventory_balances_tenant_id_idx" ON "spectra"."sandbox_mrp_inventory_balances" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"wo_number" text NOT NULL,
	"assembly_item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE restrict,
	"quantity_released" integer NOT NULL,
	"quantity_completed" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_work_orders_tenant_wo_active_uq"
	ON "spectra"."sandbox_mrp_work_orders" ("tenant_id", "wo_number")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_work_orders_tenant_id_idx" ON "spectra"."sandbox_mrp_work_orders" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"po_number" text NOT NULL,
	"line_no" integer NOT NULL,
	"supplier_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_suppliers"("id") ON DELETE restrict,
	"item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE restrict,
	"quantity" integer NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_po_tenant_po_line_active_uq"
	ON "spectra"."sandbox_mrp_purchase_orders" ("tenant_id", "po_number", "line_no")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_purchase_orders_tenant_id_idx" ON "spectra"."sandbox_mrp_purchase_orders" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_routing_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"sequence_no" integer NOT NULL,
	"operation_code" text NOT NULL,
	"operation_name" text NOT NULL,
	"work_center" text NOT NULL,
	"planned_time_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_routing_tenant_item_seq_active_uq"
	ON "spectra"."sandbox_mrp_routing_operations" ("tenant_id", "item_id", "sequence_no")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_routing_operations_tenant_id_idx" ON "spectra"."sandbox_mrp_routing_operations" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"transaction_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"work_order_id" uuid REFERENCES "spectra"."sandbox_mrp_work_orders"("id") ON DELETE SET NULL,
	"purchase_order_id" uuid REFERENCES "spectra"."sandbox_mrp_purchase_orders"("id") ON DELETE SET NULL,
	"reference" text,
	"effective_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_inv_txn_tenant_effective_idx" ON "spectra"."sandbox_mrp_inventory_transactions" ("tenant_id", "effective_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spectra"."sandbox_mrp_demand_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "spectra"."runtime_tenants"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "spectra"."sandbox_mrp_items"("id") ON DELETE CASCADE,
	"period_start" timestamp with time zone NOT NULL,
	"bucket_label" text,
	"forecast_qty" integer NOT NULL,
	"horizon_weeks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"status_id" uuid NOT NULL REFERENCES "spectra"."catalog"("id") ON DELETE restrict,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sandbox_mrp_forecast_tenant_item_period_active_uq"
	ON "spectra"."sandbox_mrp_demand_forecasts" ("tenant_id", "item_id", "period_start")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_mrp_demand_forecasts_tenant_id_idx" ON "spectra"."sandbox_mrp_demand_forecasts" ("tenant_id");
