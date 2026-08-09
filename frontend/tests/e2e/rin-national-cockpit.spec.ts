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

test.describe("Cockpit national RIN", () => {
  test("le ministre consulte la synthèse nationale du référentiel industriel", async ({ page }) => {
    await loginAsMinistre(page);
    await page.goto(`${BASE}/pnpi/rin`);

    await expect(page.getByRole("heading", { name: "Référentiel Industriel National" })).toBeVisible();
    await expect(page.getByText("Cockpit national du RIN")).toBeVisible();
    await expect(page.getByText("Complétude moyenne RIN")).toBeVisible();
    await expect(page.getByText("Alertes de complétude nationale")).toBeVisible();
    await expect(page.getByText("File des fiches RIN à compléter")).toBeVisible();
    await expect(page.getByText("Domaines RIN")).toBeVisible();
    await expect(page.getByText("Prochain palier technique")).toBeVisible();
  });
});
