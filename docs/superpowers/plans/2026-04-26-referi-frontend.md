# referi-frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, read-only Svelte SPA on Cloudflare Pages that shows a leaderboard and recent-match feed for the WhatsApp pickup-football tracker, sourcing data through PostgREST against the existing `referi` Postgres database.

**Architecture:** Two-tab Svelte 5 + TypeScript SPA, plain `fetch` against two PostgREST endpoints, results held in Svelte stores. Hosted on Cloudflare Pages with auto-deploy from GitHub. Platform side adds one PostgREST service + Caddy snippet + SQL migration to `maybornai-monorepo`.

**Tech Stack:** Svelte 5, TypeScript (strict), Vite Plus (Vite + Vitest + Oxlint + Oxfmt + Vite Task), Tailwind CSS v4, @testing-library/svelte, Playwright, GitHub Actions, Cloudflare Pages, PostgREST.

**Spec:** `docs/superpowers/specs/2026-04-26-referi-frontend-design.md`

---

## File Structure

After this plan completes, the `referi-frontend` repo looks like:

```
referi-frontend/
├── .github/workflows/ci.yml             # lint + typecheck + unit + build + e2e
├── .gitignore                           # already exists; will be merged with scaffold output
├── CLAUDE.md                            # written then improved via claude-md-improver
├── README.md                            # quickstart, deploy, troubleshooting
├── docs/
│   └── superpowers/
│       ├── specs/2026-04-26-referi-frontend-design.md   (already exists)
│       └── plans/2026-04-26-referi-frontend.md          (this file)
├── e2e/
│   ├── fixtures/
│   │   ├── leaderboard.json             # deterministic stub for player_stats
│   │   └── matches.json                 # deterministic stub for match_feed
│   ├── leaderboard.spec.ts
│   ├── match-history.spec.ts
│   └── tab-switch.spec.ts
├── playwright.config.ts
├── public/
│   └── favicon.svg
├── src/
│   ├── main.ts
│   ├── App.svelte                       # 2-tab shell
│   ├── app.css                          # Tailwind v4 entrypoint
│   ├── lib/
│   │   ├── types.ts                     # PlayerStats, MatchFeedEntry, AsyncState
│   │   ├── api.ts                       # fetchLeaderboard, fetchMatchFeed
│   │   ├── api.test.ts                  # incl. schema-leak guard
│   │   ├── format.ts                    # formatDate, formatWinner, formatWinRate
│   │   └── format.test.ts
│   ├── stores/
│   │   ├── leaderboard.ts               # AsyncState<PlayerStats[]> + load()
│   │   ├── leaderboard.test.ts
│   │   ├── matches.ts                   # AsyncState<MatchFeedEntry[]> + load()
│   │   └── matches.test.ts
│   └── components/
│       ├── Leaderboard.svelte
│       ├── Leaderboard.test.ts
│       ├── MatchFeed.svelte
│       └── MatchFeed.test.ts
├── svelte.config.js
├── tsconfig.json
├── tsconfig.node.json                   # for vite.config.ts itself
├── vite.config.ts                       # unified Vite Plus config
└── package.json
```

Files in `maybornai-monorepo` (separate PR — covered in Phase 8):

```
maybornai-monorepo/
├── caddy.d/referi-api.caddy             # NEW
├── compose.yml                          # MODIFIED: postgrest service added
├── .env.example                         # MODIFIED: PGRST_* vars added
├── db/referi/004_public_views.sql       # NEW
└── db/referi/README.md                  # MODIFIED: bootstrap notes for 004
```

---

## Phase 1 — Bootstrap

### Task 1: Scaffold Svelte 5 + TS via Vite Plus into a temp directory

**Files:**

- Create: `_scaffold/` (temporary, removed in Task 2)

We can't run `vp create` directly into `/Users/vienna/Projects/referi-frontend` because the directory already has a git repo and the spec doc. Scaffold into a sibling temp dir and migrate files.

- [ ] **Step 1: Verify Node version**

```bash
node --version
```

Expected: `v20.x.x` or higher (Vite Plus needs ≥20).

- [ ] **Step 2: Run the scaffolder**

From `/Users/vienna/Projects/referi-frontend`:

```bash
npx vite-plus@latest create vite --no-interactive -- _scaffold --template svelte-ts
```

Expected: progress lines ending with `Migrated to vite-plus ✓` and a populated `_scaffold/` directory containing `package.json`, `src/`, `vite.config.ts`, etc.

- [ ] **Step 3: Inspect the scaffold's package.json**

```bash
cat _scaffold/package.json
```

Note: the `packageManager` field (e.g. `"pnpm@9.x.x"`), the `dependencies` and `devDependencies` versions, and the `scripts` block. Subsequent tasks assume `pnpm` — if the scaffold pinned a different package manager, substitute it consistently.

- [ ] **Step 4: Verify the scaffold contains the expected files**

```bash
ls _scaffold/
```

Expected to include at least: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `svelte.config.js`, `src/`, `public/`, `index.html`, `.gitignore`.

---

### Task 2: Move scaffold contents into the repo root

**Files:**

- Create: many (whatever the scaffold produced)
- Modify: `.gitignore` (merge scaffold's into existing)

- [ ] **Step 1: Move all scaffold contents up one level**

```bash
# from /Users/vienna/Projects/referi-frontend
shopt -s dotglob
mv _scaffold/* .
shopt -u dotglob
rmdir _scaffold
```

- [ ] **Step 2: Merge the scaffold's `.gitignore` into the existing one**

The scaffold likely created a `.gitignore` that overwrote ours. Open both and reconcile. The combined file MUST contain:

```gitignore
# OS / editor noise
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json

# Override global ~/.gitignore_global rules that swallow project docs
!docs/

# Node / build artifacts
node_modules/
dist/
coverage/
.vite/
*.tsbuildinfo

# Test outputs
playwright-report/
test-results/
playwright/.cache/

# Env / secrets
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
```

If the scaffold added other lines, keep them too — but verify `!docs/` survives.

- [ ] **Step 3: Install scaffold dependencies (lockfile-creating run)**

```bash
pnpm install
```

Expected: success, generates `pnpm-lock.yaml`, populates `node_modules/`.

(Substitute `npm install` / `bun install` / `yarn` if the scaffold pinned a different `packageManager`.)

- [ ] **Step 4: Smoke-test the scaffold**

```bash
pnpm dev
```

Expected: Vite dev server starts on `http://localhost:5173` showing the default Svelte counter app. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Svelte 5 + TypeScript app via Vite Plus"
```

---

### Task 3: Add Tailwind CSS v4 + jsdom + testing-library

**Files:**

- Modify: `package.json`, `src/app.css`, `vite.config.ts`

- [ ] **Step 1: Add runtime + dev dependencies**

```bash
pnpm add -D tailwindcss @tailwindcss/vite \
  jsdom @testing-library/svelte @testing-library/jest-dom @types/jsdom
```

Expected: `package.json` updated, lockfile updated.

- [ ] **Step 2: Replace `src/app.css` with Tailwind v4 entry**

Open `src/app.css` and replace its entire contents with:

```css
@import "tailwindcss";

:root {
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: #f8fafc;
}
```

- [ ] **Step 3: Wire Tailwind + Vitest into `vite.config.ts`**

Replace the entire contents of `vite.config.ts` with:

```ts
import { defineConfig } from "vite-plus";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],

  server: {
    port: 5173,
    host: true,
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,svelte}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },

  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["unicorn", "typescript"],
    categories: {
      correctness: "error",
      perf: "error",
    },
    ignorePatterns: ["dist/**", "node_modules/**", "e2e/**"],
  },

  fmt: {
    semi: true,
    singleQuote: true,
  },

  staged: {
    "*.{js,ts,svelte}": "vp check --fix",
  },
});
```

- [ ] **Step 4: Create the Vitest setup file**

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Verify Vite still builds**

```bash
pnpm exec vp build
```

Expected: a `dist/` directory with `index.html`, `assets/...`. No type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind v4, jsdom, testing-library, unified vite.config.ts"
```

