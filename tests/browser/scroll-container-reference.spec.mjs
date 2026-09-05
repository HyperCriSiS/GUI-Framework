// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/scroll-container.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Scroll Container keeps browser-owned offset across adapter updates at compact width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-scroll-container-reference-root");
  const viewport = page.getByRole("region", { name: "Activity log viewport" });
  const lastItem = page.getByText("Activity event 12", { exact: true });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(viewport).toHaveAttribute("data-gui-variant", "vertical");
  await expect(viewport).toHaveAttribute("data-gui-size", "small");
  await expect(viewport).toHaveAttribute("tabindex", "0");
  await expect(viewport).toHaveCSS("overflow-y", "auto");
  await expect(viewport).toHaveCSS("overflow-x", "hidden");
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(lastItem).not.toBeInViewport();

  await viewport.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(lastItem).toBeInViewport();
  const preservedOffset = await viewport.evaluate((element) => element.scrollTop);

  await page.getByRole("button", { name: "Disable viewport focus" }).click();
  await expect(viewport).not.toHaveAttribute("tabindex", "0");
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(preservedOffset);
  await expect(page.getByText(/keyboard focus: disabled/)).toBeVisible();

  await page.getByRole("button", { name: "Enable viewport focus" }).click();
  await expect(viewport).toHaveAttribute("tabindex", "0");
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(preservedOffset);

  await page.getByRole("button", { name: "Reset scroll position" }).click();
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(page.getByText(/Scroll offset: 0/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
