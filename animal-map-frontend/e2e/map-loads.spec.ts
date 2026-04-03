import { test, expect } from "@playwright/test";

test.describe("map loads", () => {
  test("app loads and shows map UI", async ({ page }) => {
    await page.route("**/markers/all**", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/");

    await expect(page.getByText("Loading map...")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Loading map...")).toBeHidden({
      timeout: 15000,
    });
  });

  test("FAB button is visible after map loads", async ({ page }) => {
    await page.route("**/markers/all**", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/");

    await expect(page.getByText("Loading map...")).toBeHidden({
      timeout: 15000,
    });

    const fabButton = page.getByRole("button", { name: "+" });
    await expect(fabButton).toBeVisible({ timeout: 5000 });
  });
});
