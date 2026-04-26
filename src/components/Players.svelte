<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { AsyncState, PlayerStats } from "../lib/types";
  import { formatWinRate } from "../lib/format";

  interface Props {
    store: Readable<AsyncState<PlayerStats[]>>;
    onRetry?: () => void;
    onSelect?: (displayName: string) => void;
  }

  let { store, onRetry, onSelect }: Props = $props();

  let search = $state("");

  const display = $derived.by((): PlayerStats[] => {
    if ($store.status !== "ready") return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? $store.data.filter((p) => p.display_name.toLowerCase().includes(q))
      : $store.data.slice();
    return list.sort((a, b) => a.display_name.localeCompare(b.display_name));
  });

  function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
  }
</script>

{#if $store.status === "idle" || $store.status === "loading"}
  <div data-testid="players-skeleton" class="space-y-2">
    <div class="h-10 animate-pulse rounded-lg bg-zinc-200"></div>
    {#each [0, 1, 2, 3] as i (i)}
      <div class="h-14 animate-pulse rounded-lg border border-zinc-200 bg-white"></div>
    {/each}
  </div>
{:else if $store.status === "error"}
  <div class="rounded-lg border border-red-200 bg-red-50 p-4">
    <p class="text-red-800">Couldn't load players.</p>
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
    No players yet. Stats appear here once /referi messages start landing in the WhatsApp group.
  </p>
{:else}
  <div class="space-y-3">
    <label class="relative flex items-center">
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
        data-testid="players-search"
        bind:value={search}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Search a player by name…"
        class="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none"
      />
    </label>

    {#if display.length === 0}
      <p
        data-testid="players-empty-search"
        class="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600"
      >
        No players match "{search}". Try a different name.
      </p>
    {:else}
      <ul class="space-y-2">
        {#each display as p (p.display_name)}
          <li>
            <button
              type="button"
              data-testid="player-link"
              onclick={() => onSelect?.(p.display_name)}
              class="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:border-emerald-500 focus:bg-emerald-50/40 focus:outline-none"
            >
              <span
                aria-hidden="true"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800"
              >
                {initial(p.display_name)}
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-zinc-900">{p.display_name}</div>
                <div class="text-xs text-zinc-500 tabular-nums">
                  {p.matches_played}
                  {p.matches_played === 1 ? "match" : "matches"}
                  · {p.wins}W–{p.draws}D–{p.losses}L · {formatWinRate(p.win_rate_pct)}
                </div>
              </div>
              <svg
                aria-hidden="true"
                class="h-4 w-4 shrink-0 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
