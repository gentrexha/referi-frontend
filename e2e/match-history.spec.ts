import { expect, test } from "@playwright/test";
import { mockApi } from "./mock";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("matches tab renders cards with date and winner badge", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-matches").click();
  const cards = page.getByTestId("match-card");
  await expect(cards.first()).toBeVisible();
  await expect(cards.first()).toContainText(/Reds won/);
  await expect(page.getByText("Draw")).toBeVisible();
});

test("clicking a player chip in a match navigates to their profile", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-matches").click();
  await page.getByRole("button", { name: "Gent" }).first().click();
  await expect(page.getByRole("heading", { name: "Gent" })).toBeVisible();
  await expect(page.getByTestId("profile-history")).toBeVisible();
});
