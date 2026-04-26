import type { Winner } from "./types";

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

export function formatWinner(winner: Winner, team1Label: string, team2Label: string): string {
  if (winner === "draw") return "Draw";
  return `${winner === "team_1" ? team1Label : team2Label} won`;
}

export function formatWinRate(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct}%`;
}
