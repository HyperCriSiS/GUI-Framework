// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiSlider } from "../packages/adapter-web/src/slider.mjs";

const irPath = "build/spec-ir-slider-test.json";
const cssPath = "build/web/components-slider-test.css";

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
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.style = new FakeStyle();
    this.disabled = false;
    this.className = "";
    this.type = "";
    this.value = "";
    this.min = "";
    this.max = "";
    this.step = "";
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type);
    listeners?.delete(listener);
    if (listeners?.size === 0) this.listeners.delete(type);
  }
  dispatch(type) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, currentTarget: this, target: this });
    }
  }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-slider \{/);
  assert.match(css, /\.gui-slider__input/);
  assert.match(css, /\.gui-slider__track/);
  assert.match(css, /\.gui-slider__fill/);
  assert.match(css, /\.gui-slider__thumb/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /\.gui-slider:where\(\[data-gui-state~="focus"\]\)/);
  assert.match(css, /\.gui-slider:where\(\[data-gui-state~="pressed"\]\)/);
  assert.match(css, /\.gui-slider:where\(\[data-gui-state~="disabled"\]\)/);
  assert.match(css, /min-width: var\(--gui-component-slider-track-length-medium\);/);
  assert.match(css, /min-height: var\(--gui-component-slider-track-thickness-medium\);/);
  assert.match(css, /min-width: var\(--gui-component-slider-thumb-size-medium\);/);
  assert.match(css, /inline-size: calc\(var\(--gui-slider-fraction, 0\) \* 100%\);/);
  assert.match(css, /writing-mode: vertical-lr;/);
  assert.match(css, /direction: rtl;/);
  assert.match(css, /transition: var\(--gui-motion-interaction-fast\);/);
  assert.match(css, /transition-duration: 0ms !important;/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Component CSS must remain palette-variable driven");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  const changes = [];
  const changeArgumentCounts = [];
  const slider = createGuiSlider(fakeDocument, {
    value: 25,
    min: 0,
    max: 100,
    step: 5,
    accessibilityLabel: "Volume",
    accessibilityValueText: "25 percent",
    size: "large",
    onValueChange(value) {
      changes.push(value);
      changeArgumentCounts.push(arguments.length);
    },
  });

  assert.equal(slider.element.tagName, "DIV");
  assert.equal(slider.element.className, "gui-slider");
  assert.equal(slider.element.dataset.guiComponent, "slider");
  assert.equal(slider.element.dataset.guiVariant, "horizontal");
  assert.equal(slider.element.dataset.guiSize, "large");
  assert.equal(slider.element.style.getPropertyValue("--gui-slider-fraction"), "0.25");
  assert.equal(slider.inputElement.tagName, "INPUT");
  assert.equal(slider.inputElement.type, "range");
  assert.equal(slider.inputElement.value, "25");
  assert.equal(slider.inputElement.min, "0");
  assert.equal(slider.inputElement.max, "100");
  assert.equal(slider.inputElement.step, "5");
  assert.equal(slider.inputElement.getAttribute("aria-label"), "Volume");
  assert.equal(slider.inputElement.getAttribute("aria-valuetext"), "25 percent");
  assert.equal(slider.inputElement.getAttribute("aria-orientation"), "horizontal");
  assert.equal(slider.trackElement.children[0], slider.fillElement);
  assert.equal(slider.trackElement.children[1], slider.thumbElement);
  assert.equal(slider.trackElement.getAttribute("aria-hidden"), "true");
  assert.equal(slider.fillElement.getAttribute("aria-hidden"), "true");
  assert.equal(slider.thumbElement.getAttribute("aria-hidden"), "true");

  slider.inputElement.value = "30";
  slider.inputElement.dispatch("input");
  assert.deepEqual(changes, [30]);
  assert.deepEqual(changeArgumentCounts, [1], "Slider changes must expose only the numeric payload");
  assert.equal(typeof changes[0], "number");
  assert.equal(slider.inputElement.value, "25", "Slider value remains controlled until update");

  slider.update({ value: 30, accessibilityValueText: "30 percent" });
  assert.equal(slider.inputElement.value, "30");
  assert.equal(slider.element.style.getPropertyValue("--gui-slider-fraction"), "0.3");
  assert.equal(slider.inputElement.getAttribute("aria-valuetext"), "30 percent");

  slider.inputElement.dispatch("focus");
  assert.match(slider.element.dataset.guiState, /\bfocus\b/);
  slider.inputElement.dispatch("pointerdown");
  assert.match(slider.element.dataset.guiState, /\bpressed\b/);
  slider.inputElement.dispatch("pointerup");
  assert.doesNotMatch(slider.element.dataset.guiState, /\bpressed\b/);
  slider.inputElement.dispatch("blur");
  assert.equal(slider.element.dataset.guiState, "");

  slider.update({ variant: "vertical", min: -50, max: 50, step: 10, value: 0, accessibilityValueText: "" });
  assert.equal(slider.element.dataset.guiVariant, "vertical");
  assert.equal(slider.inputElement.getAttribute("aria-orientation"), "vertical");
  assert.equal(slider.inputElement.getAttribute("aria-valuetext"), null);
  assert.equal(slider.element.style.getPropertyValue("--gui-slider-fraction"), "0.5");

  slider.update({ disabled: true });
  assert.equal(slider.inputElement.disabled, true);
  assert.match(slider.element.dataset.guiState, /\bdisabled\b/);
  slider.inputElement.value = "10";
  slider.inputElement.dispatch("input");
  assert.deepEqual(changes, [30], "Disabled sliders must not emit value changes");
  assert.equal(slider.inputElement.value, "0", "Disabled input attempts must restore the controlled value");

  assert.throws(() => slider.update({ value: 100 }), /value must be between min and max/);
  assert.throws(() => slider.update({ min: 50, max: 50 }), /max must be greater than min/);
  assert.throws(() => slider.update({ step: 0 }), /step must be greater than zero/);
  assert.throws(() => slider.update({ disabled: 0 }), /disabled must be a boolean/);
  assert.throws(() => slider.update({ accessibilityLabel: "" }), /accessibilityLabel must be a non-empty string/);
  assert.throws(() => slider.update({ onValueChange: true }), /onValueChange must be a function or null/);
  assert.throws(() => slider.update({ variant: "radial" }), /Unknown GUI slider variant/);
  assert.throws(() => slider.update({ size: "huge" }), /Unknown GUI slider size/);

  slider.destroy();
  for (const type of ["input", "focus", "blur", "pointerdown", "pointerup", "pointercancel"]) {
    assert.equal(slider.inputElement.listeners.has(type), false, `Slider destroy must remove ${type} listener`);
  }

  assert.throws(() => createGuiSlider(fakeDocument, { accessibilityLabel: "Volume" }), /value must be a finite number/);
  assert.throws(() => createGuiSlider(fakeDocument, { value: 10 }), /accessibilityLabel must be a non-empty string/);
  assert.throws(() => createGuiSlider(fakeDocument, { value: Number.NaN, accessibilityLabel: "Volume" }), /value must be a finite number/);

  console.log("Web Basic slider controlled/native-range vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