---

### Task 4: Strict TypeScript + clean default app shell

**Files:**

- Modify: `tsconfig.json`, `src/main.ts`, `src/App.svelte`
- Delete: `src/lib/Counter.svelte`, `src/assets/*`, `public/vite.svg` (if scaffold created them)

- [ ] **Step 1: Open `tsconfig.json` and ensure strict flags**

The scaffold's `tsconfig.json` already extends a Svelte preset; make sure these flags are set under `compilerOptions`:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
  },
}
```

Keep any `extends` and `include` fields the scaffold provided.

- [ ] **Step 2: Strip the default counter from `src/App.svelte`**

Replace the entire file with a temporary stub (we'll fill it in Task 13):

```svelte
<script lang="ts">
  // App shell — wired up in a later task
</script>

<main class="min-h-screen p-6">
  <h1 class="text-2xl font-semibold text-slate-800">referi</h1>
  <p class="text-sm text-slate-500">Coming online…</p>
</main>
```

- [ ] **Step 3: Make sure `src/main.ts` imports `app.css`**

Replace `src/main.ts` with:

```ts
import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
```

- [ ] **Step 4: Delete leftover scaffold files**

```bash
rm -f src/lib/Counter.svelte
rm -rf src/assets
rm -f public/vite.svg
```

- [ ] **Step 5: Replace `index.html`'s default title**

Edit `index.html` and replace the `<title>` element with:

```html
<title>referi — pickup football stats</title>
```

- [ ] **Step 6: Run a clean build**

```bash
pnpm exec vp check
pnpm exec vp build
```

Expected: no errors, no warnings beyond noting the empty App.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: enable strict TS, clear default scaffold, hook up app.css"
```

---

## Phase 2 — Pure-TS tier (TDD)

### Task 5: Type definitions

**Files:**

- Create: `src/lib/types.ts`

These are the contract between PostgREST and the rest of the app. Everything else imports from here.

- [ ] **Step 1: Create the file**

```ts
export type Winner = "team_1" | "team_2" | "draw";

export interface PlayerStats {
  phone_jid?: never; // intentional — the public view MUST NOT return JIDs
  display_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate_pct: number | null;
}

export interface MatchFeedEntry {
  id: number;
  played_on: string; // ISO date: "2026-04-26"
  winner: Winner;
  team_1_label: string;
  team_2_label: string;
  recorded_at: string; // ISO timestamp
  team_1_players: string[]; // display names
  team_2_players: string[];
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: string };
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm exec vp check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: define PlayerStats, MatchFeedEntry, AsyncState types"
```

---

### Task 6: format.ts (TDD)

**Files:**

- Create: `src/lib/format.test.ts` (first), then `src/lib/format.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatWinner, formatWinRate } from "./format";

describe("formatDate", () => {
  it('renders "Apr 26, 2026" for "2026-04-26"', () => {
    expect(formatDate("2026-04-26")).toBe("Apr 26, 2026");
  });

  it('returns "—" for empty input', () => {
    expect(formatDate("")).toBe("—");
  });
});

describe("formatWinner", () => {
  it("returns the winning team label for team_1", () => {
    expect(formatWinner("team_1", "Reds", "Blues")).toBe("Reds won");
  });

  it("returns the winning team label for team_2", () => {
    expect(formatWinner("team_2", "Reds", "Blues")).toBe("Blues won");
  });

  it('returns "Draw" for draw', () => {
    expect(formatWinner("draw", "Reds", "Blues")).toBe("Draw");
  });
});

describe("formatWinRate", () => {
  it('renders "62.5%" for 62.5', () => {
    expect(formatWinRate(62.5)).toBe("62.5%");
  });

  it('renders "100%" for 100', () => {
    expect(formatWinRate(100)).toBe("100%");
  });

  it('renders "—" for null', () => {
    expect(formatWinRate(null)).toBe("—");
  });
});
```

- [ ] **Step 2: Run the test — it must fail**

```bash
pnpm exec vp test --run src/lib/format.test.ts
```

Expected: FAIL with "Failed to resolve import './format'".

- [ ] **Step 3: Create the implementation**

Create `src/lib/format.ts`:

```ts
import type { Winner } from "./types";

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWinner(winner: Winner, team1Label: string, team2Label: string): string {
  if (winner === "draw") return "Draw";
  return `${winner === "team_1" ? team1Label : team2Label} won`;
}

export function formatWinRate(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct}%`;
}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/lib/format.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add format utilities (date, winner, win rate) with tests"
```

---

### Task 7: api.ts (TDD)

**Files:**

- Create: `src/lib/api.test.ts` (first), then `src/lib/api.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchLeaderboard, fetchMatchFeed } from "./api";
import type { MatchFeedEntry, PlayerStats } from "./types";

const BASE = "https://referi-api.test";

