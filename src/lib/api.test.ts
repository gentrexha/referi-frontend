import { describe, expect, it, vi } from "vitest";
import { buildPlayerHistoryUrl, fetchLeaderboard, fetchMatchFeed, fetchPlayerHistory } from "./api";
import type { MatchFeedEntry, PlayerStats } from "./types";

const BASE = "https://referi-api.test";

describe("fetchLeaderboard", () => {
  it("hits player_stats ordered by matches_played.desc, then wins.desc", async () => {
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
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await fetchLeaderboard(BASE, fetchMock);
    expect(out).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call![0])).toBe(
      `${BASE}/player_stats?order=matches_played.desc,wins.desc&matches_played=gte.1`,
    );
  });

  it("throws on non-2xx", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 503 }));
    await expect(fetchLeaderboard(BASE, fetchMock)).rejects.toThrow(/503/);
  });

  it("rejects responses that contain phone_jid (schema-leak guard)", async () => {
    const leaky = [{ display_name: "X", phone_jid: "123@lid" }];
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(leaky), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(fetchLeaderboard(BASE, fetchMock)).rejects.toThrow(/forbidden field/i);
  });
});

describe("fetchMatchFeed", () => {
  it("hits match_feed with limit and order", async () => {
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
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await fetchMatchFeed(BASE, 20, fetchMock);
    expect(out).toEqual(sample);
    const call = fetchMock.mock.calls[0];
    expect(String(call![0])).toBe(`${BASE}/match_feed?order=played_on.desc,id.desc&limit=20`);
  });
});

describe("buildPlayerHistoryUrl", () => {
  it("encodes the JSON array literal into the cs filter", () => {
    const url = buildPlayerHistoryUrl(BASE, "Gent");
    // ["Gent"] -> %5B%22Gent%22%5D
    expect(url).toBe(
      `${BASE}/match_feed?or=(team_1_players.cs.%5B%22Gent%22%5D,team_2_players.cs.%5B%22Gent%22%5D)&order=played_on.desc,id.desc`,
    );
  });

  it("handles names with spaces", () => {
    const url = buildPlayerHistoryUrl(BASE, "Foo Bar");
    expect(url).toContain("team_1_players.cs.%5B%22Foo%20Bar%22%5D");
    expect(url).toContain("team_2_players.cs.%5B%22Foo%20Bar%22%5D");
  });
});

describe("fetchPlayerHistory", () => {
  it("returns parsed match list from the cs-filtered endpoint", async () => {
    const sample: MatchFeedEntry[] = [
      {
        id: 7,
        played_on: "2026-04-26",
        winner: "team_1",
        team_1_label: "Reds",
        team_2_label: "Blues",
        recorded_at: "2026-04-26T18:00:00Z",
        team_1_players: ["Gent", "Donat"],
        team_2_players: ["Lirim", "Arben"],
      },
    ];
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await fetchPlayerHistory(BASE, "Gent", fetchMock);
    expect(out).toEqual(sample);
    const call = fetchMock.mock.calls[0];
    expect(String(call![0])).toBe(buildPlayerHistoryUrl(BASE, "Gent"));
  });
});
