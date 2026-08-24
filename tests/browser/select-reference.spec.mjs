// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/select.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Select reference is controlled, keyboard navigable and compact-safe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-select-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  const select = page.getByRole("combobox", { name: "Delivery channel" });
  await expect(select).toHaveAttribute("data-gui-component", "select");
  await expect(select).toHaveAttribute("data-gui-size", "small");
  await expect(select).toHaveAttribute("aria-expanded", "false");

  const bounds = await select.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeGreaterThanOrEqual(24);
  expect(bounds.height).toBeGreaterThanOrEqual(24);

  await select.click();
  await expect(select).toHaveAttribute("aria-expanded", "true");
  const listbox = page.getByRole("listbox", { name: "Delivery channel options" });
  await expect(listbox).toBeVisible();
  await expect(page.getByRole("option", { name: "Legacy channel" })).toHaveAttribute("aria-disabled", "true");

  await select.press("ArrowDown");
  await select.press("Enter");
  await expect(select).toHaveValue("push");
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Selected push.")).toBeVisible();
});

test("editable ComboBox reference exposes controlled query behavior", async ({ page }) => {
  await page.goto(`${referencePath}?editable=true`);
  const combo = page.getByRole("combobox", { name: "Find delivery channel" });
  await expect(combo).toHaveAttribute("aria-autocomplete", "list");
  await combo.fill("dig");
  await expect(combo).toHaveValue("dig");
  await expect(combo).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Query dig.")).toBeVisible();
  await combo.press("Escape");
  await expect(combo).toHaveAttribute("aria-expanded", "false");
});
