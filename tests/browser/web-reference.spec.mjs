// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/";

async function openReference(page, context = "page", density = "standard", theme = "basic", capabilityMode = "auto", extendedComponent = null) {
  const query = new URLSearchParams();
  if (context !== "page") query.set("context", context);
  if (density !== "standard") query.set("density", density);
  if (theme !== "basic") query.set("theme", theme);
  if (capabilityMode !== "auto") query.set("capabilities", capabilityMode);
  if (extendedComponent !== null) query.set("extended", extendedComponent);
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

test("Basic extended Checkbox remains controlled, focusable and compact-safe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openReference(page, "page", "compact", "basic", "auto", "checkbox");
  await expectNoHorizontalOverflow(page);

  const checkbox = page.getByRole("checkbox", { name: "Diagnostic logging" });
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toHaveAttribute("data-gui-component", "checkbox");
  await expect(checkbox).toHaveAttribute("data-gui-size", "small");
  await expect(checkbox).toHaveAttribute("aria-checked", "false");
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Diagnostic logging enabled.")).toBeVisible();

  await checkbox.focus();
  await expect(checkbox).toBeFocused();
  const focusStyle = await checkbox.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
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
  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });

  expect(buttonStyle.borderRadius).toBe("14px");
  expect(inputStyle.borderRadius).toBe("14px");
  expect(switchStyle).toEqual({ borderRadius: "999px", thumbBorderRadius: "999px" });
  expect(panelStyle.borderRadius).toBe("20px");
  expect(panelStyle.boxShadow).toContain("0px 2px 6px 0px");
  expect(panelStyle.boxShadow).toContain("0.14");
  expect(dialogStyle.borderRadius).toBe("24px");
  expect(dialogStyle.boxShadow).toContain("0px 6px 18px -2px");
  expect(dialogStyle.boxShadow).toContain("0.18");
  await page.keyboard.press("Escape");

  const geometryBeforePaletteChange = { buttonStyle, inputStyle, switchStyle, panelStyle, dialogStyle };
  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");

  const geometryAfterPaletteChange = {
    buttonStyle: await page.getByRole("button", { name: "Save settings" }).evaluate((element) => ({ borderRadius: getComputedStyle(element).borderRadius })),
    inputStyle: await page.getByLabel("Display name").evaluate((element) => ({ borderRadius: getComputedStyle(element).borderRadius })),
    switchStyle: await page.getByRole("switch", { name: "Activity notifications" }).evaluate((element) => {
      const style = getComputedStyle(element);
      const thumb = element.querySelector(".gui-switch__thumb");
      if (!thumb) throw new Error("Modern switch thumb is missing after palette change");
      return { borderRadius: style.borderRadius, thumbBorderRadius: getComputedStyle(thumb).borderRadius };
    }),
    panelStyle: await page.locator(".gui-panel").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
    }),
  };
  await page.getByRole("button", { name: "Review changes" }).click();
  geometryAfterPaletteChange.dialogStyle = await page.getByRole("dialog", { name: "Review settings" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });

  expect(geometryAfterPaletteChange).toEqual(geometryBeforePaletteChange);
  await page.keyboard.press("Escape");
});

test("Glass keeps geometry while introducing translucent semantic surfaces", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "glass");

  const panel = page.locator(".gui-panel").first();
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(panelStyle.borderRadius).toBe("20px");
  expect(panelStyle.backgroundColor).toBe("rgba(23, 26, 33, 0.72)");
  expect(panelStyle.boxShadow).not.toBe("none");
  expect(panelStyle.backdropFilter).toBe("none");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(dialogStyle.backgroundColor).toBe("rgba(36, 40, 51, 0.88)");
  expect(dialogStyle.boxShadow).not.toBe("none");
  expect(dialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(lightPanelStyle.borderRadius).toBe(panelStyle.borderRadius);
  expect(lightPanelStyle.backgroundColor).not.toBe(panelStyle.backgroundColor);
  expect(lightPanelStyle.boxShadow).toBe(panelStyle.boxShadow);
  expect(lightPanelStyle.backdropFilter).toBe("none");
});

test("Frosted Glass uses native backdrop blur when the browser exposes it", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "frosted-glass");
  await expect(root).toHaveAttribute("data-gui-theme", "frosted-glass");

  const panel = page.locator(".gui-panel").first();
  await expect(panel).toHaveAttribute("data-gui-fallback", "high");
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
    };
  });
  expect(panelStyle.backgroundColor).toBe("rgba(23, 26, 33, 0.72)");
  expect([panelStyle.backdropFilter, panelStyle.webkitBackdropFilter]).toContain("blur(24px)");

  for (const locator of [
    page.getByRole("button", { name: "Save settings" }),
    page.getByLabel("Display name"),
    page.getByRole("switch", { name: "Activity notifications" }),
  ]) {
    await expect(locator).not.toHaveAttribute("data-gui-fallback", "high");
    const backdropFilter = await locator.evaluate((element) => getComputedStyle(element).backdropFilter);
    expect(backdropFilter).toBe("none");
  }

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toHaveAttribute("data-gui-fallback", "high");
  const dialogBackdrop = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.backdropFilter, style.webkitBackdropFilter];
  });
  expect(dialogBackdrop).toContain("blur(24px)");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelBackdrop = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.backdropFilter, style.webkitBackdropFilter];
  });
  expect(lightPanelBackdrop).toContain("blur(24px)");
});

