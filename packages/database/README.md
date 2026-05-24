# database

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Drizzle migrations

From the repo root, with `DATABASE_DIRECT_URL` (or `DATABASE_URL`) pointing at the database:

```bash
npx drizzle-kit migrate
```

Configuration lives in [`drizzle.config.ts`](../../drizzle.config.ts). Migrations are emitted under [`drizzle/`](./drizzle/) and tracked in [`drizzle/meta/_journal.json`](./drizzle/meta/_journal.json).

**Idempotency:** Prefer `IF NOT EXISTS` / guarded DML where re-runs are plausible (branches, journal repair). Cursor applies [`.cursor/rules/sql-migrations-idempotent.mdc`](../../.cursor/rules/sql-migrations-idempotent.mdc) to new `.sql` files. The admin **View migration SQL** modal shows a heuristic **Idempotent** flag (overridable with `-- @spectra-migration: idempotent` / `non-idempotent` in the file header); see `src/lib/migration-sql-metadata.ts`. Changing bytes in a migration that is **already recorded** in `spectra.__drizzle_migrations` changes its hash and will show as a mismatch until you repair the row (same hash as on disk) or follow the delete-record + re-apply flow in this README—avoid editing applied migrations in shared environments unless coordinated.

### Admin UI migration runner (`admin-ui-api`)

Staff **Settings → Runner** persists `spectra.platform_settings.admin_migrations_use_shared_http_client` (boolean). When **off** (default in `NODE_ENV=production` if no row exists), `POST /v1/admin/migrations/run` uses a short-lived **`node-pg`** client, preferring **`DATABASE_DIRECT_URL`** then the active Spectra URL. When **on** (default in non-production), migrate uses the same Drizzle client as the API (Neon **HTTP** when configured), which does not wrap an entire migration file in one transaction.

**Hash-order repair (gap + later migration already recorded):** `runDrizzleMigrations` first applies any journal `.sql` whose SHA-256 is **missing** from `spectra.__drizzle_migrations` (in journal order), then calls Drizzle’s `migrate()`. Drizzle’s own migrator only compares the **latest** row’s `created_at` to each file’s journal `when`, so it would **never** run an earlier missing migration after a later one was inserted — that left repairs like “delete orphan `0002` hash, `0003` still applied” stuck until this pass.

### Migration journal schema (`spectra` vs `drizzle`)

`drizzle.config.ts` sets `migrations.schema` to **`spectra`**, so applied migrations are recorded in **`spectra.__drizzle_migrations`**.

Older setups (or Drizzle defaults) sometimes recorded history only in **`drizzle.__drizzle_migrations`**. If `spectra.__drizzle_migrations` is empty while the database already has tables from `0000` / `0001`, `drizzle-kit migrate` tries to run those SQL files again. PostgreSQL then rejects duplicate objects; the CLI may exit with code **1** and little useful output after the spinner.

**Check both tables:**

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY id;
SELECT * FROM spectra.__drizzle_migrations ORDER BY id;
```

**Recover when the schema is already correct** (tables match the latest migration, only the journal is wrong): insert the missing rows into `spectra.__drizzle_migrations` with the same `hash` and `created_at` as in `packages/database/drizzle/meta/_journal.json` (each migration’s `hash` is the SHA-256 of the corresponding `.sql` file). For example:

```bash
sha256sum packages/database/drizzle/0000_init_control_plane.sql \
  packages/database/drizzle/0001_spectra_schema_and_data.sql
```

Then insert those hashes with the `when` values from `_journal.json` as `created_at`.

If you still have rows only in `drizzle` and the database state matches those applied files, you can copy them into `spectra` (same `hash` / `created_at`) before running migrate again—**only** if you are sure no extra migrations were applied solely against the old journal.

**See the real SQL error** (when the CLI is unhelpful):

```bash
PGPASSWORD=… psql … -v ON_ERROR_STOP=1 -f packages/database/drizzle/0001_spectra_schema_and_data.sql
```

Use the next pending file from the journal after whatever is already recorded in `spectra.__drizzle_migrations`.

### `0003_control_plane_catalog_audit`

Adds **`spectra.catalog`** (with seeds for **`status`**, **`upload_status`**, **`upload_type`**, **`general`**), audit columns and **`status_id`** on control-plane tables, **partial unique** on **`users(email)`** for active lifecycle rows only, surrogate **`id`** + audit columns on **`org_memberships`** and **`application_scopes`**, replaces **`scope_requests.status`** / **`production_access_requests.status`** with **`status_id`**, and replaces **`uploads.status`** text with **`uploads.status_id`** (pipeline → **`upload_status`**) plus **`type_id`**. Stable catalog UUIDs match [`src/schema/catalog-seed-ids.ts`](./src/schema/catalog-seed-ids.ts).
