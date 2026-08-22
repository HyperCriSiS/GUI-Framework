// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/";

async function openReference(page, context = "page", density = "standard", theme = "basic", capabilityMode = "auto") {
  const query = new URLSearchParams();
  if (context !== "page") query.set("context", context);
  if (density !== "standard") query.set("density", density);
  if (theme !== "basic") query.set("theme", theme);
  if (capabilityMode !== "auto") query.set("capabilities", capabilityMode);
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

test("Modern visual delta baseline remains exact and palette-neutral", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "modern");

  const buttonStyle = await page.getByRole("button", { name: "Save settings" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius };
  });
  const inputStyle = await page.getByLabel("Display name").evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius };
  });
  const switchStyle = await page.getByRole("switch", { name: "Activity notifications" }).evaluate((element) => {
    const style = getComputedStyle(element);
    const thumb = element.querySelector(".gui-switch__thumb");
    if (!thumb) throw new Error("Modern switch thumb is missing");
    return {
      borderRadius: style.borderRadius,
      thumbBorderRadius: getComputedStyle(thumb).borderRadius,
    };
  });
  const panelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });

  expect(buttonStyle.borderRadius).toBe("14px");
  expect(inputStyle.borderRadius).toBe("14px");
  expect(switchStyle).toEqual({ borderRadius: "999px", thumbBorderRadius: "999px" });
  expect(panelStyle.borderRadius).toBe("20px");
  expect(panelStyle.boxShadow).toContain("0px 2px 6px 0px");
  expect(panelStyle.boxShadow).toContain("0.14");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(dialogStyle.borderRadius).toBe("20px");
  expect(dialogStyle.boxShadow).toContain("0px 6px 18px -2px");
  expect(dialogStyle.boxShadow).toContain("0.18");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(lightPanelStyle).toEqual(panelStyle);
});

test("Glass reference keeps translucency crisp without backdrop blur", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "glass");

  const panel = page.locator(".gui-panel").first();
  const darkPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(darkPanelStyle.backgroundColor).toBe("rgba(23, 26, 33, 0.72)");
  expect(darkPanelStyle.borderRadius).toBe("20px");
  expect(darkPanelStyle.boxShadow).toContain("0px 2px 6px 0px");
  expect(darkPanelStyle.backdropFilter).toBe("none");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  const darkDialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(darkDialogStyle.backgroundColor).toBe("rgba(32, 36, 45, 0.82)");
  expect(darkDialogStyle.borderRadius).toBe("20px");
  expect(darkDialogStyle.boxShadow).toContain("0px 6px 18px -2px");
  expect(darkDialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(lightPanelStyle.backgroundColor).toBe("rgba(255, 255, 255, 0.72)");
  expect(lightPanelStyle.borderRadius).toBe(darkPanelStyle.borderRadius);
  expect(lightPanelStyle.boxShadow).toBe(darkPanelStyle.boxShadow);
  expect(lightPanelStyle.backdropFilter).toBe("none");
});

test("Frosted Glass enables native backdrop blur only on the declared surfaces", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "frosted-glass");
  await expect(root).toHaveAttribute("data-gui-theme", "frosted-glass");

  const panel = page.locator(".gui-panel").first();
  await expect(panel).toHaveAttribute("data-gui-fallback", "high");
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      borderRadius: style.borderRadius,
    };
  });
  expect(panelStyle.backgroundColor).toBe("rgba(23, 26, 33, 0.72)");
  expect(panelStyle.backdropFilter).toBe("blur(24px)");
  expect(panelStyle.borderRadius).toBe("20px");

  for (const control of [
    page.getByRole("button", { name: "Save settings" }),
    page.getByLabel("Display name"),
    page.getByRole("switch", { name: "Activity notifications" }),
  ]) {
    await expect(control).not.toHaveAttribute("data-gui-fallback", "high");
    expect(await control.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  }

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-gui-fallback", "high");
  expect(await dialog.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("blur(24px)");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  await expect(panel).toHaveAttribute("data-gui-fallback", "high");
  const lightPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter };
  });
  expect(lightPanelStyle).toEqual({
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(24px)",
  });
});

