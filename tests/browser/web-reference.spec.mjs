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

async function tabTo(page, locator, maxTabs = 10) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await locator.evaluate((element) => document.activeElement === element)) return;
    await page.keyboard.press("Tab");
  }
  await expect(locator).toBeFocused();
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

test("Basic extended Checkbox remains controlled, keyboard-focusable and compact-safe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openReference(page, "page", "compact", "basic", "auto", "checkbox");
  await expectNoHorizontalOverflow(page);

  const checkbox = page.getByRole("checkbox", { name: "Diagnostic logging" });
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toHaveAttribute("data-gui-component", "checkbox");
  await expect(checkbox).toHaveAttribute("data-gui-size", "small");
  await expect(checkbox).toHaveAttribute("aria-checked", "false");

  const bounds = await checkbox.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeGreaterThanOrEqual(24);
  expect(bounds.height).toBeGreaterThanOrEqual(24);

  await checkbox.click();
  await expect(checkbox).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Diagnostic logging enabled.")).toBeVisible();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(checkbox).toBeFocused();
  const focusStyle = await checkbox.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
});

test("Basic extended Radio remains grouped, keyboard-selectable and compact-safe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openReference(page, "page", "compact", "basic", "auto", "radio");
  await expectNoHorizontalOverflow(page);

  const group = page.getByRole("radiogroup", { name: "Review format" });
  const summary = page.getByRole("radio", { name: "Summary review" });
  const detailed = page.getByRole("radio", { name: "Detailed review" });

  await expect(group).toBeVisible();
  for (const radio of [summary, detailed]) {
    await expect(radio).toBeVisible();
    await expect(radio).toHaveAttribute("data-gui-component", "radio");
    await expect(radio).toHaveAttribute("data-gui-size", "small");
    const bounds = await radio.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.width).toBeGreaterThanOrEqual(24);
    expect(bounds.height).toBeGreaterThanOrEqual(24);
  }

  await expect(summary).toHaveAttribute("aria-checked", "true");
  await expect(summary).toHaveAttribute("tabindex", "0");
  await expect(detailed).toHaveAttribute("aria-checked", "false");
  await expect(detailed).toHaveAttribute("tabindex", "-1");

  await tabTo(page, summary);
  await expect(summary).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(detailed).toBeFocused();
  await expect(summary).toHaveAttribute("aria-checked", "false");
  await expect(summary).toHaveAttribute("tabindex", "-1");
  await expect(detailed).toHaveAttribute("aria-checked", "true");
  await expect(detailed).toHaveAttribute("tabindex", "0");
  await expect(page.getByText("Review format changed to detailed.")).toBeVisible();

  const focusStyle = await detailed.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);

  await page.keyboard.press("ArrowLeft");
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAttribute("aria-checked", "true");
  await expect(detailed).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Review format changed to summary.")).toBeVisible();
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
  expect(switchStyle.borderRadius).toBe("999px");
  expect(switchStyle.thumbBorderRadius).toBe("999px");
  expect(panelStyle.borderRadius).toBe("18px");
  expect(panelStyle.boxShadow).toBe("rgba(0, 0, 0, 0.14) 0px 3px 12px -2px");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(dialogStyle.borderRadius).toBe("24px");
  expect(dialogStyle.boxShadow).toBe("rgba(0, 0, 0, 0.18) 0px 6px 18px -2px");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightButtonStyle = await page.getByRole("button", { name: "Save settings" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius };
  });
  const lightPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(lightButtonStyle.borderRadius).toBe(buttonStyle.borderRadius);
  expect(lightPanelStyle.borderRadius).toBe(panelStyle.borderRadius);
  expect(lightPanelStyle.boxShadow).toBe(panelStyle.boxShadow);
});

test("Glass reference uses translucent native surfaces without backdrop blur", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "glass");
  const panelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
    };
  });
  expect(panelStyle.backgroundColor).toBe("rgba(23, 26, 33, 0.72)");
  expect(panelStyle.backdropFilter).toBe("none");
  expect(panelStyle.webkitBackdropFilter).toBe("none");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
    };
  });
  expect(dialogStyle.backgroundColor).toBe("rgba(31, 36, 48, 0.82)");
  expect(dialogStyle.backdropFilter).toBe("none");
  expect(dialogStyle.webkitBackdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  const lightPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(lightPanelStyle).toBe("rgba(255, 255, 255, 0.72)");
});

