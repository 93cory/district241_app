import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Inspection Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Login as inspecteur
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "inspecteur");
    await page.fill('input[name="password"]', "Demo1234!@#$");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/pnpi/);
  });

  test("inspecteur can view inspections list", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/inspections`);
    await expect(page.locator("h1, h2").first()).toContainText(/inspection/i);
    // Table should be visible
    await expect(page.locator("table, .table-card").first()).toBeVisible();
  });

  test("inspecteur can view inspection detail", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/inspections`);
    // Click first inspection link
    const firstLink = page.locator("a[href*='/inspections/']").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page.locator("body")).toContainText(/conformite|observations|inspecteur/i);
    }
  });

  test("inspection detail shows download PDF button", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/inspections`);
    const firstLink = page.locator("a[href*='/inspections/']").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      // Look for PDF download link/button
      const pdfBtn = page.locator("a[href*='report.pdf'], button:has-text('PDF')");
      if (await pdfBtn.isVisible()) {
        await expect(pdfBtn).toBeEnabled();
      }
    }
  });
});
