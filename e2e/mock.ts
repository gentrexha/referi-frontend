import type { Page } from "@playwright/test";
import leaderboard from "./fixtures/leaderboard.json" with { type: "json" };
import matches from "./fixtures/matches.json" with { type: "json" };
import gentHistory from "./fixtures/gent-history.json" with { type: "json" };

export const API = "https://referi-api.e2e.test";

export async function mockApi(page: Page): Promise<void> {
  await page.route(`${API}/player_stats**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaderboard),
    });
  });

  await page.route(`${API}/match_feed**`, async (route) => {
    const url = route.request().url();
    const body = url.includes("or=(") ? gentHistory : matches;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
