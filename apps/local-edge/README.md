# local-edge

**Local development only.** This Nx app is a small Express process on **port 3000** (default): permissive CORS, liveness routes, and a **reverse proxy** to the public API backends. It is **not** deployed to AWS and is **not** Amazon API Gateway.

- **Run:** `npx nx serve local-edge` (or use **Serve local-edge** / **Debug local-edge with Nx** in VS Code Run & Debug).
- **Health:** `GET /v1/local-edge/health`, `GET /v1/local-edge/ready`
- **Proxy:** `/v1/platform` → aviate-api `:3001`, `/v1/seq` → `:3003`, `/v1/quantum` → `:3004`, `/v1/corridor` → `:3005`, `/docs` → aviate-api Swagger UI
- **Consumers:** `spectra-ui` and **`sandbox-ui`** use `http://127.0.0.1:3000` as `apiBaseUrl` in development
- **Production public API:** HTTP API Gateway and routes are defined in Terraform — see [`terraform/modules/api_http`](../../terraform/modules/api_http).

## Legacy AWS cleanup

If an older pipeline created a Lambda named for **`api-gateway`** in your account, remove it from the AWS Console (Lambda → delete) or via CLI when you no longer need it. CI/CD no longer builds or deploys this artifact.
