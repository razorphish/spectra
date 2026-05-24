-- @spectra-migration: idempotent
CREATE TABLE IF NOT EXISTS "spectra"."catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL,
	"updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_family_name_uq" ON "spectra"."catalog" USING btree ("family","name");
--> statement-breakpoint
INSERT INTO "spectra"."catalog" ("id","family","name","description","created_by","updated_by") VALUES
('a0000001-0000-4000-8000-000000000001','status','pending','Batch-oriented queue','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000001-0000-4000-8000-000000000002','status','active','Live; deleted_at NULL','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000001-0000-4000-8000-000000000003','status','deleted','Soft-delete','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000001-0000-4000-8000-000000000004','status','archived','Ready to archive','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000001-0000-4000-8000-000000000005','status','restored','Batch staging after delete','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000001','upload_status','idle','No upload started yet','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000002','upload_status','pending','Queued, waiting to start','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000003','upload_status','uploading','Actively in progress','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000004','upload_status','processing','Server is handling the file','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000005','upload_status','success','Completed successfully','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000006','upload_status','failed','Something went wrong','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000007','upload_status','cancelled','User aborted','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000008','upload_status','queued','Waiting in line behind other uploads','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000009','upload_status','validating','Checking file type, size, format','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000a','upload_status','compressing','Reducing file size before upload','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000b','upload_status','paused','Temporarily stopped (resumable)','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000c','upload_status','retrying','Auto-retrying after failure','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000d','upload_status','partial','Only part of the file uploaded','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000e','upload_status','timeout','Took too long','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-00000000000f','upload_status','aborted','Forcefully stopped','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000010-0000-4000-8000-000000000010','upload_status','complete','Alias for success (legacy/API)','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000020-0000-4000-8000-000000000001','upload_type','image',NULL,'{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000020-0000-4000-8000-000000000002','upload_type','video',NULL,'{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000020-0000-4000-8000-000000000003','upload_type','archive',NULL,'{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000020-0000-4000-8000-000000000004','upload_type','code',NULL,'{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000020-0000-4000-8000-000000000005','upload_type','document',NULL,'{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb),
('a0000030-0000-4000-8000-000000000001','general','reserved','Reserved for future FKs','{"name":"SYSTEM","userId":null}'::jsonb,'{"name":"SYSTEM","userId":null}'::jsonb)
ON CONFLICT ("family", "name") DO NOTHING;
--> statement-breakpoint
DROP INDEX IF EXISTS "spectra"."users_email_uq";
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."users" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."users" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."users" DROP CONSTRAINT IF EXISTS "users_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."users" ADD CONSTRAINT "users_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_uq" ON "spectra"."users" USING btree ("email") WHERE "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_id_idx" ON "spectra"."users" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."orgs" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."orgs" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" DROP CONSTRAINT IF EXISTS "orgs_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."orgs" ADD CONSTRAINT "orgs_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orgs_status_id_idx" ON "spectra"."orgs" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."applications" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."applications" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."applications" DROP CONSTRAINT IF EXISTS "applications_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."applications" ADD CONSTRAINT "applications_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_status_id_idx" ON "spectra"."applications" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."oauth_clients" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."oauth_clients" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" DROP CONSTRAINT IF EXISTS "oauth_clients_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."oauth_clients" ADD CONSTRAINT "oauth_clients_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_clients_status_id_idx" ON "spectra"."oauth_clients" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "id" uuid;
--> statement-breakpoint
UPDATE "spectra"."org_memberships" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."org_memberships" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" DROP CONSTRAINT IF EXISTS "org_memberships_user_id_org_id_pk";
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" DROP CONSTRAINT IF EXISTS "org_memberships_pkey";
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD CONSTRAINT "org_memberships_pkey" PRIMARY KEY("id");
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" DROP CONSTRAINT IF EXISTS "org_memberships_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."org_memberships" ADD CONSTRAINT "org_memberships_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_user_org_active_uq" ON "spectra"."org_memberships" USING btree ("user_id","org_id") WHERE "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_user_id_idx" ON "spectra"."org_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_org_id_idx" ON "spectra"."org_memberships" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_status_id_idx" ON "spectra"."org_memberships" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "id" uuid;
--> statement-breakpoint
UPDATE "spectra"."application_scopes" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."application_scopes" SET "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" DROP CONSTRAINT IF EXISTS "application_scopes_application_id_scope_id_pk";
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" DROP CONSTRAINT IF EXISTS "application_scopes_pkey";
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD CONSTRAINT "application_scopes_pkey" PRIMARY KEY("id");
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" DROP CONSTRAINT IF EXISTS "application_scopes_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ADD CONSTRAINT "application_scopes_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "application_scopes_app_scope_active_uq" ON "spectra"."application_scopes" USING btree ("application_id","scope_id") WHERE "status_id" = 'a0000001-0000-4000-8000-000000000002'::uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_scopes_application_id_idx" ON "spectra"."application_scopes" USING btree ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_scopes_status_id_idx" ON "spectra"."application_scopes" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
DO $mig$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'spectra' AND table_name = 'scope_requests' AND column_name = 'status'
	) THEN
		UPDATE "spectra"."scope_requests" SET "status_id" = CASE lower(trim("status"))
			WHEN 'pending' THEN 'a0000001-0000-4000-8000-000000000001'::uuid
			WHEN 'approved' THEN 'a0000001-0000-4000-8000-000000000002'::uuid
			WHEN 'active' THEN 'a0000001-0000-4000-8000-000000000002'::uuid
			WHEN 'rejected' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
			WHEN 'denied' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
			WHEN 'deleted' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
			WHEN 'archived' THEN 'a0000001-0000-4000-8000-000000000004'::uuid
			ELSE 'a0000001-0000-4000-8000-000000000001'::uuid
		END;
	END IF;
