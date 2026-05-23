# Postgres `spectra` schema (Drizzle)

Control-plane tables and the Drizzle journal (`__drizzle_migrations`) live in the **`spectra`** schema (see [`drizzle.config.ts`](../../drizzle.config.ts) `migrations.schema` and [`packages/database/src/schema/control-plane.ts`](../../packages/database/src/schema/control-plane.ts)).

## New databases

Run migrations as usual: `npm run db:migrate` (or `npm run dev:db` for local Docker). Migration `0000` creates `public.*` tables; migration `0001` creates `spectra.*`, copies any data from `public`, then drops the legacy `public` tables.

## Existing databases (already on `0000` in `public`)

Before the first `npm run db:migrate` after pulling this change:

1. Apply the one-time journal seed so Drizzle does **not** re-run `0000` against existing `public` tables:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db-seed-spectra-migrations-journal.sql
   ```

2. Run migrations:

   ```sh
   npm run db:migrate
   ```

The seed script inserts the recorded hash for `0000_init_control_plane.sql` into `spectra.__drizzle_migrations` when `public.users` still exists and that hash is not already present.

## CI / Neon

No extra steps if the database is empty: migrate runs `0000` then `0001` automatically.
