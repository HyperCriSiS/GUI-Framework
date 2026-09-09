// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sharedPath = "examples/showcase-shared/src/main/kotlin/gui/framework/examples/showcase/ShowcaseExplorerContent.kt";
const desktopPath = "examples/compose-desktop/src/main/kotlin/ShowcaseExplorer.kt";
const androidPath = "examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/ShowcaseActivity.kt";

const [shared, desktop, android] = await Promise.all([
  readFile(sharedPath, "utf8"),
  readFile(desktopPath, "utf8"),
  readFile(androidPath, "utf8"),
]);

const themes = [
  ["GuiThemeId.BASIC", "Basic"],
  ["GuiThemeId.MODERN", "Modern"],
  ["GuiThemeId.GLASS", "Glass"],
  ["GuiThemeId.FROSTED_GLASS", "Frosted Glass"],
  ["GuiThemeId.SPACEY", "Spacey"],
  ["GuiThemeId.CYBERPUNK", "Cyberpunk"],
];

for (const [enumName, label] of themes) {
  assert.ok(shared.includes(enumName), `Showcase must expose ${enumName}`);
  assert.ok(shared.includes(`"${label}"`), `Showcase must expose the ${label} theme label`);
}
assert.ok(shared.includes("themeOptions"), "Showcase must keep one shared theme option source for selectors/comparison");

for (const section of ["Components", "Screens", "Compare", "Stress Lab"]) {
  assert.ok(shared.includes(`"${section}"`), `Showcase must expose the ${section} primary section`);
}

for (const gallerySection of ["Controls", "Data", "Layout", "Feedback"]) {
  assert.ok(shared.includes(`"${gallerySection}"`), `Component Gallery must expose ${gallerySection}`);
}

for (const component of [
  "GuiButton(",
  "GuiInput(",
  "GuiSelect(",
  "GuiSwitch(",
  "GuiCheckbox(",
  "GuiSlider(",
  "GuiTable(",
  "GuiTree(",
  "GuiTabs(",
  "GuiPanel(",
  "GuiDialog(",
]) {
  assert.ok(shared.includes(component), `Showcase must exercise the real framework component ${component.slice(0, -1)}`);
}

for (const screen of ["Operations Dashboard", "Data Explorer", "Settings"]) {
  assert.ok(shared.includes(screen), `Showcase real-world screens must include ${screen}`);
}
assert.ok(shared.includes("Theme A/B Comparison"), "Showcase must expose the semantic A/B theme comparison surface");

for (const mode of ["Controls", "Large Grid", "Large Tree", "Text"]) {
  assert.ok(shared.includes(`"${mode}"`), `Stress Lab must expose ${mode}`);
}
for (const workload of [40, 100, 250, 500, 1000]) {
  assert.match(shared, new RegExp(`\\b${workload}\\b`), `Stress Lab must expose workload ${workload}`);
}

for (const qaOption of [
  "Dark",
  "Light",
  "Standard",
  "Compact",
  "150%",
  "Phone · 420",
  "Tablet · 760",
  "Desktop · 1180",
]) {
  assert.ok(shared.includes(qaOption), `Showcase QA controls must expose ${qaOption}`);
}

assert.match(shared, /GuiTheme\s*\(/, "Shared Showcase content must render through the real GuiTheme provider");
assert.ok(
  (shared.match(/GuiTheme\s*\(/g) ?? []).length >= 2,
  "Showcase must render the root theme plus nested comparison theme contexts",
);
assert.ok(shared.includes('ComparisonCard("A ·'), "Showcase comparison must render Theme A");
assert.ok(shared.includes('ComparisonCard("B ·'), "Showcase comparison must render Theme B");

for (const [source, platform] of [
  [desktop, "Desktop / Windows target"],
  [android, "Android target"],
]) {
  assert.ok(
    source.includes("gui.framework.examples.showcase.ShowcaseExplorer"),
    `${platform} wrapper must import the shared ShowcaseExplorer`,
  );
  assert.ok(source.includes("ShowcaseExplorer("), `${platform} wrapper must delegate to the shared explorer`);
  assert.ok(source.includes(platform), `${platform} wrapper must preserve its platform label`);
}

console.log(
  "Six-theme Showcase coverage passed: shared Desktop/Android explorer exposes all themes, component gallery, real-world screens, A/B comparison, QA controls and stress scenarios.",
);
