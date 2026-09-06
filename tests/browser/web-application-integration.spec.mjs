// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

test("Web application integration host consumes compiled IR and native adapter", async ({ page }) => {
  await page.goto("/examples/web-reference/integration.html");

  const root = page.getByRole("main", { name: "Web application GUI integration" });
  await expect(root).toHaveAttribute("data-gui-host", "web-application");
  await expect(root).toHaveAttribute("data-gui-surface", "application");
  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");

  const button = page.getByRole("button", { name: "Activate Web integration" });
  await expect(button).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Activations: 0");
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Activations: 1");

  const runtime = await page.evaluate(() => ({
    supported: globalThis.__guiWebApplicationReference.capabilitySelection.supported,
    selectedFallback: globalThis.__guiWebApplicationReference.capabilitySelection.selectedFallback,
  }));
  expect(runtime.supported).toBe(true);
  expect(runtime.selectedFallback).toBe(null);
});
