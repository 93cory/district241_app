import { expect, test } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = process.env.PNPI_E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: import("@playwright/test").Page, username: string) {
  await page.goto(`${BASE}/connexion`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', e2ePasswords[username as keyof typeof e2ePasswords]);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(pnpi|pilotage|admin)/);
}

test.describe("Suivi ATI multi-profils", () => {
  test("les profils clés consultent la liste ATI et ouvrent un dossier", async ({ page }) => {
    for (const username of ["operateur", "instructeur", "directeur", "ministre"] as const) {
      await login(page, username);
      await page.goto(`${BASE}/pnpi/ati`);

      await expect(page.getByRole("heading", { name: /agrements techniques industriels/i })).toBeVisible();
      const firstDossier = page.locator('a[href^="/pnpi/ati/ATI-"]').first();
      await expect(firstDossier).toBeVisible({ timeout: 10000 });
      await firstDossier.click();

      await expect(page.locator("body")).toContainText(/ATI-2026|Agrement|Soumis|Approuve/i);
      await page.goto(`${BASE}/api/auth/logout`);
    }
  });
});
