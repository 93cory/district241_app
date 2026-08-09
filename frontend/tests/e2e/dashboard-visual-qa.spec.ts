import { expect, test } from "@playwright/test";
import { e2ePasswords } from "./helpers/credentials";

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

test("dashboard visual QA at required breakpoints", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const isCancelledNextPrefetch = text.startsWith("Failed to fetch RSC payload for ");
    if (message.type() === "error" && !isCancelledNextPrefetch) consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto("/connexion");
  await page.locator('input[name="username"]').fill("ministre");
  await page.locator('input[name="password"]').fill(e2ePasswords.ministre);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("connexion"));

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/pnpi$/);
    await expect(page.locator("main")).toBeVisible();

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const overflowing = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > root.clientWidth + 1 || rect.left < -1;
        })
        .slice(0, 20)
        .map((element) => ({
          tag: element.tagName,
          className: element.className?.toString().slice(0, 120),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        }));
      const clippedText = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((element) => !element.classList.contains("skip-link"))
        .filter((element) => element.childElementCount === 0 && (element.textContent ?? "").trim())
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .slice(0, 20)
        .map((element) => ({
          tag: element.tagName,
          className: element.className?.toString().slice(0, 120),
          text: element.textContent?.trim().slice(0, 100),
        }));
      const smallTargets = [...document.querySelectorAll<HTMLElement>("a,button,input,select")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        })
        .slice(0, 30)
        .map((element) => ({
          tag: element.tagName,
          name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 50),
          width: Math.round(element.getBoundingClientRect().width),
          height: Math.round(element.getBoundingClientRect().height),
        }));
      return {
        viewport: root.clientWidth,
        scrollWidth: root.scrollWidth,
        overflowing,
        clippedText,
        smallTargets,
      };
    });

    await testInfo.attach(`layout-${viewport.name}`, {
      body: JSON.stringify(layout, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    expect(layout.scrollWidth, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(
      layout.viewport + 1,
    );
    expect(layout.clippedText, "Text nodes should not be clipped").toEqual([]);
  }

  expect(pageErrors, `Page errors: ${pageErrors.join("\n")}`).toEqual([]);
  expect(
    consoleErrors,
    `Console errors: ${consoleErrors.join("\n")}\nFailed responses: ${failedResponses.join("\n")}`,
  ).toEqual([]);
});
