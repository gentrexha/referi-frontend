// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import Players from "./Players.svelte";
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

describe("Players", () => {
  it("renders skeleton when loading", () => {
    render(Players, { props: { store: withState({ status: "loading" }) } });
    expect(screen.getByTestId("players-skeleton")).toBeInTheDocument();
  });

  it("lists players alphabetically by default", () => {
    render(Players, {
      props: {
        store: withState({
          status: "ready",
          data: [
            player({ display_name: "Gent" }),
            player({ display_name: "Arben" }),
            player({ display_name: "Donat" }),
          ],
        }),
      },
    });
    const links = screen.getAllByTestId("player-link");
    expect(links[0]!.textContent).toMatch(/Arben/);
    expect(links[1]!.textContent).toMatch(/Donat/);
    expect(links[2]!.textContent).toMatch(/Gent/);
  });

  it("filters by search query", async () => {
    render(Players, {
      props: {
        store: withState({
          status: "ready",
          data: [player({ display_name: "Gent" }), player({ display_name: "Donat" })],
        }),
      },
    });
    const search = screen.getByTestId("players-search");
    await fireEvent.input(search, { target: { value: "gen" } });
    const links = screen.getAllByTestId("player-link");
    expect(links).toHaveLength(1);
    expect(links[0]!.textContent).toMatch(/Gent/);
  });

  it("shows empty-search state when nothing matches", async () => {
    render(Players, {
      props: {
        store: withState({
          status: "ready",
          data: [player({ display_name: "Gent" })],
        }),
      },
    });
    const search = screen.getByTestId("players-search");
    await fireEvent.input(search, { target: { value: "zzz" } });
    expect(screen.getByTestId("players-empty-search")).toBeInTheDocument();
  });

  it("calls onSelect when a player is clicked", async () => {
    const onSelect = vi.fn();
    render(Players, {
      props: {
        store: withState({ status: "ready", data: [player({ display_name: "Gent" })] }),
        onSelect,
      },
    });
    const link = screen.getByTestId("player-link");
    await fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith("Gent");
  });
});
