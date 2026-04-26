# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Public, read-only Svelte 5 + TypeScript SPA on Cloudflare Pages,
sourcing data from PostgREST against the `referi` Postgres database in
`gentrexha/maybornai-monorepo`. Two views: a leaderboard and a
recent-matches feed. n8n is the only writer; this app never POSTs.

- **Live:** https://referi.pages.dev
- **API:** https://referi-api.gentrexha.xyz

`README.md` covers the stack, env vars, and dev commands.
`docs/superpowers/specs/` holds the design spec and
`docs/superpowers/plans/` the implementation plan; don't duplicate
their contents here.

## Where things live

```
src/
├── App.svelte          # 2-tab shell, picks view + lazy-loads stores
├── lib/
│   ├── api.ts          # PostgREST fetch + schema-leak guard
│   ├── config.ts       # reads VITE_REFERI_API_URL, throws if missing
│   ├── format.ts       # date/winner/win-rate formatters
│   └── types.ts        # PlayerStats, MatchFeedEntry, AsyncState
├── stores/             # Svelte writable + .load() per view
└── components/         # Leaderboard, MatchFeed (state-aware)

e2e/                    # Playwright specs + JSON fixtures (mocked network)
```

Tests live next to the file they cover (`Foo.ts` ↔ `Foo.test.ts`).

## Critical points

1. **Single env var:** `VITE_REFERI_API_URL`. Set in `.env.local` for
   dev and Cloudflare Pages env for prod. The app throws at boot if
   it's missing (see `src/lib/config.ts`).

2. **No SDK, just `fetch`.** PostgREST does the work. Do not pull in
   `postgrest-js` or `@supabase/*`.

3. **Schema-leak guard.** `src/lib/api.ts` rejects responses that
   contain any `*_jid`-suffixed keys. If a future view ever exposes
   one, the app fails loud (and `api.test.ts` catches it earlier).

4. **Component tests need a per-file env pragma.** Vite Plus's
   vitest config doesn't always pass `environment: 'jsdom'` through to
   files importing `@testing-library/svelte`. Top of every component
   `.test.ts` should start with `// @vitest-environment jsdom`. Pure-TS
   tests (under `lib/`, `stores/`) don't need it.

5. **Vite Plus is the toolchain entry point.** All scripts go through
   `vp` (`vp dev`, `vp build`, `vp test`, `vp check`). The bare `vite`
   and `vitest` packages are transitive deps only — do not add them as
   direct deps.

6. **`.npmrc` hoists `vite`/`vitest`/types** out of pnpm's strict
   isolation. Without it, vite-plus can't load `vite.config.ts`. Don't
   delete the file thinking it's redundant.

7. **Cloudflare Pages auto-deploys on push to `main` via GitHub
   Actions** (NOT via Cloudflare's native Git integration). The
   `deploy` job in `ci.yml` runs `cloudflare/wrangler-action@v3` with
   `pages deploy dist`. Required GH secrets:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. The platform-side
   PostgREST + Caddy bits live in `maybornai-monorepo` and deploy
   independently via that repo's normal `deploy.sh` flow.

8. **CI artifact order is load-bearing.** Playwright's `webServer`
   command rebuilds `dist/` with `VITE_REFERI_API_URL=https://referi-api.e2e.test`
   so e2e specs hit mocked routes. The production-flavored `dist/`
   MUST be uploaded as an artifact BEFORE Playwright runs, otherwise
   the deploy job will ship the e2e bundle. See `.github/workflows/ci.yml`
   — the order `Production build → Upload dist → Install Playwright →
E2E` is intentional, not a stylistic choice.

9. **Don't add CORS headers in Caddy for this API.** PostgREST sets
   them itself. The Caddy snippet (`maybornai-monorepo/caddy.d/referi-api.caddy`)
   is just a reverse proxy — adding a duplicate
   `Access-Control-Allow-Origin: *` produces the spec-illegal
   `*, *` and browsers refuse the response.

## Tools available

- `/playwright` plugin — for browser automation when iterating on
  visual changes locally.
- `/frontend-design:frontend-design` plugin — pair with screenshots
  of the running `pnpm dev` server.

## First-time setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm exec playwright install chromium    # only needed before first e2e run
```

## Common commands

```bash
pnpm dev                              # local dev server (http://localhost:5173)
pnpm exec vp check                    # lint + format-check + typecheck
pnpm exec vp check --fix              # auto-fix formatting before commit
pnpm exec vp test run                 # all unit + component tests, headless
pnpm exec vp test run <pattern>       # single test file or matching pattern
pnpm exec vp build                    # production build → dist/
pnpm exec playwright test             # e2e against built bundle (vite preview)
```

## Manual deploy (when CI is bypassed or you're testing a one-off)

```bash
VITE_REFERI_API_URL=https://referi-api.gentrexha.xyz pnpm exec vp build
wrangler pages deploy dist --project-name=referi --branch=main
```

Requires `wrangler login` once. The `--branch=main` flag tags the
deploy as production; omit it for a preview deploy on a uniquely-hashed
URL.

## Don'ts

- Don't add a router until bookmarkable URLs are an actual ask.
- Don't add data caching/SWR libraries; the app fetches once per tab
  view and that's enough.
- Don't write to PostgREST. n8n owns the write path.
- Don't write `vp test --run`; Vite Plus uses positional `vp test run`
  for non-watch mode (the standard vitest `--run` flag isn't wired up).
