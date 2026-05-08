# Spectra runbooks

Operational playbooks that pair with the [DEVELOPER-API-PLATFORM-PLAN.md](../../README.md).

| Runbook | When to use |
| --- | --- |
| [`environments.md`](./environments.md) | Spinning up a new sub-env (`devNN`, `qaNN`, ...). Required vars/secrets, branch mapping. |
| [`cicd.md`](./cicd.md) | Walkthrough of every workflow under `.github/workflows/` and what `scripts/ci/*` it shells out to. |
| [`rollback.md`](./rollback.md) | Lambda alias rollback + Neon branch / PITR restore steps. |
| [`neon-pre-migration.md`](./neon-pre-migration.md) | Mandatory pre-migration Neon branch (or PITR snapshot) before destructive schema changes. |
