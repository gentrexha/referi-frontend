import { expect, test } from "@playwright/test";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };
import matches from "./fixtures/matches.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/player_stats**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaderboard),
    }),
  );
  await page.route(`${API}/match_feed**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(matches),
    }),
  );
});

test("tabs switch between leaderboard and matches", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Win %")).toBeVisible();

  await page.getByTestId("tab-matches").click();
  await expect(page.getByText("Apr 26, 2026")).toBeVisible();

  await page.getByTestId("tab-leaderboard").click();
  await expect(page.getByText("Win %")).toBeVisible();
});
