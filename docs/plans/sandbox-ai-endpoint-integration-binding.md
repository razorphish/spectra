# Sandbox AI endpoints — integration binding

Bind custom (AI-generated) sandbox endpoints to **integrations**, so a consumer's
credentials, scopes, and the endpoint definitions they can call are governed
together — with per-endpoint **read / write** access.

Extends [`ai-sandbox-custom-apis.md`](./ai-sandbox-custom-apis.md) and realizes
backlog item #3 ("Per-integration allowed operations") in
[`sandbox-phase4-backlog.md`](./sandbox-phase4-backlog.md).

## Goal

Today, custom AI endpoints and integrations are independent features, both scoped
only to the **org**. Any approved M2M client of an org can invoke any of that org's
endpoints; there is no per-consumer restriction and no read/write distinction.

We want:

- A consumer creates an **integration** (credentials + details + scopes), and the
  endpoint definitions they are allowed to call are **bound to that integration**.
- The **same** endpoint definition can be **shared** across multiple integrations,
  each with its own access mode.
- Each binding carries a **mode: read or write**, independent per integration.

## Design lock

**Model: grant-based many-to-many (definitions vs grants).**

- **Endpoint definitions** stay authored at the org level (current
  `developer_ai_endpoints` under the org's runtime tenant). This is the library of
  what *can* exist — authored once (the AI prompt → spec).
- A **grant** binds one integration to one endpoint with an access mode. Grants are
  the access layer; definitions are the catalog.

Rejected alternative: strict 1:N ownership (one endpoint belongs to one
integration). Simpler, but cannot express the required *shared endpoint, different
modes* case, and would force duplicate definitions per consumer.

**Access mode granularity: per-grant.** Each `(integration, endpoint)` grant carries
its own `read | write`. The M2M client's `granted_scopes` remains the coarse ceiling;
the grant says *which* endpoints and at *what* mode.

**Scope: integration, not org/account.** The integration is already the credential +
scope + runtime-identity boundary (the M2M token carries `integration_id`), so it is
the only level at which per-consumer read-vs-write can be expressed. Org-wide is
strictly coarser and loses the differentiation.

## Schema

New table `spectra.integration_endpoint_grants` (conventions mirror
`m2m_oauth_clients`: UUID PK, catalog-backed `status_id`, soft-delete, audit JSONB):

| Column | Notes |
|--------|-------|
| `id` | uuid pk |
| `integration_id` | → `integrations.id` (on delete cascade) |
| `endpoint_id` | → `developer_ai_endpoints.id` (on delete cascade) |
| `access_mode` | `read` \| `write` — CHECK constraint or catalog `family='access_mode'` |
| `status_id` | → `catalog.id` (lifecycle) |
| `created_at` / `updated_at` / `deleted_at` | soft-delete |
| `created_by` / `updated_by` | audit jsonb |

Constraints/indexes:
- `UNIQUE(integration_id, endpoint_id) WHERE deleted_at IS NULL`
- index on `(integration_id)`, index on `(endpoint_id)`

Also **activate `ai_endpoint_production_requests.related_integration_id`** (currently
a schema placeholder, never written) so an endpoint's production request can carry
the integration it was submitted under — letting approval/pricing flow through the
integration.

Query helper: `hasEndpointGrant(db, integrationId, endpointId)` returning the active
grant row incl. mode — mirrors `hasApprovedProductionAccessForIntegration`.

### Migration workflow (required for every schema change)

Schema edits are **not complete** until the Drizzle migration is generated and all
generated artifacts are committed — the admin-ui migration runner applies these files,
so a hand-edited schema with no migration will not reach any database.

1. Edit the Drizzle schema (`packages/database/src/schema/*.ts`).
2. Run `npm run db:generate` (`drizzle-kit generate`, `out: packages/database/drizzle`).
   This produces, for the new step `NNNN`:
   - `packages/database/drizzle/NNNN_<tag>.sql` — the forward SQL.
   - `packages/database/drizzle/meta/NNNN_snapshot.json` — the new schema snapshot.
   - an appended entry in `packages/database/drizzle/meta/_journal.json` (idx, tag,
     `when`, version, breakpoints). Keep `when` monotonic with the existing entries.
3. Review the generated SQL (custom constraints/partial unique indexes, e.g. the
   `WHERE deleted_at IS NULL` unique, and the FK on `related_integration_id`, may need
   hand-tuning — match the style of `0009_sandbox_ai_custom_endpoints.sql`).
4. **Commit all three** (SQL + snapshot + journal entry) together. Drizzle's
   `readMigrationFiles` reads the journal + SQL; a missing journal entry or snapshot
   makes the migration invisible/inconsistent.
5. Apply: locally via `npm run db:migrate`; in deployed envs via the **admin-ui
   migrations runner** (Settings → Migrations), which tracks applied steps in
   `spectra.__drizzle_migrations` (see `packages/database/src/lib/admin-migrations.ts`).

This applies to **both** new tables in this plan: `integration_endpoint_grants` and the
activation of `ai_endpoint_production_requests.related_integration_id`.

## API (aviate-api)

**Invoke enforcement** — `apps/services/aviate-api/src/routes/tenant-runtime.ts`,
after the endpoint is resolved by `(tenant, slug)`:
- Require an active grant for `(m2m.id, endpoint.id)` → else `403 endpoint_not_granted`.
- Check `access_mode` against the spec's effect: a `read` grant may only invoke
  read-kind specs (`static_response`, `json_transform`, `sandbox_mrp_fixture_read`);
  write-kind specs require a `write` grant.

**Grant management** — under the integration namespace
(`sandbox-portal.ts` / new `sandbox-portal-integration-endpoints.ts`), org-scoped via
session auth:
- `GET    /integrations/:id/endpoints` — list grants + available org endpoints
- `POST   /integrations/:id/endpoints` — grant `{ endpointId, accessMode }`
- `PATCH  /integrations/:id/endpoints/:grantId` — change mode
- `DELETE /integrations/:id/endpoints/:grantId` — revoke

## UI (sandbox-ui)

- Add an **Endpoints** tab to `integration-view.page.ts`: list granted endpoints with
  a Read/Write toggle, an "Add endpoint" picker from the org definition library, and
  revoke.
- Reframe `/custom-endpoints` as the **definitions library** (author prompt/spec
  once); binding to integrations happens from the integration view.
- Both remain behind `sandbox.ai.endpoints_enabled`.

## Tests

- DB: grant uniqueness, soft-delete, cascade on integration/endpoint delete.
- API: invoke rejected without grant; `read` grant blocked on write spec; grant CRUD
  authz is org-scoped.

## Phasing

1. **Schema + generated migration + query helper** — edit schema, `npm run db:generate`,
   review/commit the SQL + snapshot + `_journal.json` entry (see *Migration workflow*),
   confirm it applies via the admin-ui runner. Review the data model here before building up.
2. **API**: invoke enforcement + grant management routes.
3. **UI**: integration Endpoints tab; reframe definitions library.
4. **Tests** across all layers.

## Open question

"Write" only becomes meaningful once write-capable endpoint specs exist — today all
three execution kinds are reads. The mode is wired end-to-end and gated now so it is
ready; until a write-kind spec lands, `write` grants behave like `read` in practice.