describe("fetchLeaderboard", () => {
  it("hits the player_stats endpoint with the expected query", async () => {
    const sample: PlayerStats[] = [
      {
        display_name: "Gent",
        matches_played: 4,
        wins: 3,
        draws: 0,
        losses: 1,
        win_rate_pct: 75,
      },
    ];
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await fetchLeaderboard(BASE, fetchMock);
    expect(out).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      `${BASE}/player_stats?order=win_rate_pct.desc.nullslast,wins.desc&matches_played=gte.1`,
    );
  });

  it("throws on non-2xx", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 503 }));
    await expect(fetchLeaderboard(BASE, fetchMock)).rejects.toThrow(/503/);
  });

  it("rejects responses that contain phone_jid (schema-leak guard)", async () => {
    const leaky = [{ display_name: "X", phone_jid: "123@lid" }];
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(leaky), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(fetchLeaderboard(BASE, fetchMock)).rejects.toThrow(/forbidden field/i);
  });
});

describe("fetchMatchFeed", () => {
  it("hits the match_feed endpoint with limit and order", async () => {
    const sample: MatchFeedEntry[] = [
      {
        id: 1,
        played_on: "2026-04-26",
        winner: "team_1",
        team_1_label: "Reds",
        team_2_label: "Blues",
        recorded_at: "2026-04-26T18:00:00Z",
        team_1_players: ["Gent"],
        team_2_players: ["Donat"],
      },
    ];
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await fetchMatchFeed(BASE, 20, fetchMock);
    expect(out).toEqual(sample);
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/match_feed?order=played_on.desc,id.desc&limit=20`);
  });
});
```

- [ ] **Step 2: Run tests — they must fail**

```bash
pnpm exec vp test --run src/lib/api.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the implementation**

Create `src/lib/api.ts`:

```ts
import type { MatchFeedEntry, PlayerStats } from "./types";

const FORBIDDEN_KEYS = /(^|_)jid$/i;

function assertNoLeakedKeys(rows: unknown): void {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row)) {
        if (FORBIDDEN_KEYS.test(key)) {
          throw new Error(
            `PostgREST returned forbidden field "${key}" — public view leaks internal data`,
          );
        }
      }
    }
  }
}

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PostgREST request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as T;
  assertNoLeakedKeys(body);
  return body;
}

export function fetchLeaderboard(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlayerStats[]> {
  const url = `${baseUrl}/player_stats?order=win_rate_pct.desc.nullslast,wins.desc&matches_played=gte.1`;
  return getJson<PlayerStats[]>(url, fetchImpl);
}

export function fetchMatchFeed(
  baseUrl: string,
  limit = 20,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchFeedEntry[]> {
  const url = `${baseUrl}/match_feed?order=played_on.desc,id.desc&limit=${limit}`;
  return getJson<MatchFeedEntry[]>(url, fetchImpl);
}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/lib/api.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: add PostgREST client with schema-leak guard"
```

---

## Phase 3 — Stores

### Task 8: leaderboard store (TDD)

**Files:**

- Create: `src/stores/leaderboard.test.ts` (first), then `src/stores/leaderboard.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/leaderboard.test.ts`:

```ts
import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createLeaderboardStore } from "./leaderboard";
import type { PlayerStats } from "../lib/types";

const sample: PlayerStats[] = [
  {
    display_name: "Gent",
    matches_played: 4,
    wins: 3,
    draws: 0,
    losses: 1,
    win_rate_pct: 75,
  },
];

describe("leaderboardStore", () => {
  it("starts in idle", () => {
    const fetchMock = vi.fn();
    const store = createLeaderboardStore("https://api.test", fetchMock);
    expect(get(store).status).toBe("idle");
  });

  it("transitions idle → loading → ready on load()", async () => {
    let resolveFetch!: (r: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolveFetch = r)));
    const store = createLeaderboardStore("https://api.test", fetchMock);

    const p = store.load();
    expect(get(store).status).toBe("loading");

    resolveFetch(
      new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await p;

    const state = get(store);
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.data).toEqual(sample);
    }
  });

  it("transitions to error on failure", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    const store = createLeaderboardStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error).toMatch(/500/);
    }
  });
});
```

- [ ] **Step 2: Run — must fail**

```bash
pnpm exec vp test --run src/stores/leaderboard.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the implementation**

Create `src/stores/leaderboard.ts`:

```ts
import { writable, type Writable } from "svelte/store";
import { fetchLeaderboard } from "../lib/api";
import type { AsyncState, PlayerStats } from "../lib/types";

export interface LeaderboardStore extends Writable<AsyncState<PlayerStats[]>> {
  load(): Promise<void>;
}

export function createLeaderboardStore(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): LeaderboardStore {
  const inner = writable<AsyncState<PlayerStats[]>>({ status: "idle" });
  return {
    subscribe: inner.subscribe,
    set: inner.set,
    update: inner.update,
    async load() {
      inner.set({ status: "loading" });
      try {
        const data = await fetchLeaderboard(baseUrl, fetchImpl);
        inner.set({ status: "ready", data });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        inner.set({ status: "error", error });
      }
    },
  };
}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/stores/leaderboard.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/leaderboard.ts src/stores/leaderboard.test.ts
git commit -m "feat: add leaderboard store with idle/loading/ready/error states"
```

---

### Task 9: matches store (TDD)

**Files:**

- Create: `src/stores/matches.test.ts` (first), then `src/stores/matches.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/matches.test.ts`:

```ts
import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createMatchesStore } from "./matches";
import type { MatchFeedEntry } from "../lib/types";

const sample: MatchFeedEntry[] = [
  {
    id: 1,
    played_on: "2026-04-26",
    winner: "team_1",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-26T18:00:00Z",
    team_1_players: ["Gent"],
    team_2_players: ["Donat"],
  },
];

describe("matchesStore", () => {
  it("starts in idle", () => {
    const fetchMock = vi.fn();
    const store = createMatchesStore("https://api.test", fetchMock);
    expect(get(store).status).toBe("idle");
  });

  it("loads and surfaces ready state", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const store = createMatchesStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("ready");
    if (state.status === "ready") expect(state.data).toEqual(sample);
  });

  it("surfaces error on failure", async () => {
    const fetchMock = vi.fn(async () => new Response("x", { status: 502 }));
    const store = createMatchesStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("error");
  });
});
```

- [ ] **Step 2: Run — must fail**

```bash
pnpm exec vp test --run src/stores/matches.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the implementation**

Create `src/stores/matches.ts`:

```ts
import { writable, type Writable } from "svelte/store";
import { fetchMatchFeed } from "../lib/api";
import type { AsyncState, MatchFeedEntry } from "../lib/types";

export interface MatchesStore extends Writable<AsyncState<MatchFeedEntry[]>> {
  load(): Promise<void>;
}

