// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { textLocaleFixtures } from "../examples/text-locale-fixtures.mjs";

const [androidSource, desktopSource, runtimeSource] = await Promise.all([
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
  readFile("examples/compose-desktop/src/main/kotlin/Main.kt", "utf8"),
  readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt", "utf8"),
]);

for (const [label, source] of [["Android", androidSource], ["Desktop", desktopSource]]) {
  assert.match(source, /import androidx\.compose\.runtime\.CompositionLocalProvider/);
  assert.match(source, /import androidx\.compose\.ui\.platform\.LocalLayoutDirection/);
  assert.match(source, /import androidx\.compose\.ui\.unit\.LayoutDirection/);
  assert.match(source, /CompositionLocalProvider\(LocalLayoutDirection provides LayoutDirection\.Rtl\)/, `${label} reference must exercise RTL layout direction`);
  assert.ok(source.includes(textLocaleFixtures.longText), `${label} reference must include the long natural-language fixture`);
  assert.ok(source.includes(textLocaleFixtures.unbrokenText), `${label} reference must include the unbroken-token fixture`);
  assert.ok(source.includes(textLocaleFixtures.unicodeText), `${label} reference must include the Unicode/emoji/combining fixture`);
  assert.ok(source.includes(textLocaleFixtures.mixedBidiText), `${label} reference must include the mixed-bidi fixture`);
  assert.match(source, /label = "RTL start marker"/);
  assert.match(source, /label = "RTL end marker"/);
  assert.match(source, /accessibilityLabel = "RTL Unicode mixed-direction input"/);
}

assert.ok(runtimeSource.includes(textLocaleFixtures.longText), "Android runtime must render the long locale fixture");
assert.ok(runtimeSource.includes(textLocaleFixtures.unbrokenText), "Android runtime must render the unbroken locale fixture");
assert.match(runtimeSource, /fetchSemanticsNode\(\)\.boundsInRoot/);
assert.match(runtimeSource, /rtlStartBounds\.left > rtlEndBounds\.left/);
assert.match(runtimeSource, /LocalLayoutDirection\.Rtl must place the first Row child to the physical right/);

console.log("Compose text, Unicode and RTL reference/runtime contract tests passed.");
