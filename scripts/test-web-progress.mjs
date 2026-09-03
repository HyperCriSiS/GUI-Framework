// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiProgress } from "../packages/adapter-web/src/progress.mjs";

const irPath = "build/spec-ir-progress-test.json";
const cssPath = "build/web/components-progress-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  removeProperty(name) { this.values.delete(name); }
  getPropertyValue(name) { return this.values.get(name) ?? ""; }
}
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase(); this.dataset = {}; this.attributes = new Map(); this.children = []; this.className = ""; this.style = new FakeStyle(); this.hidden = false; this.textContent = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}
class FakeDocument {
  createElement(tagName) { return new FakeElement(tagName); }
  createElementNS(_namespace, tagName) { return new FakeElement(tagName); }
}

const fakeDocument = new FakeDocument();

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-progress/);
  assert.match(css, /\.gui-progress__track/);
  assert.match(css, /\.gui-progress__indicator/);
  assert.match(css, /data-gui-variant="linear"/);
  assert.match(css, /data-gui-variant="circular"/);
  assert.match(css, /data-gui-state~="indeterminate"/);
  assert.match(css, /aria-disabled="true"/);
  assert.match(css, /--gui-progress-track-color:/);
  assert.match(css, /--gui-progress-indicator-color:/);
  assert.match(css, /@keyframes gui-progress-linear-indeterminate/);
  assert.match(css, /@keyframes gui-progress-circular-indeterminate/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /animation: none !important/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Progress CSS must inherit cascading palette token variables");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into Progress CSS");

  const progress = createGuiProgress(fakeDocument, { value: 25, min: 0, max: 100, label: "Uploading", accessibilityLabel: "Upload progress" });
  assert.equal(progress.element.tagName, "DIV");
  assert.equal(progress.element.className, "gui-progress");
  assert.equal(progress.element.dataset.guiComponent, "progress");
  assert.equal(progress.element.dataset.guiVariant, "linear");
  assert.equal(progress.element.dataset.guiSize, "medium");
  assert.equal(progress.element.dataset.guiState, "");
  assert.equal(progress.element.getAttribute("role"), "progressbar");
  assert.equal(progress.element.getAttribute("aria-label"), "Upload progress");
  assert.equal(progress.element.getAttribute("aria-valuemin"), "0");
  assert.equal(progress.element.getAttribute("aria-valuemax"), "100");
  assert.equal(progress.element.getAttribute("aria-valuenow"), "25");
  assert.equal(progress.labelElement.textContent, "Uploading");
  assert.equal(progress.labelElement.hidden, false);
  assert.equal(progress.trackElement.className, "gui-progress__track");
  assert.equal(progress.indicatorElement.style.getPropertyValue("inline-size"), "25%");
  assert.equal(progress.element.style.getPropertyValue("--gui-progress-fraction"), "0.25");

  progress.update({ value: 75, label: "" });
  assert.equal(progress.element.getAttribute("aria-valuenow"), "75");
  assert.equal(progress.indicatorElement.style.getPropertyValue("inline-size"), "75%");
  assert.equal(progress.labelElement.hidden, true);
  assert.equal(progress.element.getAttribute("aria-label"), "Upload progress");

  progress.update({ indeterminate: true, disabled: true, accessibilityLabel: "Working" });
  assert.equal(progress.element.dataset.guiState, "indeterminate disabled");
  assert.equal(progress.element.getAttribute("aria-disabled"), "true");
  assert.equal(progress.element.getAttribute("aria-valuenow"), null);
  assert.equal(progress.element.getAttribute("aria-valuemin"), null);
  assert.equal(progress.element.getAttribute("aria-valuemax"), null);
  assert.equal(progress.indicatorElement.style.getPropertyValue("inline-size"), "");

  progress.update({ variant: "circular", size: "large" });
  assert.equal(progress.element.dataset.guiVariant, "circular");
  assert.equal(progress.element.dataset.guiSize, "large");
  assert.equal(progress.visualElement.tagName, "SVG");
  assert.equal(progress.visualElement.getAttribute("viewBox"), "0 0 100 100");
  assert.equal(progress.trackElement.tagName, "CIRCLE");
  assert.equal(progress.indicatorElement.getAttribute("pathLength"), "100");
  assert.equal(progress.indicatorElement.getAttribute("stroke-dasharray"), "25 75");

  progress.update({ indeterminate: false, disabled: false, value: 60, min: 10, max: 110, accessibilityLabel: "" });
  assert.equal(progress.element.getAttribute("aria-disabled"), null);
  assert.equal(progress.element.getAttribute("aria-valuemin"), "10");
  assert.equal(progress.element.getAttribute("aria-valuemax"), "110");
  assert.equal(progress.element.getAttribute("aria-valuenow"), "60");
  assert.equal(progress.indicatorElement.getAttribute("stroke-dasharray"), "100 100");
  assert.equal(progress.indicatorElement.getAttribute("stroke-dashoffset"), "50");
  assert.equal(progress.element.getAttribute("aria-label"), null);

  progress.update({ variant: "linear", label: "Halfway" });
  assert.equal(progress.visualElement.tagName, "DIV");
  assert.equal(progress.indicatorElement.style.getPropertyValue("inline-size"), "50%");
  assert.equal(progress.element.getAttribute("aria-label"), "Halfway");

  assert.throws(() => createGuiProgress(null), /requires a DOM Document-like object/);
  assert.throws(() => createGuiProgress(fakeDocument, { max: 0 }), /max must be greater than min/);
  assert.throws(() => createGuiProgress(fakeDocument, { value: 101 }), /value must be between min and max/);
  assert.doesNotThrow(() => createGuiProgress(fakeDocument, { indeterminate: true, min: 10, max: 20 }));
  assert.throws(() => progress.update({ disabled: "yes" }), /disabled must be a boolean/);
  assert.throws(() => progress.update({ value: Number.NaN }), /value must be a finite number/);
  assert.throws(() => progress.update({ variant: "radial" }), /Unknown GUI progress variant/);
  assert.throws(() => progress.update({ size: "huge" }), /Unknown GUI progress size/);
  assert.throws(() => progress.update({ label: 42 }), /label must be a string/);

  console.log("Web Basic Progress / Spinner vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