END
$mig$;
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" DROP CONSTRAINT IF EXISTS "scope_requests_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD CONSTRAINT "scope_requests_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."scope_requests" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."scope_requests" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scope_requests_status_id_idx" ON "spectra"."scope_requests" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "status_id" uuid;
--> statement-breakpoint
DO $mig$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'spectra' AND table_name = 'production_access_requests' AND column_name = 'status'
	) THEN
		UPDATE "spectra"."production_access_requests" SET "status_id" = CASE lower(trim("status"))
			WHEN 'pending' THEN 'a0000001-0000-4000-8000-000000000001'::uuid
			WHEN 'approved' THEN 'a0000001-0000-4000-8000-000000000002'::uuid
			WHEN 'active' THEN 'a0000001-0000-4000-8000-000000000002'::uuid
			WHEN 'rejected' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
			WHEN 'denied' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
			ELSE 'a0000001-0000-4000-8000-000000000001'::uuid
		END;
	END IF;
END
$mig$;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ALTER COLUMN "status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" DROP CONSTRAINT IF EXISTS "production_access_requests_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD CONSTRAINT "production_access_requests_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."production_access_requests" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."production_access_requests" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_access_requests_status_id_idx" ON "spectra"."production_access_requests" USING btree ("status_id");
--> statement-breakpoint
DO $mig$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'spectra' AND table_name = 'uploads' AND column_name = 'status'
	) THEN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'spectra' AND table_name = 'uploads' AND column_name = 'status_id_new'
		) THEN
			ALTER TABLE "spectra"."uploads" ADD COLUMN "status_id_new" uuid;
		END IF;
		UPDATE "spectra"."uploads" SET "status_id_new" = CASE lower(trim("status"))
			WHEN 'idle' THEN 'a0000010-0000-4000-8000-000000000001'::uuid
			WHEN 'pending' THEN 'a0000010-0000-4000-8000-000000000002'::uuid
			WHEN 'uploading' THEN 'a0000010-0000-4000-8000-000000000003'::uuid
			WHEN 'processing' THEN 'a0000010-0000-4000-8000-000000000004'::uuid
			WHEN 'success' THEN 'a0000010-0000-4000-8000-000000000005'::uuid
			WHEN 'failed' THEN 'a0000010-0000-4000-8000-000000000006'::uuid
			WHEN 'cancelled' THEN 'a0000010-0000-4000-8000-000000000007'::uuid
			WHEN 'canceled' THEN 'a0000010-0000-4000-8000-000000000007'::uuid
			WHEN 'queued' THEN 'a0000010-0000-4000-8000-000000000008'::uuid
			WHEN 'validating' THEN 'a0000010-0000-4000-8000-000000000009'::uuid
			WHEN 'compressing' THEN 'a0000010-0000-4000-8000-00000000000a'::uuid
			WHEN 'paused' THEN 'a0000010-0000-4000-8000-00000000000b'::uuid
			WHEN 'retrying' THEN 'a0000010-0000-4000-8000-00000000000c'::uuid
			WHEN 'partial' THEN 'a0000010-0000-4000-8000-00000000000d'::uuid
			WHEN 'timeout' THEN 'a0000010-0000-4000-8000-00000000000e'::uuid
			WHEN 'aborted' THEN 'a0000010-0000-4000-8000-00000000000f'::uuid
			WHEN 'complete' THEN 'a0000010-0000-4000-8000-000000000010'::uuid
			ELSE 'a0000010-0000-4000-8000-000000000002'::uuid
		END;
		ALTER TABLE "spectra"."uploads" ALTER COLUMN "status_id_new" SET NOT NULL;
		ALTER TABLE "spectra"."uploads" DROP COLUMN IF EXISTS "status";
		ALTER TABLE "spectra"."uploads" RENAME COLUMN "status_id_new" TO "status_id";
	ELSIF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'spectra' AND table_name = 'uploads' AND column_name = 'status_id_new'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'spectra' AND table_name = 'uploads' AND column_name = 'status_id'
	) THEN
		ALTER TABLE "spectra"."uploads" RENAME COLUMN "status_id_new" TO "status_id";
	END IF;
