// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { textLocaleFixtures } from "../examples/text-locale-fixtures.mjs";

const [source, html] = await Promise.all([
  readFile("examples/web-reference/locale-reference.mjs", "utf8"),
  readFile("examples/web-reference/locale.html", "utf8"),
]);

assert.equal(textLocaleFixtures.direction, "rtl");
assert.equal(textLocaleFixtures.language, "ar");
assert.match(textLocaleFixtures.longText, /[\u0600-\u06ff]/u, "long fixture must contain Arabic text");
assert.match(textLocaleFixtures.mixedBidiText, /[\u0590-\u05ff]/u, "mixed bidi fixture must contain Hebrew text");
assert.match(textLocaleFixtures.mixedBidiText, /[A-Za-z]/u, "mixed bidi fixture must contain Latin text");
assert.match(textLocaleFixtures.unicodeText, /🧑🏽‍💻/u, "Unicode fixture must contain a multi-code-point emoji sequence");
assert.match(textLocaleFixtures.unicodeText, /e\u0301/u, "Unicode fixture must contain a combining-mark sequence");
assert.equal(/\s/u.test(textLocaleFixtures.unbrokenText), false, "unbroken fixture must not contain whitespace");
assert.ok(textLocaleFixtures.unbrokenText.length > 120, "unbroken fixture must be long enough to stress compact layout");

assert.match(html, /<html lang="ar" dir="rtl">/);
assert.match(html, /gui-text-locale-reference-root/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiInput/);
assert.match(source, /createGuiNavigation/);
assert.match(source, /createGuiTable/);
assert.match(source, /root\.setAttribute\("dir", direction\)/);
assert.match(source, /root\.setAttribute\("lang", direction === "rtl" \? "ar" : "en"\)/);
assert.match(source, /RTL locale navigation/);
assert.match(source, /RTL locale table/);
assert.match(source, /Unicode preserved/);

console.log("Standalone Web text and locale robustness reference tests passed.");
