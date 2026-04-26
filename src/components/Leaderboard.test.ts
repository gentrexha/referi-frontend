// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
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
    render(Leaderboard, { props: { store: withState({ status: "ready", data: [] }) } });
    expect(screen.getByText(/no matches recorded yet/i)).toBeInTheDocument();
  });

  it("renders sorted-by-matches_played by default", () => {
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [
            player({ display_name: "Alice", matches_played: 4, wins: 2, win_rate_pct: 50 }),
            player({ display_name: "Bob", matches_played: 10, wins: 5, win_rate_pct: 50 }),
            player({ display_name: "Cara", matches_played: 7, wins: 3, win_rate_pct: 42.9 }),
          ],
        }),
      },
    });
    const rows = screen.getAllByTestId("leaderboard-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("Bob")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Cara")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Alice")).toBeInTheDocument();
  });

  it("toggles sort direction on repeated header clicks", async () => {
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [
            player({ display_name: "Alice", win_rate_pct: 80 }),
            player({ display_name: "Bob", win_rate_pct: 30 }),
            player({ display_name: "Cara", win_rate_pct: 55 }),
          ],
        }),
      },
    });
    const winRateBtn = screen.getByTestId("sort-win_rate_pct");
    await fireEvent.click(winRateBtn);
    let rows = screen.getAllByTestId("leaderboard-row");
    expect(within(rows[0]!).getByText("Alice")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Bob")).toBeInTheDocument();

    await fireEvent.click(winRateBtn);
    rows = screen.getAllByTestId("leaderboard-row");
    expect(within(rows[0]!).getByText("Bob")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Alice")).toBeInTheDocument();
  });

  it("filters rows by search input", async () => {
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [
            player({ display_name: "Gent" }),
            player({ display_name: "Donat" }),
            player({ display_name: "Lirim" }),
          ],
        }),
      },
    });
    const search = screen.getByTestId("leaderboard-search");
    await fireEvent.input(search, { target: { value: "Don" } });
    const rows = screen.getAllByTestId("leaderboard-row");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByText("Donat")).toBeInTheDocument();
  });

  it("calls onSelect when a player is clicked", async () => {
    const onSelect = vi.fn();
    render(Leaderboard, {
      props: {
        store: withState({
          status: "ready",
          data: [player({ display_name: "Gent" })],
        }),
        onSelect,
      },
    });
    const link = screen.getByTestId("player-link");
    await fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith("Gent");
  });

  it("renders an error banner with retry on error", () => {
    render(Leaderboard, {
      props: { store: withState({ status: "error", error: "boom" }) },
    });
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
