// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiPanel } from "../packages/adapter-web/src/panel.mjs";

const irPath = "build/spec-ir-panel-test.json";
const cssPath = "build/web/components-panel-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.style = {};
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-panel/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /background-color: var\(--gui-semantic-color-surface-elevated\);/);
  assert.match(css, /border-color: var\(--gui-semantic-color-border\);/);
  assert.match(css, /border-width: var\(--gui-border-width-standard\);/);
  assert.match(css, /border-radius: var\(--gui-radius-lg\);/);
  assert.match(css, /padding-inline: var\(--gui-spacing-lg\);/);
  assert.match(css, /padding-block: var\(--gui-spacing-lg\);/);
  assert.match(css, /:where\(\[data-gui-size="small"\]\)/);
  assert.match(css, /:where\(\[data-gui-size="large"\]\)/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Panel CSS must inherit cascading palette token variables");
  assert.doesNotMatch(css, /\.gui-panel[^{]*\{[^}]*transition:/s, "The Basic panel must remain static");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into panel CSS");

  const panel = createGuiPanel(fakeDocument);
  assert.equal(panel.element.tagName, "DIV");
  assert.equal(panel.element.className, "gui-panel");
  assert.equal(panel.element.dataset.guiComponent, "panel");
  assert.equal(panel.element.dataset.guiVariant, "standard");
  assert.equal(panel.element.dataset.guiSize, "medium");
  assert.equal(panel.element.getAttribute("role"), null);
  assert.equal(panel.element.getAttribute("aria-label"), null);
  assert.equal(panel.element.style.boxSizing, "border-box");
  assert.equal(panel.element.style.borderStyle, "solid");
  assert.equal(panel.element.style.minWidth, "0");

  const child = fakeDocument.createElement("span");
  panel.element.append(child);
  panel.update({ size: "large", accessibilityLabel: "Account settings" });
  assert.equal(panel.element.dataset.guiSize, "large");
  assert.equal(panel.element.getAttribute("role"), "group");
  assert.equal(panel.element.getAttribute("aria-label"), "Account settings");
  assert.equal(panel.element.children.length, 1, "Panel updates must preserve caller-owned children");
  assert.equal(panel.element.children[0], child);

  panel.update({ accessibilityLabel: "" });
  assert.equal(panel.element.getAttribute("role"), null);
  assert.equal(panel.element.getAttribute("aria-label"), null);
  assert.equal(panel.element.children[0], child);

  assert.throws(
    () => panel.update({ accessibilityLabel: undefined }),
    { name: "TypeError", message: "GUI panel accessibilityLabel must be a string" },
  );
  assert.throws(() => panel.update({ variant: "invalid" }), /Unknown GUI panel variant/);
  assert.throws(() => panel.update({ size: "invalid" }), /Unknown GUI panel size/);
  assert.throws(
    () => createGuiPanel(null),
    { name: "TypeError", message: "createGuiPanel requires a DOM Document-like object" },
  );

  assert.doesNotThrow(() => panel.destroy());
  assert.equal(panel.element.children[0], child, "Destroy must not take ownership of caller-provided child nodes");

  console.log("Web Basic panel vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
