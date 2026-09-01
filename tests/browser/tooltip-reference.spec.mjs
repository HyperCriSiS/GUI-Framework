// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/tooltip.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Tooltip reference preserves native trigger semantics and controlled hover/focus behavior", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact&placement=top`);

  const root = page.locator("#gui-tooltip-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  const trigger = page.getByRole("button", { name: "Reload workspace" });
  const popup = page.locator(".gui-tooltip__popup");
  await expect(trigger).toBeVisible();
  await expect(popup).toBeHidden();
  await expect(trigger).not.toHaveAttribute("aria-describedby", /gui-tooltip-/);

  await trigger.hover();
  await expect(popup).toBeVisible();
  await expect(page.getByRole("tooltip")).toHaveText("Reload the current workspace data.");
  const popupId = await popup.getAttribute("id");
  expect(popupId).toMatch(/^gui-tooltip-\d+$/);
  await expect(trigger).toHaveAttribute("aria-describedby", popupId);
  await expect(page.getByText("Tooltip open.")).toBeVisible();
  expect(await popup.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");

  await page.mouse.move(1, 700);
  await expect(popup).toBeHidden();
  await expect(trigger).not.toHaveAttribute("aria-describedby", /gui-tooltip-/);

  await trigger.focus();
  await expect(popup).toBeVisible();
  await trigger.press("Escape");
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.evaluate((node) => {
    node.style.position = "fixed";
    node.style.top = "2px";
    node.style.left = "120px";
    node.style.zIndex = "2";
    node.blur();
  });
  await trigger.focus();
  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-gui-resolved-placement", "bottom");
  const topBounds = await popup.boundingBox();
  expect(topBounds).not.toBeNull();
  expect(topBounds.y).toBeGreaterThanOrEqual(4);
  await expectNoHorizontalOverflow(page);
});

test("Basic Tooltip right placement flips left and remains viewport-clamped", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact&placement=right`);

  const trigger = page.getByRole("button", { name: "Reload workspace" });
  const popup = page.locator(".gui-tooltip__popup");
  await trigger.evaluate((node) => {
    node.style.position = "fixed";
    node.style.right = "2px";
    node.style.top = "240px";
    node.style.zIndex = "2";
  });
  await trigger.focus();

  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-gui-resolved-placement", "left");
  const bounds = await popup.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(4);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(316);
  await expectNoHorizontalOverflow(page);
});
