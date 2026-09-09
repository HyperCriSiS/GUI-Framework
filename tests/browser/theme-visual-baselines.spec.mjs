// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const themes = [
  ["basic", "Basic"],
  ["modern", "Modern"],
  ["glass", "Glass"],
  ["frosted-glass", "Frosted Glass"],
  ["spacey", "Spacey"],
  ["cyberpunk", "Cyberpunk"],
];

for (const [themeId, themeLabel] of themes) {
  test(`${themeLabel} complex settings visual baseline`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/examples/web-reference/index.html?theme=${encodeURIComponent(themeId)}`);

    const root = page.locator("#gui-reference-root");
    await expect(root).toHaveAttribute("data-gui-theme", themeId);
    await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");
    await expect(root).toHaveAttribute("data-gui-host-context", "page");
    await expect(root).toHaveAttribute("data-gui-density", "standard");

    await page.getByRole("button", { name: "Review changes" }).click();
    const dialog = page.getByRole("dialog", { name: "Review settings" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    await expect(root).toHaveScreenshot(`${themeId}-complex-desktop.png`, {
      animations: "disabled",
    });
  });
}
