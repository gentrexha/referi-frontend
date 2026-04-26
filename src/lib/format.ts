import type { MatchFeedEntry, MatchResult, Team, Winner } from "./types";

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWinner(winner: Winner, team1Label: string, team2Label: string): string {
  if (winner === "draw") return "Draw";
  return `${winner === "team_1" ? team1Label : team2Label} won`;
}

export function formatWinRate(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct}%`;
}

export function teamForPlayer(
  displayName: string,
  match: Pick<MatchFeedEntry, "team_1_players" | "team_2_players">,
): Team | null {
  if (match.team_1_players.includes(displayName)) return "team_1";
  if (match.team_2_players.includes(displayName)) return "team_2";
  return null;
}

export function resultForPlayer(winner: Winner, team: Team): MatchResult {
  if (winner === "draw") return "draw";
  return winner === team ? "win" : "loss";
}

export function resultLabel(result: MatchResult): string {
  return result === "win" ? "Won" : result === "draw" ? "Drew" : "Lost";
}
