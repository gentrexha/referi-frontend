<script lang="ts">
  import Leaderboard from "./components/Leaderboard.svelte";
  import MatchFeed from "./components/MatchFeed.svelte";
  import Players from "./components/Players.svelte";
  import PlayerProfile from "./components/PlayerProfile.svelte";
  import { createLeaderboardStore } from "./stores/leaderboard";
  import { createMatchesStore } from "./stores/matches";
  import { createPlayerHistoryStore, type PlayerHistoryStore } from "./stores/playerHistory";
  import { API_BASE_URL } from "./lib/config";
  import type { View } from "./lib/types";

  const leaderboard = createLeaderboardStore(API_BASE_URL);
  const matches = createMatchesStore(API_BASE_URL);

  let view: View = $state("leaderboard");
  let selectedPlayer: string | null = $state(null);
  let leaderboardLoaded = $state(false);
  let matchesLoaded = $state(false);
  let history: PlayerHistoryStore | null = $state(null);

  function ensureLeaderboardLoaded(): void {
    if (!leaderboardLoaded) {
      leaderboard.load();
      leaderboardLoaded = true;
    }
  }

  function ensureMatchesLoaded(): void {
    if (!matchesLoaded) {
      matches.load();
      matchesLoaded = true;
    }
  }

  $effect(() => {
    if (view === "leaderboard") ensureLeaderboardLoaded();
    if (view === "matches") ensureMatchesLoaded();
    if (view === "players") ensureLeaderboardLoaded();
  });

  function selectTab(next: View): void {
    selectedPlayer = null;
    history = null;
    view = next;
  }

  function selectPlayer(name: string): void {
    selectedPlayer = name;
    ensureLeaderboardLoaded();
    history = createPlayerHistoryStore(API_BASE_URL, name);
    history.load();
  }

  function clearProfile(): void {
    selectedPlayer = null;
    history = null;
  }

  function tabClass(active: boolean): string {
    return active
      ? "border-emerald-600 text-zinc-900 font-semibold"
      : "border-transparent text-zinc-500 hover:text-zinc-900";
  }

  const summary = $derived.by(() => {
    if (!selectedPlayer) return undefined;
    if ($leaderboard.status !== "ready") return undefined;
    return $leaderboard.data.find((p) => p.display_name === selectedPlayer);
  });
</script>

<main class="mx-auto max-w-3xl p-4 md:p-6">
  <header class="mb-5 flex items-baseline gap-2">
    <span class="text-2xl leading-none" aria-hidden="true">⚽</span>
    <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Referi</h1>
    <p class="ml-auto text-xs text-zinc-500 sm:text-sm">
      Pickup-football stats from <span class="font-medium text-zinc-700"
        >Football Group — ALB</span
      >
      🇦🇱
    </p>
  </header>

  <nav class="mb-4 flex gap-1 border-b border-zinc-200 sm:gap-4" aria-label="Sections">
    <button
      type="button"
      data-testid="tab-leaderboard"
      class="-mb-px border-b-2 px-2 py-2 text-sm transition-colors sm:px-1 {tabClass(
        view === 'leaderboard' && !selectedPlayer,
      )}"
      onclick={() => selectTab("leaderboard")}
    >
      Leaderboard
    </button>
    <button
      type="button"
      data-testid="tab-matches"
      class="-mb-px border-b-2 px-2 py-2 text-sm transition-colors sm:px-1 {tabClass(
        view === 'matches' && !selectedPlayer,
      )}"
      onclick={() => selectTab("matches")}
    >
      Recent matches
    </button>
    <button
      type="button"
      data-testid="tab-players"
      class="-mb-px border-b-2 px-2 py-2 text-sm transition-colors sm:px-1 {tabClass(
        view === 'players' && !selectedPlayer,
      )}"
      onclick={() => selectTab("players")}
    >
      Players
    </button>
  </nav>

  {#if selectedPlayer && history}
    <PlayerProfile
      displayName={selectedPlayer}
      {summary}
      {history}
      onBack={clearProfile}
      onRetry={() => history?.load()}
      onSelect={selectPlayer}
    />
  {:else if view === "leaderboard"}
    <Leaderboard
      store={leaderboard}
      onRetry={() => leaderboard.load()}
      onSelect={selectPlayer}
    />
  {:else if view === "matches"}
    <MatchFeed store={matches} onRetry={() => matches.load()} onSelect={selectPlayer} />
  {:else}
    <Players
      store={leaderboard}
      onRetry={() => leaderboard.load()}
      onSelect={selectPlayer}
    />
  {/if}
</main>
