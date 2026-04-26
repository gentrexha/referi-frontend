// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import PlayerProfile from "./PlayerProfile.svelte";
import type { AsyncState, MatchFeedEntry, PlayerStats } from "../lib/types";

const summary: PlayerStats = {
  display_name: "Gent",
  matches_played: 5,
  wins: 3,
  draws: 1,
  losses: 1,
  win_rate_pct: 60,
};

const matches: MatchFeedEntry[] = [
  {
    id: 3,
    played_on: "2026-04-26",
    winner: "team_1",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-26T19:00:00Z",
    team_1_players: ["Gent", "Donat"],
    team_2_players: ["Lirim", "Arben"],
  },
  {
    id: 2,
    played_on: "2026-04-19",
    winner: "draw",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-19T19:00:00Z",
    team_1_players: ["Donat", "Lirim"],
    team_2_players: ["Gent", "Arben"],
  },
  {
    id: 1,
    played_on: "2026-04-12",
    winner: "team_2",
    team_1_label: "Reds",
    team_2_label: "Blues",
    recorded_at: "2026-04-12T19:00:00Z",
    team_1_players: ["Gent"],
    team_2_players: ["Donat"],
  },
];

function withState(state: AsyncState<MatchFeedEntry[]>) {
  return writable<AsyncState<MatchFeedEntry[]>>(state);
}

describe("PlayerProfile", () => {
  it("renders the player name and summary card", () => {
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "ready", data: matches }),
        onBack: vi.fn(),
      },
    });
    expect(screen.getByRole("heading", { name: "Gent" })).toBeInTheDocument();
    expect(screen.getByText(/60% win rate/)).toBeInTheDocument();
  });

  it("renders form chips for last six matches with correct W/D/L", () => {
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "ready", data: matches }),
        onBack: vi.fn(),
      },
    });
    const form = screen.getByTestId("profile-form");
    const chips = form.querySelectorAll("span");
    expect(chips).toHaveLength(3);
    expect(chips[0]!.textContent).toBe("W");
    expect(chips[1]!.textContent).toBe("D");
    expect(chips[2]!.textContent).toBe("L");
  });

  it("renders match history with correct result labels", () => {
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "ready", data: matches }),
        onBack: vi.fn(),
      },
    });
    const history = screen.getByTestId("profile-history");
    const items = within(history).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByText(/Won/)).toBeInTheDocument();
    expect(within(items[1]!).getByText(/Drew/)).toBeInTheDocument();
    expect(within(items[2]!).getByText(/Lost/)).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const onBack = vi.fn();
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "ready", data: matches }),
        onBack,
      },
    });
    await fireEvent.click(screen.getByTestId("profile-back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("calls onSelect when a teammate is clicked", async () => {
    const onSelect = vi.fn();
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "ready", data: matches }),
        onBack: vi.fn(),
        onSelect,
      },
    });
    const links = screen.getAllByTestId("player-link");
    const donat = links.find((b) => b.textContent === "Donat");
    expect(donat).toBeDefined();
    await fireEvent.click(donat!);
    expect(onSelect).toHaveBeenCalledWith("Donat");
  });

  it("renders skeleton while history is loading", () => {
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "loading" }),
        onBack: vi.fn(),
      },
    });
    expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
  });

  it("renders error banner with retry on error", () => {
    render(PlayerProfile, {
      props: {
        displayName: "Gent",
        summary,
        history: withState({ status: "error", error: "oops" }),
        onBack: vi.fn(),
      },
    });
    expect(screen.getByText(/couldn't load match history/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
