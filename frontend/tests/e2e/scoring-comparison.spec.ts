import { test, expect } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = "http://localhost:3000";

test.describe("Scoring & Comparison", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "ministre");
    await page.fill('input[name="password"]', e2ePasswords.ministre);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/pnpi/);
  });

  test("operateur detail shows score card", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/operateurs`);
    const firstLink = page.locator("a[href*='/operateurs/']").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      // Score card should be visible
      await expect(page.locator("body")).toContainText(/score|grade|conformite/i);
    }
  });

  test("comparison page loads with form", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/comparison`);
    await expect(page.locator("h1")).toContainText(/comparaison/i);
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test("comparison form submits and shows results", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/comparison`);
    // Fill dates
    await page.fill('input[name="p1_start"]', "2025-01-01");
    await page.fill('input[name="p1_end"]', "2025-06-30");
    await page.fill('input[name="p2_start"]', "2025-07-01");
    await page.fill('input[name="p2_end"]', "2025-12-31");
    await page.click('button[type="submit"]');
    // Wait for results table
    await page.waitForSelector("table", { timeout: 10000 });
    await expect(page.locator("table")).toBeVisible();
  });

  test("dashboard config page loads", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/dashboard-config`);
    await expect(page.locator("h1")).toContainText(/configuration.*dashboard/i);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
