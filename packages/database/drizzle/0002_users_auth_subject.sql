-- @spectra-migration: idempotent
ALTER TABLE "spectra"."users" ADD COLUMN IF NOT EXISTS "auth_subject" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_subject_uq" ON "spectra"."users" USING btree ("auth_subject");