export function createMatchesStore(baseUrl: string, fetchImpl: typeof fetch = fetch): MatchesStore {
  const inner = writable<AsyncState<MatchFeedEntry[]>>({ status: "idle" });
  return {
    subscribe: inner.subscribe,
    set: inner.set,
    update: inner.update,
    async load() {
      inner.set({ status: "loading" });
      try {
        const data = await fetchMatchFeed(baseUrl, 20, fetchImpl);
        inner.set({ status: "ready", data });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        inner.set({ status: "error", error });
      }
    },
  };
}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/stores/matches.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/matches.ts src/stores/matches.test.ts
git commit -m "feat: add matches store"
```

---

## Phase 4 — Components

### Task 10: Leaderboard component (TDD)

**Files:**

- Create: `src/components/Leaderboard.test.ts` (first), then `src/components/Leaderboard.svelte`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Leaderboard.test.ts`:

```ts
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { writable } from "svelte/store";
import Leaderboard from "./Leaderboard.svelte";
import type { AsyncState, PlayerStats } from "../lib/types";

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  display_name: "Gent",
  matches_played: 4,
  wins: 3,
  draws: 0,
  losses: 1,
  win_rate_pct: 75,
  ...over,
});

function withState(state: AsyncState<PlayerStats[]>) {
  return writable<AsyncState<PlayerStats[]>>(state);
}

describe("Leaderboard", () => {
  it("renders skeleton rows when loading", () => {
    render(Leaderboard, { props: { store: withState({ status: "loading" }) } });
    expect(screen.getByTestId("leaderboard-skeleton")).toBeInTheDocument();
  });

  it("renders an empty state when no players", () => {
    render(Leaderboard, {
      props: { store: withState({ status: "ready", data: [] }) },
    });
    expect(screen.getByText(/no matches recorded yet/i)).toBeInTheDocument();
  });

  it("renders a row per player when ready", () => {
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [player({ display_name: "Gent" }), player({ display_name: "Donat" })],
        }),
      },
    });
    expect(screen.getByText("Gent")).toBeInTheDocument();
    expect(screen.getByText("Donat")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders an error banner with retry on error", () => {
    render(Leaderboard, {
      props: {
        store: withState({ status: "error", error: "boom" }),
      },
    });
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — must fail**

```bash
pnpm exec vp test --run src/components/Leaderboard.test.ts
```

- [ ] **Step 3: Create the component**

Create `src/components/Leaderboard.svelte`:

```svelte
<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { AsyncState, PlayerStats } from '../lib/types';
  import { formatWinRate } from '../lib/format';

  interface Props {
    store: Readable<AsyncState<PlayerStats[]>>;
    onRetry?: () => void;
  }

  let { store, onRetry }: Props = $props();
</script>

