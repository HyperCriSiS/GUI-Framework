// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/tabs.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Tabs reference is compact-safe and uses manual keyboard activation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-tabs-reference-root");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  const tablist = page.getByRole("tablist", { name: "Workspace sections" });
  await expect(tablist).toBeVisible();

  const overview = page.getByRole("tab", { name: "Overview" });
  const metrics = page.getByRole("tab", { name: "Metrics" });
  const logs = page.getByRole("tab", { name: "Logs" });

  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(overview).toHaveAttribute("tabindex", "0");
  await expect(metrics).toBeDisabled();
  await expect(metrics).toHaveAttribute("aria-disabled", "true");
  await expect(logs).toHaveAttribute("aria-selected", "false");

  for (const tab of [overview, logs]) {
    const bounds = await tab.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.width).toBeGreaterThanOrEqual(24);
    expect(bounds.height).toBeGreaterThanOrEqual(24);
  }

  await expect(page.getByRole("tabpanel")).toContainText("Overview panel");

  await overview.focus();
  await overview.press("ArrowRight");
  await expect(logs).toBeFocused();
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(logs).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("tabpanel")).toContainText("Overview panel");

  await logs.press("ArrowRight");
  await expect(overview).toBeFocused();
  await overview.press("ArrowLeft");
  await expect(logs).toBeFocused();
  await expect(overview).toHaveAttribute("aria-selected", "true");

  await logs.press("Enter");
  await expect(logs).toHaveAttribute("aria-selected", "true");
  await expect(overview).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("tabpanel")).toContainText("Logs panel");
  await expect(page.getByText("Selected logs.")).toBeVisible();

  await logs.press("Home");
  await expect(overview).toBeFocused();
  await expect(logs).toHaveAttribute("aria-selected", "true");
  await overview.press("End");
  await expect(logs).toBeFocused();
  await expect(logs).toHaveAttribute("aria-selected", "true");
  await logs.press("Home");
  await expect(overview).toBeFocused();
  await overview.press("Space");
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Overview panel");
});
