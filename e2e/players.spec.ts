import { expect, test } from "@playwright/test";
import { mockApi } from "./mock";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("players tab shows a search input and an alphabetical list", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-players").click();
  await expect(page.getByTestId("players-search")).toBeVisible();
  const links = page.getByTestId("player-link");
  await expect(links.first()).toContainText("Arben");
});

test("typing in the search filters the list", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-players").click();
  await page.getByTestId("players-search").fill("ge");
  const links = page.getByTestId("player-link");
  await expect(links).toHaveCount(1);
  await expect(links.first()).toContainText("Gent");
});

test("clicking a player from the players tab opens the profile", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-players").click();
  await page.getByTestId("player-link").filter({ hasText: "Gent" }).click();
  await expect(page.getByRole("heading", { name: "Gent" })).toBeVisible();
  await expect(page.getByTestId("profile-form")).toBeVisible();
  await expect(page.getByTestId("profile-history")).toBeVisible();
});

test("back button from a profile returns to the list", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-players").click();
  await page.getByTestId("player-link").filter({ hasText: "Gent" }).click();
  await page.getByTestId("profile-back").click();
  await expect(page.getByTestId("players-search")).toBeVisible();
});
