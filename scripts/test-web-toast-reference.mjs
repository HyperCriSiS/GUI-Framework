// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/toast.html", "utf8"),
  readFile("examples/web-reference/toast-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-toast-reference-root"/);
assert.match(html, /toast-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiToast/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /durationMs: query\.get\("durationMs"\)/);
assert.match(source, /label: "Show notification"/);
assert.match(source, /label: "Show timed notification"/);
assert.match(source, /label: "Show error notification"/);
assert.match(source, /actionLabel: "Undo"/);
assert.match(source, /actionValue: "undo"/);
assert.match(source, /accessibilityLabel: "Workspace notification"/);
assert.match(source, /onOpenChange: setOpen/);
assert.match(source, /variant: "error"/);
assert.match(source, /toast\.element\.style\.position = "fixed"/);
assert.match(source, /Placement belongs to the host/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Toast / Notification reference source tests passed.");
