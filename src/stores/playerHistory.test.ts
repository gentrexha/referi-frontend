import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createPlayerHistoryStore } from "./playerHistory";
import type { MatchFeedEntry } from "../lib/types";

const sample: MatchFeedEntry[] = [
  {
    id: 1,
    played_on: "2026-04-26",
    winner: "team_1",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-26T18:00:00Z",
    team_1_players: ["Gent", "Donat"],
    team_2_players: ["Lirim", "Arben"],
  },
];

describe("playerHistoryStore", () => {
  it("starts in idle and exposes the displayName", () => {
    const fetchMock = vi.fn();
    const store = createPlayerHistoryStore("https://api.test", "Gent", fetchMock);
    expect(get(store).status).toBe("idle");
    expect(store.displayName).toBe("Gent");
  });

  it("transitions to ready with fetched data", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const store = createPlayerHistoryStore("https://api.test", "Gent", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("ready");
    if (state.status === "ready") expect(state.data).toEqual(sample);
  });

  it("transitions to error on failure", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    const store = createPlayerHistoryStore("https://api.test", "Gent", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("error");
    if (state.status === "error") expect(state.error).toMatch(/500/);
  });
});
