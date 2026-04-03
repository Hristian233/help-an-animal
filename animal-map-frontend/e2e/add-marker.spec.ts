import { test, expect } from "@playwright/test";

const MOCK_LOCATION = { latitude: 42.6977, longitude: 23.3219 };

test.describe("add marker", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation(MOCK_LOCATION);

    await page.route("**/markers/all**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("Add Animal triggers geolocation and shows pick-location toast", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Loading map...")).toBeHidden({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "+" }).click();
    await page.getByText("Добави животно").click();

    await expect(
      page.getByText(
        /кликнете на картата в рамките на 100 метра/i,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

});
