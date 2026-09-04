// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/table.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Table and Data Grid reference preserves passive table semantics and controlled row selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-table-reference-root");
  const table = page.getByRole("table", { name: "Project inventory table" });
  const grid = page.getByRole("grid", { name: "Project selection grid" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(table).toHaveAttribute("data-gui-size", "small");
  await expect(grid).toHaveAttribute("data-gui-size", "small");
  await expect(table.getByText("Project inventory", { exact: true })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Project" })).toBeVisible();
  await expect(table.getByText("Atlas", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const atlas = grid.getByRole("row", { name: "Atlas project row" });
  const nova = grid.getByRole("row", { name: "Nova project row" });
  const archive = grid.getByRole("row", { name: "Archive project row" });

  await expect(atlas).toHaveAttribute("aria-selected", "true");
  await expect(atlas).toHaveAttribute("tabindex", "0");
  await expect(nova).toHaveAttribute("aria-selected", "false");
  await expect(archive).toHaveAttribute("aria-disabled", "true");
  await expect(archive).toHaveAttribute("tabindex", "-1");
  await expect(page.getByText("Selected row: atlas · activated: none · grid enabled", { exact: true })).toBeVisible();

  await nova.click();
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await expect(nova).toHaveAttribute("tabindex", "0");
  await expect(atlas).toHaveAttribute("aria-selected", "false");
  await expect(page.getByText("Selected row: nova · activated: none · grid enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Select Atlas" }).click();
  await atlas.focus();
  await expect(atlas).toBeFocused();
  await atlas.press("ArrowDown");
  await expect(nova).toBeFocused();
  await nova.press("Space");
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await nova.press("Enter");
  await expect(page.getByText("Selected row: nova · activated: nova · grid enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Disable grid" }).click();
  await expect(grid).toHaveAttribute("aria-disabled", "true");
  await expect(atlas).toHaveAttribute("aria-disabled", "true");
  await expect(nova).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Selected row: nova · activated: nova · grid disabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable grid" }).click();
  await expect(grid).toHaveAttribute("aria-disabled", "false");
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await expectNoHorizontalOverflow(page);
});
