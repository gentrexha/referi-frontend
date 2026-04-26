<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { AsyncState, MatchFeedEntry, Winner } from "../lib/types";
  import { formatDate } from "../lib/format";

  interface Props {
    store: Readable<AsyncState<MatchFeedEntry[]>>;
    onRetry?: () => void;
    onSelect?: (displayName: string) => void;
  }

  let { store, onRetry, onSelect }: Props = $props();

  function badgeFor(winner: Winner, t1: string, t2: string): { label: string; tone: "win" | "draw" } {
    if (winner === "draw") return { label: "Draw", tone: "draw" };
    return { label: `${winner === "team_1" ? t1 : t2} won`, tone: "win" };
  }

  function teamClasses(team: "team_1" | "team_2", winner: Winner): string {
    if (winner === "draw") return "text-zinc-700";
    return winner === team ? "text-zinc-900 font-semibold" : "text-zinc-500";
  }
</script>

{#if $store.status === "idle" || $store.status === "loading"}
  <div data-testid="matches-skeleton" class="space-y-3">
    {#each [0, 1, 2] as i (i)}
      <div class="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"></div>
    {/each}
  </div>
{:else if $store.status === "error"}
  <div class="rounded-lg border border-red-200 bg-red-50 p-4">
    <p class="text-red-800">Couldn't load the match feed.</p>
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
    No matches recorded yet.
  </p>
{:else}
  <ul class="space-y-3">
    {#each $store.data as m (m.id)}
      {@const badge = badgeFor(m.winner, m.team_1_label, m.team_2_label)}
      <li
        data-testid="match-card"
        class="overflow-hidden rounded-lg border border-zinc-200 bg-white"
      >
        <div class="p-3 sm:p-4">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-xs font-medium text-zinc-500">{formatDate(m.played_on)}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase {badge.tone ===
              'draw'
                ? 'bg-zinc-100 text-zinc-600'
                : 'bg-emerald-50 text-emerald-700'}"
            >
              {badge.label}
            </span>
          </div>
          <div class="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs {teamClasses('team_1', m.winner)} uppercase tracking-wide">
                {m.team_1_label}
              </p>
              <ul class="mt-1 flex flex-wrap gap-x-1.5 gap-y-1 text-sm">
                {#each m.team_1_players as name (name)}
                  <li>
                    <button
                      type="button"
                      data-testid="player-link"
                      class="rounded text-zinc-700 hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none"
                      onclick={() => onSelect?.(name)}
                    >
                      {name}
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
            <div>
              <p class="text-xs {teamClasses('team_2', m.winner)} uppercase tracking-wide">
                {m.team_2_label}
              </p>
              <ul class="mt-1 flex flex-wrap gap-x-1.5 gap-y-1 text-sm">
                {#each m.team_2_players as name (name)}
                  <li>
                    <button
                      type="button"
                      data-testid="player-link"
                      class="rounded text-zinc-700 hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none"
                      onclick={() => onSelect?.(name)}
                    >
                      {name}
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

