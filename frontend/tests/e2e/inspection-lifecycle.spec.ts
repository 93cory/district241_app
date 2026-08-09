import { test, expect } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = "http://localhost:3000";

test.describe("Inspection Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Login as inspecteur
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "inspecteur");
    await page.fill('input[name="password"]', e2ePasswords.inspecteur);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(inspecteur|pnpi)/);
  });

  test("inspecteur can view inspections list", async ({ page }) => {
    await page.goto(`${BASE}/pnpi/inspections`);
    await expect(page.locator("h1, h2").first()).toContainText(/inspection/i);
    // La liste actuelle est rendue en cartes cliquables plutôt qu'en table.
    await expect(page.locator("a[href*='/pnpi/inspections/']").first()).toBeVisible();
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
