// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/";

async function openCyberpunk(page, density = "standard") {
  const query = new URLSearchParams({ theme: "cyberpunk" });
  if (density !== "standard") query.set("density", density);
  await page.goto(`${referencePath}?${query.toString()}`);
  const root = page.locator("#gui-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "cyberpunk");
  await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");
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

test("Cyberpunk renders sharp palette-driven signal frames with bounded native elevation", async ({ page }) => {
  const root = await openCyberpunk(page);

  const buttonStyle = await page.getByRole("button", { name: "Save settings" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  const inputStyle = await page.getByLabel("Display name").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  const switchStyle = await page.getByRole("switch", { name: "Activity notifications" }).evaluate((element) => {
    const style = getComputedStyle(element);
    const thumb = element.querySelector(".gui-switch__thumb");
    if (!thumb) throw new Error("Cyberpunk switch thumb is missing");
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
      thumbBorderRadius: getComputedStyle(thumb).borderRadius,
    };
  });
  const panel = page.locator(".gui-panel").first();
  const panelStyle = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });

  expect(buttonStyle).toEqual({ borderRadius: "6px", boxShadow: "none", backdropFilter: "none" });
  expect(inputStyle.borderRadius).toBe("6px");
  expect(inputStyle.borderColor).toBe("rgb(37, 99, 235)");
  expect(inputStyle.boxShadow).toBe("none");
  expect(inputStyle.backdropFilter).toBe("none");
  expect(switchStyle.borderRadius).toBe("6px");
  expect(switchStyle.thumbBorderRadius).toBe("6px");
  expect(switchStyle.borderColor).toBe(inputStyle.borderColor);
  expect(switchStyle.boxShadow).toBe("none");
  expect(switchStyle.backdropFilter).toBe("none");
  expect(panelStyle.borderRadius).toBe("6px");
  expect(panelStyle.borderColor).toBe(inputStyle.borderColor);
  expect(panelStyle.boxShadow).toContain("0px 2px 6px 0px");
  expect(panelStyle.boxShadow).toContain("0.14");
  expect(panelStyle.backdropFilter).toBe("none");

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
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
  expect(dialogStyle.borderColor).toBe("rgb(43, 109, 235)");
  expect(dialogStyle.boxShadow).toContain("0px 6px 18px -2px");
  expect(dialogStyle.boxShadow).toContain("0.18");
  expect(dialogStyle.backdropFilter).toBe("none");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Use light palette" }).click();
  await expect(root).toHaveAttribute("data-gui-palette", "reference-light");
  await expect.poll(
    () => page.getByLabel("Display name").evaluate((element) => getComputedStyle(element).borderColor),
    { message: "Cyberpunk input border must settle on the light-palette semantic accent" },
  ).toBe("rgb(104, 77, 226)");
  const lightStyles = await page.evaluate(() => {
    const input = document.querySelector(".gui-input");
    const panel = document.querySelector(".gui-panel");
    if (!input || !panel) throw new Error("Cyberpunk reference controls are missing");
    const inputStyle = getComputedStyle(input);
    const panelStyle = getComputedStyle(panel);
    return {
      inputRadius: inputStyle.borderRadius,
      inputBorder: inputStyle.borderColor,
      panelRadius: panelStyle.borderRadius,
      panelBorder: panelStyle.borderColor,
      panelShadow: panelStyle.boxShadow,
    };
  });
  expect(lightStyles.inputRadius).toBe("6px");
  expect(lightStyles.panelRadius).toBe("6px");
  expect(lightStyles.inputBorder).toBe("rgb(104, 77, 226)");
  expect(lightStyles.panelBorder).toBe(lightStyles.inputBorder);
  expect(lightStyles.inputBorder).not.toBe(inputStyle.borderColor);
  expect(lightStyles.panelShadow).toContain("0px 2px 6px 0px");
});

test("Cyberpunk compact density remains usable at the 320px reference minimum", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openCyberpunk(page, "compact");
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

  const input = page.getByLabel("Display name");
  const referenceSwitch = page.getByRole("switch", { name: "Activity notifications" });
  const saveButton = page.getByRole("button", { name: "Save settings" });
  await input.focus();
  await page.keyboard.press("Tab");
  await expect(referenceSwitch).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(saveButton).toBeFocused();

  await page.getByRole("button", { name: "Review changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Review settings" });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
});
