# Plan: M2M client credentials for customer systems → Spectra edge APIs

## Implementation status

**As of 2026-05-31** (living document — update this section when major milestones land):

| Area | Status |
|------|--------|
| **Phase 0 (design lock)** | **Done** — ADR accepted: [`docs/adr/m2m-client-credentials-phase0.md`](../adr/m2m-client-credentials-phase0.md). |
| **Phase 1 — schema + portal** | **Implemented in main** — `integrations` / `m2m_oauth_clients` / issuance log in control-plane schema; sandbox portal + sandbox-ui flows for create / list / rotate / revoke (see [Implementation pointers](#implementation-pointers-existing-code)). |
| **Phase 2–3 — token mint** | **Implemented in main** — [`apps/services/auth-api`](../../apps/services/auth-api): `client_credentials`, ES256 JWT, JWKS, issuance logging; gated at runtime by **`M2M_MINT_ENABLED`**. |
| **Phase 4 — edge (Node)** | **Implemented in main** — dual-issuer auth in **`@spectra/auth`** ([`require-spectra-access-token.ts`](../../packages/auth/src/lib/require-spectra-access-token.ts)); aviate-api M2M verify + status cache behind **`M2M_VERIFY_ENABLED_AVIATE_API`**; tier **(c)** sandbox router does not accept M2M; scope enforcement from emitted **`scope-map.json`**. |
| **OpenAPI tiers + polyglot verify** | **Partial** — public vs authenticated OpenAPI and CI↔map checks evolve incrementally (ADR notes); full Go / Python / .NET verifiers + contract matrix deferred per ADR. |
| **Phase 5 — integrator docs** | **Partial** — e.g. curl + env notes in [`apps/sandbox-ui/docs/auth0.md`](../../apps/sandbox-ui/docs/auth0.md); expand as GA approaches. |
| **Phase 6 — hardening + GA** | **Ongoing** — use [`m2m-ga-checklist.md`](./m2m-ga-checklist.md); production mint/verify remain **off** until that ordering and ops sign-off. |

**Normative spec:** The rest of this document remains the **contract** (wire format, errors, revocation Option C, flags). **“Implemented”** here means **code on main**, not necessarily **production GA** (flags and checklist).

## Goal

Allow **customer-owned backends and automation** (not interactive users) to call Spectra public APIs behind **local-edge** / production edge, using **credentials issued from Spectra** (sandbox portal or successor). Humans still sign into Spectra with **Auth0**; M2M credentials are **only** for server-to-server consumption.

## Context

- **Today:** Protected routes validate **Auth0-issued JWTs** only (`createRequireAuth0AccessToken` in `@spectra/auth`, `AUTH0_DOMAIN` + **`AUTH0_AUDIENCE`**). Sandbox UI attaches those tokens for browser calls. **M2M:** edge will gain a **second** expected **`aud`** (distinct API resource, [Decisions](#decisions-phase-0-lock) row 8) — do not overload **`AUTH0_AUDIENCE`** for M2M tokens.
- **Today:** Sandbox portal creates **applications** with Spectra-generated `clientId` / `clientSecret` (secret hashed at rest), but rows are modeled as **`authorization_code`** confidential clients with **required redirect URIs**. There is **no** token endpoint that exchanges those credentials for a bearer token the edge accepts.
- **Target:** A first-party **OAuth2 client credentials** path: `client_id` + `client_secret` → **`POST` token on `auth.aviate.com`** → **short-lived ES256 JWT** → `Authorization: Bearer` on edge APIs; JWKS at `https://auth.aviate.com/.well-known/jwks.json`; claims bind **org** / **Integration** id / **scopes** (see [Decisions](#decisions-phase-0-lock)).

## Non-goals (initial scope)

- Per-customer **Auth0** M2M applications as the primary credential store.
- Using M2M secrets inside the browser SPA (secrets stay on customer servers only).
- Replacing Auth0 for **human** login to sandbox/admin UI.

## Current vs target (summary)


| Area                   | Current                                       | Target                                                                                                                                   |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Edge bearer validation | Auth0 JWT only                                | **Single middleware**, **issuer-based routing**: Auth0 vs Spectra M2M JWT (no try-until-works); see [Decisions](#decisions-phase-0-lock) |
| Customer server auth   | Would need separate Auth0 M2M outside portal  | Spectra token endpoint on **dedicated auth host** ([Decisions](#decisions-phase-0-lock)) + portal-issued client                          |
| Portal credentials     | Auth-code–shaped OAuth client + redirect URIs | New **Integration** entity (separate from **Application**) + M2M client credentials                                                      |
| Token issuance         | N/A                                           | `POST https://auth.aviate.com/.../oauth/token` (exact path TBD) `grant_type=client_credentials`                                          |


## Architecture principles

1. **Provision** M2M clients only after an authenticated **human** session (existing Auth0-backed sandbox portal pattern).
2. **Secrets:** show once on create/rotate; store **only hashes**; rate-limit token endpoint; never log secrets.
3. **Tokens:** short TTL (e.g. 5–15 minutes); sign with **asymmetric** keys; document `iss`, `aud`, and required claims.
4. **Authorization:** claims must bind requests to **org** / **application** (and optional **scopes** / environments).
5. **Token revocation:** **Underspecified revocation is a security gap.** The **exact revocation model** (portal meaning, in-flight tokens, maximum exposure) is decided only in **Phase 0 ADR** — see [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr). [Phase 1](#phase-1--data-model-and-portal) schema and [Phase 2–4](#phase-2--token-endpoint-auth-service) auth/edge behavior **must** implement that model, not invent it late.

**MVP — coarse by API / segment:** OAuth2-style space-delimited scopes grouped **by API surface** (e.g. polyglot **segment** or service prefix: `platform:read`, `platform:write`, `seq:read`, …). Each scope implies a **prefix or tag class** of routes (read vs write within that area). Enforcement: middleware checks JWT `scope` against the **server-owned map** defined in [Scope management (M2M)](#scope-management-m2m) (scope string → allowed path prefixes / HTTP methods); **403** when the token lacks a required scope.

**Future — granular:** narrow scopes to resources or actions (e.g. `seq:applications:read`) **without changing the JWT wire format** (still OAuth2 `scope` as a space-delimited string on the token); extend the **policy resolver** (static map → DB-backed rules) and admin UI — see [Scope management (M2M)](#scope-management-m2m).

### Scope management (M2M)

**MVP — scope map source of truth (repo, no DB dependency on hot path):**

- **(a) File path:** Canonical implementation: [`packages/auth/scope-map.ts`](packages/auth/scope-map.ts) (or an adjacent module under [`packages/auth`](packages/auth) if split for size) — **versioned in git**, exported types + map consumed by **`@spectra/auth`**.
- **(a′) Polyglot parity (plan default — ADR item [7](#adr-close-out-sequence-non-negotiable)):** **Codegen** — a **build step** emits **`scope-map.json`** (or equivalent language-neutral artifact) **from** `scope-map.ts`, checked into the repo or produced in CI; **polyglot verifiers** load it at startup (bundled or from artifact store). **CI** runs a **contract test** that a given **scope + path + method** yields the **same allow/deny** in **Node, Go, Python, and .NET**. **Mirror** (each runtime maintains a hand port validated against the same shared JSON artifact the contract test reads) is **acceptable** if codegen is too costly for a Phase 4 MVP slice — the ADR must **state the choice and tradeoff** explicitly; **contract test remains mandatory** either way.
- **(b) Deploy coupling:** Changing what a scope means **requires a normal code deploy** (map ships in the service binary / bundle). **No** runtime DB fetch for the MVP map; operational simplicity trades away hot policy edits.
- **(c) CI validation:** Pipeline runs a **check** that **validates `scope-map` against OpenAPI** (inputs: merged or per-segment specs as agreed in ADR — e.g. authenticated full spec + public limited where M2M applies) so **documented HTTP operations** cannot drift from **enforced scope coverage** without failing CI (catch missing routes, orphan scopes, or illegal path patterns).

**Post-GA:** **Granular** scopes and **DB-backed policy** can replace or augment the static resolver **without changing the wire format** — tokens still carry OAuth2 `scope`; only **where** the map is loaded from and **how fine-grained** the scope strings are evolves.

**Best practice (where admin fits):**

- **Source of truth for “what a scope means” (MVP):** the **repo file** above + CI/OpenAPI alignment; **not** only copy in the admin UI. **Post-GA:** migration-versioned **DB tables** for policy remain compatible with the same JWT `scope` claim shape.
- **Admin UI** ([admin-ui](apps/admin-ui)): staff (or product policy) manage **scope catalog** definitions (display name, description, implied route prefixes), **templates** (“Billing integration” = preset bundle of scopes), and optionally **defaults** for new org tiers. **Sandbox portal** assigns **subset of allowed scopes** to an M2M client at provision/rotate time from templates + checklist (least privilege).
- **Audit:** who changed global scope maps or templates; client’s granted scope set stored on the client record and echoed in issued JWTs.

## Sandbox portal vs admin UI

Day-to-day **developer** lifecycle (create / list own clients / rotate / revoke for **their** org or application) stays in the **sandbox portal** ([sandbox-ui](apps/sandbox-ui) + Auth0-backed routes such as [sandbox-portal.ts](apps/services/aviate-api/src/routes/sandbox-portal.ts)).

**Admin UI** (staff, [admin-ui](apps/admin-ui) / [admin-ui-api](apps/services/admin-ui-api)) is optional in early phases but should be planned for **platform and support** responsibilities:

- **Cross-tenant read:** search or list M2M clients (or integrations) by org, status, metadata; open a tenant context for support (subject to RBAC and audit).
- **Forced lifecycle:** revoke or suspend a specific client, an entire org’s M2M clients, or a **global** feature flag / kill-switch for token issuance.
- **Policy and quotas:** max M2M clients per org, plan-gated enablement, default TTL or allowed scopes templates; **scope catalog / templates** (see [Scope management](#scope-management-m2m)).
- **Operations:** token-endpoint rate-limit tuning, abuse dashboards, maintenance mode; if signing keys are centrally operated, **who** may trigger rotation and audit trail.
- **Compliance:** export or review audit of create / rotate / revoke and high-volume failed `client_credentials` attempts (restricted roles).

**Hybrid model:** same underlying tables and APIs; **admin** routes require explicit staff permissions (e.g. `platform:integrations:manage` — exact names TBD in Phase 0). Avoid duplicating business rules between portals: shared service layer in **aviate-api** (or chosen host) with different authz guards.

**Phasing:** MVP can ship sandbox-only provisioning. **GA:** admin surfaces limited to **read-only audit** for M2M/Integration ([Decisions](#decisions-phase-0-lock) item 5). **Post-GA:** revoke-any and broader operator tooling.

## Integration catalog vs sandbox portal

Sandbox **self-service** APIs (session bootstrap, applications, rotate secret, etc.) are **not** part of the **public limited** API contract and must not be callable with **M2M** tokens. They live under `/v1/platform/sandbox/...` on the platform router ([platform.ts](apps/services/aviate-api/src/routes/platform.ts)); they remain in the **full** merged spec (`spectra-integration-api.json` / **`GET /integration/openapi.json`**) but are **excluded** from the public limited artifact (`spectra-public-api.json` / **`GET /openapi.json`**) via **`x-spectra-audience`** and prefix rules — **tighten** runtime authz per [OpenAPI URLs, spec variants, and deprecation](#openapi-urls-spec-variants-and-deprecation) and [Public limited spec: drift risk, MVP bridge, and recommended fix](#public-limited-spec-drift-risk-mvp-bridge-and-recommended-fix).

- **Contract (OpenAPI):** Align with **three-tier** path model in [Decisions](#decisions-phase-0-lock) row 6. The **public limited** spec at `GET /openapi.json` (and public `/docs`) includes **tier (a) Public** integrator routes only — **excludes** BFF-only (`/v1/**/sandbox/**`, etc.), **tier (c)**, staff-only platform routes (**`/health`**, **`/stats`**, **`/uploads`** on `platform` per [Platform policies](#platform-policies-agreed)), and other non-catalog paths. **Tier (b) Authenticated** routes appear in the **full** spec at **`GET /integration/openapi.json`** (auth per [Decisions](#decisions-phase-0-lock) row 7).
- **Authorization:** On `/v1/platform/sandbox/**` (and any sibling “portal only” prefixes agreed in Phase 0), require **Auth0 user** access tokens only; **reject** Spectra-issued M2M bearer tokens with **403** (distinct `error` from `invalid_token`). Do not attach “M2M allowed” middleware to these routers.
- **M2M surface:** Allowlist routes or segments where M2M JWTs are accepted (integration/data APIs only); default **deny** elsewhere on shared hosts such as [aviate-api](apps/services/aviate-api).
- **Alignment:** Generate or filter the integration OpenAPI from the same route/class rules as runtime authz so the published catalog cannot advertise paths M2M cannot use.
- **Polyglot:** Same exclusion and authz rules across Node, Go, Python, .NET services if any sandbox-adjacent paths exist there; integration docs per segment should match.

### OpenAPI URLs, spec variants, and deprecation

**Naming note:** The URL path `/integration/openapi.json` below means **“authenticated OpenAPI document for integrators/staff”** (full or richer spec), not the same thing as the **integration catalog** (limited public contract). If this confuses readers, rename the path in implementation (e.g. `/catalog/authenticated/openapi.json`) while keeping the same behavior.

**Principle:** Never remove or restrict an existing OpenAPI URL without a **deprecation period** and successor discovery.

**Artifact split (build pipeline):** Emit at least **limited public** and **full authenticated** JSON from [packages/openapi](packages/openapi) using the same filters as route/authz policy; avoid two hand-maintained specs.

**URLs (agreed direction):**


| URL                                      | Spec                                                                                         | Access                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET /openapi.json`                      | Public **limited** (excludes sandbox self-service, staff-only routes, etc.)                  | Unauthenticated                                                                                                     |
| `GET /integration/openapi.json`          | **Full** contract (tiers **b** + **c** and staff routes as appropriate for staff visibility) | **Authenticated** via **admin-ui-api proxy + static integration key** ([Decisions](#decisions-phase-0-lock) item 7) |
| `GET /openapi/v2/openapi.json` (example) | **Versioned** public or authenticated variant when breaking doc changes ship                 | Per version policy                                                                                                  |


**Swagger UI:** Pair each JSON URL with a `/docs` path (e.g. `/docs` for public limited, `/integration/docs` for authenticated full) implemented in [main.ts](apps/services/aviate-api/src/main.ts); mirror on [local-edge](apps/local-edge) when merged docs are served.

**Deprecation lifecycle (when changing which URL serves which spec):** (These are **OpenAPI rollout steps**, not the same numbering as [Phased delivery](#phased-delivery) below.)

1. **Step 1 — Additive:** Keep existing `GET /openapi.json` behavior and URL; add `GET /integration/openapi.json` (and UI) without breaking callers.
2. **Step 2 — Signal:** On responses for the soon-to-be-changed resource, set e.g. `Deprecation: true`, `Sunset: <HTTP-date>`, and `Link: <https://api.example.com/integration/openapi.json>; rel="successor-version"` (RFC 8594-style sunset; tune header names to standards in use).
3. **Step 3 — Redirect:** After sunset announcement, respond with **301** to the successor URL plus a clear deprecation body or warning for **90 days** (configurable).
4. **Step 4 — Restrict:** Then restrict or retire the old URL (auth required, 404, or removal) per policy.

**Optional pattern (header gate, no 401 for public):** For automation that can pass a shared secret header (e.g. `X-Integration-Key`), return the **full** OpenAPI JSON; without the header, return the **reduced** public spec (same URL). Use only when it fits threat model — prefer separate authenticated path for staff clarity.

### Public limited spec: drift risk, MVP bridge, and recommended fix

**Drift risk:** If the merge pipeline filters the **public limited** artifact using only a **prefix denylist** (e.g. strip `/v1/platform/sandbox`, `/v1/platform/uploads`, `/v1/platform/health`, `/v1/platform/stats`), then any **new** private or portal-only path can leak into `GET /openapi.json` if the list is not updated — a documentation / integrator-expectation mismatch even when runtime authz is correct.

**MVP bridge (ship first):** Keep a **single centralized denylist** in the merge script (e.g. [`scripts/merge-public-openapi.mjs`](../../scripts/merge-public-openapi.mjs)) and add **merge-time or CI assertions** that the emitted public JSON contains **no** paths under those prefixes. That unblocks a clean **public vs full** split immediately without annotating every path in YAML.

**Recommended end state (best fix):** Treat visibility as **data in the spec**, not URL trivia:

1. Add an OpenAPI **vendor extension** on each path or operation, e.g. **`x-spectra-audience`**: `public` | `integration` | `internal` (exact enum and semantics documented here and in merge tooling). Map them to this plan’s tiers: **`public`** ≈ tier **(a)** public limited catalog; **`integration`** ≈ tier **(b)** (and optionally staff-visible integrator routes in the **full** artifact); **`internal`** / non-`public` entries must never appear in the public limited artifact.
2. **Merge filter:** Build the public limited JSON by **excluding** paths whose effective audience is not `public` (policy for missing extension: **fail-closed in CI** after a cutover date). Build the full authenticated artifact from `public` + `integration` (or all paths) per product choice.
3. **CI:** Assert no non-public paths leak into the public artifact; after cutover, **fail the build** if a path lacks `x-spectra-audience` so every new route requires an explicit product classification.
4. **Deprecate** the prefix denylist once YAML coverage is complete.

**Alignment:** Reuse the same `public` / `integration` / `internal` vocabulary in merge scripts, CI messages, and runtime authz discussions so published OpenAPI cannot drift from “what M2M may call” without a deliberate spec change.

## Decisions (Phase 0 lock)

Recommendations adopted for implementation and ADR; revise only via explicit change control.

| # | Topic | Decision |
|---|--------|----------|
| 1 | **Signing algorithm** | **ES256** (ECDSA P-256). **JWKS** URL: `https://auth.aviate.com/.well-known/jwks.json` (or path aligned with deployment). M2M JWT **`iss`** MUST equal the canonical issuer in [Solidified ADR contract — `iss`](#iss-m2m-canonical-issuer) (exact string, trailing slash). |
| 2 | **Dual auth** | **Single middleware** stack: route by **`iss`** (Auth0 vs `auth.aviate.com`), then on the M2M branch verify **`aud`** matches the **Spectra M2M API resource** (row **8** below); on the Auth0 branch verify **`aud`** matches **only** `AUTH0_AUDIENCE`. **No** “try decode until one works” in production. **`iss` + `aud` + signature** together provide **defense in depth**. |
| 3 | **Product split** | New **Integration** entity **separate from Application**; M2M credentials bind to **Integration**; browser **authorization_code** flows stay on **Application**. **MVP:** **greenfield** Integrations — **no migration** of existing `applications` / `oauthClients`; portal **Integrations** UI **alongside** Applications; M2M client rows use **`integration_id` FK** only. **Post-GA:** optional **`application_id`** FK on Integration for grouping. |
| 4 | **Host surface** | **Dedicated auth service** at **`auth.aviate.com`**: token endpoint, JWKS, signing authority. Edge APIs validate M2M JWTs using JWKS from this host; they do not mint tokens. |
| 5 | **Admin scope (GA vs post-GA)** | **GA:** **read-only audit** — no cross-tenant **revoke-any**. Staff permission strings: **`platform:integrations:read`**, **`platform:integrations:export`** ([RBAC names](#rbac-names-ga-audit)). **Post-GA:** `platform:integrations:revoke`, `platform:integrations:suspend-org`. |
| 6 | **Path / OpenAPI tiers** | **Three-tier model** derived by **rules** from build artifacts and CI ([three-tier classification](#three-tier-path-classification-rule-based), row **9**). **(a) Public** limited `GET /openapi.json`; **(b) Authenticated** full spec; **(c) BFF-only** — not M2M-callable. **Tier (c)** by **router group isolation** (see tier **(c)** bullet under [three-tier classification](#three-tier-path-classification-rule-based)). |
| 7 | **Authenticated OpenAPI** | **`GET /integration/openapi.json`** (and paired UI): **admin-ui-api proxy** + **static integration key**; staff path; do not expose key to sandbox-ui. |
| 8 | **M2M `aud` (API resource)** | **`aud`** is a **single string** (never an array): **`https://api.aviate.com/`**. Env **`SPECTRA_M2M_AUDIENCE`** on auth service + every verifier before Phase 2 mint in that environment. **String equality** branch check. Distinct from Auth0 **`AUTH0_AUDIENCE`**. See [Solidified ADR contract](#solidified-adr-contract). |
| 9 | **Scope map (MVP)** | Versioned map at [`packages/auth/scope-map.ts`](packages/auth/scope-map.ts); deploy-only changes; **CI vs OpenAPI**. **Post-GA:** optional DB-backed policy; same JWT `scope` wire format. |

**Local / non-prod:** JWKS path pattern parity on configurable host. **`iss` escape hatch:** only **`AUTH_ISSUER_OVERRIDE`** ([Local dev issuer override](#local-dev-issuer-override-auth_issuer_override)) — never ad-hoc localhost in shared constants or disabled issuer checks.

## Solidified ADR contract

The Phase 0 ADR **must restate** this section (or merge by reference) so implementers have a single normative source. Items here are **plan-level decisions**; the ADR adds deployment specifics (exact Nx project path, numeric SLOs, cache env names).

### `iss` (M2M canonical issuer)

- **Canonical `iss` string:** **`https://auth.aviate.com/`** (HTTPS, host `auth.aviate.com`, **trailing slash**).
- **Equality:** All middleware and libraries MUST compare `iss` with **exact string equality** to this value (and to the configured expected issuer per env). **No** alternate forms (e.g. omitting the slash) in production tokens.
- **Shared constant:** Export one constant from **`packages/auth`** (exact export name in ADR, e.g. `SPECTRA_M2M_ISSUER`) used by auth service mint, edge validators, and **CI fixtures**.
- **JWKS document:** If the JWKS JSON includes an **`issuer`** field, it MUST match this same string.
- **CI:** A test asserts `iss` on a minted or fixture token equals the shared constant (guards drift across `jsonwebtoken`, `golang-jwt`, PyJWT, .NET after upgrades).

### Local dev issuer override (`AUTH_ISSUER_OVERRIDE`)

- **Purpose:** The only supported way to use a **non-production** `iss` host in local/staging (e.g. `http://127.0.0.1:9100/`) while keeping **string-equality** validation and avoiding hardcoded localhost in shared constants or **disabled issuer checks**.
- **Behavior:** When **`AUTH_ISSUER_OVERRIDE`** is set, middleware compares JWT `iss` to this value (still enforcing trailing-slash discipline as documented for that value); the **local auth service** mints tokens with the **same** `iss`. JWKS `issuer` field (if present) must match.
- **Production guard:** If **`NODE_ENV=production`** (or platform-equivalent “prod” signal) **and** `AUTH_ISSUER_OVERRIDE` is set, the process **must exit at startup** (fail closed). CI should assert this.
- **Other misconfig:** Missing **`SPECTRA_M2M_AUDIENCE`**, missing Auth0 **`AUTH0_AUDIENCE`** where required, or other required auth env for a running service → **startup fatal** (process does not listen), **not** a runtime JSON error — see [HTTP error contract](#http-error-contract-edge-apis).

### `aud` (M2M — wire encoding)

Already locked in [Decisions](#decisions-phase-0-lock) row **8**: **always a single string** `https://api.aviate.com/`; env **`SPECTRA_M2M_AUDIENCE`**; never a JWT `aud` array.

### JWT time claims vs principal timestamps

- **On the JWT wire:** Standard JWT **`iat`** and **`exp`** as **numeric Unix epoch seconds** only (spec-compliant).
- **On `req.auth.principal`:** **`issued_at`** and **`expires_at`** are **ISO-8601 strings** (UTC) — **only** the middleware mapping layer converts `iat`/`exp` → ISO-8601 when building the [M2M principal JSON shape](#m2m-principal-json-shape-service-facing).

### JWT claim for `display_name` (wire token)

- **Problem:** Principal **`display_name`** must not require a **per-request DB read** at the edge (conflicts with “no hot-path DB” for M2M verify beyond status cache).
- **Plan default (locked):** Auth service **mints** custom claim **`client_name`** (string) from the Integration record; ADR **may not** substitute another key without a plan amendment (polyglot contract tests depend on a single wire name).
- **Edge:** Middleware maps JWT **`client_name`** → principal **`display_name`**. **Informational / logging only** — not used for authz; slightly stale values between portal renames are acceptable until token `exp`.

### M2M JWT wire claims → principal mapping (normative)

Auth service **mints** all custom claims below at **issuance** — edge **does not** DB-fetch Integration/org/display for principal population (consistent with [status cache](#status-cache-cold-start-and-db-failure-mvp-defaults) hot-path goals). ADR **copies this table** into the wire-claim appendix.

| JWT claim | Type | Principal field | Notes |
|-----------|------|-----------------|-------|
| `iss` | string | `issuer` | Standard; exact string match ([`iss` (M2M)](#iss-m2m-canonical-issuer)). |
| `aud` | string | — | Validated against `SPECTRA_M2M_AUDIENCE`; **not** copied to principal. |
| `iat` | number (epoch sec) | `issued_at` | Middleware converts to **ISO-8601** UTC ([JWT time claims](#jwt-time-claims-vs-principal-timestamps)). |
| `exp` | number (epoch sec) | `expires_at` | Same conversion as `iat`. |
| `nbf` | — | — | **Not minted** — omit **`nbf`** from M2M access tokens. If a validator inspects **`nbf`** defensively, apply the same **30s** clock skew leeway as for **`iat`** / **`exp`** ([Platform policies](#platform-policies-agreed)). |
| `jti` | string | `token_id` | Always present; UUID or ULID. |
| `scope` | string (space-delimited) | `scopes` | Split to JSON **array** in middleware. |
| `client_id` | string | `client_id` | **Custom claim** named `client_id` (not an RFC 7519 registered claim). Mint this string on every M2M access token. |
| `integration_id` | string | `id` | **Custom**; ULID of **Integration** entity. |
| `org_id` | string | `org_id` | **Custom**; ULID of owning org. |
| `client_name` | string | `display_name` | **Custom**; informational only ([JWT claim for `display_name`](#jwt-claim-for-display_name-wire-token)). |

**`client_id` vs `sub`:** Some stacks or libraries treat **`sub`** as the natural subject for `client_credentials`. **Plan default:** mint **`client_id`** as above. If a given JWT library **reserves** `client_id` or conflicts with introspection middleware, ADR documents the exception: mint **`sub`** equal to the OAuth2 `client_id` string **and** map **`sub` → principal `client_id`** in middleware — **one** wire subject claim per token, **no** ambiguous dual subjects. Polyglot validators **must** agree on which claim populates **`principal.client_id`**. **Post-GA:** if **OAuth2 token introspection** ([RFC 7662](https://www.rfc-editor.org/rfc/rfc7662)) is added, **revisit** whether a JWT **`client_id`** claim collides with shared introspection-response parsing in any library — MVP does not ship introspection.

**`type: "m2m"`:** Set **only in middleware** from the **`iss`** routing branch that accepted the token — **not** a JWT claim.

### Token revocation (MVP plan default)


| Option | Behavior | MVP |
|--------|----------|-----|
| **A — TTL-only** | No edge checks beyond JWT validation; revoke stops **new** mints; in-flight tokens live until `exp`. | Not chosen |
| **B — `jti` denylist** | Edge checks denylist every request; strongest immediate revoke; operational complexity. | **Deferred** — issuance log + `jti` stubbed for later |
| **C — Status check** | Edge uses **short-lived cache** of Integration / client **status** (`active` vs `revoked` / suspended). No hot-path denylist for MVP. | **Chosen for MVP** |


**Plan decisions for MVP (Option C):**

- **Mint (auth service):** Refuse `client_credentials` for revoked or suspended Integration / client (hard stop).
- **Edge:** After JWT crypto + `iss` + `aud` + scope, enforce **cached status**; **customer-facing maximum exposure** documented as **≤ 15 minutes** conservative ceiling under [Status cache and exposure](#status-cache-and-exposure-mvp-defaults) (ADR may tune down; not up without threat-model review).
- **`jti`:** **Always** on every access token (UUID or ULID). **Phase 1** persists [Token issuance log](#token-issuance-log--minimum-schema-phase-1) row per mint. Edge **does not** query denylist for MVP.
- **Later:** Option B (denylist, e.g. Redis) **without** changing JWT wire format.

### Status cache and exposure (MVP defaults)

**Lock these three together** in the ADR (adjust only with explicit threat-model review):

| Value | Plan default | Rationale |
|-------|----------------|-----------|
| **Access token TTL** | **10 minutes** | Middle of the 5–15 min range stated elsewhere in this plan. |
| **Status cache TTL** | **2 minutes** | With 10 min access token, worst-case post-revoke exposure ≤ **12 min** from cache staleness + token tail; **15 min** stated to customers covers clock skew + small buffers. |
| **Stated max exposure (customer docs)** | **15 minutes** | Conservative ceiling; integrators size incident response accordingly. |

**Implementation (MVP):** **In-process** status cache per pod (e.g. LRU keyed by `client_id` or Integration id with TTL). **Not** globally instantaneous: after revoke/suspend, each pod may serve **up to status-cache TTL** before blocking — **independent per pod** (worst case is TTL from last refresh on **each** running instance, not a single global clock). **Redis (or shared cache)** is **not** required for MVP; add when scale or cross-pod consistency demands it.

**Option B trigger:** If product requires **sub–status-cache-TTL** or **immediate** invalidation after rotate/revoke (contractual SLA), that is **post-MVP / Option B** (denylist), not a silent scope creep on Option C.

### Status cache cold start and DB failure (MVP defaults)

**Cache-aside on miss (pod cold start / empty LRU):** On first request for a `client_id` (or Integration key) with **no cache entry**, treat as **cache miss** → **synchronous DB lookup** to resolve current status, **populate** the LRU entry, then enforce. **Do not** default to “assume `active` on miss” — that is unsafe.

**Refresh failure when a stale entry exists:** If a **background or inline refresh** cannot reach the DB but the pod **already has** a cached status, **fail-open**: continue serving the **last known** entry until TTL expires. Rationale: a pod that has verified a client should not flip **every** M2M request to **503** on a short DB blip; staleness is bounded by [status cache TTL](#status-cache-and-exposure-mvp-defaults) (**2 min**).

**Cold miss with no prior cache state:** If the pod has **never** successfully loaded status for this client (no entry and DB read fails), **fail-closed** — return **`503`** with body `error`: **`auth_unavailable`** — **same client-facing code** as JWKS fail-closed after stale-ok exhaustion ([HTTP error contract](#http-error-contract-edge-apis)). Integrator remediation is **retry with backoff** in both cases. **Do not** mint a second public error string (e.g. `integration_status_unavailable`): that fragments SDKs and dashboards without changing client behavior. **Distinguish causes in structured logs only** (e.g. `error_sub_cause`: `status_db_unavailable` vs `jwks_fetch_failed`). **Not** `401` — this pod must not invent `active`.

ADR **names** this three-way behavior so Node and polyglot implementations do not diverge.

### Rotate secret vs outstanding access tokens (MVP)

- **Rotate secret:** Issues a **new** secret; **old secret cannot mint** new tokens immediately. **Outstanding access tokens** issued under the old secret **remain valid until `exp`** (same as normal short TTL).
- **Customer communication:** Document that after a suspected leak, callers may see **up to access token TTL** of continued access on already-issued JWTs; they should shorten TTL at the token request if the product allows, and rely on revoke/suspend for faster cut-off via status cache.
- **Immediate invalidation of all outstanding tokens** after rotate **without** waiting for `exp` ⇒ **Option B** territory; track explicitly on **post-GA** backlog if required.

### Token issuance log — minimum schema (Phase 1)

One row per successful mint (**required**). Minimum columns (ADR maps to real table names / types):

| Column | Type | Notes |
|--------|------|--------|
| `id` | ULID/UUID | Primary key. |
| `jti` | text | **Unique**, **indexed** — matches JWT `jti` claim (Option B denylist lookups). |
| `client_id` | text | FK to M2M client row. |
| `org_id` | text | Tenant-scoped audit and queries. |
| `issued_at` | `timestamptz` | |
| `expires_at` | `timestamptz` | Align with JWT `exp`. |
| `revoked_at` | `timestamptz` nullable | **Nullable for MVP**; populated when/if Option B or admin revoke-by-`jti` semantics need it — avoids migration when denylist ships. |

**Indexes:** **unique on `jti`**; composite **`(client_id, issued_at)`** for audit listings.

### Token endpoint: `scope` request parameter

- **Semantics:** Requested **`scope`** (space-delimited) is the **intersection** of (a) scopes in the request and (b) scopes **registered** for that Integration / client (**ceiling** from portal).
- **Validation:** Any scope not in the registered set or not in [`packages/auth/scope-map.ts`](packages/auth/scope-map.ts) ⇒ **`400`** with `{"error":"invalid_scope","error_description":"…"}`. **Do not** silently ignore unknown scopes.

### Token endpoint: mixed credentials (RFC 6749 §5.2)

If the client sends **both** HTTP **Basic** client credentials **and** `client_id` / `client_secret` in the **form body** for the same token request, respond **`400`** with OAuth2 error JSON:

```json
{"error":"invalid_request","error_description":"Client credentials must be provided via Basic auth or request body, not both"}
```

ADR appendix for token-endpoint errors **includes** this row next to `invalid_scope` so implementers do not invent divergent shapes.

### Token endpoint: successful access token response (RFC 6749 §5.1)

Every successful **`grant_type=client_credentials`** response **must** return a JSON body of this shape (ADR appendix copies verbatim for RFC 6749 compliance):

```json
{
  "access_token": "<JWT>",
  "token_type": "Bearer",
  "expires_in": 600,
  "scope": "<actual granted scope string>"
}
```

- **`expires_in`:** Lifetime of the access token in **seconds** — **default `600`** (matches [access token TTL](#status-cache-and-exposure-mvp-defaults), **10 minutes**).
- **`scope`:** The **intersection actually granted** (same string as inside the JWT `scope` claim after mint); lets clients confirm grants **without** decoding the JWT.

### Token endpoint: OAuth error contract (RFC 6749 §5.2)

ADR token-endpoint appendix documents the **full** error set below (additive to [mixed credentials](#token-endpoint-mixed-credentials-rfc-6749-52) and [scope validation](#token-endpoint-scope-request-parameter)). **`client_locked`** is a **Spectra extension** — it is **not** in RFC 6749; the ADR must **label it as such** so implementers do not search the OAuth2 spec for it.

| Condition | HTTP | `error` |
|-----------|------|---------|
| Wrong `client_secret` / unrecognized `client_id` | 401 | `invalid_client` |
| Revoked / suspended client (**mint** refused at token endpoint) | 401 | `invalid_client` |
| Missing or unsupported `grant_type` | 400 | `unsupported_grant_type` |
| Unknown or unregistered scope string | 400 | `invalid_scope` |
| Both Basic and form-body credentials present | 400 | `invalid_request` |
| Rate limited / locked out | 429 | `client_locked` (Spectra extension) |

**Mint vs edge (intentional split):** RFC 6749 uses **`invalid_client`** when **client authentication** fails at the **token endpoint** (including mint refused for revoked/suspended). The **edge** API uses **`client_revoked`** after successful JWT validation and [status check](#http-error-contract-edge-apis) — different layer; both strings remain in their respective tables.

### Three-tier path classification (rule-based)

ADR defines **rules** from build artifacts (merged OpenAPI / route registry), **not** a static path list.

- **Tier (a) — Public:** Operations in the **public limited** catalog **excluding** `/v1/**/sandbox/**` and excluding `/v1/platform/stats`, `/v1/platform/uploads`, `/v1/platform/health` (staff-only; [Platform policies](#platform-policies-agreed)).
- **Tier (c) — BFF-only (recommended detection):** **Router group isolation** — mount BFF / sandbox portal APIs on a **separate router** (or sub-app) that attaches **only** `requireAuth0AccessToken` (or equivalent) **without** M2M middleware. If a route lives on that router, it is tier **(c)** by construction ([sandbox-portal.ts](apps/services/aviate-api/src/routes/sandbox-portal.ts) and siblings are the natural boundary). **Phase 6:** contract test asserts **no** route on the BFF router accepts a valid **M2M** bearer.
- **Tier (b) — Authenticated:** All other integrator-facing operations in the authenticated full spec that are not tier **(c)**. (Annotations or allowlist tables are **not** recommended for MVP — higher drift risk.)

**CI ([Decisions](#decisions-phase-0-lock) row 9):** Fail public tier violations; fail if an M2M token can call a tier **(c)** route.

### JWKS fail-closed and HTTP status

When JWKS fetch fails and **stale-ok is exhausted** ([Auth service availability, JWKS caching, and key rotation](#auth-service-availability-jwks-caching-and-key-rotation)), M2M verification returns **`503`** (retryable), **not** `401` / `403`. Body `error`: **`auth_unavailable`** — same string as [status cache cold miss + DB unreachable](#status-cache-cold-start-and-db-failure-mvp-defaults); use **`error_sub_cause`** (or equivalent structured field) in logs to separate **`jwks_fetch_failed`** from **`status_db_unavailable`**.

### HTTP error contract (edge APIs)

Stable **`error`** string on JSON bodies for **runtime** auth failures. **Misconfiguration** (missing `SPECTRA_M2M_AUDIENCE`, missing `AUTH0_AUDIENCE` where required, invalid flag combinations) is **not** part of this table: services **must fail at startup** (process exit) so operators never depend on a special runtime code such as `auth_not_configured` across polyglot stacks.

**RFC 6750:** Every **401** and **403** in this table **must** include a **`WWW-Authenticate: Bearer …`** header per [Edge APIs: WWW-Authenticate header (RFC 6750 §3)](#edge-apis-www-authenticate-header-rfc-6750-3). **`503`** and **`429`** rows do **not** require `WWW-Authenticate`.

| Condition | HTTP | `error` |
|-----------|------|---------|
| No `Authorization` header | 401 | `missing_token` |
| JWT bad signature / malformed / expired / wrong `iss` or `aud` | 401 | `invalid_token` |
| Valid M2M JWT on tier **(c)** route | 403 | `token_type_not_allowed` |
| JWT valid but scope insufficient | 403 | `insufficient_scope` |
| Client revoked / Integration suspended (status check) | 401 | `client_revoked` |
| JWKS unavailable (fail-closed after stale-ok exhausted) | 503 | `auth_unavailable` |
| Integration status unavailable (status cache **cold miss** + DB unreachable — [fail-closed](#status-cache-cold-start-and-db-failure-mvp-defaults)) | 503 | `auth_unavailable` |
| Rate limit / lockout | 429 | `client_locked` |

**Note:** Both **`503` + `auth_unavailable`** rows share the **same** integrator-facing contract; **sub-cause** is **logs / metrics only** ([JWKS fail-closed](#jwks-fail-closed-and-http-status), [status cache cold start](#status-cache-cold-start-and-db-failure-mvp-defaults)).

### Edge APIs: WWW-Authenticate header (RFC 6750 §3)

For **every** **401** and **403** in the [HTTP error contract](#http-error-contract-edge-apis) table (`missing_token`, `invalid_token`, `token_type_not_allowed`, `insufficient_scope`, `client_revoked`), edge APIs **must** return **`WWW-Authenticate`** alongside the JSON error body, using the **`Bearer`** scheme. The header's **`error=`** parameter **must** match the JSON body's **`error`** string; **`error_description=`** carries a short human-readable phrase (ADR supplies examples per condition).

**401 (template):**

```http
WWW-Authenticate: Bearer realm="https://api.aviate.com/", error="<error_string>", error_description="<human string>"
```

**403 `insufficient_scope`** — also include the **`scope=`** parameter with the **required** scope string the route expects:

```http
WWW-Authenticate: Bearer realm="https://api.aviate.com/", error="insufficient_scope", scope="<required scope string>", error_description="<human string>"
```

**Other 403** (`token_type_not_allowed`): use the **same Bearer template as 401** (`error` + `error_description`); **no** `scope=` parameter unless the product later defines one for that route class.

**Exempt:** **`503` `auth_unavailable`** and **`429` `client_locked`** — **no** `WWW-Authenticate` requirement (not Bearer auth challenges in the RFC 6750 sense for these flows).


### RBAC names (GA audit)

These are **admin-ui-api** route permission strings (staff Auth0 session), **not** values inside M2M JWT `scope`.


| Permission                          | GA      | Purpose                                                                          |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------- |
| `platform:integrations:read`        | Yes     | View M2M / Integration metadata, audit, failed auth counts (cross-tenant staff). |
| `platform:integrations:export`      | Yes     | Export audit records (stricter/compliance).                                      |
| `platform:integrations:revoke`      | Post-GA | Force-revoke any org’s M2M clients.                                              |
| `platform:integrations:suspend-org` | Post-GA | Org-level kill-switch for token issuance.                                        |


### Rollout feature flags

Three-level matrix; values **read at process startup** and **logged explicitly** (no silent permissive default in production):


| Flag                               | Purpose                                                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`M2M_MINT_ENABLED`**             | Gate **token issuance** on auth service; **`false`** in production until [Phase 1 exit criteria](#phase-1--data-model-and-portal) and [GA ordering](#ga-ordering-non-negotiable) are satisfied. |
| **`M2M_VERIFY_ENABLED_<SEGMENT>`** | Per-segment edge verification (e.g. `M2M_VERIFY_ENABLED_AVIATE_API`); roll M2M acceptance service-by-service.                                                                                   |
| **`M2M_ORG_ALLOWLIST`**            | Optional comma-separated org ids for **limited availability** before broad GA.                                                                                                                  |


### Observability minimums

**Required before GA customer traffic** — metric names below are normative ([ADR close-out sequence](#adr-close-out-sequence-non-negotiable) item parallel).

**Token endpoint (auth service):**

- `m2m_token_issued_total` (labels: `org_id`, `scope_count`)
- `m2m_token_request_duration_seconds`
- `m2m_token_error_total` (labels: `error_code`)
- `m2m_client_lockout_total` (labels: `reason`: `rate_limit` | `failed_attempts`)

**Edge M2M verifiers:**

- `m2m_verify_total` (labels: `result`: `success` | `invalid` | `client_revoked` | `auth_unavailable`, `segment`) — **`client_revoked`** matches the [HTTP error contract](#http-error-contract-edge-apis) `error` string (no shortened `revoked` label).
- `jwks_fetch_duration_seconds`
- `jwks_stale_serving_total`

**Logging:** Never log secrets or full JWTs. **`client_id`**, **`org_id`**, **`jti`**, and structured **`error_sub_cause`** (e.g. `jwks_fetch_failed` vs `status_db_unavailable` for **`auth_unavailable`**) are safe correlation / ops fields.

### ADR close-out sequence (non-negotiable)

Before substantive Phase 1–4 code review on shared contracts:

1. `aud` / `iss` exact strings + env vars (`SPECTRA_M2M_AUDIENCE`, issuer constant) — unblocks auth config + validators.
2. **`iat` / `exp` wire vs principal ISO-8601** — unblocks principal mapping in all runtimes.
3. **Revocation model** (this plan: **Option C** + issuance log + always `jti`) — unblocks Phase 1 schema + Phase 2 mint + Phase 4 edge cache.
4. **Token `scope` parameter** (intersection + `invalid_scope`) — unblocks portal validation + token endpoint.
5. **Three-tier rule-based matrix + CI** — unblocks middleware + OpenAPI pipeline.
6. **HTTP error contract** (this table) — unblocks SDKs and integrator docs.
7. **Scope map polyglot parity** — **codegen** default (`scope-map.json` from [`packages/auth/scope-map.ts`](packages/auth/scope-map.ts)), CI + cross-runtime contract test; **mirror** only with explicit ADR tradeoff ([Scope management (M2M)](#scope-management-m2m)) — unblocks Phase 4 Go / Python / .NET without silent drift from Node.
8. **Status cache cold-start / DB failure** — ADR copies the three-way behavior from [Status cache cold start and DB failure](#status-cache-cold-start-and-db-failure-mvp-defaults) (cache-aside on miss; fail-open on refresh with stale entry; fail-closed on cold miss when DB unreachable; **`503` + `auth_unavailable`** only).
9. **M2M JWT → principal wire contract** — ADR includes the [normative mapping table](#m2m-jwt-wire-claims--principal-mapping-normative) (custom claims `integration_id`, `org_id`, `client_id`, `client_name` + `client_id` vs `sub` rule) — unblocks Phase 3 mint + Phase 4 / Phase 6 principal contract tests without per-runtime claim invention.

**Parallel / slightly later in ADR doc:** RBAC permission strings (already listed), rollout flag matrix, observability metric names, Integrations UI copy, [mixed credentials](#token-endpoint-mixed-credentials-rfc-6749-52) error row, [RFC 6749 §5.1 success body](#token-endpoint-successful-access-token-response-rfc-6749-51) + [§5.2 token-endpoint error table](#token-endpoint-oauth-error-contract-rfc-6749-52), [RFC 6750 `WWW-Authenticate`](#edge-apis-www-authenticate-header-rfc-6750-3) on edge 401/403, [abuse lockout defaults](#client-credentials-abuse-lockout-defaults), [client secret hashing](#m2m-client-secret-at-rest-hashing), [incident / leak runbook](#incident-and-leak-runbook-minimum). (Normative JWT → principal table is **close-out [9](#adr-close-out-sequence-non-negotiable)**, not deferred here.)

## Platform policies (agreed)

Decisions to carry into ADR, admin-ui, and implementation.

- **Token endpoint client authentication:** Support **both** RFC 6749 approaches: `client_id` / `client_secret` in **form body** and **HTTP Basic** (`Authorization: Basic base64(client_id:client_secret)`). **Default documented and exemplified: Basic Auth.** If both are sent together, use [mixed credentials](#token-endpoint-mixed-credentials-rfc-6749-52) error shape.
- **Abuse after rate limit:** Beyond baseline rate limiting — exponential lockout windows, per-identity and per-IP tracking, cooldown, metrics + logs, and ops dashboards (Phase 6). **Numeric defaults** are locked below ([Client credentials abuse lockout](#client-credentials-abuse-lockout-defaults)); ADR treats them as **tunable** via Admin UI in Phase 6 but **names the starting values** so Phase 2 and Phase 6 tests assert one contract.

### Client credentials abuse lockout (defaults)

| Parameter | Suggested default |
|-----------|-------------------|
| Failed attempts before lockout | **5** within a sliding **60-second** window |
| Lockout duration (first offense) | **15 minutes** |
| Lockout duration (repeat offense) | Exponential: **15 min × 2^(n−1)**, cap at **24 hours** |
| Tracking granularity | Per **`client_id` hash** **and** per **source IP** — lockout triggers if **either** threshold is hit |
| Alert threshold | **10** lockout events per **org** in **5 minutes** → ops alert |

### M2M client secret at rest (hashing)

**Requirement:** `client_secret` **hashed at rest** everywhere this plan mentions it ([Phase 1](#phase-1--data-model-and-portal), token endpoint verify). ADR **names the algorithm** so Phase 1 schema and Phase 2 compare path are not security guesses.

**Plan default:** **Argon2id** with starting parameters **memory = 64 MiB**, **iterations = 3**, **parallelism = 4** (tune in ADR after measurement). **Fallback** where Argon2 is impractical in a given runtime: **bcrypt** with **cost ≥ 12**.

**Token endpoint:** Secret compare runs on the **hot path** — validate end-to-end latency under expected load in **Phase 2** load tests; adjust Argon2 parameters (or bcrypt cost) so p95 token latency stays compatible with rate limits and abuse lockout UX, **without** weakening to trivially fast hashes.

- **JWT clock skew:** Default **30 seconds** leeway for `iat` / `exp` (and `nbf` if used) validation, **identical** across Node, Go, Python, .NET. Make leeway **configurable** via **Admin UI → General settings → new “Auth” tab** (persisted platform setting, e.g. `platform_settings` / control-plane row); document env default for CI and local dev.
- **HA signing:** **Asymmetric EC (ES256)** per [Decisions](#decisions-phase-0-lock); private key in KMS or approved secret store on **auth.aviate.com**; **JWKS** at `https://auth.aviate.com/.well-known/jwks.json`; all API runtimes fetch JWKS from this URL (configurable per env). **Availability, JWKS caching, and key rotation** follow the subsection below and infra runbooks.

### Auth service availability, JWKS caching, and key rotation

**Availability contract (`auth.aviate.com`):** Document a target **SLO** (e.g. monthly uptime) in ADR and ops runbooks. **Token endpoint** unavailable ⇒ **no new** M2M access tokens until recovery; **existing** JWTs behave per [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr) and **`exp`**. **JWKS** unavailable ⇒ edge cannot **mint** (N/A) but **must** still define M2M **verify** behavior (see caching policy); Auth0-backed user requests remain independent if configured on separate issuer paths.

**JWKS caching policy (edge and every M2M JWT verifier — Node, Go, Python, .NET):**


| Parameter                             | Default                   | Purpose                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fresh revalidation interval**       | **5 minutes**             | Periodic background or on-demand refresh so validators do not hit `auth.aviate.com` on every request; tune per load.                                                                                                                                                            |
| **Stale-ok TTL**                      | **1 hour**                | If JWKS HTTP fetch fails, continue using the **last good** JWKS document for up to this duration to absorb transient outages.                                                                                                                                                   |
| **Behavior after stale-ok exhausted** | **Fail-closed** (default) | **503** + body `error`: **`auth_unavailable`** (per [Solidified ADR contract](#jwks-fail-closed-and-http-status)) — **not** `401`/`403`, so integrators use **retry/backoff** instead of token refresh storms. **Security:** no unbounded trust of stale JWKS after compromise. |
| **Fail-open (non-default)**           | Explicit opt-in only      | Continue verifying with **stale** JWKS beyond policy — **higher availability**, **unacceptable** if attacker still holds tokens signed with a leaked old key after rotation; requires documented risk acceptance.                                                               |


Implement identical numeric defaults in shared config or ADR so polyglot stacks do not drift.

**Key rotation runbook (sequence):**

1. **Pre-publish:** Deploy JWKS that includes the **new** EC key (`kid` **B**) **alongside** the **current** key (`kid` **A**). No change to signing key used for mint yet.
2. **Wait N before switching signer:** Default **N = 15** minutes (configurable). **Purpose:** Allow validators to **actively fetch** JWKS so every fleet has a document containing **both** `kid` A and B. **Sizing:** During healthy operation, validators re-fetch on the **fresh** interval (default **5 min**) plus **deploy propagation** lag; **stale-ok** (default **1 h**) applies only when the JWKS HTTP fetch **fails** — it is **not** the driver for this pre-switch wait while auth is up. A practical lower bound is **N ≥ fresh_interval + deploy_lag** (e.g. **5 + ~5 ≈ 10 min**); **15 min** is a conservative buffer.
3. **Rotate active signer:** Auth service switches mint to sign only with **kid B**; validators still accept A and B for verify until A is removed.
4. **Retire kid A (separate wait):** After **`max(access_token TTL) + safety buffer`** (e.g. default access token **10 min** + **5 min** buffer = **15 min** — document the sum in the ADR), remove **kid A** from JWKS so tokens signed only with A can no longer verify. **Do not conflate** this wait with step **2**; step **2** is “validators see both keys”; step **4** is “no outstanding JWTs should still need `kid` A”.

Record who approves rotation, rollback (re-add `kid` A), and emergency key compromise steps in the same runbook (align with [Platform policies](#platform-policies-agreed) KMS / Terraform workflows).

- **OpenAPI URL behavior:** Follow [OpenAPI URLs, spec variants, and deprecation](#openapi-urls-spec-variants-and-deprecation) — additive URLs first, **Sunset** / **Deprecation** / **Link: rel="successor-version"** headers, then **301** for 90 days, then restrict; never hard-cut `/openapi.json` without that sequence.
- **CORS:** Implement **restrictive CORS** on the **token endpoint** and any browser-exposed doc origins: **no** wildcard `*` with credentials; allowlist known admin/sandbox origins only where a browser legitimately calls the API; document that **M2M `client_credentials` is server-side only** and browsers must not hold client secrets.
- **Non-sandbox platform routes ([platform.ts](apps/services/aviate-api/src/routes/platform.ts)):** **`/stats`**, **`/uploads`**, and **`/health`** (and aligned readiness if applicable) are **staff-facing**, **not** part of the public anonymous integrator surface. Require **staff Auth0** (or stricter) for these; **do not** expose them in the **public limited** OpenAPI. **Ops note:** if Kubernetes/AWS health probes need an unauthenticated TCP/HTTP check, use a **dedicated probe path** at the load balancer or a minimal `GET` that is explicitly non-sensitive — document in runbooks so “staff health” vs “LB liveness” are not conflated.

## M2M principal JSON shape (service-facing)

After successful **M2M** JWT validation, attach a **normalized principal object** to the request context (e.g. `req.auth.principal` or language equivalent) for **access checks, logs, audit, and `hello` responses** — **identical field names and semantics** across **Node, Go, Python, .NET**.

Wire tokens are **ES256 JWTs** with standard claims (`iss`, `aud`, `iat`, `exp`, `scope`, `jti`) — **no** **`nbf`** ([wire claim table](#m2m-jwt-wire-claims--principal-mapping-normative)) — plus **custom** claims **`client_id`**, **`integration_id`**, **`org_id`**, **`client_name`** per [M2M JWT wire claims → principal mapping](#m2m-jwt-wire-claims--principal-mapping-normative) (and **`sub`** only if ADR documents the library-exception path). **`iat` / `exp`** stay **Unix epoch seconds** on the JWT ([Solidified ADR contract](#jwt-time-claims-vs-principal-timestamps)). Middleware builds the principal **only** from JWT claims + branch metadata — see mapping table (no per-request DB read for `id` / `org_id` / `display_name`).


| Field | Why it's there |
|-------|----------------|
| **`type`** | Distinguishes M2M from user sessions — every service needs this for access-control branching. **Not** on JWT; middleware sets **`"m2m"`** when the M2M **`iss`** branch validated the token ([mapping table](#m2m-jwt-wire-claims--principal-mapping-normative)). |
| **`id`** | Stable internal **Integration** id — canonical identifier in logs and audit. Sourced from JWT **`integration_id`** ([minted at issuance](#m2m-jwt-wire-claims--principal-mapping-normative)). |
| **`client_id`** | OAuth2 **`client_id`** for the credential. Sourced from JWT **`client_id`** claim (or documented **`sub` → `client_id`** mapping per ADR). |
| **`org_id`** | Tenant scoping — multi-tenant enforcement at every layer. Sourced from JWT **`org_id`**. |
| **`display_name`** | Human-readable in logs (e.g. `"Production Data Sync"`). Sourced from JWT **`client_name`** — not DB-fetched at edge. |
| **`scopes`** | Always a **JSON array** — services check authorization without splitting strings. |
| **`issuer`** | Which **auth service** issued the token — supports **`iss`-based** dual-issuer middleware routing ([Decisions](#decisions-phase-0-lock) row 2). |
| **`issued_at`** / **`expires_at`** | Audit trail — **log these values** from the principal; do not re-derive only from raw JWT at log time. |
| **`token_id`** | Unique per token — revocation checks, denylist, and **exact log correlation**. |


**Example (illustrative):**

```json
{
  "type": "m2m",
  "id": "01hxe2…",
  "client_id": "spectra_ci_…",
  "org_id": "01hxe1…",
  "display_name": "Production Data Sync",
  "scopes": ["platform:read", "seq:write"],
  "issuer": "https://auth.aviate.com/",
  "issued_at": "2026-08-30T12:00:00Z",
  "expires_at": "2026-08-30T12:15:00Z",
  "token_id": "jti-or-opaque-id"
}
```

**User (Auth0) sessions:** keep existing `principal` / `sub` shape for interactive tokens; branch on **`type`** (or equivalent) so shared handlers stay explicit.

## Plan assessment

Use this section to **triage** work before implementation: what is already **decided in-repo** vs what still needs the **Phase 0 ADR** or explicit backlog owners.

**Status (final):** The **design contract** in this plan is **complete** — no substantive gaps remain for MVP M2M. **Engineering status** (what is merged vs behind flags vs GA-pending) is summarized at **[Implementation status](#implementation-status)** and in the related ADR. The **Ready to implement** subsection below lists everything engineering may take as normative after the ADR references it. **Historically**, schema and mint work were **blocked on Phase 0 ADR**; with the ADR **accepted** and the Node MVP path in **`main`**, remaining gaps are **incremental** (OpenAPI filter maturity, polyglot runtime parity, dashboards, prod enablement) unless an amendment reopens wire format or security defaults.

### Ready to implement (after ADR closes dependencies)

These are **specified in this plan**; engineering should not reinterpret without a plan amendment:

- **Decisions** rows [1–9](#decisions-phase-0-lock) and the full **[Solidified ADR contract](#solidified-adr-contract)** (canonical `iss` / `aud`, JWT vs principal time formats, revocation Option C + `jti` + issuance log, token `scope` semantics, rule-based three-tier + CI, JWKS **503** + `auth_unavailable` (incl. status cold-miss path), edge HTTP errors + [RFC 6750 `WWW-Authenticate`](#edge-apis-www-authenticate-header-rfc-6750-3), token endpoint [RFC 6749 §5.1 success](#token-endpoint-successful-access-token-response-rfc-6749-51) + [§5.2 errors](#token-endpoint-oauth-error-contract-rfc-6749-52), RBAC strings, rollout flags, observability metric names, [status cache cold-start / DB failure](#status-cache-cold-start-and-db-failure-mvp-defaults), [M2M JWT wire claims → principal](#m2m-jwt-wire-claims--principal-mapping-normative), [mixed credentials](#token-endpoint-mixed-credentials-rfc-6749-52), ADR close-out order items [1–9](#adr-close-out-sequence-non-negotiable)).
- **Platform policies:** token endpoint client auth (Basic default + form + mixed error), [abuse lockout numeric defaults](#client-credentials-abuse-lockout-defaults), [client secret hashing](#m2m-client-secret-at-rest-hashing), clock skew tab, JWKS cache defaults + fail-closed, key rotation sequence, CORS stance, staff vs LB health ([Platform policies](#platform-policies-agreed)).
- **[M2M principal JSON shape](#m2m-principal-json-shape-service-facing)** — **`issued_at` / `expires_at`** as **ISO-8601** in principal; JWT **`iat` / `exp`** remain Unix integers per [Solidified ADR contract](#jwt-time-claims-vs-principal-timestamps); **`id`**, **`org_id`**, **`display_name`**, **`client_id`** populated **only** from minted JWT claims per [mapping table](#m2m-jwt-wire-claims--principal-mapping-normative) (no edge DB read for principal fields).
- **[Incident and leak runbook](#incident-and-leak-runbook-minimum)** — ADR embeds the four-step minimum (no separate vague backlog).

### Blocked on Phase 0 ADR (non-negotiable before schema / mint)

**Note:** This subsection described **gating before** the Phase 0 ADR was written and accepted. **Repo paths, env spellings, router boundaries, and scope-map emission** are now instantiated in [`m2m-client-credentials-phase0.md`](../adr/m2m-client-credentials-phase0.md) and code; items below remain useful for **threat-model / ops** completeness (SLOs, dashboards, runbooks) and any **future** amendment cycle — not as a blanket “ADR missing” blocker for the merged MVP slice.

The **[Solidified ADR contract](#solidified-adr-contract)** locks **defaults** (access token **10 min**, status cache **2 min**, customer-facing exposure **≤ 15 min**, rotate semantics, issuance log columns, tier **(c)** router isolation, `AUTH_ISSUER_OVERRIDE`, startup vs runtime errors, [status cache cold-start / DB failure](#status-cache-cold-start-and-db-failure-mvp-defaults), [scope polyglot strategy](#scope-management-m2m) + close-out [7–9](#adr-close-out-sequence-non-negotiable), [abuse lockout numbers](#client-credentials-abuse-lockout-defaults), [mixed credentials error](#token-endpoint-mixed-credentials-rfc-6749-52), [M2M JWT → principal mapping](#m2m-jwt-wire-claims--principal-mapping-normative), [client secret hashing](#m2m-client-secret-at-rest-hashing), [incident runbook](#incident-and-leak-runbook-minimum)). **Instantiation** of auth service path (**`apps/services/auth-api`**), Nx project name, **env contract** spellings, **OpenAPI proxy** wiring, tier **(c)** router boundary, portal lifecycle verbs, and **portal copy** for Integrations is recorded in the **accepted** ADR and **`main`** code paths. **Still typically tracked outside this plan** (ops / GA): formal **SLO numbers**, dashboards wired to every [observability](#observability-minimums) metric, and incremental **public limited** OpenAPI completeness. **[Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr)** remains the **security gate** for any deviation from plan defaults.

### Incident and leak runbook (minimum)

ADR **embeds** (or copies verbatim from this plan) this **four-step** minimum so Phase 0 does not ship with a vague “write runbook later” gap:

1. **Suspected secret leak:** Rotate the Integration secret **immediately** in the portal — old secret **stops minting**; outstanding access tokens expire within [access token TTL](#status-cache-and-exposure-mvp-defaults) (**10 min** default).
2. **Confirmed compromise or broader exposure:** **Revoke** the Integration in the portal — status cache propagates within **2 min**; **new mints** blocked immediately; **outstanding** tokens blocked within **status cache TTL** exposure ([Option C](#token-revocation-mvp-plan-default)).
3. **Org-level incident (post-GA):** Use **`platform:integrations:suspend-org`** ([RBAC](#rbac-names-ga-audit)) per ADR / admin procedure.
4. **Signing key compromise:** Follow [key rotation runbook](#auth-service-availability-jwks-caching-and-key-rotation) **emergency** path — e.g. re-add compromised `kid` if needed for continuity, rotate to new key, retire compromised key **out-of-band** with operator sign-off.

No other **residual** plan-vs-ADR gaps remain for MVP contract; optional backlog stays in [Gaps and follow-ups](#gaps-and-follow-ups).

### Optional / deferred (already called out)

- [Gaps and follow-ups](#gaps-and-follow-ups) (OAuth discovery, header-gated OpenAPI).
- Per-segment M2M **`aud`** ([Decisions](#decisions-phase-0-lock) row 8).
- DB-backed granular scope policy post-GA ([Decisions](#decisions-phase-0-lock) row 9).

## Gaps and follow-ups

Remaining items for Phase 0 ADR or backlog.

- **Discovery (optional backlog):** `/.well-known/oauth-authorization-server` or OAuth metadata for generic clients — not required for MVP curl flow.
- **Optional header-gated single URL** for OpenAPI (see [OpenAPI URLs, spec variants, and deprecation](#openapi-urls-spec-variants-and-deprecation)) — threat-model before use vs separate authenticated path.

## Remaining ADR items (Phase 0 close-out)

Normative **defaults** live in **[Solidified ADR contract](#solidified-adr-contract)**. The checklist below is what the ADR must still **instantiate** (numbers, repo paths, runbooks) or **prove** against the codebase — not re-decide the wire contract.

### Routing, tiers, and docs

- **Rule-based tiers:** Implement the pipeline per [three-tier classification](#three-tier-path-classification-rule-based). **Tier (c):** **router group isolation** (BFF router never mounts M2M middleware) — ADR references concrete router/module names per service.
- **M2M vs user vs staff:** Per-segment notes where today’s code diverges from rules; align with [Integration catalog vs sandbox portal](#integration-catalog-vs-sandbox-portal).
- **Authenticated OpenAPI traffic path:** Canonical pattern: **admin-ui-api proxy** vs direct **`aviate-api`** + header; CORS, TLS, **static integration key** storage, rotation, emergency revoke ([Decisions](#decisions-phase-0-lock) item 7).
- **Portal copy:** Integrations **alongside** Applications ([Decisions](#decisions-phase-0-lock) row 3); no migration of legacy OAuth rows for MVP.

### JWT and principal contract

- **Restate** [Solidified ADR contract](#solidified-adr-contract) sections on **`iss`**, **`aud`**, **`iat`/`exp`**, principal **`issued_at`/`expires_at`**, and **token `scope`** — ADR adds only deployment matrices (which service sets which env).
- **Wire claim table:** **Normative** — ADR includes the full table from [M2M JWT wire claims → principal mapping](#m2m-jwt-wire-claims--principal-mapping-normative) (plus deployment matrices for which service sets which env).

### Token revocation (Phase 0 ADR)

**Security gate:** Revocation semantics **must** be fully specified before locking [Phase 1](#phase-1--data-model-and-portal) schema or [Phase 2](#phase-2--token-endpoint-auth-service) mint logic.

**Plan default (already chosen):** **[Option C — status check](#token-revocation-mvp-plan-default)** with **always-on `jti`**, **[issuance log](#token-issuance-log--minimum-schema-phase-1)**, **no** edge denylist for MVP. **Numeric defaults** locked: access token **10 min**, status cache **2 min**, customer-facing exposure **≤ 15 min** ([Status cache and exposure](#status-cache-and-exposure-mvp-defaults)). **Rotate secret:** [future mints only](#rotate-secret-vs-outstanding-access-tokens-mvp) for outstanding JWTs.

The ADR **must** still define at minimum:

1. **Portal / lifecycle verbs** — Exact UX for soft-delete Integration, mark client `revoked`, **rotate secret**, suspend org (plan: rotate does **not** kill outstanding access tokens before `exp`; immediate kill ⇒ Option B backlog).
2. **Status cache implementation** — **In-process** LRU per pod for MVP (or justify Redis in ADR). **Cold-start / DB failure** behavior is **not** left to implementer judgment: follow [Status cache cold start and DB failure](#status-cache-cold-start-and-db-failure-mvp-defaults). Document numeric overrides only if an env **must** diverge from plan defaults.
3. **Threat model paragraph** — Tie **≤ 15 min** exposure to “offboarded integrator” vs “stolen token” and when **Option B** becomes mandatory.

**Implementation dependencies:**

- **Phase 1:** Revoked / suspended flags; **token issuance log** per [minimum schema](#token-issuance-log--minimum-schema-phase-1) (**required**); audit events for revoke/rotate; portal APIs match ADR verbs.
- **Phase 2–3:** Refuse mint when revoked/suspended; **always** emit **`jti`**.
- **Phase 4:** Edge applies **cached status** check after JWT validation; no denylist query for MVP.

### Auth service and infra

- **`auth.aviate.com`:** DNS, TLS, deployment topology, **repo path / Nx project**, health endpoints distinct from staff **`/v1/platform/health`**. **SLO / error budget** numbers.
- **JWKS client behavior:** Tunable env names mirroring defaults in [Auth service availability, JWKS caching, and key rotation](#auth-service-availability-jwks-caching-and-key-rotation).
- **Env contract:** Full list: `SPECTRA_M2M_AUDIENCE`, **`SPECTRA_M2M_ISSUER`** (or ADR-chosen constant name), **`AUTH_ISSUER_OVERRIDE`** (non-prod only; see [Local dev issuer override](#local-dev-issuer-override-auth_issuer_override)), **`M2M_MINT_ENABLED`**, **`M2M_VERIFY_ENABLED_*`**, **`M2M_ORG_ALLOWLIST`**, JWKS overrides, prod mint kill-switch.
- **local-edge ([apps/local-edge](apps/local-edge)):** Token + JWKS + `/docs` proxy parity.

### Ops and integrator UX

- **Load balancer liveness** vs staff health — named paths in runbooks.
- **HTTP / OAuth errors:** Copy [HTTP error contract (edge APIs)](#http-error-contract-edge-apis) + [WWW-Authenticate (RFC 6750 §3)](#edge-apis-www-authenticate-header-rfc-6750-3) into ADR appendix (incl. both **`503` + `auth_unavailable`** rows and ops-only **`error_sub_cause`**); document token endpoint [RFC 6749 §5.1 success](#token-endpoint-successful-access-token-response-rfc-6749-51) + [§5.2 error table](#token-endpoint-oauth-error-contract-rfc-6749-52) (incl. **`invalid_scope`**, **`invalid_request`** / [mixed credentials](#token-endpoint-mixed-credentials-rfc-6749-52), **`client_locked`** as Spectra extension); include normative [JWT → principal mapping](#m2m-jwt-wire-claims--principal-mapping-normative).
- **RBAC:** Map [permission strings](#rbac-names-ga-audit) to admin-ui-api routes and Auth0 role assignment process.
- **Observability:** Wire [metric names](#observability-minimums) into dashboards / alerts (`m2m_verify_total` **`result`** values align with [HTTP `error` strings](#http-error-contract-edge-apis), e.g. **`client_revoked`**); document `auth_unavailable` on-call playbooks.

### Scope policy (MVP)

- **Scope map source of truth:** [Decisions](#decisions-phase-0-lock) row 9 — ADR names the **CI target** / script and **OpenAPI input** files; **polyglot** path per [ADR close-out](#adr-close-out-sequence-non-negotiable) item **7** (`scope-map.json` build artifact + contract test, or documented mirror + same test).

### *Defer* (document decision “not in MVP”)

- **OAuth discovery** metadata URL — same bullets as [Gaps and follow-ups](#gaps-and-follow-ups) if explicitly deferred in ADR.

## GA ordering (non-negotiable)

**Production:** [Phase 1 — Data model and portal](#phase-1--data-model-and-portal) must be **production-complete** (schema migrated, Integration + M2M client lifecycle live in **prod**, sandbox portal create/list/rotate/revoke for Integrations verified, audit and ops runbooks in place) **before** any **production GA** M2M access token is issued to real integrators.

**Rationale:** If the **auth service** ([Phase 2–3](#phase-2--token-endpoint-auth-service)) or **edge** ([Phase 4](#phase-4--edge-and-polyglot-apis)) ships tokens in production **without** Phase 1, **shipping pressure** collapses ordering: teams retrofit provisioning, secrets, tenancy, and audit **after** launch and carry long-lived operational risk.

**Allowed earlier (dev / staging / flags):** Vertical slices of Phase 2 + 3 + 4 behind feature flags or non-prod environments are fine for engineering velocity — but **production** `client_credentials` mint on **`auth.aviate.com`** must remain **disabled** until Phase 1 prod exit criteria are met. **`M2M_MINT_ENABLED=false`** (or equivalent) in prod configs until the gate passes ([Rollout feature flags](#rollout-feature-flags)). Release automation or CI should **block** enabling prod token issuance if Phase 1 migrations / portal flows are not in the required state.

## Phased delivery

**Roll-up:** See **[Implementation status](#implementation-status)** for what is already in **`main`** vs **partial** vs **GA-gated**. Phase headings below stay **normative** (exit criteria and intent).

### Phase 0 — Design lock (~1–2 days)

**Deliverables**

- Short ADR or linked doc: [Decisions (Phase 0 lock)](#decisions-phase-0-lock) + **close every item** in [Remaining ADR items (Phase 0 close-out)](#remaining-adr-items-phase-0-close-out).
- Claim contract: [M2M JWT wire claims → principal mapping](#m2m-jwt-wire-claims--principal-mapping-normative) (incl. `client_id` vs `sub` rule); `**iss**` = `**https://auth.aviate.com/**`; `**jti**` always; see [Solidified ADR contract](#solidified-adr-contract).
- **MVP scope matrix:** coarse **by API / segment** with `**:read`** / `**:write**` (or equivalent) per area; encode scope → path prefix + method rules in `[packages/auth/scope-map.ts](packages/auth/scope-map.ts)` per [Scope management (M2M)](#scope-management-m2m); document defaults at client creation; **CI↔OpenAPI validation** ([Decisions](#decisions-phase-0-lock) row 9) stubbed or implemented.
- Threat model notes: **token revocation** per [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr), rotation, rate limits, **abuse lockout** (see [Platform policies](#platform-policies-agreed)), **client secret at rest** ([M2M client secret at rest (hashing)](#m2m-client-secret-at-rest-hashing)).
- Integration vs portal boundary per [Integration catalog vs sandbox portal](#integration-catalog-vs-sandbox-portal): **three-tier** prefix list (public / authenticated / BFF-only), M2M deny behavior on sandbox portal, public vs authenticated OpenAPI URLs.

**Exit criteria:** ADR published; [Remaining ADR items](#remaining-adr-items-phase-0-close-out) addressed or explicitly *defer* with owner; **[Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr)** complete; [Decisions](#decisions-phase-0-lock) and [Platform policies](#platform-policies-agreed) referenced; public limited OpenAPI excludes BFF-only and staff-only routes; M2M cannot access sandbox portal at runtime; JWKS URL and **ES256** agreed for all runtimes; **scope map** path (`[packages/auth/scope-map.ts](packages/auth/scope-map.ts)`) and **CI OpenAPI↔map validation** ([row 9](#decisions-phase-0-lock)) specified or implemented in draft.

---

### Phase 1 — Data model and portal

**GA gate:** This phase is **blocking** for **production** M2M token issuance — see [GA ordering (non-negotiable)](#ga-ordering-non-negotiable).

**Deliverables**

- Schema: new **Integration** entity (separate from **Application**) with M2M **oauth client** rows bound to Integration via **`integration_id` FK**; `client_credentials` grant; **client secret** stored per [M2M client secret at rest (hashing)](#m2m-client-secret-at-rest-hashing); lifecycle `active` / `revoked` / `suspended` per ADR; **token issuance log** per [minimum schema](#token-issuance-log--minimum-schema-phase-1) (**required**); audit columns per control-plane patterns — **fields and state machine per [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr)**. **Do not** mutate legacy `applications` / `oauthClients` for MVP M2M ([Decisions](#decisions-phase-0-lock) row 3).
- **Production data path:** migrations applied through **production**; rollback tested; no destructive surprise on existing `applications` / `oauthClients` rows.
- **Sandbox** portal API + UI: create, list (no secret), rotate secret, revoke **Integration** M2M clients — semantics **match** [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr) (**no redirect URI required** for pure M2M, [Decisions](#decisions-phase-0-lock) item 3).
- **Optional (admin) GA:** **read-only audit** UI/API (list/view M2M failures, Integration metadata) per [Decisions](#decisions-phase-0-lock) item 5 — **no** cross-tenant revoke in GA.
- **Post-GA (admin):** revoke-any, org kill-switch, broader operator actions.
- **Admin UI — General settings → Auth tab:** persist **JWT clock skew** (default **30s**) to platform settings; admin-ui-api read/write for staff; all runtimes read the same value for JWT verification (see [Platform policies](#platform-policies-agreed)).
- **Optional (admin):** scope **catalog** / **templates** UI aligned with [Scope management](#scope-management-m2m) (defer partial UI if MVP uses code-only scope map first).

**Exit criteria (must be true in production before prod token mint):** Operators can create, list, rotate, and revoke **Integration** M2M clients in **production** with full audit trail; clock skew setting is editable in Admin UI and honored; schema and APIs are stable enough that auth service can resolve `**client_id`** → Integration + org + scopes without ad-hoc scripts. **`client_secret`** at rest is **Argon2id** (or **bcrypt** cost **≥ 12**) per [M2M client secret at rest (hashing)](#m2m-client-secret-at-rest-hashing) — **no** plaintext, MD5, or SHA-only variants; verified in **schema / security review** before the gate clears (not deferred to Phase 2 load tests alone).

---

### Phase 2 — Token endpoint (auth service)

**Production:** Do not enable **production** `client_credentials` token mint until [Phase 1](#phase-1--data-model-and-portal) prod exit criteria and [GA ordering](#ga-ordering-non-negotiable) are satisfied.

**Deliverables**

- **Dedicated auth service** (`auth.aviate.com` in prod; configurable base URL in dev): `**POST .../oauth/token`** (exact path in ADR, e.g. `/oauth/token`), **ES256** access tokens, **JWKS** at `**/.well-known/jwks.json`**, OAuth2 error JSON per [RFC 6749 §5.2](#token-endpoint-oauth-error-contract-rfc-6749-52), **successful** JSON body per [RFC 6749 §5.1](#token-endpoint-successful-access-token-response-rfc-6749-51), **rate limiting** + **abuse lockout**, **restrictive CORS**, structured logging (see `@spectra/logger` / project logging skill if applicable). **Refuse mint** for revoked Integrations/clients and apply `**jti` / issuance rules** per [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr).
- **Client authentication:** **HTTP Basic** (default in docs and examples) **and** form-body `client_id` / `client_secret` per [Platform policies](#platform-policies-agreed); `grant_type=client_credentials`, optional `scope`.

**Exit criteria:** Curl obtains a token using **Basic Auth** against auth host by default; body-based client auth also works; successful response includes **`access_token`**, **`token_type`**, **`expires_in`**, **`scope`** per [RFC 6749 §5.1](#token-endpoint-successful-access-token-response-rfc-6749-51); JWKS returns keys for **ES256**; CORS and rate/abuse paths covered in tests or manual checklist; **Phase 2** load test validates **secret-verify** latency stays within targets under [Argon2id / bcrypt policy](#m2m-client-secret-at-rest-hashing).

---

### Phase 3 — Mint access tokens

**Deliverables**

- Signing keys managed safely (env/KMS — align with infra rules: no ad-hoc infra outside Terraform/workflows if production keys).
- JWT builder on **auth service**: **ES256** only, **`iss`** = canonical **`https://auth.aviate.com/`** ([Solidified ADR contract](#iss-m2m-canonical-issuer)), **`aud`** = **`https://api.aviate.com/`** / **`SPECTRA_M2M_AUDIENCE`**, short `exp`, **`jti` on every token** (UUID or ULID), mint **`integration_id`**, **`org_id`**, **`client_id`** (or documented **`sub`**-only exception per [mapping table](#m2m-jwt-wire-claims--principal-mapping-normative)), and **`client_name`** from Integration / org records for [principal population](#m2m-principal-json-shape-service-facing); leeway from platform **clock skew** setting (read by auth service).
- Key rotation procedure documented per [Auth service availability, JWKS caching, and key rotation](#auth-service-availability-jwks-caching-and-key-rotation) **key rotation runbook**; **JWKS** published at `**https://auth.aviate.com/.well-known/jwks.json`** (env override for non-prod).

**Exit criteria:** Issued **ES256** JWT verifies locally against JWKS; clock skew setting from Admin UI is applied by auth + edge validators.

---

### Phase 4 — Edge and polyglot APIs

**Deliverables**

- `@spectra/auth` (and polyglot equivalents): **single middleware** per [Decisions](#decisions-phase-0-lock) row **2**: `**iss`** routes Auth0 vs M2M; **M2M path** verifies `**aud`** equals configured **M2M API resource** (row **8**), **JWKS** signature, [Token revocation](#token-revocation-phase-0-adr), **[Scope management](#scope-management-m2m)** (enforce from `[packages/auth/scope-map.ts](packages/auth/scope-map.ts)` per row **9**); **Auth0 path** verifies `**aud`** equals `**AUTH0_AUDIENCE**` only. Populate **[M2M principal JSON shape](#m2m-principal-json-shape-service-facing)** on the M2M path; **Auth0 user-only** on `/v1/platform/sandbox/`** and other **BFF-only** prefixes. **401**/**403** responses include **`WWW-Authenticate`** per [RFC 6750 §3](#edge-apis-www-authenticate-header-rfc-6750-3).
- **CI:** Scope map ↔ OpenAPI validation job ([row 9](#decisions-phase-0-lock)) runs on PRs touching the map or relevant OpenAPI assets.
- **Staff-only platform routes:** lock down `**/stats`**, `**/uploads**`, `**/health**` (and readiness if applicable) per [Platform policies](#platform-policies-agreed); align with LB probe strategy in runbooks.
- **local-edge:** reverse-proxy **`auth.aviate.com`** token + JWKS paths in dev (or route to local auth service port); **CORS** not required for server-side token calls from customer systems; restrict browser origins on any browser-exposed auth routes.
- Replicate or share validation contract (incl. **30s default skew**, configurable) and **JWKS cache policy** ([Auth service availability, JWKS caching, and key rotation](#auth-service-availability-jwks-caching-and-key-rotation)) across **Node, Go, Python, .NET** services per [api-polyglot.md](../api-polyglot.md).
- **OpenAPI:** implement `GET /openapi.json` (public limited), `GET /integration/openapi.json` (full, **auth required**), optional `**/openapi/v2/openapi.json`**; pair Swagger UI paths; follow [deprecation lifecycle](#openapi-urls-spec-variants-and-deprecation) **steps 1–4** whenever changing URLs; emit **Deprecation** / **Sunset** / **Link: rel="successor-version"** when in **Step 2** and beyond.
- **Dual docs entrypoints:** `**/integration/openapi.json`** + `/integration/docs` served from **aviate-api** (or docs host) but **fetched via admin-ui-api proxy** using **static integration key** for staff tooling ([Decisions](#decisions-phase-0-lock) item 7); public `**/openapi.json`** + `/docs` unchanged until deprecation steps apply. Update [main.ts](apps/services/aviate-api/src/main.ts) and [local-edge](apps/local-edge).

**Exit criteria:** An allowlisted `GET /v1/.../hello` (or chosen integration path) succeeds with **either** Auth0 user token or M2M token **when scopes allow**; `**hello`** returns a `**principal**` object consistent with [M2M principal JSON shape](#m2m-principal-json-shape-service-facing) for M2M (`type: "m2m"`) and existing user shape for Auth0; sandbox portal returns **403** for M2M; **public** `GET /openapi.json` omits sandbox + staff-only paths; **authenticated** `GET /integration/openapi.json` serves full spec; missing scope returns **403**.

---

### Phase 5 — Developer experience

**Deliverables**

- Sandbox UI: copy-paste **curl** for token exchange (**Basic Auth** default) targeting `**https://auth.aviate.com`** (or local auth base URL); sample call to edge; link to **public** `GET /openapi.json` / `/docs`.
- `.env.example` / docs: variables for token URL, **M2M audience** (distinct from Auth0), Auth0 audience unchanged, no secrets in repo; **CORS** and server-side-only warnings.

**Exit criteria:** New integrator can follow docs without reading source.

---

### Phase 6 — Hardening and GA

**Deliverables**

- **Revocation / exposure:** Automated and manual tests prove behavior **matches** [Token revocation (Phase 0 ADR)](#token-revocation-phase-0-adr) (revoke → in-flight token outcome within documented **maximum exposure window**); no ADR discovery in Phase 6.
- **Abuse lockout** tested against **Client credentials abuse lockout defaults**: **5** failed attempts within a sliding **60s** window → lockout; **15 min** first lockout; repeat lockouts **15 min × 2^(n−1)** capped at **24h**; tracking **per `client_id` hash** and **per source IP** (either triggers); **10** lockout events per **org** in **5 min** → alert — per [Platform policies](#platform-policies-agreed) and [lockout table](#client-credentials-abuse-lockout-defaults).
- Contract tests in CI: token endpoint + one authenticated edge request; **403** for M2M token on a sandbox portal route; **403** when scope insufficient; public `openapi.json` snapshot lacks `/sandbox/` and staff-only paths; assert **`hello`** M2M **`principal`** includes required keys from [M2M principal JSON shape](#m2m-principal-json-shape-service-facing); sample **401**/**403** edge responses include valid **`WWW-Authenticate: Bearer …`** matching JSON **`error`** ([RFC 6750 §3](#edge-apis-www-authenticate-header-rfc-6750-3)); **`iss` + `aud` defense in depth:** reject tokens whose **`aud`** does not match the **branch** (e.g. Auth0 audience on M2M-allowlisted routes, M2M API resource on Auth0-only paths) — including regression cases if **`iss` routing** is stubbed or misconfigured in tests; **tier (c) router isolation:** automated test that **no** route mounted on the BFF-only router accepts a valid **M2M** bearer (align with [three-tier classification](#three-tier-path-classification-rule-based)); **scope map:** release pipeline requires the **OpenAPI ↔ `scope-map` CI check** from [Decisions](#decisions-phase-0-lock) row 9 to pass; **polyglot scope parity:** contract test per [ADR close-out](#adr-close-out-sequence-non-negotiable) item **7** (same allow/deny for scope + path + method across Node, Go, Python, .NET); optional test for **Deprecation** / **Sunset** headers when a URL is in sunset phase.
- **Admin GA:** audit-only flows verified ([Decisions](#decisions-phase-0-lock) item 5); **post-GA** backlog for revoke-any. **Auth** tab clock skew persists and affects verification on **edge + auth service**.

**Exit criteria:** Checklist signed off for production enablement; **[GA ordering](#ga-ordering-non-negotiable)** verified (Phase 1 **prod** complete before prod token issuance enabled); production token mint gated by config until sign-off.

## Implementation pointers (existing code)

**OpenAPI artifact split (implemented):** `nx run openapi:merge` runs [`scripts/merge-public-openapi.mjs`](../../scripts/merge-public-openapi.mjs), which emits **`spectra-public-api.json`** (public limited) and **`spectra-integration-api.json`** (full) into `packages/openapi/dist/` and `apps/services/aviate-api/src/assets/`. Each merged path carries **`x-spectra-audience`** (`public` \| `integration` \| `internal`); the public artifact also applies a prefix denylist for known portal/staff trees. Aviate serves the limited spec at **`GET /openapi.json`** and **`/docs`**, and the full spec at **`GET /integration/openapi.json`** and **`/integration/docs`** ([OpenAPI URLs](#openapi-urls-spec-variants-and-deprecation), [drift / extension notes](#public-limited-spec-drift-risk-mvp-bridge-and-recommended-fix)). Optional link back to the sandbox UI in **`info.description`**: set **`SPECTRA_SWAGGER_SHOW_DASHBOARD_LINK=true`** and **`SPECTRA_SANDBOX_UI_URL`** (default is off so public Swagger stays integrator-only).

| Concern                                              | Location                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 JWT middleware (user + staff tokens)           | [packages/auth/src/lib/require-auth0-access-token.ts](packages/auth/src/lib/require-auth0-access-token.ts)                                                                                                        |
| Dedicated auth service                               | [`apps/services/auth-api`](../../apps/services/auth-api) — `POST` token (`client_credentials`), mint **ES256**, **`GET /.well-known/jwks.json`** (base path / env per [ADR](../adr/m2m-client-credentials-phase0.md)); prod host **`auth.aviate.com`**. |
| JWT validation (`iss` + `aud` + JWKS)                | [packages/auth](packages/auth) — **`createRequireSpectraAccessToken`** in [require-spectra-access-token.ts](../../packages/auth/src/lib/require-spectra-access-token.ts); M2M `aud` / `iss` per [Solidified ADR contract](#solidified-adr-contract); Auth0 path remains [require-auth0-access-token.ts](../../packages/auth/src/lib/require-auth0-access-token.ts) |
| M2M issuer + audience constants                      | `packages/auth` + service env — **`SPECTRA_M2M_ISSUER`**, **`SPECTRA_M2M_AUDIENCE`**, **`SPECTRA_M2M_JWKS_URL`** per [ADR](../adr/m2m-client-credentials-phase0.md) and [Solidified ADR contract](#solidified-adr-contract); CI asserts `iss` / `aud` on fixture tokens where present |
| M2M scope → route map (MVP)                          | [packages/auth/src/lib/scope-map.ts](../../packages/auth/src/lib/scope-map.ts) + emitted **`packages/auth/dist/scope-map.json`** via **`nx run auth:emit-scope-map`** per [ADR](../adr/m2m-client-credentials-phase0.md); **CI** / contract script per [Scope management](#scope-management-m2m) and [Decisions](#decisions-phase-0-lock) row 9 |
| Sandbox portal (apps, secrets, rotate)               | [sandbox-portal.ts](../../apps/services/aviate-api/src/routes/sandbox-portal.ts) — includes **Integration** / M2M client lifecycle alongside legacy applications                                                                                                                      |
| OAuth / Integration schema                           | [control-plane.ts](../../packages/database/src/schema/control-plane.ts) — **`integrations`**, **`m2m_oauth_clients`**, **`m2m_token_issuance_log`**, etc. (MVP M2M separate from legacy `applications` / `oauthClients`) |
| Sandbox UI secret handling                           | `apps/sandbox-ui/src/app/pages/application-form.page.ts`, `application-view.page.ts`                                                                                                                              |
| Authenticated OpenAPI proxy + integration key        | [apps/services/admin-ui-api](apps/services/admin-ui-api) — proxy `GET /integration/openapi.json`, static key in platform secrets                                                                                  |
| Merged OpenAPI artifacts (public limited + full)     | `nx run openapi:merge` → [`scripts/merge-public-openapi.mjs`](../../scripts/merge-public-openapi.mjs) — **`spectra-public-api.json`** + **`spectra-integration-api.json`** in `packages/openapi/dist/` and aviate assets; see [Implementation pointers](#implementation-pointers-existing-code) above |
| Docs hosts (OpenAPI + Swagger)                       | [apps/services/aviate-api/src/main.ts](apps/services/aviate-api/src/main.ts) — `GET /openapi.json`, `GET /docs`, `**GET /integration/openapi.json`**, `**GET /integration/docs**`, optional `/openapi/v2/...`     |
| Admin UI Auth settings (clock skew)                  | [apps/admin-ui](apps/admin-ui) General settings → **Auth** tab; [apps/services/admin-ui-api](apps/services/admin-ui-api) persistence                                                                              |
| M2M principal / `hello` contract                     | Polyglot `hello` handlers + [M2M principal JSON shape](#m2m-principal-json-shape-service-facing)                                                                                                                  |
| API conventions                                      | `docs/api-polyglot.md`                                                                                                                                                                                            |
| Sandbox Auth0 setup                                  | `apps/sandbox-ui/docs/auth0.md`                                                                                                                                                                                   |


## Suggested sequencing

**Production (strict):** Phase 0 → **[Phase 1 complete in production](#phase-1--data-model-and-portal)** → Phase 2–3 (auth service **prod**, token mint **off** until Phase 1 gate cleared) → Phase 4–6. Do not flip **production** token issuance on until Phase 1 exit criteria are met — see [GA ordering (non-negotiable)](#ga-ordering-non-negotiable).

**Engineering (parallel / spike):** After Phase 0, teams may run **Phase 2 + 3 + 4** in **dev or staging** behind flags to de-risk middleware and JWKS integration **before** Phase 1 lands, as long as **prod** auth remains unable to mint customer tokens until the Phase 1 gate passes.

1. Phase 0 (ADR + [token revocation](#token-revocation-phase-0-adr) + three-tier path matrix + RBAC names for audit + [Plan assessment](#plan-assessment) backlog rows: Application/Integration, `aud`/`iss` encoding, token `scope` param, rollout flags, observability, revocation hot-path bounds)
2. **Prod track:** Phase 1 to production-complete (GA gate)
3. Phase 2 + 3 (auth service); **prod mint** only after step 2
4. Phase 4 on one service + local-edge, then roll across segments
5. Phases 5–6 before GA customer comms

## Success metrics

- Customer can automate API access **without** Auth0 user flows on their server, using `**auth.aviate.com`** for tokens and **ES256** JWTs validated via **JWKS**.
- No long-lived bearer tokens without explicit rotation path.
- Polyglot `**hello`** and logs use the [M2M principal JSON shape](#m2m-principal-json-shape-service-facing) for M2M requests (`type: "m2m"`).
- Edge and docs clearly distinguish **user token** vs **integration token**; **public** `GET /openapi.json` excludes sandbox self-service and **staff-only** platform routes; M2M cannot invoke portal routes; **scopes** enforced at API-area granularity MVP with path to finer grants.
- **Scope map ↔ OpenAPI CI** and `**aud` / `iss` contracts** produce **zero** unexplained drift between auth service, edge, and published specs on main after introduction.

