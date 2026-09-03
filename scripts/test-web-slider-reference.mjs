// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/slider.html", "utf8"),
  readFile("examples/web-reference/slider-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-slider-reference-root"/);
assert.match(html, /slider-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiSlider/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /value,\n    min: 0,\n    max: 100,\n    step: 5/);
assert.match(source, /accessibilityLabel: "Workspace zoom"/);
assert.match(source, /accessibilityValueText: "40 percent"/);
assert.match(source, /onValueChange\(nextValue\) \{/);
assert.match(source, /slider\.update\(\{\n        value,\n        accessibilityValueText: `\$\{value\} percent`,/);
assert.match(source, /accessibilityLabel: "Vertical balance"/);
assert.match(source, /variant: "vertical"/);
assert.match(source, /label: "Disable slider"/);
assert.match(source, /slider\.update\(\{ disabled \}\)/);
assert.match(source, /label: "Reset zoom"/);
assert.match(source, /Workspace zoom: \$\{value\}% · \$\{disabled \? "disabled" : "enabled"\}/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Slider reference source tests passed.");
