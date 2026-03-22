import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Admin Bulk Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Demo1234!@#$");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(pnpi|admin)/);
  });

  test("admin page loads with user management", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page.locator("body")).toContainText(/utilisateur|admin/i);
  });

  test("admin can see import CSV section", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page.locator("body")).toContainText(/import.*csv|csv.*import/i);
  });

  test("ATI list has bulk checkboxes", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/ati`);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("selecting ATIs shows bulk action bar", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/ati`);
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      // Bulk action bar should appear
      await expect(page.locator("body")).toContainText(/selectionne|action/i);
    }
  });
});
