<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { AsyncState, MatchFeedEntry } from "../lib/types";
  import { formatDate, formatWinner } from "../lib/format";

  interface Props {
    store: Readable<AsyncState<MatchFeedEntry[]>>;
    onRetry?: () => void;
  }

  let { store, onRetry }: Props = $props();
</script>

{#if $store.status === "idle" || $store.status === "loading"}
  <div data-testid="matches-skeleton" class="space-y-3">
    {#each [0, 1, 2] as i (i)}
      <div class="h-24 animate-pulse rounded border border-slate-200 bg-white"></div>
    {/each}
  </div>
{:else if $store.status === "error"}
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
            <p class="text-slate-600">{m.team_1_players.join(", ")}</p>
          </div>
          <div>
            <p class="font-semibold text-slate-700">{m.team_2_label}</p>
            <p class="text-slate-600">{m.team_2_players.join(", ")}</p>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}
