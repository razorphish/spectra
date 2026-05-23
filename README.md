# Spectra

Developer API platform monorepo (Angular UIs, Node/Express APIs, `@spectra/*` packages). Canonical plan: Vital Woman Reset `.cursor/plans/DEVELOPER-API-PLATFORM-PLAN.md` (mirror `SPECTRA-PLATFORM-PLAN.md`).

**Node:** use `.nvmrc` (20.19.x+) — `nvm use` before `npm install` / `nx`. Angular 21’s toolchain expects Node’s experimental `require(esm)` path for `@angular/compiler-cli`; the repo sets `NODE_OPTIONS=--experimental-require-module` in **committed** `.local.env` (loaded by Nx) and uses [`scripts/run-with-require-esm.cjs`](scripts/run-with-require-esm.cjs) for `npm run build` / `npm run nx` / `dev:*` so CI and local shells behave the same. If you call `nx`/`npx nx` directly without going through those scripts, ensure that flag is present or builds may fail with `ERR_REQUIRE_ESM`.

**Layout:** `apps/spectra-ui`, `apps/sandbox-ui`, `apps/admin-ui`, `apps/api-gateway`, `apps/services/{aviate-api,admin-ui-api,seq-api,quantum-api,corridor-api,ml-camp}`, `packages/{auth,database,logger,openapi,upload,shared-ui}`.

**Neon / Postgres:** copy [`.env.example`](.env.example) → `.env`. Default template uses **`SPECTRA_DB_TARGET=local`** (Docker Postgres). For Neon, set **`SPECTRA_DB_TARGET=neon`** and put the pooled string in **`NEON_DATABASE_URL`** (or rely on legacy **`DATABASE_URL`** when the target flag is omitted). Then `npm run db:verify`, `npm run db:migrate` (applies SQL under `packages/database/drizzle/`). Control-plane tables and Drizzle’s journal use the **`spectra`** Postgres schema; upgrading an older DB that only had `public` tables may require a one-time seed — see [`docs/runbooks/spectra-postgres-schema.md`](docs/runbooks/spectra-postgres-schema.md). If `db:migrate` complains about the serverless driver, set `DATABASE_DIRECT_URL` to the non-pooler URL for the **active** target (see `.env.example`). With the API running (`nx serve aviate-api`), check `GET /v1/platform/stats` for row counts (still unauthenticated — gate behind the authorizer before prod).

**Uploads:** set `SPECTRA_UPLOADS_BUCKET` (and `AWS_REGION`) when running `aviate-api` so `POST /v1/platform/uploads/init` can mint presigned URLs. Implementation: [`@spectra/upload`](packages/upload/src). The bucket + SQS queue are provisioned by [`terraform/modules/uploads_bucket`](terraform/modules/uploads_bucket) and [`upload_queue`](terraform/modules/upload_queue), with names exported as SSM parameters under `/${project}/${env}/uploads/`.

**CI/CD:** see [`docs/cicd/README.md`](docs/cicd/README.md) for required GitHub Vars/Secrets, branch→stage table, and the workflow inventory under [`.github/workflows/`](.github/workflows/). Helper scripts live in [`scripts/ci/`](scripts/ci/). Runbooks: [`rollback.md`](docs/runbooks/rollback.md), [`neon-pre-migration-branch.md`](docs/runbooks/neon-pre-migration-branch.md), [`new-subenv.md`](docs/runbooks/new-subenv.md).

**Infrastructure:** Terraform lives under [`terraform/environments/{sandbox,production}`](terraform/) with reusable modules in [`terraform/modules/`](terraform/modules/). State key per stage: `spectra/${main_env}/${environment}/terraform.tfstate`.

## Local development

Bring up the entire stack — three Angular UIs, the Expo platform UI, every Node API, and a local Postgres — on one machine.

**Prereqs:** Docker (Compose v2), Node 20.19+ (`nvm use`).

**One-time setup:**

```sh
cp .env.local.example .env.local       # local Postgres URL + DATABASE_DRIVER=pg
npm install
npm run dev:db                          # starts postgres container + applies drizzle migrations
```

**Run everything (two equivalent paths):**

