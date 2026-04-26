import { expect, test } from "@playwright/test";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaderboard),
    });
  });
});

test("leaderboard renders rows for every player in the fixture", async ({ page }) => {
  await page.goto("/");
  for (const p of leaderboard) {
    await expect(page.getByText(p.display_name)).toBeVisible();
  }
  await expect(page.getByText("75%")).toBeVisible();
});

test("leaderboard shows error banner when API 5xxs", async ({ page }) => {
  await page.unroute(`${API}/player_stats**`);
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({ status: 503, body: "down" });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
});
