// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/tooltip.html", "utf8"),
  readFile("examples/web-reference/tooltip-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-tooltip-reference-root"/);
assert.match(html, /tooltip-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiTooltip/);
assert.match(source, /data.*guiTheme|dataset\.guiTheme = "basic"/s);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /placement: query\.get\("placement"\)/);
assert.match(source, /triggerElement: button\.element/);
assert.match(source, /onOpenChange: setOpen/);
assert.match(source, /tooltip\.update\(\{ open \}\)/);
assert.match(source, /Tooltip open\./);
assert.match(source, /Tooltip closed\./);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Tooltip reference source tests passed.");
