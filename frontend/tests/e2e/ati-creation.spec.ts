import { expect, test } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = process.env.PNPI_E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto(`${BASE}/connexion`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(pnpi|pilotage|admin)/);
}

test.describe("Création ATI", () => {
  test("un opérateur peut soumettre une demande ATI depuis le guichet", async ({ page }) => {
    await login(page, "operateur", e2ePasswords.operateur);

    await page.goto(`${BASE}/pnpi/guichet`);
    await expect(page.getByRole("heading", { name: /Depot de demande ATI/i })).toBeVisible();

    const operatorSelect = page.locator("#w-op");
    if (await operatorSelect.isVisible().catch(() => false)) {
      await operatorSelect.selectOption({ index: 0 });
      await page.getByRole("button", { name: /Suivant/i }).click();
    }
    await page.getByRole("button", { name: /^Creation/i }).click();
    await page.getByRole("button", { name: /Suivant/i }).click();

    const activity = `Démo ATI ministère ${Date.now()}`;
    await page.locator("#w-act").fill(activity);
    await page.locator("#w-sec").selectOption("bois");
    await page.locator("#w-prio").selectOption("normale");
    await page.locator("#w-obs").fill("Dossier créé automatiquement pour vérifier le parcours de démo.");
    await page.getByRole("button", { name: /Suivant/i }).click();

    await expect(page.getByText(activity)).toBeVisible();
    await page.getByRole("button", { name: /Soumettre la demande ATI/i }).click();

    await page.waitForURL(/\/pnpi\/ati\/ATI-/, { timeout: 15000 });
    await expect(page.getByText(activity)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).toContainText("Soumis");
  });
});