test("Frosted Glass capabilityless host falls back exactly to crisp Glass", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "frosted-glass", "none");
  await expect(root).toHaveAttribute("data-gui-theme", "frosted-glass");

  const panel = page.locator(".gui-panel").first();
  await expect(panel).not.toHaveAttribute("data-gui-fallback", "high");
  const frostedFallback = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });

  const glassRoot = await openReference(page, "page", "standard", "glass");
  await expect(glassRoot).toHaveAttribute("data-gui-theme", "glass");
  const glassStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });

  expect(frostedFallback).toEqual(glassStyle);
  expect(frostedFallback.backdropFilter).toBe("none");
});

test("Spacey native instrumentation remains bounded and palette-driven", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "spacey");
  await expect(root).toHaveAttribute("data-gui-theme", "spacey");

  const panel = page.locator(".gui-panel").first();
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(panelStyle.borderRadius).toBe("12px");
  expect(panelStyle.borderWidth).toBe("1px");
  expect(panelStyle.boxShadow).not.toBe("none");
  expect(panelStyle.backdropFilter).toBe("none");

  const input = page.getByLabel("Display name");
  const inputStyle = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, borderColor: style.borderColor };
  });
  expect(inputStyle.borderRadius).toBe("10px");
  expect(inputStyle.borderColor).toBe(panelStyle.borderColor);

  const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
  const switchStyle = await notificationSwitch.evaluate((element) => {
    const style = getComputedStyle(element);
    const thumb = element.querySelector(".gui-switch__thumb");
    if (!thumb) throw new Error("Spacey switch thumb is missing");
    return {
      borderRadius: style.borderRadius,
      thumbBorderRadius: getComputedStyle(thumb).borderRadius,
    };
  });
  expect(switchStyle).toEqual({ borderRadius: "999px", thumbBorderRadius: "999px" });

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(dialogStyle.borderRadius).toBe("12px");
  expect(dialogStyle.borderWidth).toBe("1px");
  expect(dialogStyle.boxShadow).not.toBe("none");
  expect(dialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  expect(lightPanelStyle.borderRadius).toBe(panelStyle.borderRadius);
  expect(lightPanelStyle.boxShadow).toBe(panelStyle.boxShadow);
  expect(lightPanelStyle.borderColor).not.toBe(panelStyle.borderColor);
});

test("Cyberpunk signal-frame contract remains bounded and palette-driven", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "cyberpunk");
  await expect(root).toHaveAttribute("data-gui-theme", "cyberpunk");

  const button = page.getByRole("button", { name: "Save settings" });
  const input = page.getByLabel("Display name");
  const panel = page.locator(".gui-panel").first();

  const before = {
    button: await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
    input: await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
    panel: await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
  };

  expect(before.button.borderRadius).toBe("6px");
  expect(before.button.boxShadow).toBe("none");
  expect(before.input.borderRadius).toBe("6px");
  expect(before.input.boxShadow).toBe("none");
  expect(before.panel.borderRadius).toBe("6px");
  expect(before.panel.boxShadow).toContain("0px 2px 6px 0px");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(dialogStyle.borderRadius).toBe("6px");
  expect(dialogStyle.boxShadow).toContain("0px 6px 18px -2px");
  expect(dialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const after = {
    button: await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
    input: await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
    panel: await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, borderColor: style.borderColor, boxShadow: style.boxShadow };
    }),
  };

  expect(after.button.borderRadius).toBe(before.button.borderRadius);
  expect(after.button.boxShadow).toBe(before.button.boxShadow);
  expect(after.button.borderColor).not.toBe(before.button.borderColor);
  expect(after.input.borderRadius).toBe(before.input.borderRadius);
  expect(after.input.boxShadow).toBe(before.input.boxShadow);
  expect(after.input.borderColor).not.toBe(before.input.borderColor);
  expect(after.panel.borderRadius).toBe(before.panel.borderRadius);
  expect(after.panel.boxShadow).toBe(before.panel.boxShadow);
  expect(after.panel.borderColor).not.toBe(before.panel.borderColor);
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
  await page.keyboard.press("Escape");
});
