// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/slider.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Slider reference keeps native range semantics controlled", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-slider-reference-root");
  const slider = page.getByRole("slider", { name: "Workspace zoom" });
  const vertical = page.getByRole("slider", { name: "Vertical balance" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  await expect(slider).toHaveAttribute("min", "0");
  await expect(slider).toHaveAttribute("max", "100");
  await expect(slider).toHaveAttribute("step", "5");
  await expect(slider).toHaveValue("40");
  await expect(slider).toHaveAttribute("aria-valuetext", "40 percent");
  await expect(slider).toHaveAttribute("aria-orientation", "horizontal");
  await expect(slider.locator("xpath=..")).toHaveAttribute("data-gui-size", "small");
  await expect(page.getByText("Workspace zoom: 40% · enabled", { exact: true })).toBeVisible();

  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("45");
  await expect(slider).toHaveAttribute("aria-valuetext", "45 percent");
  await expect(page.getByText("Workspace zoom: 45% · enabled", { exact: true })).toBeVisible();

  await expect(vertical).toHaveValue("25");
  await expect(vertical).toHaveAttribute("aria-orientation", "vertical");
  await expect(vertical.locator("xpath=..")).toHaveAttribute("data-gui-variant", "vertical");
  await expect(vertical.locator("xpath=..")).toHaveAttribute("data-gui-size", "small");

  await page.getByRole("button", { name: "Disable slider" }).click();
  await expect(slider).toBeDisabled();
  await expect(slider.locator("xpath=..")).toHaveAttribute("data-gui-state", /disabled/);
  await expect(page.getByText("Workspace zoom: 45% · disabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable slider" }).click();
  await expect(slider).toBeEnabled();
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect(slider).toHaveValue("40");
  await expect(slider).toHaveAttribute("aria-valuetext", "40 percent");
  await expect(page.getByText("Workspace zoom: 40% · enabled", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
