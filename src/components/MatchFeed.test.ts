// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import MatchFeed from "./MatchFeed.svelte";
import type { AsyncState, MatchFeedEntry } from "../lib/types";

const match = (over: Partial<MatchFeedEntry> = {}): MatchFeedEntry => ({
  id: 1,
  played_on: "2026-04-26",
  winner: "team_1",
  team_1_label: "Reds",
  team_2_label: "Blues",
  recorded_at: "2026-04-26T18:00:00Z",
  team_1_players: ["Gent", "Donat"],
  team_2_players: ["Lirim", "Arben"],
  ...over,
});

function withState(state: AsyncState<MatchFeedEntry[]>) {
  return writable<AsyncState<MatchFeedEntry[]>>(state);
}

describe("MatchFeed", () => {
  it("renders skeletons when loading", () => {
    render(MatchFeed, { props: { store: withState({ status: "loading" }) } });
    expect(screen.getByTestId("matches-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when no matches", () => {
    render(MatchFeed, { props: { store: withState({ status: "ready", data: [] }) } });
    expect(screen.getByText(/no matches recorded yet/i)).toBeInTheDocument();
  });

  it("renders cards with date, winner badge, and player buttons", () => {
    render(MatchFeed, { props: { store: withState({ status: "ready", data: [match()] }) } });
    expect(screen.getByText(/Apr 26, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Reds won/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arben" })).toBeInTheDocument();
  });

  it("shows Draw when winner is draw", () => {
    render(MatchFeed, {
      props: { store: withState({ status: "ready", data: [match({ winner: "draw" })] }) },
    });
    expect(screen.getByText("Draw")).toBeInTheDocument();
  });

  it("calls onSelect when a player name is clicked", async () => {
    const onSelect = vi.fn();
    render(MatchFeed, {
      props: { store: withState({ status: "ready", data: [match()] }), onSelect },
    });
    const link = screen.getByRole("button", { name: "Donat" });
    await fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith("Donat");
  });

  it("shows error banner with retry", () => {
    render(MatchFeed, { props: { store: withState({ status: "error", error: "oops" }) } });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
