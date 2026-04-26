import { writable, type Writable } from "svelte/store";
import { fetchPlayerHistory } from "../lib/api";
import type { AsyncState, MatchFeedEntry } from "../lib/types";

export interface PlayerHistoryStore extends Writable<AsyncState<MatchFeedEntry[]>> {
  load(): Promise<void>;
  readonly displayName: string;
}

export function createPlayerHistoryStore(
  baseUrl: string,
  displayName: string,
  fetchImpl: typeof fetch = fetch,
): PlayerHistoryStore {
  const inner = writable<AsyncState<MatchFeedEntry[]>>({ status: "idle" });
  return {
    subscribe: inner.subscribe,
    set: inner.set,
    update: inner.update,
    displayName,
    async load() {
      inner.set({ status: "loading" });
      try {
        const data = await fetchPlayerHistory(baseUrl, displayName, fetchImpl);
        inner.set({ status: "ready", data });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        inner.set({ status: "error", error });
      }
    },
  };
}
