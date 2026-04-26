import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatWinRate,
  formatWinner,
  resultForPlayer,
  resultLabel,
  teamForPlayer,
} from "./format";

describe("formatDate", () => {
  it('renders "Apr 26, 2026" for "2026-04-26"', () => {
    expect(formatDate("2026-04-26")).toBe("Apr 26, 2026");
  });

  it('returns "—" for empty input', () => {
    expect(formatDate("")).toBe("—");
  });
});

describe("formatDateShort", () => {
  it('renders "Apr 26" for "2026-04-26"', () => {
    expect(formatDateShort("2026-04-26")).toBe("Apr 26");
  });

  it('returns "—" for empty input', () => {
    expect(formatDateShort("")).toBe("—");
  });
});

describe("formatWinner", () => {
  it("returns the winning team label for team_1", () => {
    expect(formatWinner("team_1", "Reds", "Blues")).toBe("Reds won");
  });

  it("returns the winning team label for team_2", () => {
    expect(formatWinner("team_2", "Reds", "Blues")).toBe("Blues won");
  });

  it('returns "Draw" for draw', () => {
    expect(formatWinner("draw", "Reds", "Blues")).toBe("Draw");
  });
});

describe("formatWinRate", () => {
  it('renders "62.5%" for 62.5', () => {
    expect(formatWinRate(62.5)).toBe("62.5%");
  });

  it('renders "100%" for 100', () => {
    expect(formatWinRate(100)).toBe("100%");
  });

  it('renders "—" for null', () => {
    expect(formatWinRate(null)).toBe("—");
  });
});

describe("teamForPlayer", () => {
  const m = {
    team_1_players: ["Gent", "Donat"],
    team_2_players: ["Lirim", "Arben"],
  };

  it("returns team_1 when player is on team 1", () => {
    expect(teamForPlayer("Gent", m)).toBe("team_1");
  });

  it("returns team_2 when player is on team 2", () => {
    expect(teamForPlayer("Arben", m)).toBe("team_2");
  });

  it("returns null when player did not play", () => {
    expect(teamForPlayer("Nobody", m)).toBeNull();
  });
});

describe("resultForPlayer", () => {
  it("returns win when winner matches team", () => {
    expect(resultForPlayer("team_1", "team_1")).toBe("win");
    expect(resultForPlayer("team_2", "team_2")).toBe("win");
  });

  it("returns loss when winner is the opposite team", () => {
    expect(resultForPlayer("team_1", "team_2")).toBe("loss");
    expect(resultForPlayer("team_2", "team_1")).toBe("loss");
  });

  it("returns draw on draw", () => {
    expect(resultForPlayer("draw", "team_1")).toBe("draw");
    expect(resultForPlayer("draw", "team_2")).toBe("draw");
  });
});

describe("resultLabel", () => {
  it("maps result to label", () => {
    expect(resultLabel("win")).toBe("Won");
    expect(resultLabel("draw")).toBe("Drew");
    expect(resultLabel("loss")).toBe("Lost");
  });
});
