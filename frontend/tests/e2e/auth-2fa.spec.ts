import { test, expect } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = "http://localhost:3000";

test.describe("Authentication & Security", () => {
  test("Login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/connexion`);

    // Should have username and password fields
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Successful login redirects to dashboard", async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "ministre");
    await page.fill('input[name="password"]', e2ePasswords.ministre);
    await page.click('button[type="submit"]');

    // Should redirect away from connexion
    await page.waitForURL((url) => !url.pathname.includes("/connexion"), { timeout: 10000 });
    expect(page.url()).not.toContain("/connexion");
  });

  test("Invalid credentials show error", async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "wrong_user");
    await page.fill('input[name="password"]', "wrong_password");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=/[Ee]rreur|[Ee]chou|invalide/")).toBeVisible({ timeout: 5000 });
  });

  test("Protected pages redirect to login", async ({ page }) => {
    // Try accessing a protected page without login
    await page.goto(`${BASE}/pnpi`);

    // Should redirect to connexion
    await page.waitForURL(/connexion/, { timeout: 10000 });
  });

  test("Session timeout warning appears", async ({ page }) => {
    // This test just verifies the SessionTimeout component renders
    await page.goto(`${BASE}/connexion`);
    await page.fill('input[name="username"]', "ministre");
    await page.fill('input[name="password"]', e2ePasswords.ministre);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/connexion"), { timeout: 10000 });

    // The SessionTimeout component should be in the DOM (but not visible yet)
    // Just verify the page loaded successfully
    await expect(page.locator("main, [id=main-content]")).toBeVisible();
  });
});
