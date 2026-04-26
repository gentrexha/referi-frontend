# referi-frontend

Public read-only frontend for the **referi** WhatsApp pickup-football
match tracker. Reads a leaderboard and recent-matches feed from
PostgREST, served over HTTPS by the Hetzner platform that hosts the
write-side n8n workflow.

- **Live:** https://&lt;project&gt;.pages.dev
- **API:** https://referi-api.gentrexha.xyz
- **Spec:** [`docs/superpowers/specs/2026-04-26-referi-frontend-design.md`](docs/superpowers/specs/2026-04-26-referi-frontend-design.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-04-26-referi-frontend.md`](docs/superpowers/plans/2026-04-26-referi-frontend.md)

## Stack

- **Svelte 5** + TypeScript (strict)
- **Vite Plus** unified toolchain (Vite + Vitest + Oxlint + Oxfmt)
- **Tailwind CSS v4**
- **@testing-library/svelte** for component tests
- **Playwright** for e2e
- Hosted on **Cloudflare Pages**, GitHub-integration auto-deploy

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

`main` is connected to a Cloudflare Pages project via the standard
GitHub integration:

| Setting          | Value                |
| ---------------- | -------------------- |
| Framework preset | Svelte (or "None")   |
| Build command    | `pnpm exec vp build` |
| Build output dir | `dist`               |
| Root directory   | `/`                  |
| Node.js version  | 22                   |

## Platform side

The PostgREST service, Caddy reverse-proxy, and SQL migration that
power this frontend live in `gentrexha/maybornai-monorepo`. See that
repo's `db/referi/README.md` for the bootstrap steps.
