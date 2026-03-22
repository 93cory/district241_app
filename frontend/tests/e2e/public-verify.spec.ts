import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Public ATI Verification", () => {
  test("verify page shows error for unknown ATI", async ({ page }) => {
    await page.goto(`${BASE}/verify/ati/UNKNOWN-999`);
    await expect(page.locator("body")).toContainText(/introuvable|erreur|not found/i);
  });

  test("verify page renders with Gabon branding", async ({ page }) => {
    await page.goto(`${BASE}/verify/ati/test`);
    await expect(page.locator("body")).toContainText(/republique gabonaise|PNPI|verification/i);
  });

  test("verify page does not require login", async ({ page }) => {
    // Should NOT redirect to /connexion
    const response = await page.goto(`${BASE}/verify/ati/test`);
    expect(response?.url()).toContain("/verify/ati/");
    expect(response?.url()).not.toContain("/connexion");
  });
});
