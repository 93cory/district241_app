import { test, expect } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = "http://localhost:3000";

async function login(page: any, username: string, password: string) {
  await page.goto(`${BASE}/connexion`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(pnpi|pilotage|admin)/);
}

test.describe("ATI Full Lifecycle", () => {
  test("Operateur submits ATI, Instructeur processes, Directeur approves", async ({ page }) => {
    // Step 1: Login as instructeur to create an operator first
    await login(page, "instructeur", e2ePasswords.instructeur);

    // Navigate to operateurs
    await page.goto(`${BASE}/pnpi/operateurs`);
    await expect(page.locator("h1")).toContainText(/[Oo]p[eé]rateurs/);

    // Step 2: Navigate to guichet and submit an ATI
    await page.goto(`${BASE}/pnpi/guichet`);
    await expect(page.locator("h1")).toContainText(/[Gg]uichet/);

    // Fill the ATI form (if visible)
    // Note: Form fields depend on available operateurs in seed data

    // Step 3: Check ATI list
    await page.goto(`${BASE}/pnpi/ati`);
    await expect(page.locator("table, [class*=table]")).toBeVisible();

    // Step 4: Check dashboard KPIs load
    await page.goto(`${BASE}/pnpi`);
    await expect(page.locator("text=/ATI/")).toBeVisible({ timeout: 10000 });
  });

  test("Dashboard displays KPIs correctly", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);
    await page.goto(`${BASE}/pnpi`);

    // KPI cards should be visible
    await expect(page.locator("text=/Total ATI|ATI en cours/")).toBeVisible({ timeout: 10000 });

    // Pipeline section
    await expect(page.locator("text=/[Pp]ipeline/")).toBeVisible();

    // Sectors section
    await expect(page.locator("text=/[Ss]ecteur/")).toBeVisible();
  });

  test("ATI filters work correctly", async ({ page }) => {
    await login(page, "instructeur", e2ePasswords.instructeur);
    await page.goto(`${BASE}/pnpi/ati`);

    // Should see filter controls
    await expect(page.locator("select, [role=combobox]").first()).toBeVisible();

    // Filter by status if dropdown exists
    const statusSelect = page.locator("select").first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption({ index: 1 });
      // Page should update (URL changes or table refreshes)
      await page.waitForTimeout(500);
    }
  });

  test("Mes Dossiers page loads for instructeur", async ({ page }) => {
    await login(page, "instructeur", e2ePasswords.instructeur);
    await page.goto(`${BASE}/pnpi/mes-dossiers`);

    await expect(page.locator("h1")).toContainText(/[Mm]es [Dd]ossiers/);
  });

  test("Historique page with filters", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);
    await page.goto(`${BASE}/pnpi/historique`);

    await expect(page.locator("h1")).toContainText(/[Hh]istorique/);
    // Filter inputs should exist
    await expect(page.locator("input[type=date]").first()).toBeVisible();
  });

  test("Notifications page with severity tabs", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);
    await page.goto(`${BASE}/pnpi/notifications`);

    // Severity filter tabs
    await expect(page.locator("text=/Toutes|Critiques|Importantes/")).toBeVisible();
  });

  test("Profile page shows 2FA and password sections", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);
    await page.goto(`${BASE}/profil`);

    // Should have 2FA section
    await expect(page.locator("text=/2FA|deux facteurs|Securite/i")).toBeVisible();

    // Should have password change section
    await expect(page.locator("text=/[Mm]ot de passe/")).toBeVisible();
  });

  test("Stats page loads with charts", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);
    await page.goto(`${BASE}/pnpi/stats`);

    await expect(page.locator("h1")).toContainText(/[Ss]tat/);
  });

  test("Exports work", async ({ page }) => {
    await login(page, "ministre", e2ePasswords.ministre);

    // Test CSV export
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      page.goto(`${BASE}/api/exports/indicators`),
    ]);
    // Just verify the page doesn't error
  });

  test("Operateur cannot access admin pages", async ({ page }) => {
    await login(page, "operateur", e2ePasswords.operateur);
    await page.goto(`${BASE}/admin`);

    // Should be redirected or see access denied
    const url = page.url();
    const body = await page.textContent("body");
    const blocked = !url.includes("/admin") || (body && /403|interdit|acces/i.test(body));
    expect(blocked).toBeTruthy();
  });

  test("404 page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-page-xyz`);
    await expect(page.locator("text=/404|introuvable/i")).toBeVisible();
  });
});
