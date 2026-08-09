# Known issues

Pre-existing problems discovered but deliberately **not** fixed in the change that found them. Each names a safe workaround so the issue doesn't block work.

## Drizzle meta snapshots are stale (snapshot/journal drift)

**What:** `packages/database/drizzle/meta/` only has `0000`/`0001` snapshots, and `_journal.json` is missing idx `6` and `8`. The meta is frozen at migration `0001` while the schema + SQL migrations advanced to `0011`. (The admin-ui "Reconcile orphan journal rows" feature and `scripts/db-seed-spectra-migrations-journal.sql` are scar tissue from this.)

**Impact:** `drizzle-kit generate` is unusable — it diffs against the `0001` snapshot and tries to re-emit every table since then (e.g. it prompts create-vs-rename on `production_access_requests.integration_id`, which was actually added in `0008`). Running it and accepting its output would produce a migration that fails on apply.

**Workaround (current team practice — verified working):** hand-author idempotent SQL (`-- @spectra-migration: idempotent`, `CREATE … IF NOT EXISTS`, statement-breakpoints) and add the `_journal.json` entry by hand, as done for `0011_meridian_action_log.sql`. The custom runner (`readMigrationFiles` over the journal, hashes tracked in `spectra.__drizzle_migrations`) applies these correctly. **Do not run `drizzle-kit generate`.**

**Fix when:** someone wants drizzle-kit generate back. Reconciling means rebuilding the snapshot chain to match current reality — a no-op against data but it touches bookkeeping for the highest-risk tables (PAR/M2M/auth), so treat it as its own reviewed task (a `drizzle_migration_review` per [Meridian taxonomy](adr/meridian-003-task-taxonomy.md)), not a side fix.

## CI/CD is documented but not wired yet

**What:** The README and `docs/cicd/` describe GitHub Actions workflows and branch→stage deploys, but CI/CD is **not actually wired** in the repo yet (confirmed 2026-06-29).

**Impact (Meridian-relevant):** pushing a branch or opening a PR does **not** trigger pipelines or deploys today, so Meridian's Assisted-phase PRs are side-effect-free beyond the PR itself. This is why the Assisted real-PR run was cleared to proceed.

**Fix when:** CI/CD goes live — at that point an Assisted PR may trigger workflows, and the activation gates ([activation plan](meridian/activation-plan.md)) should account for it (e.g. draft/WIP PRs, or a label that suppresses deploy workflows).
