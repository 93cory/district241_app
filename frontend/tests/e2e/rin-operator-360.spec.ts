import { expect, test } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = process.env.PNPI_E2E_BASE_URL ?? "http://localhost:3000";

async function loginAsMinistre(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/connexion`);
  await page.fill('input[name="username"]', "ministre");
  await page.fill('input[name="password"]', e2ePasswords.ministre);
  await Promise.all([
    page.waitForURL(/\/(pnpi|pilotage|admin)/),
    page.click('button[type="submit"]'),
  ]);
}

test.describe("Référentiel Industriel National", () => {
  test("la fiche opérateur expose la vue industrielle 360°", async ({ page }) => {
    await loginAsMinistre(page);

    await page.goto(`${BASE}/pnpi/operateurs`);
    const firstOperator = page.locator('a[href^="/pnpi/operateurs/"]').first();
    await expect(firstOperator).toBeVisible({ timeout: 10000 });
    await firstOperator.click();

    await expect(page.getByText("Référentiel Industriel National · Fiche 360°")).toBeVisible();
    await expect(page.getByText("Les 15 sous-modules du RIN")).toBeVisible();
    await expect(page.getByText("Données prioritaires à compléter pour un RIN supérieur")).toBeVisible();
    await expect(page.getByText("Données structurées RIN")).toBeVisible();
    await expect(page.getByText("Données détaillées RIN")).toBeVisible();
    await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Export JSON" })).toBeVisible();
    await expect(page.locator("div", { hasText: /^Représentants$/ }).first()).toBeVisible();
    await expect(page.getByText("Cockpit RIN")).toBeVisible();

    await expect(page.getByText("Identité", { exact: true })).toBeVisible();
    await expect(page.getByText("Sites industriels", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Capacités", { exact: true })).toBeVisible();
    await expect(page.getByText("Énergie", { exact: true })).toBeVisible();
    await expect(page.getByText("Investissements", { exact: true }).first()).toBeVisible();
  });
});
