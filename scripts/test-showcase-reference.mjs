// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sharedPath = "examples/showcase-shared/src/main/kotlin/gui/framework/examples/showcase/ShowcaseExplorerContent.kt";
const desktopPath = "examples/compose-desktop/src/main/kotlin/ShowcaseExplorer.kt";
const androidPath = "examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/ShowcaseActivity.kt";
const androidDesignPath = "examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/ShowcaseDesignApp.kt";
const referenceScenariosPath = "examples/reference-scenarios.json";

const [shared, desktop, android, androidDesign, referenceScenarios] = await Promise.all([
  readFile(sharedPath, "utf8"),
  readFile(desktopPath, "utf8"),
  readFile(androidPath, "utf8"),
  readFile(androidDesignPath, "utf8"),
  readFile(referenceScenariosPath, "utf8"),
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
for (const component of ["GuiButton(", "GuiInput(", "GuiSelect(", "GuiSwitch(", "GuiCheckbox(", "GuiSlider(", "GuiTable(", "GuiTree(", "GuiTabs(", "GuiPanel(", "GuiDialog("]) {
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
for (const qaOption of ["Dark", "Light", "Standard", "Compact", "150%", "Phone · 420", "Tablet · 760", "Desktop · 1180"]) {
  assert.ok(shared.includes(qaOption), `Showcase QA controls must expose ${qaOption}`);
}
assert.match(shared, /GuiTheme\s*\(/, "Shared Showcase content must render through the real GuiTheme provider");
assert.ok((shared.match(/GuiTheme\s*\(/g) ?? []).length >= 2, "Showcase must render the root theme plus nested comparison theme contexts");
assert.ok(shared.includes('ComparisonCard("A ·'), "Showcase comparison must render Theme A");
assert.ok(shared.includes('ComparisonCard("B ·'), "Showcase comparison must render Theme B");
for (const activeNoOpLabel of ["Primary", "Save", "Save settings", "Primary action"]) {
  assert.ok(!shared.includes(`GuiButton("${activeNoOpLabel}", onActivate = {},`), `Active Showcase action ${activeNoOpLabel} must provide observable feedback`);
}
assert.ok(!/[\u0600-\u06ff\u3040-\u30ff\u3400-\u9fff]/u.test(shared), "Design Showcase copy must not mix unrelated Arabic/CJK locale fixtures into the visible experience");
assert.ok(android.includes(".safeDrawingPadding()"), "Android Showcase must respect safe drawing insets so content is not clipped by system bars");
assert.ok(desktop.includes("gui.framework.examples.showcase.ShowcaseExplorer"), "Desktop / Windows target wrapper must import the shared ShowcaseExplorer");
assert.ok(desktop.includes("ShowcaseExplorer("), "Desktop / Windows target wrapper must delegate to the shared explorer");
assert.ok(desktop.includes("Desktop / Windows target"), "Desktop / Windows target wrapper must preserve its platform label");
assert.ok(android.includes("ShowcaseDesignApp("), "Android target must launch the design-first Showcase app");
assert.ok(androidDesign.includes("gui.framework.examples.showcase.ShowcaseExplorer"), "Android design app must retain access to the shared ShowcaseExplorer as the QA Lab");
assert.ok(androidDesign.includes('GuiTabItem("designs", "Designs")'), "Android Showcase must expose Designs as its primary mode");
assert.ok(androidDesign.includes('GuiTabItem("qa", "QA Lab")'), "Android Showcase must expose the technical explorer as QA Lab");
assert.ok(androidDesign.includes('mutableStateOf("designs")'), "Android Showcase must start in the Designs experience");
assert.ok(androidDesign.indexOf("GuiTabs(") < androidDesign.indexOf('if (section == "qa")'), "Android mode tabs must remain visible when entering the QA Lab");
assert.ok(androidDesign.includes("ShowcaseExplorer("), "Android QA Lab must delegate to the shared explorer");
assert.ok(androidDesign.includes("Android target · QA Lab"), "Android QA Lab must preserve its platform label");
for (const [enumName, label] of themes) {
  assert.ok(androidDesign.includes(enumName), `Android design gallery must expose ${enumName}`);
  assert.ok(androidDesign.includes(`"${label}"`), `Android design gallery must expose the ${label} theme label`);
}
assert.ok(!/[\u0600-\u06ff\u3040-\u30ff\u3400-\u9fff]/u.test(androidDesign), "Android design gallery must not mix unrelated Arabic/CJK stress fixtures into the visible design experience");
assert.ok(!/\bJan\b/.test(shared + androidDesign), "Showcase fixtures must not contain personalized user names");
assert.ok(referenceScenarios.includes('"initialValue": "demo@example.invalid"'), "Shared reference scenarios must use neutral example identity data");
console.log("Six-theme Showcase coverage passed: Android starts in a design-first gallery, QA Lab retains the shared explorer, safe areas are respected, and Desktop keeps the shared explorer contract.");