test("Frosted Glass uses native backdrop blur only when the browser reports the capability", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "frosted-glass");
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
  expect(panelStyle.backdropFilter).toBe("blur(24px)");

  const button = page.getByRole("button", { name: "Save settings" });
  await expect(button).not.toHaveAttribute("data-gui-fallback", "high");
  expect(await button.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");

  const input = page.getByLabel("Display name");
  await expect(input).not.toHaveAttribute("data-gui-fallback", "high");
  expect(await input.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");

  const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
  await expect(notificationSwitch).not.toHaveAttribute("data-gui-fallback", "high");
  expect(await notificationSwitch.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toHaveAttribute("data-gui-fallback", "high");
  expect(await dialog.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("blur(24px)");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  expect(await panel.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("blur(24px)");
  expect(await panel.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(255, 255, 255, 0.72)");
});

test("Frosted Glass falls back exactly to crisp Glass when backdrop blur is unavailable", async ({ page }) => {
  const glassRoot = await openReference(page, "page", "standard", "glass", "none");
  const glassPanelStyle = await page.locator(".gui-panel").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  await expect(glassRoot).toHaveAttribute("data-gui-theme", "glass");

  const frostedRoot = await openReference(page, "page", "standard", "frosted-glass", "none");
  const frostedPanel = page.locator(".gui-panel").first();
  await expect(frostedPanel).not.toHaveAttribute("data-gui-fallback");
  const frostedPanelStyle = await frostedPanel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(frostedPanelStyle.backdropFilter).toBe("none");
  expect({
    backgroundColor: frostedPanelStyle.backgroundColor,
    borderColor: frostedPanelStyle.borderColor,
    boxShadow: frostedPanelStyle.boxShadow,
  }).toEqual(glassPanelStyle);

  await page.getByRole("button", { name: "Review changes" }).click();
  const frostedDialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(frostedDialog).not.toHaveAttribute("data-gui-fallback");
  expect(await frostedDialog.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  await page.keyboard.press("Escape");
});

test("Spacey reference uses bounded native instrumentation geometry", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "spacey");
  const button = page.getByRole("button", { name: "Save settings" });
  const input = page.getByLabel("Display name");
  const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
  const panel = page.locator(".gui-panel").first();

  const [buttonStyle, inputStyle, switchStyle, panelStyle] = await Promise.all([
    button.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
    input.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
    })),
    notificationSwitch.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
    panel.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
  ]);

  expect(buttonStyle.borderRadius).toBe("6px");
  expect(inputStyle.borderRadius).toBe("6px");
  expect(switchStyle.borderRadius).toBe("6px");
  expect(panelStyle.borderRadius).toBe("6px");
  expect(buttonStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(inputStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(switchStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(panelStyle.borderColor).toBe("rgb(51, 59, 72)");
  expect(buttonStyle.boxShadow).toBe("none");
  expect(switchStyle.boxShadow).toBe("none");
  expect(panelStyle.boxShadow).toBe("rgba(0, 0, 0, 0.14) 0px 3px 12px -2px");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => ({
    borderRadius: getComputedStyle(element).borderRadius,
    borderColor: getComputedStyle(element).borderColor,
    boxShadow: getComputedStyle(element).boxShadow,
  }));
  expect(dialogStyle.borderRadius).toBe("6px");
  expect(dialogStyle.borderColor).toBe("rgb(51, 59, 72)");
  expect(dialogStyle.boxShadow).toBe("rgba(0, 0, 0, 0.18) 0px 6px 18px -2px");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  expect(await button.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(buttonStyle.borderRadius);
  expect(await input.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(inputStyle.borderRadius);
  expect(await notificationSwitch.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(switchStyle.borderRadius);
  expect(await panel.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(panelStyle.borderRadius);
});

test("Cyberpunk reference uses semantic signal frames with bounded native effects", async ({ page }) => {
  const root = await openReference(page, "page", "standard", "cyberpunk");
  const button = page.getByRole("button", { name: "Save settings" });
  const input = page.getByLabel("Display name");
  const notificationSwitch = page.getByRole("switch", { name: "Activity notifications" });
  const panel = page.locator(".gui-panel").first();

  const [buttonStyle, inputStyle, switchStyle, panelStyle] = await Promise.all([
    button.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
    input.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
    })),
    notificationSwitch.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
    panel.evaluate((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    })),
  ]);

  expect(buttonStyle.borderRadius).toBe("6px");
  expect(inputStyle.borderRadius).toBe("6px");
  expect(switchStyle.borderRadius).toBe("6px");
  expect(panelStyle.borderRadius).toBe("6px");
  expect(buttonStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(inputStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(switchStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(panelStyle.borderColor).toBe("rgb(51, 59, 72)");
  expect(buttonStyle.boxShadow).toBe("none");
  expect(switchStyle.boxShadow).toBe("none");
  expect(panelStyle.boxShadow).toBe("rgba(0, 0, 0, 0.14) 0px 3px 12px -2px");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  const dialogStyle = await dialog.evaluate((element) => ({
    borderRadius: getComputedStyle(element).borderRadius,
    borderColor: getComputedStyle(element).borderColor,
    boxShadow: getComputedStyle(element).boxShadow,
  }));
  expect(dialogStyle.borderRadius).toBe("6px");
  expect(dialogStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(dialogStyle.boxShadow).toBe("rgba(0, 0, 0, 0.18) 0px 6px 18px -2px");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  expect(await button.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(buttonStyle.borderRadius);
  expect(await input.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(inputStyle.borderRadius);
  expect(await notificationSwitch.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(switchStyle.borderRadius);
  expect(await panel.evaluate((element) => getComputedStyle(element).borderRadius)).toBe(panelStyle.borderRadius);
});

const hostProfiles = [
  ["Extension popup", "extension-popup", "compact"],
  ["Extension sidebar", "extension-sidebar", "standard"],
  ["Extension options", "extension-options", "standard"],
];

for (const host of hostProfiles) {
  test(`${host[0]} remains keyboard-usable without horizontal overflow`, async ({ page }) => {
    if (host[1] === "extension-popup") {
      await page.setViewportSize({ width: 360, height: 640 });
    }
    const root = await openReference(page, host[1], host[2]);
    await expect(root).toHaveAttribute("data-gui-host-context", host[1]);
    await expectNoHorizontalOverflow(page);

    const input = page.getByLabel("Display name");
    await input.fill("Host context");
    await expect(page.locator(".gui-reference__summary dd").nth(0)).toHaveText("Host context");

    const reviewButton = page.getByRole("button", { name: "Review changes" });
    await tabTo(page, reviewButton);
    await expect(reviewButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Review settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(reviewButton).toBeFocused();
  });
}

for (const [themeLabel, themeId] of [
  ["Basic", "basic"],
  ["Modern", "modern"],
  ["Glass", "glass"],
  ["Frosted Glass", "frosted-glass"],
  ["Spacey", "spacey"],
  ["Cyberpunk", "cyberpunk"],
]) {
  test(`${themeLabel} compact density remains usable at the minimum reference width`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const root = await openReference(page, "extension-popup", "compact", themeId);
    await expect(root).toHaveAttribute("data-gui-density", "compact");
    await expectNoHorizontalOverflow(page);

    const input = page.getByLabel("Display name");
    const switchControl = page.getByRole("switch", { name: "Activity notifications" });
    const saveButton = page.getByRole("button", { name: "Save settings" });
    const settingsPanel = page.getByRole("region", { name: "Profile settings" });
    await expect(input).toHaveAttribute("data-gui-size", "small");
    await expect(switchControl).toHaveAttribute("data-gui-size", "small");
    await expect(saveButton).toHaveAttribute("data-gui-size", "small");
    await expect(settingsPanel).toHaveAttribute("data-gui-size", "small");

    await input.fill("Compact mode");
    await expect(page.locator(".gui-reference__summary dd").nth(0)).toHaveText("Compact mode");
    await switchControl.focus();
    await page.keyboard.press("Space");
    await expect(switchControl).toHaveAttribute("aria-checked", "false");
  });
}

test("extension host styling does not introduce a fixed application shell", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const root = await openReference(page, "extension-popup", "compact");
  const bounds = await root.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await expectNoHorizontalOverflow(page);
});
