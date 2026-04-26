<script lang="ts">
  import type { Readable } from "svelte/store";
  import type {
    AsyncState,
    MatchFeedEntry,
    MatchResult,
    PlayerStats,
  } from "../lib/types";
  import {
    formatDateShort,
    formatWinRate,
    resultForPlayer,
    resultLabel,
    teamForPlayer,
  } from "../lib/format";

  interface Props {
    displayName: string;
    summary: PlayerStats | undefined;
    history: Readable<AsyncState<MatchFeedEntry[]>>;
    onBack: () => void;
    onRetry?: () => void;
    onSelect?: (displayName: string) => void;
  }

  let { displayName, summary, history, onBack, onRetry, onSelect }: Props = $props();

  function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
  }

  interface ProfileMatch {
    match: MatchFeedEntry;
    result: MatchResult;
    ownTeamLabel: string;
    opponentTeamLabel: string;
    teammates: string[];
    opponents: string[];
  }

  function buildProfileMatches(matches: MatchFeedEntry[]): ProfileMatch[] {
    const out: ProfileMatch[] = [];
    for (const m of matches) {
      const team = teamForPlayer(displayName, m);
      if (!team) continue;
      const result = resultForPlayer(m.winner, team);
      const teammates = (team === "team_1" ? m.team_1_players : m.team_2_players).filter(
        (n) => n !== displayName,
      );
      const opponents = team === "team_1" ? m.team_2_players : m.team_1_players;
      out.push({
        match: m,
        result,
        ownTeamLabel: team === "team_1" ? m.team_1_label : m.team_2_label,
        opponentTeamLabel: team === "team_1" ? m.team_2_label : m.team_1_label,
        teammates,
        opponents,
      });
    }
    return out;
  }

  const profileMatches = $derived.by((): ProfileMatch[] =>
    $history.status === "ready" ? buildProfileMatches($history.data) : [],
  );

  const form = $derived(profileMatches.slice(0, 6));

  function resultStripClass(r: MatchResult): string {
    return r === "win" ? "bg-emerald-600" : r === "draw" ? "bg-zinc-300" : "bg-red-600";
  }

  function resultBadgeClass(r: MatchResult): string {
    return r === "win"
      ? "bg-emerald-50 text-emerald-700"
      : r === "draw"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-red-50 text-red-700";
  }

  function chipClass(r: MatchResult): string {
    return r === "win"
      ? "bg-emerald-600 text-white"
      : r === "draw"
        ? "bg-zinc-400 text-white"
        : "bg-red-600 text-white";
  }
</script>

<div class="space-y-4">
  <button
    type="button"
    data-testid="profile-back"
    onclick={() => onBack()}
    class="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-emerald-700"
  >
    <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
    Back
  </button>

  <header class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
    <span
      aria-hidden="true"
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-800"
    >
      {initial(displayName)}
    </span>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-lg font-semibold text-zinc-900">{displayName}</h2>
      {#if summary}
        <p class="text-xs text-zinc-500 tabular-nums">
          {summary.matches_played}
          {summary.matches_played === 1 ? "match" : "matches"} · {formatWinRate(
            summary.win_rate_pct,
          )} win rate
        </p>
      {/if}
    </div>
  </header>

  {#if summary}
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-lg border border-zinc-200 bg-white p-3">
        <div class="text-[10px] tracking-wider text-zinc-500 uppercase">Played</div>
        <div class="text-lg font-semibold tabular-nums text-zinc-900">
          {summary.matches_played}
        </div>
      </div>
      <div class="rounded-lg border border-zinc-200 bg-white p-3">
        <div class="text-[10px] tracking-wider text-zinc-500 uppercase">Won</div>
        <div class="text-lg font-semibold tabular-nums text-emerald-700">{summary.wins}</div>
      </div>
      <div class="rounded-lg border border-zinc-200 bg-white p-3">
        <div class="text-[10px] tracking-wider text-zinc-500 uppercase">Drawn</div>
        <div class="text-lg font-semibold tabular-nums text-zinc-700">{summary.draws}</div>
      </div>
      <div class="rounded-lg border border-zinc-200 bg-white p-3">
        <div class="text-[10px] tracking-wider text-zinc-500 uppercase">Lost</div>
        <div class="text-lg font-semibold tabular-nums text-red-700">{summary.losses}</div>
      </div>
    </div>
  {/if}

  {#if $history.status === "loading" || $history.status === "idle"}
    <div data-testid="profile-skeleton" class="space-y-2">
      {#each [0, 1, 2, 3] as i (i)}
        <div class="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white"></div>
      {/each}
    </div>
  {:else if $history.status === "error"}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-red-800">Couldn't load match history.</p>
      <p class="mt-1 text-xs text-red-600">{$history.error}</p>
      <button
        type="button"
        class="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
        onclick={() => onRetry?.()}
      >
        Retry
      </button>
    </div>
  {:else if profileMatches.length === 0}
    <p class="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
      No matches found for {displayName}.
    </p>
  {:else}
    {#if form.length > 0}
      <section>
        <h3 class="mb-2 text-[10px] tracking-wider text-zinc-500 uppercase">
          Form (last {form.length})
        </h3>
        <div class="flex gap-1.5" data-testid="profile-form">
          {#each form as f, i (`${f.match.id}-${i}`)}
            <span
              class="flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold {chipClass(
                f.result,
              )}"
              title={`${formatDateShort(f.match.played_on)} · ${resultLabel(f.result)}`}
            >
              {f.result === "win" ? "W" : f.result === "draw" ? "D" : "L"}
            </span>
          {/each}
        </div>
      </section>
    {/if}

    <section>
      <h3 class="mb-2 text-[10px] tracking-wider text-zinc-500 uppercase">Match history</h3>
      <ul class="space-y-2" data-testid="profile-history">
        {#each profileMatches as pm (pm.match.id)}
          <li class="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div class="flex items-stretch">
              <span aria-hidden="true" class="w-1 shrink-0 {resultStripClass(pm.result)}"></span>
              <div class="flex-1 p-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-zinc-500 tabular-nums">
                    {formatDateShort(pm.match.played_on)}
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase {resultBadgeClass(
                      pm.result,
                    )}"
                  >
                    {resultLabel(pm.result)}
                  </span>
                </div>
                <p class="mt-1 text-sm text-zinc-700">
                  <span class="font-semibold text-zinc-900">{pm.ownTeamLabel}</span>
                  <span class="text-zinc-400">vs</span>
                  <span>{pm.opponentTeamLabel}</span>
                </p>
                {#if pm.teammates.length > 0 || pm.opponents.length > 0}
                  <div class="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    {#if pm.teammates.length > 0}
                      <div>
                        <span class="text-zinc-500">With: </span>
                        <span class="inline-flex flex-wrap gap-x-1.5 gap-y-1">
                          {#each pm.teammates as t (t)}
                            <button
                              type="button"
                              data-testid="player-link"
                              class="rounded text-zinc-700 hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none"
                              onclick={() => onSelect?.(t)}
                            >
                              {t}
                            </button>
                          {/each}
                        </span>
                      </div>
                    {/if}
                    {#if pm.opponents.length > 0}
                      <div>
                        <span class="text-zinc-500">vs: </span>
                        <span class="inline-flex flex-wrap gap-x-1.5 gap-y-1">
                          {#each pm.opponents as o (o)}
                            <button
                              type="button"
                              data-testid="player-link"
                              class="rounded text-zinc-700 hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none"
                              onclick={() => onSelect?.(o)}
                            >
                              {o}
                            </button>
                          {/each}
                        </span>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
