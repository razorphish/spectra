-- Run once on databases that already applied 0000_init_control_plane while the
-- Drizzle journal lived in schema `drizzle`, before switching drizzle.config.ts
-- to migrations.schema = 'spectra'.
--
-- Creates spectra.__drizzle_migrations (if needed) and inserts the 0000 row so
-- `npm run db:migrate` will skip 0000 and only apply newer migrations.
--
-- Usage (example):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db-seed-spectra-migrations-journal.sql

CREATE SCHEMA IF NOT EXISTS "spectra";

CREATE TABLE IF NOT EXISTS "spectra"."__drizzle_migrations" (
  "id" SERIAL PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" bigint
);

-- SHA256 of packages/database/drizzle/0000_init_control_plane.sql (matches Drizzle migrator).
-- "when" from meta/_journal.json for 0000_init_control_plane
INSERT INTO "spectra"."__drizzle_migrations" ("hash", "created_at")
SELECT
  'e77c7d4dd009bc872712e883c138329417a6aa0f8dcee8fcb0e919a928e27d18'::text,
  1778102552123::bigint
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
  AND NOT EXISTS (SELECT 1 FROM "spectra"."__drizzle_migrations" WHERE "hash" = 'e77c7d4dd009bc872712e883c138329417a6aa0f8dcee8fcb0e919a928e27d18');
