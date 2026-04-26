# referi-frontend — design spec

**Date:** 2026-04-26
**Status:** draft, pending review
**Repo:** `referi-frontend` (new, separate from `maybornai-monorepo`)

## Goal

Public read-only web app showing leaderboard and match history for the
WhatsApp pickup-football tracker. Data is written by the existing
`referi.json` n8n workflow into the `referi` Postgres database on the
Hetzner platform; the frontend is a standalone SPA on Cloudflare Pages
that reads through PostgREST.

## Scope

In:

- Two views in a single SPA: a leaderboard and a recent-matches feed.
- One platform-side migration adding a public-safe view + role to the
  existing `referi` database.
- One PostgREST service added to `maybornai-monorepo`'s
  `compose.yml` and Caddy config.
- Full CI: lint, format-check, type-check, unit + component tests,
  Playwright e2e against the production build.
- Cloudflare Pages auto-deploy on push to `main` via the GitHub
  integration.

Out:

- Authentication / per-user data. The site is fully public.
- Per-player profile pages. (Possible follow-up; not v1.)
- Writing data from the frontend. n8n stays the only writer.
- Live-DB integration tests in CI.
- Synthetic monitoring of the live API. (Possible follow-up.)
- Custom domain on Cloudflare Pages. Defaults to `*.pages.dev`.

## Architecture

```
   Browser
     │ GET https://referi-api.gentrexha.xyz/...
     ▼
   Hetzner box ──► Caddy (host) ──► localhost:3001
                                       │
                                       ▼
                          postgrest container
                                       │ maybornai-network
                                       ▼
                          postgres container, db=referi
                                       ▲
                                       │ writes via record_match()
                          n8n (referi.json — existing, untouched)


   Browser ◄── Cloudflare Pages CDN ◄── push to main on referi-frontend
```

Two independent moving parts: the read path (Pages → PostgREST →
Postgres), and the existing write path (n8n → Postgres). They share
only the database.

## Data layer

### Schema additions (one new migration: `db/referi/004_public_views.sql` in `maybornai-monorepo`)

1. `referi.match_feed` — flat view that does the team-roster join +
   JSON aggregation server-side, so the frontend gets a single
   round-trip per page load. Deliberately omits `raw_roster_text`,
   `raw_referi_text`, `players_hash`, `*_message_id`, and `phone_jid`.
   Returns: `id`, `played_on`, `winner`, `team_1_label`,
   `team_2_label`, `recorded_at`, `team_1_players` (jsonb array of
   display names), `team_2_players` (jsonb array of display names).

2. `authenticator` role (LOGIN, password-protected) — the role
   PostgREST connects as.

3. `web_anon` role (NOLOGIN) — the role PostgREST switches into for
   anonymous requests. Granted `SELECT` on `referi.player_stats` and
   `referi.match_feed` only. `authenticator` is granted
   `web_anon`.

4. `USAGE` on the `referi` schema for both roles, so PostgREST can
   introspect.

### Endpoints exposed

| URL                                                                                  | Purpose        |
| ------------------------------------------------------------------------------------ | -------------- |
| `GET /player_stats?order=win_rate_pct.desc.nullslast,wins.desc&matches_played=gte.1` | Leaderboard    |
| `GET /match_feed?order=played_on.desc,id.desc&limit=20`                              | Recent matches |

Filtering, ordering, and pagination come from PostgREST for free —
no SDK on the frontend, just `fetch`. CORS allows the Pages origin
(handled in the Caddy snippet, since PostgREST's own CORS handling
needs config and Caddy already does it for the rest of the platform).

## Frontend

### Stack

- **Svelte 5 + TypeScript (strict).**
- **Vite Plus** as the unified toolchain — one config file, one
  dependency, covers dev / build / test / lint / format / staged-file
  hooks.
- **Tailwind CSS** for styling. Default-friendly to the
  `/frontend-design` plugin.
- **No router** — `App.svelte` holds a `view` signal and conditionally
  renders `Leaderboard` or `MatchFeed`. A hash router can be added
  later if bookmarkable URLs become a real ask.
- **No data lib** — plain `fetch` to two URLs, results held in Svelte
  stores. PostgREST does the work the SDK would have done.

### File structure

```
referi-frontend/
├── .github/workflows/ci.yml
├── .gitignore
├── CLAUDE.md
├── README.md
├── docs/superpowers/specs/2026-04-26-referi-frontend-design.md
├── e2e/
│   ├── leaderboard.spec.ts
│   └── match-history.spec.ts
├── playwright.config.ts
├── public/favicon.svg
├── src/
│   ├── main.ts
│   ├── App.svelte                # 2-tab shell
│   ├── app.css                   # Tailwind entrypoint
│   ├── lib/
│   │   ├── api.ts                # fetch wrappers around the 2 endpoints
│   │   ├── api.test.ts
│   │   ├── format.ts             # date / winner / win-rate formatters
│   │   └── format.test.ts
│   └── components/
│       ├── Leaderboard.svelte
│       ├── Leaderboard.test.ts   # @testing-library/svelte
│       ├── MatchFeed.svelte
│       └── MatchFeed.test.ts
├── svelte.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts                # unified Vite Plus config
└── package.json
```

### State

