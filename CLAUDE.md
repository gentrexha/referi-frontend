# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Public, read-only Svelte 5 + TypeScript SPA on Cloudflare Pages,
sourcing data from PostgREST against the `referi` Postgres database in
`gentrexha/maybornai-monorepo`. Two views: a leaderboard and a
recent-matches feed. n8n is the only writer; this app never POSTs.

`README.md` covers the stack, env vars, and dev commands.
`docs/superpowers/specs/` holds the design spec and
`docs/superpowers/plans/` the implementation plan; don't duplicate
their contents here.

## Critical points

1. **Single env var:** `VITE_REFERI_API_URL`. Set in `.env.local` for
   dev and Cloudflare Pages env for prod. The app throws at boot if
   it's missing (see `src/lib/config.ts`).

2. **No SDK, just `fetch`.** PostgREST does the work. Do not pull in
   `postgrest-js` or `@supabase/*`.

3. **Schema-leak guard.** `src/lib/api.ts` rejects responses that
   contain any `*_jid`-suffixed keys. If a future view ever exposes
   one, the app fails loud (and `api.test.ts` catches it earlier).

4. **Tests live next to source.** `*.test.ts` next to `*.svelte`/`*.ts`.
   Vitest + jsdom + testing-library/svelte. `e2e/` is Playwright only.

5. **Vite Plus is the toolchain entry point.** All scripts go through
   `vp` (`vp dev`, `vp build`, `vp test`, `vp check`). The bare `vite`
   and `vitest` packages are transitive deps only — do not add them as
   direct deps.

6. **`.npmrc` hoists `vite`/`vitest`/types** out of pnpm's strict
   isolation. Without it, vite-plus can't load `vite.config.ts`. Don't
   delete the file thinking it's redundant.

7. **Cloudflare Pages auto-deploys on push to `main`.** No manual
   deploy step. The platform-side PostgREST + Caddy bits live in
   `maybornai-monorepo` and deploy independently via that repo's
   normal `deploy.sh` flow.

## Tools available

- `/playwright` plugin — for browser automation when iterating on
  visual changes locally.
- `/frontend-design:frontend-design` plugin — pair with screenshots
  of the running `pnpm dev` server.

## Common commands

```bash
pnpm dev                              # local dev server
pnpm exec vp check                    # lint + format + typecheck
pnpm exec vp test run                 # unit + component tests
pnpm exec vp build                    # production build
pnpm exec playwright test             # e2e against built bundle
```

## Don'ts

- Don't add a router until bookmarkable URLs are an actual ask.
- Don't add data caching/SWR libraries; the app fetches once per tab
  view and that's enough.
- Don't write to PostgREST. n8n owns the write path.
- Don't replace `vp test --run` with `vp test --run`. Vite Plus uses
  positional `vp test run` for non-watch mode.
