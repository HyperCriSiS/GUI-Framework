// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../examples/web-reference/form-layout.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../examples/web-reference/form-layout-reference.mjs", import.meta.url), "utf8");

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-form-layout-reference-root"/);
assert.match(html, /form-layout-reference\.mjs/);
assert.match(source, /createGuiFormLayout/);
assert.match(source, /createGuiFormLayoutSection/);
assert.match(source, /createGuiFormField/);
assert.match(source, /createGuiFormActions/);
assert.match(source, /createGuiInput/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /accessibilityLabel: "Account settings form layout"/);
assert.match(source, /columns: 2/);
assert.match(source, /variant = "inline"/);
assert.match(source, /label: "Recovery code"/);
assert.match(source, /Recovery code must contain 6 characters/);
assert.match(source, /label: "API token"/);
assert.match(source, /disabled: true/);
assert.match(source, /form\.update\(\{ variant \}\)/);
assert.match(source, /emailInput\.update\(\{ value: emailValue \}\)/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Form Layout reference source tests passed.");
