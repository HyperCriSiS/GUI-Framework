// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/navigation.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Navigation reference keeps controlled horizontal and vertical selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-navigation-reference-root");
  const horizontal = page.getByRole("navigation", { name: "Workspace navigation" });
  const vertical = page.getByRole("navigation", { name: "Workspace navigation rail" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(horizontal).toHaveAttribute("data-gui-size", "small");
  await expect(vertical).toHaveAttribute("data-gui-size", "small");
  await expect(vertical).toHaveAttribute("data-gui-variant", "vertical");
  await expectNoHorizontalOverflow(page);

  const horizontalHome = horizontal.getByRole("button", { name: "Home destination" });
  const horizontalSearch = horizontal.getByRole("button", { name: "Search destination" });
  const horizontalArchive = horizontal.getByRole("button", { name: "Archive destination" });
  const verticalSearch = vertical.getByRole("button", { name: "Search destination" });
  const verticalSettings = vertical.getByRole("button", { name: "Settings destination" });

  await expect(horizontalHome).toHaveAttribute("aria-current", "page");
  await expect(horizontalArchive).toBeDisabled();
  await expect(vertical.getByRole("button", { name: "Archive destination" })).toBeDisabled();
  await expect(page.getByText("Selected section: home · navigation enabled", { exact: true })).toBeVisible();

  await horizontalSearch.click();
  await expect(horizontalSearch).toHaveAttribute("aria-current", "page");
  await expect(verticalSearch).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Selected section: search · navigation enabled", { exact: true })).toBeVisible();

  await verticalSettings.click();
  await expect(horizontal.getByRole("button", { name: "Settings destination" })).toHaveAttribute("aria-current", "page");
  await expect(verticalSettings).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Selected section: settings · navigation enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Disable navigation" }).click();
  await expect(horizontalSearch).toBeDisabled();
  await expect(verticalSearch).toBeDisabled();
  await expect(page.getByText("Selected section: settings · navigation disabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable navigation" }).click();
  await page.getByRole("button", { name: "Select home" }).click();
  await expect(horizontalHome).toHaveAttribute("aria-current", "page");
  await expect(vertical.getByRole("button", { name: "Home destination" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Selected section: home · navigation enabled", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
