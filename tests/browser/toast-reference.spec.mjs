// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/toast.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Toast reference exposes controlled action and dismiss behavior", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact&durationMs=180`);

  const root = page.locator("#gui-toast-reference-root");
  const toast = page.locator(".gui-toast");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expectNoHorizontalOverflow(page);
  await expect(toast).toBeHidden();

  await page.getByRole("button", { name: "Show notification", exact: true }).click();
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("role", "status");
  await expect(toast).toHaveAttribute("aria-live", "polite");
  await expect(toast).toHaveAttribute("aria-label", "Workspace notification");
  await expect(page.getByText("Workspace updated")).toBeVisible();
  await expect(page.getByText("Your changes were saved.")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(toast).toBeHidden();
  await expect(page.getByText("Last notification action: undo")).toBeVisible();

  await page.getByRole("button", { name: "Show notification", exact: true }).click();
  await expect(toast).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(toast).toBeHidden();
  await expectNoHorizontalOverflow(page);
});

test("Basic Toast pauses timed dismissal for hover and focus and exposes assertive errors", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${referencePath}?density=compact&durationMs=180`);

  const toast = page.locator(".gui-toast");
  const timedButton = page.getByRole("button", { name: "Show timed notification" });
  const errorButton = page.getByRole("button", { name: "Show error notification" });

  await timedButton.click();
  await toast.hover();
  await page.waitForTimeout(260);
  await expect(toast).toBeVisible();
  await page.mouse.move(1, 1);
  await expect(toast).toBeHidden({ timeout: 1000 });

  await timedButton.click();
  await page.getByRole("button", { name: "Undo" }).focus();
  await page.waitForTimeout(260);
  await expect(toast).toBeVisible();
  await timedButton.focus();
  await expect(toast).toBeHidden({ timeout: 1000 });

  await errorButton.click();
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("data-gui-variant", "error");
  await expect(toast).toHaveAttribute("role", "alert");
  await expect(toast).toHaveAttribute("aria-live", "assertive");
  await expect(page.getByText("Sync failed")).toBeVisible();
  await expect(page.getByText("The workspace could not be synchronized.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
