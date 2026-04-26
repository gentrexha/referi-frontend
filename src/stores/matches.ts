import { writable, type Writable } from "svelte/store";
import { fetchMatchFeed } from "../lib/api";
import type { AsyncState, MatchFeedEntry } from "../lib/types";

export interface MatchesStore extends Writable<AsyncState<MatchFeedEntry[]>> {
  load(): Promise<void>;
}

export function createMatchesStore(baseUrl: string, fetchImpl: typeof fetch = fetch): MatchesStore {
  const inner = writable<AsyncState<MatchFeedEntry[]>>({ status: "idle" });
  return {
    subscribe: inner.subscribe,
    set: inner.set,
    update: inner.update,
    async load() {
      inner.set({ status: "loading" });
      try {
        const data = await fetchMatchFeed(baseUrl, 20, fetchImpl);
        inner.set({ status: "ready", data });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        inner.set({ status: "error", error });
      }
    },
  };
}
