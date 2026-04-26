export type Winner = "team_1" | "team_2" | "draw";

export type Team = "team_1" | "team_2";

export type MatchResult = "win" | "draw" | "loss";

export interface PlayerStats {
  phone_jid?: never;
  display_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate_pct: number | null;
}

export interface MatchFeedEntry {
  id: number;
  played_on: string;
  winner: Winner;
  team_1_label: string;
  team_2_label: string;
  recorded_at: string;
  team_1_players: string[];
  team_2_players: string[];
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: string };

export type SortKey =
  | "display_name"
  | "matches_played"
  | "wins"
  | "draws"
  | "losses"
  | "win_rate_pct";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export type View = "leaderboard" | "matches" | "players";
