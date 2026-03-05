import { expect, test } from "@playwright/test";

test.describe("PNPI Workflow UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pnpi/e2e");
    await expect(page.getByRole("heading", { name: "PNPI E2E Demo" })).toBeVisible();
  });

  test("displays ATI table with all entries", async ({ page }) => {
    await expect(page.getByText("ATI-2026-0001")).toBeVisible();
    await expect(page.getByText("ATI-2026-0002")).toBeVisible();
    await expect(page.getByText("ATI-2026-0003")).toBeVisible();
    await expect(page.getByText("ATI-2026-0004")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Dossiers ATI \(4\)/ })).toBeVisible();
  });

  test("filters ATIs by statut", async ({ page }) => {
    await page.getByTestId("statut-filter").selectOption("soumis");
    await expect(page.getByRole("heading", { name: /Dossiers ATI \(1\)/ })).toBeVisible();
    await expect(page.getByText("ATI-2026-0001")).toBeVisible();
    await expect(page.getByText("ATI-2026-0002")).toHaveCount(0);
  });

  test("filters ATIs by secteur", async ({ page }) => {
    await page.getByTestId("secteur-filter").selectOption("mines");
    await expect(page.getByRole("heading", { name: /Dossiers ATI \(1\)/ })).toBeVisible();
    await expect(page.getByText("Mines du Haut-Ogooue")).toBeVisible();
  });

  test("search filters across ATIs and operateurs", async ({ page }) => {
    await page.getByTestId("search-input").fill("Bois Gabon");
    await expect(page.getByRole("heading", { name: /Dossiers ATI \(1\)/ })).toBeVisible();
    await expect(page.getByText("ATI-2026-0001")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Operateurs \(1\)/ })).toBeVisible();
    await expect(page.getByText("NIF-001")).toBeVisible();
  });

  test("displays operateurs table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Operateurs \(3\)/ })).toBeVisible();
    await expect(page.getByText("NIF-001")).toBeVisible();
    await expect(page.getByText("NIF-002")).toBeVisible();
    await expect(page.getByText("NIF-003")).toBeVisible();
  });

  test("displays inspections table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Inspections \(2\)/ })).toBeVisible();
    await expect(page.getByText("INS-E2E-001")).toBeVisible();
    await expect(page.getByText("INS-E2E-002")).toBeVisible();
    await expect(page.getByText("conforme")).toBeVisible();
    await expect(page.getByText("non_conforme")).toBeVisible();
  });

  test("shows pipeline summary counts", async ({ page }) => {
    const pipeline = page.getByTestId("pipeline-summary");
    await expect(pipeline).toBeVisible();
    await expect(pipeline.getByText("soumis")).toBeVisible();
    await expect(pipeline.getByText("en_instruction")).toBeVisible();
    await expect(pipeline.getByText("approuve")).toBeVisible();
    await expect(pipeline.getByText("rejete")).toBeVisible();
  });

  test("combined filters narrow results correctly", async ({ page }) => {
    await page.getByTestId("statut-filter").selectOption("approuve");
    await page.getByTestId("secteur-filter").selectOption("agroalimentaire");
    await expect(page.getByRole("heading", { name: /Dossiers ATI \(1\)/ })).toBeVisible();
    await expect(page.getByText("Agro Ngounie SA")).toBeVisible();
  });
});
