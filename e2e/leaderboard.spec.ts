import { expect, test } from "@playwright/test";
import { API, mockApi } from "./mock";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("leaderboard renders rows for every player", async ({ page }) => {
  await page.goto("/");
  for (const p of leaderboard) {
    await expect(page.getByText(p.display_name, { exact: true }).first()).toBeVisible();
  }
});

test("rows are sorted by matches_played descending by default", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByTestId("leaderboard-row");
  await expect(rows).toHaveCount(leaderboard.length);
  const expectedOrder = [...leaderboard].sort((a, b) => b.matches_played - a.matches_played);
  for (let i = 0; i < expectedOrder.length; i++) {
    await expect(rows.nth(i)).toContainText(expectedOrder[i]!.display_name);
  }
});

test("clicking the Win % header sorts by win rate descending", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sort-win_rate_pct").click();
  const firstRow = page.getByTestId("leaderboard-row").first();
  await expect(firstRow).toContainText("Gent");
  await expect(firstRow).toContainText("75%");
});

test("clicking a player navigates to their profile", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("player-link").filter({ hasText: "Gent" }).first().click();
  await expect(page.getByRole("heading", { name: "Gent" })).toBeVisible();
  await expect(page.getByTestId("profile-back")).toBeVisible();
  await expect(page.getByTestId("profile-history")).toBeVisible();
});

test("filtering the leaderboard with the search input narrows rows", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("leaderboard-search").fill("Don");
  await expect(page.getByTestId("leaderboard-row")).toHaveCount(1);
  await expect(page.getByTestId("leaderboard-row").first()).toContainText("Donat");
});

test("error banner with retry on 5xx", async ({ page }) => {
  await page.unroute(`${API}/player_stats**`);
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({ status: 503, body: "down" });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
});