test("Frosted Glass falls back exactly to crisp Glass when backdrop blur is unavailable", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "frosted-glass", "none");
  await expect(root).toHaveAttribute("data-gui-theme", "frosted-glass");

  const panel = page.locator(".gui-panel").first();
  await expect(panel).not.toHaveAttribute("data-gui-fallback");
  const frostedFallback = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });

  const glassRoot = await openReference(page, "page", "standard", "glass", "none");
  await expect(glassRoot).toHaveAttribute("data-gui-theme", "glass");
  const glassStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(frostedFallback).toEqual(glassStyle);
  expect(frostedFallback.backdropFilter).toBe("none");
});

test("Spacey reference keeps its flat aerospace instrumentation geometry palette-neutral", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "spacey");
  await expect(root).toHaveAttribute("data-gui-theme", "spacey");

  const buttonStyle = await page.getByRole("button", { name: "Save settings" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow, backdropFilter: style.backdropFilter };
  });
  const inputStyle = await page.getByLabel("Display name").evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  const switchStyle = await page.getByRole("switch", { name: "Activity notifications" }).evaluate((element) => {
    const style = getComputedStyle(element);
    const thumb = element.querySelector(".gui-switch__thumb");
    if (!thumb) throw new Error("Spacey switch thumb is missing");
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      thumbBorderRadius: getComputedStyle(thumb).borderRadius,
    };
  });
  const panel = page.locator(".gui-panel").first();
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });

  expect(buttonStyle).toEqual({ borderRadius: "999px", boxShadow: "none", backdropFilter: "none" });
  expect(inputStyle.borderRadius).toBe("999px");
  expect(inputStyle.boxShadow).toBe("none");
  expect(switchStyle.borderRadius).toBe("999px");
  expect(switchStyle.thumbBorderRadius).toBe("999px");
  expect(switchStyle.boxShadow).toBe("none");
  expect(panelStyle.borderRadius).toBe("6px");
  expect(panelStyle.boxShadow).toBe("none");
  expect(panelStyle.backdropFilter).toBe("none");
  expect(inputStyle.borderColor).toBe(panelStyle.borderColor);
  expect(switchStyle.borderColor).toBe(panelStyle.borderColor);

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow, backdropFilter: style.backdropFilter };
  });
  expect(dialogStyle.borderRadius).toBe("6px");
  expect(dialogStyle.borderColor).toBe(panelStyle.borderColor);
  expect(dialogStyle.boxShadow).toBe("none");
  expect(dialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  expect(lightPanelStyle.borderRadius).toBe(panelStyle.borderRadius);
  expect(lightPanelStyle.boxShadow).toBe("none");
  expect(lightPanelStyle.borderColor).not.toBe(panelStyle.borderColor);
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

for (const theme of ["basic", "modern", "glass", "frosted-glass", "spacey"]) {
  const label = theme === "basic" ? "Basic" : theme === "modern" ? "Modern" : theme === "glass" ? "Glass" : theme === "frosted-glass" ? "Frosted Glass" : "Spacey";
  test(`${label} compact density remains usable at the minimum reference width`, async ({ page }) => {
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
    const dialogBounds = await dialog.boundingBox();
    expect(dialogBounds).not.toBeNull();
    expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(320);
    await page.keyboard.press("Escape");
  });
}

test("minimum viewport keeps the default reference layout usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openReference(page);
  await expectNoHorizontalOverflow(page);

  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await page.getByRole("button", { name: "Review changes" }).click();
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
});

test("Basic reference dark desktop visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openReference(page);
  await expect(page.locator("#gui-reference-root")).toHaveScreenshot("reference-dark-desktop.png", { animations: "disabled" });
});

test("Basic reference dialog visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openReference(page);
  await page.getByRole("button", { name: "Review changes" }).click();
  await expect(page.getByRole("dialog", { name: "Review settings" })).toBeVisible();
  await expect(page.locator("#gui-reference-root")).toHaveScreenshot("reference-dialog-desktop.png", { animations: "disabled" });
});

test("Basic reference light mobile visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const root = await openReference(page);
  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  await expect(root).toHaveScreenshot("reference-light-mobile.png", { animations: "disabled" });
});
