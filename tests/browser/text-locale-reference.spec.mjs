// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/locale.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function selectedIndicatorEdges(page) {
  const selected = page.getByRole("button", { name: "RTL workspace destination" });
  const indicator = selected.locator(".gui-navigation__indicator");
  return selected.evaluate((element) => {
    const item = element.getBoundingClientRect();
    const marker = element.querySelector(".gui-navigation__indicator")?.getBoundingClientRect();
    if (!marker) throw new Error("Selected navigation item has no indicator");
    return { itemLeft: item.left, itemRight: item.right, markerLeft: marker.left, markerRight: marker.right };
  });
}

test("Basic components preserve Unicode, wrap hostile text and follow host RTL/LTR direction at compact width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-text-locale-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(root).toHaveAttribute("dir", "rtl");
  await expect(root).toHaveAttribute("lang", "ar");

  const longButton = page.locator('[data-reference-locale-unbroken="true"]');
  const mixedInput = page.getByRole("textbox", { name: "Unicode mixed-direction input" });
  const navigation = page.getByRole("navigation", { name: "RTL locale navigation" });
  const table = page.getByRole("table", { name: "RTL locale table" });
  await expect(longButton).toBeVisible();
  await expect(mixedInput).toHaveValue(/Café é · 東京 · 🧑🏽‍💻/u);
  await expect(navigation).toHaveCSS("direction", "rtl");
  await expect(table).toBeVisible();
  await expect(page.getByRole("caption")).toContainText(/Project Atlas 42 — مشروع أطلس — פרויקט אטלס/);
  await expectNoHorizontalOverflow(page);

  const rtlEdges = await selectedIndicatorEdges(page);
  expect(Math.abs(rtlEdges.itemRight - rtlEdges.markerRight)).toBeLessThanOrEqual(1.5);
  expect(rtlEdges.markerLeft).toBeGreaterThan(rtlEdges.itemLeft);

  await page.getByRole("button", { name: "Switch host direction to LTR" }).click();
  await expect(root).toHaveAttribute("dir", "ltr");
  await expect(root).toHaveAttribute("lang", "en");
  await expect(navigation).toHaveCSS("direction", "ltr");
  await expect(page.getByText(/Direction: ltr · language: en · Unicode preserved/)).toBeVisible();

  const ltrEdges = await selectedIndicatorEdges(page);
  expect(Math.abs(ltrEdges.itemLeft - ltrEdges.markerLeft)).toBeLessThanOrEqual(1.5);
  expect(ltrEdges.markerRight).toBeLessThan(ltrEdges.itemRight);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Switch host direction to RTL" }).click();
  await expect(root).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
});
