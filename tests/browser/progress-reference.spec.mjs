// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/progress.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Progress reference exposes determinate and indeterminate semantics", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-progress-reference-root");
  const determinate = page.getByRole("progressbar", { name: "Workspace sync progress" });
  const activity = page.getByRole("progressbar", { name: "Workspace sync activity" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);

  await expect(determinate).toHaveAttribute("data-gui-variant", "linear");
  await expect(determinate).toHaveAttribute("data-gui-size", "small");
  await expect(determinate).toHaveAttribute("aria-valuemin", "0");
  await expect(determinate).toHaveAttribute("aria-valuemax", "100");
  await expect(determinate).toHaveAttribute("aria-valuenow", "68");
  await expect(page.getByText("Sync progress: 68%", { exact: true })).toBeVisible();

  await expect(activity).toHaveAttribute("data-gui-variant", "circular");
  await expect(activity).toHaveAttribute("data-gui-state", "indeterminate");
  await expect(activity).not.toHaveAttribute("aria-valuenow", /.+/);
  await expect(activity).not.toHaveAttribute("aria-valuemin", /.+/);
  await expect(activity).not.toHaveAttribute("aria-valuemax", /.+/);
  await expect(page.getByText("Syncing workspace", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Advance progress" }).click();
  await expect(determinate).toHaveAttribute("aria-valuenow", "82");
  await expect(page.getByText("Sync progress: 82%", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Complete loading" }).click();
  await expect(activity).toHaveAttribute("data-gui-state", "");
  await expect(activity).toHaveAttribute("aria-valuemin", "0");
  await expect(activity).toHaveAttribute("aria-valuemax", "100");
  await expect(activity).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByText("Sync complete", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("Basic Progress reference respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(referencePath);

  const activityIndicator = page.getByRole("progressbar", { name: "Workspace sync activity" }).locator(".gui-progress__indicator");
  await expect(activityIndicator).toBeVisible();
  const animationName = await activityIndicator.evaluate((node) => getComputedStyle(node).animationName);
  expect(animationName).toBe("none");
});
