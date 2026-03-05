import { test, expect } from "@playwright/test";

const MOCK_LOCATION = { latitude: 42.6977, longitude: 23.3219 };
const EXISTING_MARKER = {
  id: 1,
  animal: "dog",
  note: "Original note",
  lat: 42.6977,
  lng: 23.3219,
  image_url: "https://example.com/dog.png",
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z",
};

test.describe("edit marker", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation(MOCK_LOCATION);

    await page.route("**/markers/all**", async (route) => {
      await route.fulfill({ json: [EXISTING_MARKER] });
    });
  });

  test("map loads with markers from API", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading map...")).toBeHidden({
      timeout: 15000,
    });

    await expect(page.locator(".gm-style")).toBeVisible({
      timeout: 10000,
    });
  });
});
