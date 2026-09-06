// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const extensionPath = resolve("build/examples/browser-extension");

test("MV3 browser extension reference runs the packaged GUI integration kit", async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), "gui-framework-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) serviceWorker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(serviceWorker.url()).host;
    expect(extensionId).not.toBe("");

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    const root = page.getByRole("main", { name: "Browser extension GUI reference" });
    await expect(root).toHaveAttribute("data-gui-host", "browser-extension");
    await expect(root).toHaveAttribute("data-gui-surface", "popup");
    await expect(root).toHaveAttribute("data-gui-theme", "basic");
    await expect(root).toHaveAttribute("data-gui-palette", "reference-dark");

    const button = page.getByRole("button", { name: "Activate reference" });
    await expect(button).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Activations: 0");
    await button.click();
    await expect(page.getByRole("status")).toHaveText("Activations: 1");
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
