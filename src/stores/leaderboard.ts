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