- **CLI:** `npm run dev:all` — boots Postgres, runs migrations, then `dev:apis` and `dev:uis` in parallel via `concurrently`.
- **VS Code (with breakpoints):** Run & Debug — pick **`🟢 Full Stack (Local)`** for every API and UI (including Expo Web), or use the smaller compounds below. Each launch clears typical dev ports first (`kill-local-dev-ports`) so leftover `nx serve` processes do not hit `EADDRINUSE`.

### VS Code: Run & Debug compounds

**Hybrid local model:** Postgres runs in **Docker** ([`docker-compose.yml`](docker-compose.yml)); Node APIs, Angular apps, and Expo run **on the host** via Nx (same idea as `npm run dev:all`).

**Database bootstrap:** Compounds that start **`aviate-api`** and/or **`admin-ui-api`** (Expo compounds, focused Admin/Sandbox/Platform stacks, and **`🟢 Full Stack (Local)`**) set a compound-level **`preLaunchTask`** of **`db-migrate-local`**, which runs `kill-local-dev-ports` → `docker compose up -d --wait postgres` → Drizzle migrate against **localhost:5432** (see [`.vscode/tasks.json`](.vscode/tasks.json)). **Docker must be running** or that task fails before any app starts. Do not repoint that task’s `DATABASE_URL` at Neon or another remote DB; migrations are intended for **local Docker Postgres** only.

**Duplicate work:** Individual launch configs may still run **`kill-local-dev-ports`** (and **`Debug api-gateway with Nx`** still chains **`db-migrate-local`** on its own). Starting a compound can therefore run kill/migrate more than once; that is intentional so solo launches keep working.

**Expo-focused compounds (`expo` group):** **`📱 Launch Expo Platform`** starts **aviate-api**, **admin-ui-api**, **ml-camp**, **admin-ui**, **sandbox-ui**, and **Platform (Expo)** without extra `--inspect` ports on the three APIs (Launch configs only). **`🐛 Debug Expo Platform`** / **`🌐 Debug Expo Web Only`** use the debuggable API entries (inspectors **9230**, **9231**, **9235**). **`ml-camp`** is included for parity with `dev:apis`; the Expo app only calls **aviate-api** (**3001**) today, not **3006**.

**Focused stacks (`focused` group):** **`🛠 Launch Admin stack`** / **`🐛 Debug Admin stack`** (admin API + admin UI), **`🛠 Launch Sandbox stack`** / **`🐛 Debug Sandbox stack`** (aviate + sandbox UI), **`🛠 Launch Platform only`** / **`🐛 Debug Platform only`** (aviate + Expo native). **`🌐 Debug Expo Web Only`** remains the Expo **web** entry. **`api-gateway`**, **`seq-api`**, **`quantum-api`**, and **`corridor-api`** are not part of those slices; use **`🟢 Full Stack (Local)`** or start services individually. **`spectra-ui`** (gateway **:3000**) is a separate workflow from the Expo-focused compounds.

**Parallel startup:** VS Code starts compound members in parallel. If a UI shows an error on first load, wait for APIs to listen and **refresh** once.

**Many debug sessions:** Large compounds open many integrated terminals and multiple **`--inspect`** listeners; pick the correct process in the debugger when setting breakpoints.

**Compound `preLaunchTask`:** Requires a current **VS Code** or **Cursor** build. If the task never runs, run **`npm run dev:db`** manually, then start the compound again.

**Angular breakpoints:** The **`Serve *`** entries run **`nx serve`** only. For component/TypeScript breakpoints in the browser, use the built-in **JavaScript Debugger**: attach to `http://localhost:4200`, `http://localhost:4201`, or `http://localhost:4202`, or use **Launch Chrome** against that URL.

