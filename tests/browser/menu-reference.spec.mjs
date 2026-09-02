// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/menu.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Menu reference preserves controlled native menu semantics and keyboard roving focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-menu-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  const trigger = page.getByRole("button", { name: "Open workspace menu" });
  const popup = page.getByRole("menu", { name: "Workspace actions" });
  const items = page.getByRole("menuitem");
  const reload = items.nth(0);
  const locked = items.nth(1);
  const settings = items.nth(2);

  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(popup).toBeHidden();

  await trigger.click();
  await expect(popup).toBeVisible();
  await expect(locked).toBeDisabled();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(reload).toBeFocused();
  await expect(page.getByText("Menu open.")).toBeVisible();

  await reload.press("ArrowDown");
  await expect(settings).toBeFocused();
  await settings.press("ArrowDown");
  await expect(reload).toBeFocused();
  await reload.press("End");
  await expect(settings).toBeFocused();
  await settings.press("Home");
  await expect(reload).toBeFocused();

  await reload.press("Enter");
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-gui-menu-activation="reload"]')).toHaveText("Activated: reload.");
  await expectNoHorizontalOverflow(page);
});

test("Basic Context Menu opens at the pointer, flips inward and Escape restores the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact`);

  const trigger = page.getByRole("button", { name: "Open workspace menu" });
  const popup = page.getByRole("menu", { name: "Workspace actions" });

  await trigger.evaluate((node) => {
    node.style.position = "fixed";
    node.style.right = "2px";
    node.style.bottom = "2px";
    node.style.zIndex = "2";
  });

  const triggerBounds = await trigger.boundingBox();
  expect(triggerBounds).not.toBeNull();
  await trigger.click({
    button: "right",
    position: { x: triggerBounds.width - 2, y: triggerBounds.height - 2 },
  });

  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-gui-resolved-placement", "context");

  const popupBounds = await popup.boundingBox();
  expect(popupBounds).not.toBeNull();
  expect(popupBounds.x).toBeGreaterThanOrEqual(4);
  expect(popupBounds.y).toBeGreaterThanOrEqual(4);
  expect(popupBounds.x + popupBounds.width).toBeLessThanOrEqual(316);
  expect(popupBounds.y + popupBounds.height).toBeLessThanOrEqual(716);

  const firstItem = page.getByRole("menuitem").first();
  await expect(firstItem).toBeFocused();
  await firstItem.press("Escape");
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectNoHorizontalOverflow(page);
});
