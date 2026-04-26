import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createMatchesStore } from "./matches";
import type { MatchFeedEntry } from "../lib/types";

const sample: MatchFeedEntry[] = [
  {
    id: 1,
    played_on: "2026-04-26",
    winner: "team_1",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-26T18:00:00Z",
    team_1_players: ["Gent"],
    team_2_players: ["Donat"],
  },
];

describe("matchesStore", () => {
  it("starts in idle", () => {
    const fetchMock = vi.fn();
    const store = createMatchesStore("https://api.test", fetchMock);
    expect(get(store).status).toBe("idle");
  });

  it("loads and surfaces ready state", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const store = createMatchesStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("ready");
    if (state.status === "ready") expect(state.data).toEqual(sample);
  });

  it("surfaces error on failure", async () => {
    const fetchMock = vi.fn(async () => new Response("x", { status: 502 }));
    const store = createMatchesStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("error");
  });
});
