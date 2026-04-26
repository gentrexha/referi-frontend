import type { MatchFeedEntry, PlayerStats } from "./types";

const FORBIDDEN_KEYS = /(^|_)jid$/i;

function assertNoLeakedKeys(rows: unknown): void {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row)) {
        if (FORBIDDEN_KEYS.test(key)) {
          throw new Error(
            `PostgREST returned forbidden field "${key}" — public view leaks internal data`,
          );
        }
      }
    }
  }
}

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PostgREST request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as T;
  assertNoLeakedKeys(body);
  return body;
}

export function fetchLeaderboard(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlayerStats[]> {
  const url = `${baseUrl}/player_stats?order=matches_played.desc,wins.desc&matches_played=gte.1`;
  return getJson<PlayerStats[]>(url, fetchImpl);
}

export function fetchMatchFeed(
  baseUrl: string,
  limit = 20,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchFeedEntry[]> {
  const url = `${baseUrl}/match_feed?order=played_on.desc,id.desc&limit=${limit}`;
  return getJson<MatchFeedEntry[]>(url, fetchImpl);
}

export function buildPlayerHistoryUrl(baseUrl: string, displayName: string): string {
  // PostgREST jsonb `cs` (contains) check on team_1_players OR team_2_players.
  // The value is a JSON array literal: ["DisplayName"]. We pass a single
  // element so there's no internal comma — safe inside or=(..,..).
  const arrayJson = JSON.stringify([displayName]);
  const encoded = encodeURIComponent(arrayJson);
  return `${baseUrl}/match_feed?or=(team_1_players.cs.${encoded},team_2_players.cs.${encoded})&order=played_on.desc,id.desc`;
}

export function fetchPlayerHistory(
  baseUrl: string,
  displayName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchFeedEntry[]> {
  return getJson<MatchFeedEntry[]>(buildPlayerHistoryUrl(baseUrl, displayName), fetchImpl);
}
