import { describe, expect, it } from "vitest";
import { formatDate, formatWinner, formatWinRate } from "./format";

describe("formatDate", () => {
  it('renders "Apr 26, 2026" for "2026-04-26"', () => {
    expect(formatDate("2026-04-26")).toBe("Apr 26, 2026");
  });

  it('returns "—" for empty input', () => {
    expect(formatDate("")).toBe("—");
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
