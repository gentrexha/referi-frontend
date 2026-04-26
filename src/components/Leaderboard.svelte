<script lang="ts">
  import type { Readable } from "svelte/store";
  import type {
    AsyncState,
    PlayerStats,
    SortDir,
    SortKey,
    SortState,
  } from "../lib/types";
  import { formatWinRate } from "../lib/format";

  interface Props {
    store: Readable<AsyncState<PlayerStats[]>>;
    onRetry?: () => void;
    onSelect?: (displayName: string) => void;
  }

  let { store, onRetry, onSelect }: Props = $props();

  let search = $state("");
  let sort = $state<SortState>({ key: "matches_played", dir: "desc" });

  const NUMERIC_KEYS: SortKey[] = [
    "matches_played",
    "wins",
    "draws",
    "losses",
    "win_rate_pct",
  ];

  function setSort(key: SortKey) {
    if (sort.key === key) {
      sort = { key, dir: sort.dir === "asc" ? "desc" : "asc" };
    } else {
      sort = { key, dir: NUMERIC_KEYS.includes(key) ? "desc" : "asc" };
    }
  }

  function compare(a: PlayerStats, b: PlayerStats, key: SortKey, dir: SortDir): number {
    if (key === "display_name") {
      const cmp = a.display_name.localeCompare(b.display_name);
      return dir === "asc" ? cmp : -cmp;
    }
    const av = key === "win_rate_pct" ? (a.win_rate_pct ?? -1) : a[key];
    const bv = key === "win_rate_pct" ? (b.win_rate_pct ?? -1) : b[key];
    const cmp = (av as number) - (bv as number);
    return dir === "asc" ? cmp : -cmp;
    // Ties preserved by Array.prototype.sort's stability — the source data
    // already arrives from PostgREST ordered matches_played.desc, wins.desc.
  }

  const display = $derived.by((): PlayerStats[] => {
    if ($store.status !== "ready") return [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? $store.data.filter((p) => p.display_name.toLowerCase().includes(q))
      : $store.data.slice();
    return filtered.sort((a, b) => compare(a, b, sort.key, sort.dir));
  });

  const maxWinRate = $derived(
    display.reduce((m, p) => Math.max(m, p.win_rate_pct ?? 0), 0) || 100,
  );

  function arrow(key: SortKey): string {
    if (sort.key !== key) return "";
    return sort.dir === "desc" ? "↓" : "↑";
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sort.key !== key) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  function rankClass(rank: number): string {
    if (rank === 1) return "bg-amber-200 text-amber-900 ring-1 ring-amber-400";
    if (rank === 2) return "bg-zinc-200 text-zinc-700 ring-1 ring-zinc-400";
    if (rank === 3) return "bg-orange-200 text-orange-900 ring-1 ring-orange-400";
    return "bg-zinc-100 text-zinc-600";
  }
</script>

{#snippet headCell(
  key: SortKey,
  label: string,
  align: "left" | "right" = "right",
  hideOnMobile = false,
)}
  <th
    aria-sort={ariaSort(key)}
    class="cursor-pointer px-2 py-2 text-[11px] font-medium tracking-wide text-zinc-500 select-none hover:text-zinc-900 sm:px-3 {align ===
    'right'
      ? 'text-right'
      : 'text-left'} {hideOnMobile ? 'hidden sm:table-cell' : ''} {sort.key === key
      ? 'text-zinc-900'
      : ''}"
  >
    <button
      type="button"
      data-testid="sort-{key}"
      onclick={() => setSort(key)}
      class="inline-flex items-center gap-1 {align === 'right' ? 'flex-row-reverse' : ''}"
    >
      <span>{label}</span>
      <span aria-hidden="true" class="text-emerald-700 {sort.key === key ? '' : 'opacity-0'}"
        >{arrow(key) || "↕"}</span
      >
    </button>
  </th>
{/snippet}

