---
description: New Drizzle/Postgres tables — design order mental model then fewer tables then DB guarantees; uploads.status_id exception (family=upload_status); type_id; drop uploads.status after backfill.
globs: packages/database/**/*.ts
alwaysApply: false
---

# Database tables — required audit columns

**Design order:** (1) simplest mental model — resolved `{ name, family }`, schema comments, TS clarity; (2) prefer one `spectra.catalog`; (3) DB-level family enforcement last.

When adding a **new table** to the Spectra control-plane schema (Drizzle under `packages/database`, e.g. `packages/database/src/schema/`), include **all** of the following **audit / lifecycle** columns unless the table is **explicitly exempt** in review (e.g. append-only log tables with a frozen shape):

| Column | Requirement |
|--------|-------------|
| `created_at` | `timestamptz NOT NULL`, default now |
| `updated_at` | `timestamptz NOT NULL`, default now; bump on every update (`$onUpdate` and/or DB trigger) |
| `deleted_at` | `timestamptz NULL` — set when the row’s lifecycle is “deleted”; clear when leaving that state per product rules |
| `status_id` | `uuid NOT NULL` FK → **`spectra.catalog(id)`** — **default:** referenced row **`family = 'status'`** (entity lifecycle). **Uploads only:** **`uploads.status_id`** must reference **`family = 'upload_status'`** (pipeline); see control-plane plan. |
| `created_by` | `jsonb NOT NULL` — actor snapshot at insert (`name`, `userId` per Spectra `ActorRef`) |
| `updated_by` | `jsonb NOT NULL` — actor snapshot on last mutation |

**`uploads.type_id` is not an audit column.** Do **not** add upload-specific classification FKs to every table by default.

**Reference table:** **`spectra.catalog`** with **`id`**, **`name`**, **`family`** (discriminators include **`status`**, **`upload_status`**, **`upload_type`**, **`general`**, …), **`description`**, plus catalog audit columns. **`UNIQUE (family, name)`**. Seed **`family = 'upload_status'`** for pipeline states consumed by **`uploads.status_id`** (populate **`description`** from the meaning table in the control-plane plan). Seed **`family = 'upload_type'`** for **`uploads.type_id`**. Seed **`family = 'status'`** for default lifecycle **`status_id`**. Seed **≥ one** **`family = 'general'`** row for forward use. Do **not** add a column named **`type`** on the catalog (use **`family`**).

**`uploads`:** pipeline FK is the column **`status_id`** → **`family = 'upload_status'`** (not a separate `upload_status_id`). Add **`type_id`** → **`family = 'upload_type'`**. Migrate legacy text **`uploads.status`** into **`uploads.status_id`**, then **drop** **`uploads.status`**. Resolve unmappable legacy strings per the control-plane plan (e.g. seed `unknown`, map to `idle`, or fail migration).

**Do not** add `status_id` onto the catalog table (no self-FK).

**Migrations:** backfill default **`status_id`** to **`family = 'status'`, `name = 'active'`** where applicable; **`uploads`** backfills **`status_id`** from **`upload_status`** seeds. Set **`deleted_at` null**, SYSTEM JSON on **`created_by`/`updated_by`** before `NOT NULL` on existing data.

If a table cannot carry this audit set, document **why** in the PR and in a one-line comment on the table definition.

---

# Upload pipeline and classification (`uploads`)

- **`uploads.status_id`** → **`spectra.catalog(id)`** with **`family = 'upload_status'`**. Seed rows and meanings: **core** (`idle`, `pending`, `uploading`, `processing`, `success`, `failed`, `cancelled`) and **granular** (`queued`, `validating`, `compressing`, `paused`, `retrying`, `partial`, `timeout`, `aborted`, `complete`). Treat **`complete`** as a **semantic alias of `success`** (distinct row for legacy strings; terminal-success queries include both ids). Prefer **`success`** for new writes unless the product standardizes on `complete`.
- **`type_id`** → **`family = 'upload_type'`** (e.g. image, video, …).

Same physical **`spectra.catalog`** table; **`family`** distinguishes lifecycle vs upload pipeline vs media type. **API:** always return resolved **`family`** with **`name`** so clients can tell **`uploads.status_id`** from **`users.status_id`**.

Other tables: only add parallel FKs when the product needs a distinct facet; align the entity column name and seeded **`family`** per domain.

<!-- INSTALL: copy or move this file to spectra/.cursor/rules/database-audit-columns.mdc (same contents; extension .mdc for Cursor rules). -->
