# M2M scope map — polyglot parity

Node is the **authoritative** implementation: `packages/auth/src/lib/scope-map.ts`. The build target `nx run auth:emit-scope-map` writes `packages/auth/dist/scope-map.json`.

## Contract test (Node)

Jest: `apps/services/aviate-api/src/lib/m2m-scope.spec.ts` — contract checks against `@spectra/auth` exports.

## Go / Python / .NET

Each runtime should load the same `scope-map.json` (or a generated mirror) and implement the same `scopesAllowRequest(method, path, grantedScopes)` semantics as Node. Add CI jobs that execute the same fixture table once those verifiers land (see `docs/plans/m2m-client-credentials-edge-auth.md` ADR close-out item 7).