{#if $store.status === "idle" || $store.status === "loading"}
  <div data-testid="leaderboard-skeleton" class="space-y-2">
    {#each [0, 1, 2, 3, 4] as i (i)}
      <div class="h-10 animate-pulse rounded bg-zinc-200"></div>
    {/each}
  </div>
{:else if $store.status === "error"}
  <div class="rounded-lg border border-red-200 bg-red-50 p-4">
    <p class="text-red-800">Couldn't load the leaderboard.</p>
    <p class="mt-1 text-xs text-red-600">{$store.error}</p>
    <button
      type="button"
      class="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
      onclick={() => onRetry?.()}
    >
      Retry
    </button>
  </div>
{:else if $store.data.length === 0}
  <p class="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
    No matches recorded yet. Stats will appear here once /referi messages start landing in the
    WhatsApp group.
  </p>
{:else}
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <label class="relative flex flex-1 items-center">
        <svg
          aria-hidden="true"
          class="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          data-testid="leaderboard-search"
          bind:value={search}
          placeholder="Filter players…"
          class="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none"
        />
      </label>
      <span class="hidden text-xs text-zinc-500 sm:block">
        {display.length}
        {display.length === 1 ? "player" : "players"}
      </span>
    </div>

    {#if display.length === 0}
      <p
        data-testid="leaderboard-empty-search"
        class="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600"
      >
        No players match "{search}".
      </p>
    {:else}
      <div class="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table class="w-full table-auto text-sm tabular-nums">
          <thead class="border-b border-zinc-200 bg-white">
            <tr>
              <th
                scope="col"
                class="w-10 px-2 py-2 text-left text-[11px] font-medium tracking-wide text-zinc-500 sm:px-3"
                >#</th
              >
              {@render headCell("display_name", "Player", "left")}
              {@render headCell("matches_played", "Played", "right")}
              {@render headCell("wins", "W", "right")}
              {@render headCell("draws", "D", "right", true)}
              {@render headCell("losses", "L", "right", true)}
              {@render headCell("win_rate_pct", "Win %", "right")}
            </tr>
          </thead>
          <tbody>
            {#each display as p, i (p.display_name)}
              {@const pct = p.win_rate_pct ?? 0}
              {@const barWidth = maxWinRate > 0 ? (pct / maxWinRate) * 100 : 0}
              <tr
                data-testid="leaderboard-row"
                class="cursor-pointer border-t border-zinc-100 transition-colors first:border-t-0 hover:bg-zinc-50 focus-within:bg-zinc-50"
                onclick={() => onSelect?.(p.display_name)}
              >
                <td class="px-2 py-2.5 sm:px-3">
                  <span
                    class="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded px-1.5 text-[11px] font-semibold {rankClass(
                      i + 1,
                    )}"
                  >
                    {i + 1}
                  </span>
                </td>
                <td class="px-2 py-2.5 font-medium text-zinc-900 sm:px-3">
                  <button
                    type="button"
                    data-testid="player-link"
                    class="-mx-2 -my-1 inline-flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none"
                    onclick={(e) => {
                      e.stopPropagation();
                      onSelect?.(p.display_name);
                    }}
                  >
                    <span class="truncate">{p.display_name}</span>
                  </button>
                </td>
                <td class="px-2 py-2.5 text-right text-zinc-600 sm:px-3">{p.matches_played}</td>
                <td class="px-2 py-2.5 text-right text-zinc-600 sm:px-3">{p.wins}</td>
                <td class="hidden px-2 py-2.5 text-right text-zinc-600 sm:table-cell sm:px-3"
                  >{p.draws}</td
                >
                <td class="hidden px-2 py-2.5 text-right text-zinc-600 sm:table-cell sm:px-3"
                  >{p.losses}</td
                >
                <td class="px-2 py-2.5 text-right font-medium text-zinc-900 sm:px-3">
                  <span class="inline-flex items-center justify-end gap-2">
                    <span
                      aria-hidden="true"
                      class="hidden h-1 w-9 overflow-hidden rounded-full bg-zinc-100 sm:inline-block"
                    >
                      <span
                        class="block h-full bg-emerald-600"
                        style="width: {barWidth}%"
                      ></span>
                    </span>
                    <span>{formatWinRate(p.win_rate_pct)}</span>
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}
