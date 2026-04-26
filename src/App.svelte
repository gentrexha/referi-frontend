<script lang="ts">
  import Leaderboard from "./components/Leaderboard.svelte";
  import MatchFeed from "./components/MatchFeed.svelte";
  import { createLeaderboardStore } from "./stores/leaderboard";
  import { createMatchesStore } from "./stores/matches";
  import { API_BASE_URL } from "./lib/config";

  const leaderboard = createLeaderboardStore(API_BASE_URL);
  const matches = createMatchesStore(API_BASE_URL);

  type View = "leaderboard" | "matches";
  let view: View = $state("leaderboard");
  let leaderboardLoaded = $state(false);
  let matchesLoaded = $state(false);

  $effect(() => {
    if (view === "leaderboard" && !leaderboardLoaded) {
      leaderboard.load();
      leaderboardLoaded = true;
    }
    if (view === "matches" && !matchesLoaded) {
      matches.load();
      matchesLoaded = true;
    }
  });

  function tabClass(active: boolean): string {
    return active
      ? "border-emerald-600 text-emerald-700 font-semibold"
      : "border-transparent text-slate-500 hover:text-slate-700";
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
      onclick={() => (view = "leaderboard")}
    >
      Leaderboard
    </button>
    <button
      type="button"
      data-testid="tab-matches"
      class="-mb-px border-b-2 px-1 py-2 text-sm transition-colors {tabClass(view === 'matches')}"
      onclick={() => (view = "matches")}
    >
      Recent matches
    </button>
  </nav>

  {#if view === "leaderboard"}
    <Leaderboard store={leaderboard} onRetry={() => leaderboard.load()} />
  {:else}
    <MatchFeed store={matches} onRetry={() => matches.load()} />
  {/if}
</main>
