import { expect, test } from "@playwright/test";
import { mockApi } from "./mock";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("brand mark and subtitle render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Referi" })).toBeVisible();
  await expect(page.getByText(/Football Group — ALB/)).toBeVisible();
});

test("all three tabs are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("leaderboard-search")).toBeVisible();

  await page.getByTestId("tab-matches").click();
  await expect(page.getByTestId("match-card").first()).toBeVisible();

  await page.getByTestId("tab-players").click();
  await expect(page.getByTestId("players-search")).toBeVisible();

  await page.getByTestId("tab-leaderboard").click();
  await expect(page.getByTestId("leaderboard-search")).toBeVisible();
});
