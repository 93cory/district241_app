import { expect, test } from "@playwright/test";

test.describe("Pilotage Workflow UI", () => {
  test("filters dossiers by text and status", async ({ page }) => {
    await page.goto("/pilotage/e2e");

    await expect(page.getByRole("heading", { name: "Pilotage Workflow E2E Demo" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "DOS-E2E-0001", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "DOS-E2E-0002", exact: true })).toBeVisible();

    await page.getByPlaceholder("Recherche texte").fill("Agro Demo");
    await expect(page.getByRole("cell", { name: "DOS-E2E-0002", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "DOS-E2E-0001", exact: true })).toHaveCount(0);

    await page.getByPlaceholder("Recherche texte").fill("");
    await page.locator('select:has(option[value="approved"])').selectOption("approved");
    await expect(page.getByRole("cell", { name: "DOS-E2E-0002", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "DOS-E2E-0001", exact: true })).toHaveCount(0);
  });

  test("shows transition history for selected dossier", async ({ page }) => {
    await page.goto("/pilotage/e2e");

    const historySelect = page.locator("#history-dossier");
    await historySelect.selectOption("DOS-E2E-0002");
    await expect(page.getByText("Decision finale")).toBeVisible();
    await expect(page.getByRole("cell", { name: "ministre", exact: true })).toBeVisible();
  });
});