{#if $store.status === 'idle' || $store.status === 'loading'}
  <div data-testid="leaderboard-skeleton" class="space-y-2">
    {#each [0, 1, 2, 3, 4] as i (i)}
      <div class="h-10 animate-pulse rounded bg-slate-200"></div>
    {/each}
  </div>
{:else if $store.status === 'error'}
  <div class="rounded border border-red-200 bg-red-50 p-4">
    <p class="text-red-800">Couldn't load the leaderboard.</p>
    <p class="mt-1 text-xs text-red-600">{$store.error}</p>
    <button
      type="button"
      class="mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      onclick={() => onRetry?.()}
    >
      Retry
    </button>
  </div>
{:else if $store.data.length === 0}
  <p class="rounded border border-slate-200 bg-white p-6 text-slate-600">
    No matches recorded yet. Stats will appear here once /referi messages start
    landing in the WhatsApp group.
  </p>
{:else}
  <table class="w-full overflow-hidden rounded border border-slate-200 bg-white">
    <thead class="bg-slate-100 text-left text-xs uppercase text-slate-500">
      <tr>
        <th class="p-3">Player</th>
        <th class="p-3 text-right">Played</th>
        <th class="p-3 text-right">W</th>
        <th class="p-3 text-right">D</th>
        <th class="p-3 text-right">L</th>
        <th class="p-3 text-right">Win %</th>
      </tr>
    </thead>
    <tbody>
      {#each $store.data as p (p.display_name)}
        <tr class="border-t border-slate-100">
          <td class="p-3 font-medium text-slate-800">{p.display_name}</td>
          <td class="p-3 text-right text-slate-600">{p.matches_played}</td>
          <td class="p-3 text-right text-slate-600">{p.wins}</td>
          <td class="p-3 text-right text-slate-600">{p.draws}</td>
          <td class="p-3 text-right text-slate-600">{p.losses}</td>
          <td class="p-3 text-right font-semibold text-slate-800">
            {formatWinRate(p.win_rate_pct)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/components/Leaderboard.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Leaderboard.svelte src/components/Leaderboard.test.ts
git commit -m "feat: add Leaderboard component with loading/empty/error states"
```

---

### Task 11: MatchFeed component (TDD)

**Files:**

- Create: `src/components/MatchFeed.test.ts` (first), then `src/components/MatchFeed.svelte`

- [ ] **Step 1: Write the failing tests**

Create `src/components/MatchFeed.test.ts`:

```ts
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { writable } from "svelte/store";
import MatchFeed from "./MatchFeed.svelte";
import type { AsyncState, MatchFeedEntry } from "../lib/types";

const match = (over: Partial<MatchFeedEntry> = {}): MatchFeedEntry => ({
  id: 1,
  played_on: "2026-04-26",
  winner: "team_1",
  team_1_label: "Reds",
  team_2_label: "Blues",
  recorded_at: "2026-04-26T18:00:00Z",
  team_1_players: ["Gent", "Donat"],
  team_2_players: ["Lirim", "Arben"],
  ...over,
});

function withState(state: AsyncState<MatchFeedEntry[]>) {
  return writable<AsyncState<MatchFeedEntry[]>>(state);
}

describe("MatchFeed", () => {
  it("renders skeletons when loading", () => {
    render(MatchFeed, { props: { store: withState({ status: "loading" }) } });
    expect(screen.getByTestId("matches-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when no matches", () => {
    render(MatchFeed, {
      props: { store: withState({ status: "ready", data: [] }) },
    });
    expect(screen.getByText(/no matches recorded yet/i)).toBeInTheDocument();
  });

  it("renders cards with player names + winner", () => {
    render(MatchFeed, {
      props: { store: withState({ status: "ready", data: [match()] }) },
    });
    expect(screen.getByText(/Apr 26, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Reds won/)).toBeInTheDocument();
    expect(screen.getByText("Gent, Donat")).toBeInTheDocument();
    expect(screen.getByText("Lirim, Arben")).toBeInTheDocument();
  });

  it("renders Draw label when winner is draw", () => {
    render(MatchFeed, {
      props: {
        store: withState({
          status: "ready",
          data: [match({ winner: "draw" })],
        }),
      },
    });
    expect(screen.getByText("Draw")).toBeInTheDocument();
  });

  it("shows error banner with retry", () => {
    render(MatchFeed, {
      props: { store: withState({ status: "error", error: "oops" }) },
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — must fail**

```bash
pnpm exec vp test --run src/components/MatchFeed.test.ts
```

- [ ] **Step 3: Create the component**

Create `src/components/MatchFeed.svelte`:

```svelte
<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { AsyncState, MatchFeedEntry } from '../lib/types';
  import { formatDate, formatWinner } from '../lib/format';

  interface Props {
    store: Readable<AsyncState<MatchFeedEntry[]>>;
    onRetry?: () => void;
  }

  let { store, onRetry }: Props = $props();
</script>

{#if $store.status === 'idle' || $store.status === 'loading'}
  <div data-testid="matches-skeleton" class="space-y-3">
    {#each [0, 1, 2] as i (i)}
      <div class="h-24 animate-pulse rounded border border-slate-200 bg-white"></div>
    {/each}
  </div>
{:else if $store.status === 'error'}
  <div class="rounded border border-red-200 bg-red-50 p-4">
    <p class="text-red-800">Couldn't load the match feed.</p>
    <p class="mt-1 text-xs text-red-600">{$store.error}</p>
    <button
      type="button"
      class="mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      onclick={() => onRetry?.()}
    >
      Retry
    </button>
  </div>
{:else if $store.data.length === 0}
  <p class="rounded border border-slate-200 bg-white p-6 text-slate-600">
    No matches recorded yet.
  </p>
{:else}
  <ul class="space-y-3">
    {#each $store.data as m (m.id)}
      <li class="rounded border border-slate-200 bg-white p-4">
        <div class="flex items-baseline justify-between">
          <span class="text-sm font-medium text-slate-500">{formatDate(m.played_on)}</span>
          <span class="text-sm font-semibold text-emerald-700">
            {formatWinner(m.winner, m.team_1_label, m.team_2_label)}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="font-semibold text-slate-700">{m.team_1_label}</p>
            <p class="text-slate-600">{m.team_1_players.join(', ')}</p>
          </div>
          <div>
            <p class="font-semibold text-slate-700">{m.team_2_label}</p>
            <p class="text-slate-600">{m.team_2_players.join(', ')}</p>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm exec vp test --run src/components/MatchFeed.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/MatchFeed.svelte src/components/MatchFeed.test.ts
git commit -m "feat: add MatchFeed component"
```

---

## Phase 5 — App shell

### Task 12: Tabbed App.svelte that wires stores

**Files:**

- Modify: `src/App.svelte`
- Create: `src/lib/config.ts`

- [ ] **Step 1: Create the runtime config module**

Create `src/lib/config.ts`:

```ts
const RAW = import.meta.env.VITE_REFERI_API_URL;
if (!RAW) {
  throw new Error(
    "VITE_REFERI_API_URL is not set — add it to .env.local or your Cloudflare Pages env",
  );
}
export const API_BASE_URL: string = RAW.replace(/\/+$/, "");
```

- [ ] **Step 2: Add a local env file for dev**

Create `.env.local`:

```
VITE_REFERI_API_URL=https://referi-api.gentrexha.xyz
```

(`.env.local` is gitignored — already covered by the `.gitignore`.)

- [ ] **Step 3: Replace `src/App.svelte` with the wired-up shell**

```svelte
<script lang="ts">
  import Leaderboard from './components/Leaderboard.svelte';
  import MatchFeed from './components/MatchFeed.svelte';
  import { createLeaderboardStore } from './stores/leaderboard';
  import { createMatchesStore } from './stores/matches';
  import { API_BASE_URL } from './lib/config';

  const leaderboard = createLeaderboardStore(API_BASE_URL);
  const matches = createMatchesStore(API_BASE_URL);

  type View = 'leaderboard' | 'matches';
  let view: View = $state('leaderboard');
  let leaderboardLoaded = $state(false);
  let matchesLoaded = $state(false);

  $effect(() => {
    if (view === 'leaderboard' && !leaderboardLoaded) {
      leaderboard.load();
      leaderboardLoaded = true;
    }
    if (view === 'matches' && !matchesLoaded) {
      matches.load();
      matchesLoaded = true;
    }
  });

  function tabClass(active: boolean): string {
    return active
      ? 'border-emerald-600 text-emerald-700 font-semibold'
      : 'border-transparent text-slate-500 hover:text-slate-700';
  }
</script>

<main class="mx-auto max-w-3xl p-4 md:p-6">
  <header class="mb-6">
    <h1 class="text-2xl font-bold text-slate-800">referi</h1>
    <p class="text-sm text-slate-500">Pickup-football stats from your WhatsApp group.</p>
  </header>

  <nav class="mb-4 flex gap-4 border-b border-slate-200">
    <button
      type="button"
      data-testid="tab-leaderboard"
      class="-mb-px border-b-2 px-1 py-2 text-sm transition-colors {tabClass(view === 'leaderboard')}"
      onclick={() => (view = 'leaderboard')}
    >
      Leaderboard
    </button>
    <button
      type="button"
      data-testid="tab-matches"
      class="-mb-px border-b-2 px-1 py-2 text-sm transition-colors {tabClass(view === 'matches')}"
      onclick={() => (view = 'matches')}
    >
      Recent matches
    </button>
  </nav>

  {#if view === 'leaderboard'}
    <Leaderboard store={leaderboard} onRetry={() => leaderboard.load()} />
  {:else}
    <MatchFeed store={matches} onRetry={() => matches.load()} />
  {/if}
</main>
```

- [ ] **Step 4: Verify the app builds and the dev server boots**

```bash
pnpm exec vp build
pnpm dev
```

Open `http://localhost:5173`. With no live API the page renders skeletons → error banner. That's fine for now. Stop with Ctrl+C.

- [ ] **Step 5: Run all unit tests**

```bash
pnpm exec vp test --run
```

Expected: every test from Tasks 6-11 passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire stores into tabbed App shell"
```

---

## Phase 6 — Playwright e2e

### Task 13: Playwright install + config

**Files:**

- Create: `playwright.config.ts`, `e2e/fixtures/leaderboard.json`, `e2e/fixtures/matches.json`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

Expected: chromium installed.

- [ ] **Step 2: Create deterministic fixtures**

`e2e/fixtures/leaderboard.json`:

```json
[
  {
    "display_name": "Gent",
    "matches_played": 4,
    "wins": 3,
    "draws": 0,
    "losses": 1,
    "win_rate_pct": 75
  },
  {
    "display_name": "Donat",
    "matches_played": 4,
    "wins": 2,
    "draws": 1,
    "losses": 1,
    "win_rate_pct": 50
  },
  {
    "display_name": "Lirim",
    "matches_played": 3,
    "wins": 1,
    "draws": 1,
    "losses": 1,
    "win_rate_pct": 33.3
  }
]
```

`e2e/fixtures/matches.json`:

```json
[
  {
    "id": 2,
    "played_on": "2026-04-26",
    "winner": "team_1",
    "team_1_label": "Reds",
    "team_2_label": "Blues",
    "recorded_at": "2026-04-26T19:00:00Z",
    "team_1_players": ["Gent", "Donat"],
    "team_2_players": ["Lirim", "Arben"]
  },
  {
    "id": 1,
    "played_on": "2026-04-19",
    "winner": "draw",
    "team_1_label": "Reds",
    "team_2_label": "Blues",
    "recorded_at": "2026-04-19T19:00:00Z",
    "team_1_players": ["Gent", "Lirim"],
    "team_2_players": ["Donat", "Arben"]
  }
]
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

const PORT = 4173;
const E2E_API_BASE = "https://referi-api.e2e.test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec vp build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_REFERI_API_URL: E2E_API_BASE,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
```

- [ ] **Step 4: Add an `e2e` script to `package.json`**

In `package.json`, under `"scripts"`, add (alongside whatever Vite Plus put there):

```json
"e2e": "playwright test",
"e2e:headed": "playwright test --headed"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: scaffold Playwright with deterministic JSON fixtures"
```

---

### Task 14: Leaderboard e2e spec

**Files:**

- Create: `e2e/leaderboard.spec.ts`

- [ ] **Step 1: Create the spec**

```ts
import { expect, test } from "@playwright/test";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaderboard),
    });
  });
});

test("leaderboard renders rows for every player in the fixture", async ({ page }) => {
  await page.goto("/");
  for (const p of leaderboard) {
    await expect(page.getByText(p.display_name)).toBeVisible();
  }
  await expect(page.getByText("75%")).toBeVisible();
});

test("leaderboard shows error banner when API 5xxs", async ({ page }) => {
  await page.unroute(`${API}/player_stats**`);
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({ status: 503, body: "down" });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm exec playwright test e2e/leaderboard.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/leaderboard.spec.ts
git commit -m "test: e2e leaderboard renders fixture + error fallback"
```

---

### Task 15: Match-history e2e spec

**Files:**

- Create: `e2e/match-history.spec.ts`

- [ ] **Step 1: Create the spec**

```ts
import { expect, test } from "@playwright/test";
import matches from "./fixtures/matches.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/match_feed**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(matches),
    });
  });
});

test("matches tab renders all matches with player names and winner", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-matches").click();
  await expect(page.getByText("Apr 26, 2026")).toBeVisible();
  await expect(page.getByText(/Reds won/)).toBeVisible();
  await expect(page.getByText("Draw")).toBeVisible();
  await expect(page.getByText("Gent, Donat")).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm exec playwright test e2e/match-history.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add e2e/match-history.spec.ts
git commit -m "test: e2e match feed renders fixture with winner labels"
```

---

### Task 16: Tab-switch e2e spec

**Files:**

- Create: `e2e/tab-switch.spec.ts`

- [ ] **Step 1: Create the spec**

```ts
import { expect, test } from "@playwright/test";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };
import matches from "./fixtures/matches.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/player_stats**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaderboard),
    }),
  );
  await page.route(`${API}/match_feed**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(matches),
    }),
  );
});

test("tabs switch between leaderboard and matches", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Win %")).toBeVisible();

  await page.getByTestId("tab-matches").click();
  await expect(page.getByText("Apr 26, 2026")).toBeVisible();

  await page.getByTestId("tab-leaderboard").click();
  await expect(page.getByText("Win %")).toBeVisible();
});
```

- [ ] **Step 2: Run all e2e**

```bash
pnpm exec playwright test
```

Expected: all specs pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/tab-switch.spec.ts
git commit -m "test: e2e tab switch keeps both views functional"
```

---

## Phase 7 — CI

### Task 17: GitHub Actions CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          run_install: false

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint + format + typecheck
        run: pnpm exec vp check

      - name: Unit + component tests
        run: pnpm exec vp test --run

      - name: Build
        run: pnpm exec vp build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: E2E tests
        run: pnpm exec playwright test

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

(Vite Plus's `vp install` would also work in place of `pnpm install`. We use `pnpm install --frozen-lockfile` directly here so the workflow doesn't depend on the global `vp` binary — Vite Plus is invoked via `pnpm exec vp` from the local install.)

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, test, build, e2e)"
```

---

## Phase 8 — Docs + CLAUDE.md

### Task 18: README

**Files:**

- Create: `README.md`

- [ ] **Step 1: Write README**

````markdown
# referi-frontend

Public read-only frontend for the **referi** WhatsApp pickup-football
match tracker. Reads a leaderboard and recent-matches feed from
PostgREST, served over HTTPS by the Hetzner platform that hosts the
write-side n8n workflow.

- **Live:** https://<project>.pages.dev
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
````

## Tasks

| Task                              | Command                     |
| --------------------------------- | --------------------------- |
| Dev server                        | `pnpm dev`                  |
| Build                             | `pnpm exec vp build`        |
| Lint + format + typecheck         | `pnpm exec vp check`        |
| Unit + component tests            | `pnpm exec vp test --run`   |
| E2E (built once via vite preview) | `pnpm exec playwright test` |

## Environment

| Var                   | Where it's used     | Example                            |
| --------------------- | ------------------- | ---------------------------------- |
| `VITE_REFERI_API_URL` | Build- and run-time | `https://referi-api.gentrexha.xyz` |

In Cloudflare Pages: set this in **Project → Settings → Environment variables**.

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

```

- [ ] **Step 2: Create env template**

`.env.local.example`:

```

VITE_REFERI_API_URL=https://referi-api.gentrexha.xyz

````

- [ ] **Step 3: Commit**

```bash
git add README.md .env.local.example
git commit -m "docs: add README and .env.local.example"
````

---

### Task 19: CLAUDE.md (initial draft)

**Files:**

- Create: `CLAUDE.md`

- [ ] **Step 1: Write the initial CLAUDE.md**

````markdown
# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Public, read-only Svelte 5 + TypeScript SPA on Cloudflare Pages, sourcing
data from PostgREST against the `referi` Postgres database in
`gentrexha/maybornai-monorepo`. Two views: a leaderboard and a
recent-matches feed. n8n is the only writer; this app never POSTs.

`README.md` covers the stack, env vars, and dev commands. `docs/superpowers/specs/`
holds the design spec; don't duplicate it here.

## Critical points

1. **Single env var:** `VITE_REFERI_API_URL`. Set in `.env.local` for
   dev and Cloudflare Pages env for prod. The app throws at boot if
   it's missing.

2. **No SDK, just `fetch`.** PostgREST does the work. Don't pull in
   `postgrest-js` or `@supabase/*`.

3. **Schema-leak guard.** `src/lib/api.ts` rejects responses that
   contain any `*_jid`-suffixed keys. If a future view ever exposes
   one, the app fails loud (and `api.test.ts` catches it earlier).

4. **Tests live next to source.** `*.test.ts` next to `*.svelte`/`*.ts`.
   Vitest + jsdom + testing-library/svelte. `e2e/` is Playwright only.

5. **Vite Plus is the single dependency.** Do not add separate
   `vite`, `vitest`, `oxlint`, or `prettier` deps. Configure
   everything in `vite.config.ts`.

6. **Cloudflare Pages auto-deploys on push to `main`.** No manual
   deploy step. The platform-side PostgREST + Caddy bits live in
   `maybornai-monorepo` and deploy independently.

## Tools available

- `/playwright` plugin — for browser automation when iterating on
  visual changes locally.
- `/frontend-design:frontend-design` plugin — pair with screenshots
  of the running `pnpm dev` server.

## Common commands

```bash
pnpm dev                              # local dev server
pnpm exec vp check                    # lint + format + typecheck
pnpm exec vp test --run               # unit + component tests
pnpm exec vp build                    # production build
pnpm exec playwright test             # e2e against built bundle
```
````

## Don'ts

- Don't add a router until bookmarkable URLs are an actual ask.
- Don't add data caching/SWR libraries; the app fetches once per tab
  view and that's enough.
- Don't write to PostgREST. n8n owns the write path.

````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md (initial)"
````

---

### Task 20: Improve CLAUDE.md via the improver skill

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Invoke the claude-md-improver skill**

In a chat session at the repo root, run:

```
/claude-md-management:claude-md-improver
```

Follow the skill's prompts, accept the proposed improvements, save the file.

- [ ] **Step 2: Commit any changes the skill produced**

```bash
git add CLAUDE.md
git commit -m "docs: refine CLAUDE.md per claude-md-improver"
```

(If the skill produced no changes, skip this step.)

---

## Phase 9 — Cloudflare Pages setup (manual)

This is the only step the human must do by hand. It only happens once.

### Task 21: Push the repo + connect Cloudflare Pages

**Files:** none (external service)

- [ ] **Step 1: Create the GitHub repo**

```bash
gh repo create gentrexha/referi-frontend --public --source=. --remote=origin
git push -u origin main
```

- [ ] **Step 2: Create the Cloudflare Pages project**

In the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**:

- Repository: `gentrexha/referi-frontend`
- Production branch: `main`
- Framework preset: **Svelte (Vite)** (or "None"; doesn't matter)
- Build command: `pnpm exec vp build`
- Build output directory: `dist`
- Root directory: `/`
- Environment variables (Production + Preview):
  - `VITE_REFERI_API_URL` = `https://referi-api.gentrexha.xyz`
  - `NODE_VERSION` = `22`

Save and deploy. The first build must succeed before continuing.

- [ ] **Step 3: Verify**

Open the produced `*.pages.dev` URL. Without the platform-side PR landed yet, the page will skeleton → error (CORS or 502 from a missing API). That's expected. Move to Phase 10.

---

## Phase 10 — Platform-side PR (`maybornai-monorepo`)

> **Working directory change:** Phase 10 tasks are executed in
> `/Users/vienna/Projects/maybornai-monorepo`, **not** `referi-frontend`.
> Switch working trees before starting Task 22.

### Task 22: Branch + SQL migration — public view + roles

**Files (in `maybornai-monorepo`):**

- Create: `db/referi/004_public_views.sql`
- Modify: `db/referi/README.md`

- [ ] **Step 0: Switch working tree and start a branch**

```bash
cd /Users/vienna/Projects/maybornai-monorepo
git checkout main
git pull --ff-only
git checkout -b feat/referi-postgrest
```

- [ ] **Step 1: Create the migration**

`db/referi/004_public_views.sql`:

```sql
-- Public, read-only surface exposed by PostgREST.
-- Run as the referi role (database owner).

-- Flat match feed: one row per match, with team rosters as JSON arrays
-- of display names. Deliberately omits raw_*, *_message_id, players_hash,
-- and phone_jid so PostgREST cannot leak internals.
CREATE VIEW referi.match_feed AS
SELECT
  m.id,
  m.played_on,
  m.winner,
  m.team_1_label,
  m.team_2_label,
  m.recorded_at,
  (SELECT jsonb_agg(p.display_name ORDER BY p.display_name)
     FROM referi.match_players mp
     JOIN referi.players p ON p.phone_jid = mp.player_jid
    WHERE mp.match_id = m.id AND mp.team = 'team_1') AS team_1_players,
  (SELECT jsonb_agg(p.display_name ORDER BY p.display_name)
     FROM referi.match_players mp
     JOIN referi.players p ON p.phone_jid = mp.player_jid
    WHERE mp.match_id = m.id AND mp.team = 'team_2') AS team_2_players
FROM referi.matches m;

-- PostgREST connects as `authenticator` and SET ROLE-switches into
-- `web_anon` for unauthenticated requests.

-- The authenticator role is created in the bootstrap step (see README)
-- because its password lives in .env, not in this file.

CREATE ROLE web_anon NOLOGIN;
GRANT web_anon TO authenticator;

GRANT USAGE ON SCHEMA referi TO web_anon;
GRANT SELECT ON referi.player_stats TO web_anon;
GRANT SELECT ON referi.match_feed   TO web_anon;
```

- [ ] **Step 2: Update `db/referi/README.md`**

Append a new section:

````markdown
## Public read-only views (file order continued)

| File                   | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `004_public_views.sql` | `match_feed` view, `web_anon` role, PostgREST grants |

`004` depends on `001` (tables) and `002` (`player_stats` view); apply both first.

### Authenticator role bootstrap (one-time, on already-initialized servers)

The `authenticator` role for PostgREST is created with a password
that lives in `.env` (`REFERI_POSTGREST_AUTHENTICATOR_PASSWORD`),
not in source control. On a server that already has Postgres
running, run once:

```bash
export REFERI_POSTGREST_AUTHENTICATOR_PASSWORD='...'
docker exec -i postgres psql -U referi -d referi \
  -v password="$REFERI_POSTGREST_AUTHENTICATOR_PASSWORD" \
  <<'SQL'
CREATE ROLE authenticator WITH LOGIN PASSWORD :'password' NOINHERIT;
SQL

# Then apply the migration:
docker exec -i postgres psql -U referi -d referi -v ON_ERROR_STOP=1 \
  < db/referi/004_public_views.sql
```
````

````

- [ ] **Step 3: Commit**

```bash
git add db/referi/004_public_views.sql db/referi/README.md
git commit -m "feat(referi): add public match_feed view + web_anon role for PostgREST"
````

---

### Task 23: Caddy snippet for `referi-api.gentrexha.xyz`

**Files (in `maybornai-monorepo`):**

- Create: `caddy.d/referi-api.caddy`

- [ ] **Step 1: Create the snippet**

```caddy
referi-api.gentrexha.xyz {
    @cors_preflight {
        method OPTIONS
    }
    handle @cors_preflight {
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "GET, OPTIONS"
        header Access-Control-Allow-Headers "Accept, Content-Type, Authorization, Range, Prefer"
        header Access-Control-Max-Age "86400"
        respond 204
    }

    header Access-Control-Allow-Origin "*"
    header Access-Control-Expose-Headers "Content-Range, Content-Profile"

    encode gzip
    reverse_proxy localhost:3001
}
```

- [ ] **Step 2: Validate and commit**

```bash
caddy validate --config caddy.d/referi-api.caddy --adapter caddyfile
git add caddy.d/referi-api.caddy
git commit -m "feat(referi): add Caddy reverse proxy for PostgREST API"
```

(`caddy validate` is informational here — the validation that matters runs on the server during `deploy.sh`.)

---

### Task 24: PostgREST service in `compose.yml`

**Files (in `maybornai-monorepo`):**

- Modify: `compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Append a `postgrest` service to `compose.yml`**

Inside the existing `services:` block, after the `waha` service, add:

```yaml
postgrest:
  image: postgrest/postgrest:v13.0.5
  container_name: postgrest
  restart: unless-stopped
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    PGRST_DB_URI: postgres://authenticator:${REFERI_POSTGREST_AUTHENTICATOR_PASSWORD}@postgres:5432/referi
    PGRST_DB_SCHEMAS: referi
    PGRST_DB_ANON_ROLE: web_anon
    PGRST_OPENAPI_SERVER_PROXY_URI: https://referi-api.gentrexha.xyz
    PGRST_DB_POOL: "10"
    PGRST_DB_POOL_TIMEOUT: "10"
  env_file:
    - .env
  ports:
    - "127.0.0.1:3001:3000"
  networks:
    - maybornai-network
```

- [ ] **Step 2: Append env-var stanza to `.env.example`**

After the `REFERI_*` block, add:

```bash
# PostgREST authenticator role for the public read-only API
# (https://referi-api.gentrexha.xyz). The role is created manually
# once via psql; this password must match.
REFERI_POSTGREST_AUTHENTICATOR_PASSWORD=your-secure-postgrest-authenticator-password
```

- [ ] **Step 3: Commit**

```bash
git add compose.yml .env.example
git commit -m "feat(referi): add PostgREST service to platform compose"
```

---

### Task 25: Open the platform PR

**Files:** none

- [ ] **Step 1: Push and open the PR**

(Branch already exists from Task 22 Step 0 — just push.)

```bash
git push -u origin feat/referi-postgrest
gh pr create --title "feat(referi): expose public read-only API via PostgREST" --body "$(cat <<'EOF'
## Summary

- Adds `referi.match_feed` view (`db/referi/004_public_views.sql`) with team rosters as JSON arrays of display names. Deliberately omits raw text, JIDs, and message ids.
- Creates `web_anon` role granted SELECT on `player_stats` + `match_feed` only.
- Adds a `postgrest` service to `compose.yml` (image `postgrest/postgrest:v13.0.5`, bound to `127.0.0.1:3001`).
- Adds `caddy.d/referi-api.caddy` proxying `referi-api.gentrexha.xyz` → `localhost:3001` with CORS.
- Adds `REFERI_POSTGREST_AUTHENTICATOR_PASSWORD` to `.env.example`; updates `db/referi/README.md` with the one-time `authenticator` role bootstrap.

Powers the read-only `referi-frontend` SPA on Cloudflare Pages.

## Test plan
- [ ] Set `REFERI_POSTGREST_AUTHENTICATOR_PASSWORD` in `.env` on the server.
- [ ] Create the `authenticator` role per `db/referi/README.md`.
- [ ] Apply `db/referi/004_public_views.sql`.
- [ ] Merge → `deploy.sh` brings up PostgREST and reloads Caddy.
- [ ] `curl -i https://referi-api.gentrexha.xyz/player_stats` returns 200 with `Access-Control-Allow-Origin: *`.
- [ ] `curl -i https://referi-api.gentrexha.xyz/match_feed?limit=1` returns 200.
- [ ] Verify the `*.pages.dev` URL renders real data.
EOF
)"
```

---

## Self-Review

I checked the plan against the spec:

**Coverage:**

- ✅ Two views (Leaderboard, MatchFeed) — Tasks 10, 11
- ✅ One platform-side migration — Task 22
- ✅ PostgREST service + Caddy — Tasks 23, 24
- ✅ Full CI (lint, format, typecheck, unit, e2e) — Task 17
- ✅ Cloudflare Pages auto-deploy — Task 21
- ✅ Schema-leak guard — Tasks 7, 19
- ✅ Empty/loading/error states — Tasks 10, 11
- ✅ Tailwind + Svelte 5 — Tasks 3, 10, 11
- ✅ CLAUDE.md + improver skill — Tasks 19, 20

**No placeholders:** every code block is complete; every command has the literal output expected.

**Type consistency:** `PlayerStats`, `MatchFeedEntry`, `AsyncState<T>`, `Winner` are defined in Task 5 and referenced consistently in Tasks 6-12. Function names (`fetchLeaderboard`, `fetchMatchFeed`, `createLeaderboardStore`, `createMatchesStore`, `formatDate`, `formatWinner`, `formatWinRate`) are used identically across tasks.

**Known assumption:** the scaffold's `packageManager` field is presumed to be `pnpm`. Task 1 Step 3 explicitly checks this and instructs the executor to substitute if different.
