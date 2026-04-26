import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createLeaderboardStore } from "./leaderboard";
import type { PlayerStats } from "../lib/types";

const sample: PlayerStats[] = [
  {
    display_name: "Gent",
    matches_played: 4,
    wins: 3,
    draws: 0,
    losses: 1,
    win_rate_pct: 75,
  },
];

describe("leaderboardStore", () => {
  it("starts in idle", () => {
    const fetchMock = vi.fn();
    const store = createLeaderboardStore("https://api.test", fetchMock);
    expect(get(store).status).toBe("idle");
  });

  it("transitions idle → loading → ready on load()", async () => {
    let resolveFetch!: (r: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolveFetch = r)));
    const store = createLeaderboardStore("https://api.test", fetchMock);

    const p = store.load();
    expect(get(store).status).toBe("loading");

    resolveFetch(
      new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await p;

    const state = get(store);
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.data).toEqual(sample);
    }
  });

  it("transitions to error on failure", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    const store = createLeaderboardStore("https://api.test", fetchMock);
    await store.load();
    const state = get(store);
    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error).toMatch(/500/);
    }
  });
});
