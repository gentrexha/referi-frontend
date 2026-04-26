import { expect, test } from "@playwright/test";
import matches from "./fixtures/matches.json" with { type: "json" };

const API = "https://referi-api.e2e.test";

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/match_feed**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(matches),
    });
  });
});

test("matches tab renders all matches with player names and winner", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-matches").click();
  await expect(page.getByText("Apr 26, 2026")).toBeVisible();
  await expect(page.getByText(/Reds won/)).toBeVisible();
  await expect(page.getByText("Draw")).toBeVisible();
  await expect(page.getByText("Gent, Donat")).toBeVisible();
});
