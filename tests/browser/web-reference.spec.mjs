// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/";

async function openReference(page, context = "page") {
  const suffix = context === "page" ? "" : `?context=${encodeURIComponent(context)}`;
  await page.goto(`${referencePath}${suffix}`);
  const root = page.locator("#gui-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");
  await expect(root).toHaveAttribute("data-gui-host-context", context);
  return root;
}

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("controlled native interactions remain synchronized", async ({ page }) => {
  const root = await openReference(page);

  const input = page.getByLabel("Display name");
  await input.fill("Grace Hopper");
  await expect(page.getByText("Profile has unsaved changes.")).toBeVisible();
  await expect(page.locator(".gui-reference__summary dd").nth(0)).toHaveText("Grace Hopper");

  const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
  await expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
  await notificationSwitch.click();
  await expect(notificationSwitch).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".gui-reference__summary dd").nth(1)).toHaveText("Disabled");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  await expect(page.getByRole("button", { name: "Use dark palette" })).toBeVisible();

  const reviewButton = page.getByRole("button", { name: "Review changes" });
  await reviewButton.click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveJSProperty("open", true);
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(reviewButton).toBeFocused();
  await expect(page.getByText("Review closed.")).toBeVisible();
});

for (const host of [
  { context: "extension-popup", width: 360, height: 600 },
  { context: "extension-sidebar", width: 420, height: 800 },
  { context: "extension-options", width: 1100, height: 760 },
]) {
  test(`${host.context} remains keyboard-usable without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: host.width, height: host.height });
    await openReference(page, host.context);
    await expectNoHorizontalOverflow(page);

    const input = page.getByLabel("Display name");
    const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
    const saveButton = page.getByRole("button", { name: "Save settings" });
    await input.focus();
    await page.keyboard.press("Tab");
    await expect(notificationSwitch).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(saveButton).toBeFocused();

    const reviewButton = page.getByRole("button", { name: "Review changes" });
    await reviewButton.click();
    const dialog = page.getByRole("dialog", { name: "Review settings" });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(host.width);
    await page.keyboard.press("Escape");
    await expect(reviewButton).toBeFocused();
  });
}

test("Basic reference dark desktop visual baseline", async ({ page }) => {
  await openReference(page);
  await expect(page).toHaveScreenshot("reference-dark-desktop.png", { fullPage: true });
});

test("Basic reference dialog visual baseline", async ({ page }) => {
  await openReference(page);
  await page.getByRole("button", { name: "Review changes" }).click();
  await expect(page.getByRole("dialog", { name: "Review settings" })).toBeVisible();
  await expect(page).toHaveScreenshot("reference-dialog-desktop.png", { fullPage: true });
});

test("Basic reference light mobile visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const root = await openReference(page);
  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  await expect(page).toHaveScreenshot("reference-light-mobile.png", { fullPage: true });
});