Two stores: one for the leaderboard payload, one for the match feed.
Each holds `{ status: 'idle' | 'loading' | 'ready' | 'error', data?, error? }`
and is loaded once on first view of its tab. No reactive refetch on
focus or interval — fits "live on page load" without thrashing
PostgREST.

### Empty / error states

- **Empty leaderboard** (no players yet): friendly message + brief
  text explaining how matches get recorded.
- **Empty match feed**: same pattern.
- **Network or 5xx error**: skeleton loader → inline error banner with
  a "Retry" button. No toasts.
- **Loading**: skeleton rows for the leaderboard, skeleton cards for
  the feed.

## Deployment & CI

### Cloudflare Pages

Connected to the `referi-frontend` GitHub repo via the standard
GitHub integration. Build command: `vp build`. Output directory:
`dist/`. Preview URL on every PR. Production deploy on push to
`main`. No DNS work — we use the default `*.pages.dev` URL.

### `.github/workflows/ci.yml`

Runs on every PR + push to `main`:

```yaml
- vp install --frozen-lockfile
- vp check # oxlint + oxfmt --check + tsc
- vp test --run # vitest headless
- vp build
- vp exec playwright install --with-deps chromium
- vp exec playwright test
```

(Vite Plus's `vp install` adapts to whichever package manager the
project uses — pnpm/npm/yarn/bun. The scaffold picks one at
`vp create` time and pins it via `packageManager` in `package.json`.)

Playwright runs against `vite preview` of the production build, with
network mocking against deterministic fixtures — no live PostgREST
dependency in CI.

### Pre-commit

Vite Plus's `staged:` config block handles staged-file lint/format on
commit. `commitizen` enforces conventional-commit messages.

### Platform-side PR (one-time, then CI handles updates via push)

A single PR to `maybornai-monorepo` adds:

1. `caddy.d/referi-api.caddy` — reverse-proxy `referi-api.gentrexha.xyz`
   → `localhost:3001`, with explicit `Access-Control-Allow-Origin` for
   the Pages origin and `encode gzip`.
2. `compose.yml` — new `postgrest` service: image
   `postgrest/postgrest`, port `127.0.0.1:3001:3000`, on
   `maybornai-network`, env from `.env`.
3. `.env.example` — `REFERI_POSTGREST_AUTHENTICATOR_PASSWORD=…`,
   `PGRST_DB_SCHEMAS=referi`, `PGRST_DB_ANON_ROLE=web_anon`,
   `PGRST_OPENAPI_SERVER_PROXY_URI=https://referi-api.gentrexha.xyz`.
4. `db/referi/004_public_views.sql` — the view + roles + grants.
5. `db/referi/README.md` — one-time bootstrap step to apply `004` and
   set the authenticator password on existing servers (since
   `init-db.sh` only runs on first container start).

After this PR lands, the platform's normal `deploy.sh` flow brings up
PostgREST, applies new Caddy config, and the frontend (already on
Cloudflare Pages) starts seeing data.

## Testing strategy

| Level     | Tool                             | Coverage                                                                                                                          |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Unit      | Vitest                           | `format.ts`, `api.ts` (mocked `fetch`), store transitions                                                                         |
| Component | @testing-library/svelte + Vitest | `Leaderboard` renders rows; `MatchFeed` renders cards; loading + empty + error states                                             |
| E2E       | Playwright                       | leaderboard tab loads with expected columns; matches tab loads with cards; tab switch; against `vite preview` with mocked network |

A schema-leak guard in `api.test.ts`: assert that fetched objects
contain no `phone_jid` or `_jid`-suffixed keys. If a future view
mistakenly exposes one, the test fails.

## Risks & open questions

| Concern                         | Mitigation                                                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CORS misconfig                  | Caddy snippet sets `Access-Control-Allow-Origin` explicitly; verified manually with `curl -I -H "Origin: https://<project>.pages.dev"` after the platform-side PR lands. (E2E in CI uses mocked fetch and cannot exercise CORS.) |
| Schema leak                     | `web_anon` SELECT-list is the only public surface; CI test asserts no JID keys                                                                                                                                                   |
| n8n schema drift                | The two views are the contract; future `record_match` changes don't affect them unless we choose to widen the views                                                                                                              |
| Pages free-tier limits          | 500 builds/month, 100k req/day — well above expected traffic                                                                                                                                                                     |
| Authenticator password rotation | Documented in platform README; rotate by updating `.env` and bouncing the postgrest container                                                                                                                                    |

## Out-of-scope follow-ups

- Per-player profile pages (route + sub-view).
- Synthetic monitoring of `referi-api.gentrexha.xyz`.
- Custom domain on Cloudflare Pages.
- Live-DB integration tests in CI (probably not worth it; covered
  upstream).
- A hash router if bookmarkable views become a need.

## Implementation handoff

Next step: invoke the `superpowers:writing-plans` skill to break this
spec into a step-by-step implementation plan, including:

- Repo bootstrap (Vite Plus scaffolding).
- Tailwind + tsconfig + svelte config.
- API client + format utilities (test-driven).
- Components with their unit tests.
- Playwright config + e2e specs.
- GitHub Actions CI.
- Cloudflare Pages project creation.
- Platform-side PR to `maybornai-monorepo`.
- CLAUDE.md authoring + improvement via
  `/claude-md-management:claude-md-improver`.
