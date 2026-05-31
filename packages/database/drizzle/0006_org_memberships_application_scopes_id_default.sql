-- @spectra-migration: idempotent
-- 0003 added surrogate `id` columns without DB defaults; inserts that omit `id` then fail with NOT NULL.
ALTER TABLE "spectra"."org_memberships" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "spectra"."application_scopes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
