# referi-frontend

Public read-only frontend for the **referi** WhatsApp pickup-football
match tracker. Reads a leaderboard and recent-matches feed from
PostgREST, served over HTTPS by the Hetzner platform that hosts the
write-side n8n workflow.

- **Live:** https://referi-frontend.pages.dev
- **API:** https://referi-api.gentrexha.xyz
- **Spec:** [`docs/superpowers/specs/2026-04-26-referi-frontend-design.md`](docs/superpowers/specs/2026-04-26-referi-frontend-design.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-04-26-referi-frontend.md`](docs/superpowers/plans/2026-04-26-referi-frontend.md)

## Stack

- **Svelte 5** + TypeScript (strict)
- **Vite Plus** unified toolchain (Vite + Vitest + Oxlint + Oxfmt)
- **Tailwind CSS v4**
- **@testing-library/svelte** for component tests
- **Playwright** for e2e
- Hosted on **Cloudflare Pages**, auto-deployed from GitHub Actions
  (`cloudflare/wrangler-action@v3`, not the Pages native Git integration)

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # edit if your API lives elsewhere
pnpm dev                            # http://localhost:5173
```

## Tasks

| Task                              | Command                     |
| --------------------------------- | --------------------------- |
| Dev server                        | `pnpm dev`                  |
| Build                             | `pnpm exec vp build`        |
| Lint + format + typecheck         | `pnpm exec vp check`        |
| Unit + component tests            | `pnpm exec vp test run`     |
| E2E (built once via vite preview) | `pnpm exec playwright test` |

## Environment

| Var                   | Where it's used     | Example                            |
| --------------------- | ------------------- | ---------------------------------- |
| `VITE_REFERI_API_URL` | Build- and run-time | `https://referi-api.gentrexha.xyz` |

In Cloudflare Pages: set this in **Project → Settings → Environment
variables**.

## Deployment

CI builds and uploads the `dist/` artifact, and a separate `deploy`
job calls Wrangler to push to Cloudflare Pages:

```
push main → CI: vp check → vp test run → vp build → upload dist
                                              │
                                              ▼ (if CI green)
                              wrangler pages deploy dist
                              → https://referi-frontend.pages.dev
```

GitHub Actions secrets required (set in
**Settings → Secrets and variables → Actions**):

| Secret                  | How to get it                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | https://dash.cloudflare.com/profile/api-tokens — "Edit Cloudflare Workers" template covers Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Account home page in dashboard, or `wrangler whoami`                                             |

Optional repo-level **variable** (`Settings → Variables`):
`VITE_REFERI_API_URL` — overrides the default
`https://referi-api.gentrexha.xyz` baked into the build.

Manual deploy (bypassing CI):

```bash
VITE_REFERI_API_URL=https://referi-api.gentrexha.xyz pnpm exec vp build
wrangler pages deploy dist --project-name=referi-frontend --branch=main
```

## Platform side

The PostgREST service, Caddy reverse-proxy, and SQL migration that
power this frontend live in `gentrexha/maybornai-monorepo`. See that
repo's `db/referi/README.md` for the bootstrap steps. The Caddy
snippet for `referi-api.gentrexha.xyz` is intentionally minimal
(reverse proxy + gzip only) — PostgREST sets CORS headers itself, and
duplicating them in Caddy fails browsers' single-value rule on
`Access-Control-Allow-Origin`.
