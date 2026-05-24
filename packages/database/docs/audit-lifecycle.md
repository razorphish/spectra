# Control-plane audit and lifecycle (Spectra)

## Entity lifecycle (`family = status`)

- **`status_id`** on most tables references `spectra.catalog` rows where **`family = 'status'`**.
- Seeds: `pending`, `active`, `deleted`, `archived`, `restored`.
- **`deleted_at`**: set when **`status_id`** points at the catalog row with **`name = 'deleted'`**; cleared when leaving that state (e.g. user restore to **`active`**).
- User restore: **`status_id` → `active`**, **`deleted_at` → NULL**.
- Batch undo delete: **`restored` → `active`** in one transaction with **`deleted_at` → NULL** when leaving **`deleted`**.

## Uploads exception

- **`uploads.status_id`** references **`family = 'upload_status'`** (pipeline), not **`status`**. Always expose resolved **`{ name, family }`** next to UUIDs in APIs.

## JSON actors

- **`created_by` / `updated_by`**: `jsonb NOT NULL`, shape `{ "name": string, "userId": string | null }`. Use **`SYSTEM`** sentinel `{ "name": "SYSTEM", "userId": null }` for migrations and system writes.
