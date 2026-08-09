import { expect, test } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const BASE = process.env.PNPI_E2E_BASE_URL ?? "http://localhost:3000";

async function loginAsInstructeur(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/connexion`);
  await page.fill('input[name="username"]', "instructeur");
  await page.fill('input[name="password"]', e2ePasswords.instructeur);
  await Promise.all([
    page.waitForURL(/\/(pnpi|pilotage|admin)/),
    page.click('button[type="submit"]'),
  ]);
}

test.describe("Saisie RIN", () => {
  test("un instructeur ajoute une donnée structurée à une fiche opérateur", async ({ page }) => {
    await loginAsInstructeur(page);

    await page.goto(`${BASE}/pnpi/operateurs`);
    await page.locator('a[href^="/pnpi/operateurs/"]').first().click();

    await expect(page.getByText("Données structurées RIN")).toBeVisible();
    await page.getByRole("button", { name: /ajouter une donnée rin/i }).click();

    await page.selectOption("#rin-kind", "produits");
    await page.fill("#rin-nom_produit", `Produit test RIN ${Date.now()}`);
    await page.fill("#rin-categorie", "Transformation locale");
    await page.fill("#rin-unite", "tonne");
    await page.fill("#rin-capacite_annuelle", "1250");
    await page.fill("#rin-production_annuelle", "820");

    await page.getByRole("button", { name: /enregistrer dans le rin/i }).click();
    await expect(page.getByText("Produit / capacité ajouté au RIN.")).toBeVisible();
  });
});
