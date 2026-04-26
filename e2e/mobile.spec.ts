import { devices, expect, test } from "@playwright/test";
import { mockApi } from "./mock";

test.use({ ...devices["iPhone 13"] });

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("leaderboard renders without horizontal overflow on mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("leaderboard-row").first()).toBeVisible();
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test("tabs, sort, and profile flow all work on mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sort-wins").click();
  await expect(page.getByTestId("leaderboard-row").first()).toBeVisible();

  await page.getByTestId("tab-matches").click();
  await expect(page.getByTestId("match-card").first()).toBeVisible();

  await page.getByTestId("tab-players").click();
  await page.getByTestId("players-search").fill("Gent");
  await page.getByTestId("player-link").filter({ hasText: "Gent" }).click();
  await expect(page.getByRole("heading", { name: "Gent" })).toBeVisible();
  await expect(page.getByTestId("profile-history")).toBeVisible();

  await page.getByTestId("profile-back").click();
  await expect(page.getByTestId("players-search")).toBeVisible();
});
