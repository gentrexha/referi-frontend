<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { AsyncState, PlayerStats } from "../lib/types";
  import { formatWinRate } from "../lib/format";

  interface Props {
    store: Readable<AsyncState<PlayerStats[]>>;
    onRetry?: () => void;
  }

  let { store, onRetry }: Props = $props();
</script>

{#if $store.status === "idle" || $store.status === "loading"}
  <div data-testid="leaderboard-skeleton" class="space-y-2">
    {#each [0, 1, 2, 3, 4] as i (i)}
      <div class="h-10 animate-pulse rounded bg-slate-200"></div>
    {/each}
  </div>
{:else if $store.status === "error"}
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
