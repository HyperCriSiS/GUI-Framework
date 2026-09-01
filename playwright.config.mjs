// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    },
  },
  reporter: isCi ? [["line"]] : [["list"]],
  outputDir: "test-results/playwright",
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    timezoneId: "UTC",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "node scripts/serve-web-reference.mjs",
    url: "http://127.0.0.1:4173/examples/web-reference/",
    reuseExistingServer: !isCi,
    timeout: 10_000,
  },
});
