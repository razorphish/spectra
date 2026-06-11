# Sandbox AI & tenant-runtime endpoints

Normative reference for **client-visible errors** (**GAP-11**), **Drizzle migration order** (**GAP-12**), and related sandbox AI / tenant-runtime topics. **Full engineering plan (archived):** [`docs/plans/ai-sandbox-custom-apis.md`](plans/ai-sandbox-custom-apis.md). Adopted policy is **§11.1 GAP-1–12**; **implementation literals** (paths, **`custom_endpoints:invoke`**, JWT **`tenant_id`**, **`execution_kind`** values) are **locked** in that plan (**§4**, **§11.1**, **§11.3** summary) — **mirror them here** when public routes ship. Extend this document as those features ship.

---

## Client error catalog (**GAP-11**)

**`client_error_catalog_version`:** `1`

When adding a new **`error`** code, update this document in the **same PR** as the implementation (or earlier), bump **`client_error_catalog_version`**, and **do not** rename or overload existing codes without an ADR (deprecate with a transition period if needed).

### Wire format

Error responses use a JSON body with at least:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `error` | string | **yes** | Machine-readable **snake_case** code from the table below. **SDKs and automation must branch on this field**, not on `message`. |
| `message` | string | no | Human-readable text; may change without a catalog version bump. |
| `details` | object | no | Optional structured context; keys are **not** guaranteed stable across versions unless documented per code. |

HTTP status codes are **normative per row** for new implementations; align authorizers and handlers with this table.

### Codes (version 1)

| `error` | HTTP | When / typical gate |
| --- | ---: | --- |
| `par_required` | 403 | Production invoke attempted while **PAR** (production access) is **missing** or not satisfied (**GAP-3**). |
| `production_access_revoked` | 403 | **PAR** was valid for the org/integration but is **revoked, suspended, or lapsed** — production custom endpoints **fail closed** (**GAP-3**). |
| `par_inactive` | 403 | **Legacy alias** for `production_access_revoked` — servers **MAY** emit either string during transition; **clients SHOULD treat them as equivalent**. |
| `endpoint_not_approved` | 403 | Endpoint exists but is **not staff-approved** for production (no valid approved path for prod). |
| `endpoint_rejected` | 403 | Staff **rejected** this endpoint (or current revision) for production. |
| `endpoint_needs_user_response` | 409 | Staff **needs information** from the developer before approval can proceed (**§6.5**). |
| `no_production_revision_pinned` | 409 | **`approved_production_version_id`** is **null** or invalid — **GAP-2** pin not set for production traffic. |
| `missing_invoke_scope` | 403 | M2M token lacks the **dedicated invoke OAuth scope** (**GAP-4**, e.g. `custom_endpoints:invoke`). |
| `invalid_tenant_claim` | 401 | Missing or malformed **`tenant_id`** (or chosen claim name) on the access token (**GAP-4**). |
| `tenant_not_mapped` | 403 | `(org_id, tenant_id)` not found in **`runtime_tenants`** (**GAP-4**, **GAP-7**). |
| `endpoint_not_found` | 404 | Unknown **`endpoint_id`** / route slug for the tenant. |
| `tenant_quota_exceeded` | 429 | Resolved **`effective_policy`** / metering quota exceeded (**§10**, **GAP-5**). |
| `rate_limited` | 429 | Rate limit (RPS or burst) from **`effective_policy`** or edge throttle. |
| `policy_violation` | 403 | Request violates **resolved policy** (e.g. bulk cap, disallowed operation) distinct from simple rate limit. |
| `sandbox_ai_feature_disabled` | 403 | Feature gated off (e.g. `sandbox.ai.endpoints_enabled` or equivalent **platform_settings**). |

---

## Migration order (**GAP-12**)

Drizzle / SQL migrations for sandbox AI must respect foreign-key dependencies:

1. **`pricing_profiles`** (and prerequisites that do **not** reference **`runtime_tenants`**) **first**.
2. **`runtime_tenants`** **after** `pricing_profiles` when **`default_pricing_profile_id` → `pricing_profiles.id`**.
3. Tables that FK to **`runtime_tenants`** (e.g. **`developer_ai_endpoints`**, **`ai_endpoint_production_requests`**, **`usage_events`**) **then** remaining objects.

Authoritative checklist for DB engineers: [`packages/database/README.md`](../packages/database/README.md) (*Sandbox AI / tenant-runtime migration order*). The first migration creating **`runtime_tenants`** should include a **SQL header comment** citing **GAP-12**.

---

## Planned sections (stubs)

The following will be filled in as implementation lands; until then, see **[`docs/plans/ai-sandbox-custom-apis.md`](plans/ai-sandbox-custom-apis.md)** (full engineering plan snapshot: **GAP-1–12**, §1–§11).

- **`org_id` vs `tenant_id`** and **`runtime_tenants`** map (**GAP-7**, **GAP-8**)
- **Public vs private OpenAPI** merge rules (**GAP-9**)
- **Staff RBAC** permission strings (**GAP-10**, [`apps/admin-ui/docs/auth0.md`](../apps/admin-ui/docs/auth0.md))
- **M2M invoke** URL prefix, OAuth scope, JWT claim name (**GAP-4**)

---

## Developer portal (sandbox-ui)

- **Routes:** `/custom-endpoints` (list), `/custom-endpoints/new` (create draft), `/custom-endpoints/:id` (UUID of `developer_ai_endpoints.id` — focus view with versions, production approval, Try it).
- **Discovery:** Dashboard links to Custom API endpoints only when `GET /v1/platform/sandbox/session` returns `sandboxAiEndpointsEnabled: true` (mirrors admin **Settings → General → Platform → Endpoints enabled** / `sandbox.ai.endpoints_enabled`).
- **Org-private OpenAPI:** From the **list** route only, developers can download merged OpenAPI 3.0.3 JSON via **Download merged OpenAPI (JSON)** (`GET /v1/platform/sandbox/ai-endpoints/openapi`). This is session-authenticated and **not** the public integrator catalog (**GAP-9**).
- **MRP demo invoke:** Versions created by stub generate use `execution_kind: sandbox_mrp_fixture_read` with `table: sandbox_mrp_items`. After `POST /v1/platform/sandbox/runtime-tenants`, tenant-scoped rows are seeded across nine `sandbox_mrp_*` tables; **Try it** with that spec returns fixture rows for the org’s runtime tenant only. See ADR [`docs/adr/2026-06-sandbox-mrp-fixture-read.md`](adr/2026-06-sandbox-mrp-fixture-read.md).
