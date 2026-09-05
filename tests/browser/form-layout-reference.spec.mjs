// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/form-layout.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Form Layout preserves host-owned controls, field semantics and compact one-column fallback", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1100 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-form-layout-reference-root");
  const form = page.getByRole("group", { name: "Account settings form layout" });
  const email = page.getByLabel("Email");
  const recovery = page.getByLabel("Recovery code");
  const token = page.getByLabel("API token");

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(form).toHaveAttribute("data-gui-size", "small");
  await expect(form).toHaveAttribute("data-gui-variant", "inline");
  await expect(form).toHaveCSS("grid-template-columns", /.+/);
  const columnCount = await form.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
  expect(columnCount).toBe(1);

  await expect(email).toHaveValue("jan@example.com");
  await email.fill("owner@example.com");
  await expect(email).toHaveValue("owner@example.com");

  await expect(recovery).toHaveAttribute("aria-invalid", "true");
  await expect(recovery).toHaveAttribute("aria-describedby", /__description/);
  await expect(recovery).toHaveAttribute("aria-describedby", /__error/);
  await expect(page.getByText("Recovery code must contain 6 characters.", { exact: true })).toBeVisible();
  await recovery.fill("ABC123");
  await expect(recovery).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Recovery code must contain 6 characters.", { exact: true })).toBeHidden();

  await expect(token).toBeDisabled();
  const tokenField = token.locator("xpath=ancestor::*[contains(@class,'gui-form-layout__field')]");
  await expect(tokenField).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("button", { name: "Use stacked layout" }).click();
  await expect(form).toHaveAttribute("data-gui-variant", "stacked");
  await expect(page.getByText(/variant: stacked/)).toBeVisible();

  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved: 1 · variant: stacked · email: owner@example.com", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
