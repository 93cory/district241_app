import { expect, test } from "@playwright/test";

import { e2ePasswords } from "./helpers/credentials";

const ministerRoutes = [
  ["/pnpi/institutions", /un même cap, trois institutions/i],
  ["/pnpi/institutions/dossier", /dossier industriel unifié/i],
  ["/pnpi/institutions/aganor", /tableau de bord aganor/i],
  ["/pnpi/institutions/ogapi", /tableau de bord ogapi/i],
  ["/pnpi/institutions/ministre", /cockpit du ministre/i],
] as const;

async function login(page: import("@playwright/test").Page, username: keyof typeof e2ePasswords) {
  await page.goto("/connexion");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(e2ePasswords[username]);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("connexion"), {
    waitUntil: "domcontentloaded",
  });
}

test("le ministre peut consulter les cinq vues institutionnelles", async ({ page }) => {
  await login(page, "ministre");

  for (const [route, heading] of ministerRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(route);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }

  await page.goto("/pnpi/institutions/aganor", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/prototype.*données de démonstration/i).first()).toBeVisible();
  await expect(page.getByText(/données de démonstration.*fictifs/i).first()).toBeVisible();
});

test("le cockpit Ministre refuse un profil instructeur", async ({ page }) => {
  await login(page, "instructeur");
  await page.goto("/pnpi/institutions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Cockpit Ministre" })).toHaveCount(0);
  await page.goto("/pnpi/institutions/ministre", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/pnpi$/);
});

test("les vues institutionnelles restent lisibles sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, "ministre");
  await page.goto("/pnpi/institutions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
