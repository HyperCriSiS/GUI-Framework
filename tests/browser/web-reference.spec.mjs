// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/";

async function openReference(page, context = "page", density = "standard", theme = "basic") {
  const query = new URLSearchParams();
  if (context !== "page") query.set("context", context);
  if (density !== "standard") query.set("density", density);
  if (theme !== "basic") query.set("theme", theme);
  const suffix = query.size === 0 ? "" : `?${query.toString()}`;
  await page.goto(`${referencePath}${suffix}`);
  const root = page.locator("#gui-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", theme);
  await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");
  await expect(root).toHaveAttribute("data-gui-host-context", context);
  await expect(root).toHaveAttribute("data-gui-density", density);
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

test("Modern reference reuses the same components and palette interaction path", async ({ page }) => {
  const basicRoot = await openReference(page);
  const basicPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  await expect(basicRoot).toHaveAttribute("data-gui-theme", "basic");

  const modernRoot = await openReference(page, "page", "standard", "modern");
  const modernPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(modernPanelStyle.borderRadius).not.toBe(basicPanelStyle.borderRadius);
  expect(modernPanelStyle.boxShadow).not.toBe("none");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(modernRoot).toHaveAttribute("data-gui-palette", "reference-light");
  await expect(page.getByRole("button", { name: "Use dark palette" })).toBeVisible();

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  const dialogShadow = await dialog.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(dialogShadow).not.toBe("none");
  await page.keyboard.press("Escape");
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

for (const theme of ["basic", "modern"]) {
  test(`${theme === "basic" ? "Basic" : "Modern"} compact density remains usable at the minimum reference width`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await openReference(page, "page", "compact", theme);
    await expectNoHorizontalOverflow(page);

    for (const locator of [
      page.getByLabel("Display name"),
      page.getByRole("switch", { name: "Activity notifications" }),
      page.getByRole("button", { name: "Save settings" }),
      page.getByRole("button", { name: "Use light palette" }),
      page.getByRole("button", { name: "Review changes" }),
    ]) {
      await expect(locator).toHaveAttribute("data-gui-size", "small");
      const bounds = await locator.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds.height).toBeGreaterThanOrEqual(24);
    }

    for (const panel of await page.locator(".gui-panel").all()) {
      await expect(panel).toHaveAttribute("data-gui-size", "small");
    }

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
    await expect(dialog).toHaveAttribute("data-gui-size", "small");
    await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("data-gui-size", "small");

    const dialogBounds = await dialog.boundingBox();
    expect(dialogBounds).not.toBeNull();
    expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(320);
    await expectNoHorizontalOverflow(page);
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
