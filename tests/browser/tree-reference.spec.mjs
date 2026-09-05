// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/tree.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Tree reference preserves controlled hierarchy semantics at compact width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-tree-reference-root");
  const tree = page.getByRole("tree", { name: "Project hierarchy tree" });
  const workspace = tree.getByRole("treeitem", { name: "Workspace node" });
  const atlas = tree.getByRole("treeitem", { name: "Atlas node" });
  const archive = tree.getByRole("treeitem", { name: "Archive node" });
  const settings = tree.getByRole("treeitem", { name: "Settings node" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(tree).toHaveAttribute("data-gui-size", "small");
  await expect(workspace).toHaveAttribute("aria-selected", "true");
  await expect(workspace).toHaveAttribute("aria-expanded", "true");
  await expect(workspace).toHaveAttribute("tabindex", "0");
  await expect(atlas).toHaveAttribute("aria-selected", "false");
  await expect(archive).toHaveAttribute("aria-disabled", "true");
  await expect(archive).toHaveAttribute("tabindex", "-1");
  await expect(settings).toHaveAttribute("aria-selected", "false");
  await expect(page.getByText("Selected node: workspace · activated: none · workspace expanded · tree enabled", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await workspace.locator(":scope > .gui-tree__item > .gui-tree__disclosure").click();
  await expect(workspace).toHaveAttribute("aria-expanded", "false");
  await expect(atlas).toBeHidden();
  await expect(page.getByText("Selected node: workspace · activated: none · workspace collapsed · tree enabled", { exact: true })).toBeVisible();

  await workspace.focus();
  await workspace.press("ArrowRight");
  await expect(workspace).toHaveAttribute("aria-expanded", "true");
  await expect(atlas).toBeVisible();
  await workspace.press("ArrowRight");
  await expect(atlas).toBeFocused();
  await atlas.press("Space");
  await expect(atlas).toHaveAttribute("aria-selected", "true");
  await expect(workspace).toHaveAttribute("aria-selected", "false");

  await atlas.press("ArrowDown");
  await expect(settings).toBeFocused();
  await settings.press("Space");
  await expect(settings).toHaveAttribute("aria-selected", "true");
  await settings.press("Enter");
  await expect(page.getByText("Selected node: settings · activated: settings · workspace expanded · tree enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Disable tree" }).click();
  await expect(tree).toHaveAttribute("aria-disabled", "true");
  await expect(workspace).toHaveAttribute("aria-disabled", "true");
  await expect(atlas).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Selected node: settings · activated: settings · workspace expanded · tree disabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable tree" }).click();
  await page.getByRole("button", { name: "Reset hierarchy" }).click();
  await expect(workspace).toHaveAttribute("aria-selected", "true");
  await expect(workspace).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Selected node: workspace · activated: none · workspace expanded · tree enabled", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
