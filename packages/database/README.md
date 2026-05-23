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

### Admin UI migration runner (`admin-ui-api`)

Staff **Settings → Runner** persists `spectra.platform_settings.admin_migrations_use_shared_http_client` (boolean). When **off** (default in `NODE_ENV=production` if no row exists), `POST /v1/admin/migrations/run` uses a short-lived **`node-pg`** client, preferring **`DATABASE_DIRECT_URL`** then the active Spectra URL. When **on** (default in non-production), migrate uses the same Drizzle client as the API (Neon **HTTP** when configured), which does not wrap an entire migration file in one transaction.

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