END
$mig$;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" DROP CONSTRAINT IF EXISTS "uploads_status_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD CONSTRAINT "uploads_status_id_catalog_id_fk" FOREIGN KEY ("status_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD COLUMN IF NOT EXISTS "type_id" uuid;
--> statement-breakpoint
UPDATE "spectra"."uploads" SET "type_id" = CASE
	WHEN "content_type" ILIKE 'image/%' THEN 'a0000020-0000-4000-8000-000000000001'::uuid
	WHEN "content_type" ILIKE 'video/%' THEN 'a0000020-0000-4000-8000-000000000002'::uuid
	WHEN "content_type" ILIKE 'application/zip' OR "content_type" ILIKE 'application/x-zip-compressed' THEN 'a0000020-0000-4000-8000-000000000003'::uuid
	WHEN "content_type" ILIKE 'text/%' OR "content_type" ILIKE 'application/javascript%' OR "content_type" ILIKE 'application/json%' THEN 'a0000020-0000-4000-8000-000000000004'::uuid
	ELSE 'a0000020-0000-4000-8000-000000000005'::uuid
END;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ALTER COLUMN "type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" DROP CONSTRAINT IF EXISTS "uploads_type_id_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD CONSTRAINT "uploads_type_id_catalog_id_fk" FOREIGN KEY ("type_id") REFERENCES "spectra"."catalog"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "spectra"."uploads" SET "updated_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD COLUMN IF NOT EXISTS "created_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "spectra"."uploads" ADD COLUMN IF NOT EXISTS "updated_by" jsonb DEFAULT '{"name":"SYSTEM","userId":null}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploads_status_id_idx" ON "spectra"."uploads" USING btree ("status_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploads_type_id_idx" ON "spectra"."uploads" USING btree ("type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploads_deleted_at_idx" ON "spectra"."uploads" USING btree ("deleted_at");