**Expo / Metro:** See [Expo debugging tools](https://docs.expo.dev/debugging/tools/) for dev client and editor workflows. This repo’s **`Platform (Expo)`** config runs **`npm start`** under [`apps/platform`](apps/platform).

**Expo on a device or emulator:** `EXPO_PUBLIC_API_URL=http://localhost:3001` is correct for **Expo Web / same machine**. On a **phone or emulator**, `localhost` refers to the device; use your host machine’s LAN IP or tunneling so the client can reach **aviate-api** on the host.

**Uploads:** APIs can start without **`SPECTRA_UPLOADS_BUCKET`**; upload routes still need the env described in the **Uploads** section at the top of this README.

**Stop:** `Ctrl+C` the dev script, then `npm run dev:down` to stop the Postgres container. To wipe data: `docker volume rm spectra-pgdata`.

**Port map:**

| Layer    | Project          | URL                            | Inspect |
| -------- | ---------------- | ------------------------------ | ------- |
| UI       | `spectra-ui`     | <http://localhost:4200>        | —       |
| UI       | `sandbox-ui`     | <http://localhost:4201>        | —       |
| UI       | `admin-ui`       | <http://localhost:4202>        | —       |
| UI       | `platform` (Expo)| <http://localhost:8081>        | —       |
| Service  | `api-gateway`    | <http://localhost:3000>        | 9229    |
| Service  | `aviate-api`     | <http://localhost:3001>        | 9230    |
| Service  | `admin-ui-api`   | <http://localhost:3002>        | 9231    |
| Service  | `seq-api` (stub) | <http://localhost:3003>        | 9232    |
| Service  | `quantum-api` (stub) | <http://localhost:3004>    | 9233    |
| Service  | `corridor-api` (stub)| <http://localhost:3005>    | 9234    |
| Service  | `ml-camp` (stub) | <http://localhost:3006>        | 9235    |
| Database | Postgres (Docker)| `postgresql://spectra:spectra@localhost:5432/spectra` | — |

**Angular → API (local dev):** `nx serve` uses `environment.development.ts` for each app — `spectra-ui` calls **api-gateway** at `http://127.0.0.1:3000`, `sandbox-ui` → **aviate-api** at `3001`, `admin-ui` → **admin-ui-api** at `3002`. Those three services enable permissive CORS so browser requests from `:4200`–`:4202` succeed. Staff **Auth0** for `admin-ui` is driven by **`apps/admin-ui/.env`** (or root `.env` `ADMIN_UI_*` keys); see [apps/admin-ui/docs/auth0.md](apps/admin-ui/docs/auth0.md).

**Switching DB targets:** set **`SPECTRA_DB_TARGET`** to **`local`** or **`neon`** (see [`.env.example`](.env.example)). `local` uses **`LOCAL_DATABASE_URL`** or the default `postgresql://spectra:spectra@localhost:5432/spectra`; `neon` uses **`NEON_DATABASE_URL`** then **`DATABASE_URL`**. If the flag is unset, behavior is unchanged: **`DATABASE_URL` ?? `NEON_DATABASE_URL`**. You can still override with **`.env.local`** on top of a Neon `.env`. Driver selection: `node-postgres` (`pg`) when `DATABASE_DRIVER=pg` or the resolved URL’s host is loopback, otherwise Neon HTTP — see [`packages/database/src/lib/connection.ts`](packages/database/src/lib/connection.ts).

**Per-service env:** copy each `apps/.../.env.development.example` to `.env.development` (gitignored) if you want to override port/host per service. Nx's executor loads `.env.development` automatically when serving the default `development` configuration.

**Troubleshooting:**

- Port already in use → another `nx serve` is still running; check `ps -ef | grep nx`.
- `db:migrate` complains about Neon WebSocket → `dev:db` already overrides `DATABASE_URL` to the local Postgres so this should not happen; if it does, ensure your shell is bash/sh.
- `GET /v1/platform/ready` shows `database: fail` with Docker up → ensure `apps/services/aviate-api/.env.development` exists (copy from `.env.development.example`); the app loads workspace `.env`, then `.env.local`, then that file so local Postgres overrides Neon in a root `.env`.
- Reset the schema: `docker compose down && docker volume rm spectra-pgdata && npm run dev:db`.

---

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

Nx workspace — run `npx nx graph` to explore projects.

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Run tasks

To run tasks with Nx use:

```sh
npx nx <target> <project-name>
```

For example:

```sh
npx nx build myproject
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

To install a new plugin you can use the `nx add` command. Here's an example of adding the React plugin:
```sh
npx nx add @nx/react
```

Use the plugin's generator to create new projects. For example, to create a new React app or library:

```sh
# Generate an app
npx nx g @nx/react:app demo

# Generate a library
npx nx g @nx/react:lib some-lib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
