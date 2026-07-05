<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Project review subagents (`.claude/agents/`)

Read-only Claude Code subagents scoped to this platform. Each is pointed at the real source-of-truth files,
reports findings (`file:line` + fix) without editing, and auto-selects when a task matches its description —
or invoke by name, e.g. *"run tenant-isolation-auditor on aviate-api"*.

| Agent | Guards | Anchored to |
|---|---|---|
| `sandbox-endpoint-spec-reviewer` | custom AI endpoint specs vs the fixture allowlist + tenant scoping | `packages/database/src/lib/sandbox-ai-spec.ts`, `apps/services/aviate-api/src/lib/sandbox-ai-invoke.ts` |
| `drizzle-migration-checker` | schema change ships a complete migration (SQL + snapshot + journal) | `packages/database/drizzle/`, `admin-migrations.ts` |
| `angular-signals-reviewer` | standalone/OnPush/signals conventions + `@spectra/shared-ui` reuse | `apps/{spectra,sandbox,admin}-ui` |
| `auth-boundary-reviewer` | M2M client-credentials, scope enforcement, token minting, secret handling **(security)** | `packages/auth`, `apps/services/auth-api` |
| `openapi-contract-reviewer` | public API contract: route↔spec drift, breaking changes | `packages/openapi`, merged sandbox OpenAPI |
| `meridian-gate-reviewer` | Meridian L0 gates, runner, judge panel vs charter/ADRs | `packages/meridian`, `docs/meridian`, `docs/adr/meridian-00*` |
| `tenant-isolation-auditor` | every query filters `tenant_id` (from principal) + `deleted_at IS NULL` **(security)** | `packages/database/src/schema`, all `apps/services/*` query sites |
| `logging-reviewer` | structured `@spectra/logger` use, no secrets/PII in logs | `packages/logger`, `packages/logger-express` |

CI status/self-healing is handled separately by `.github/agents/ci-monitor-subagent.agent.md` (the `/monitor-ci` flow).

To add one: drop a `<name>.md` in `.claude/agents/` with `name`/`description`/`tools`/`model` frontmatter and a
system prompt that cites the files it should read. Keep them read-only (Read/Grep/Glob/Bash) — they review, they
don't edit.
