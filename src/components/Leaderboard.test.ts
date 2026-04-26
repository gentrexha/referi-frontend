// @vitest-environment jsdom
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { writable } from "svelte/store";
import Leaderboard from "./Leaderboard.svelte";
import type { AsyncState, PlayerStats } from "../lib/types";

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  display_name: "Gent",
  matches_played: 4,
  wins: 3,
  draws: 0,
  losses: 1,
  win_rate_pct: 75,
  ...over,
});

function withState(state: AsyncState<PlayerStats[]>) {
  return writable<AsyncState<PlayerStats[]>>(state);
}

describe("Leaderboard", () => {
  it("renders skeleton rows when loading", () => {
    render(Leaderboard, { props: { store: withState({ status: "loading" }) } });
    expect(screen.getByTestId("leaderboard-skeleton")).toBeInTheDocument();
  });

  it("renders an empty state when no players", () => {
    render(Leaderboard, {
      props: { store: withState({ status: "ready", data: [] }) },
    });
    expect(screen.getByText(/no matches recorded yet/i)).toBeInTheDocument();
  });

  it("renders a row per player when ready", () => {
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [player({ display_name: "Gent" }), player({ display_name: "Donat" })],
        }),
      },
    });
    expect(screen.getByText("Gent")).toBeInTheDocument();
    expect(screen.getByText("Donat")).toBeInTheDocument();
    expect(screen.getAllByText("75%")).toHaveLength(2);
  });

  it("renders an error banner with retry on error", () => {
    render(Leaderboard, {
      props: {
        store: withState({ status: "error", error: "boom" }),
      },
    });
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
