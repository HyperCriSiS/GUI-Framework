// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [rootBuild, appBuild, settings, manifest, source] = await Promise.all([
  readFile("examples/compose-android/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/settings.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/src/main/AndroidManifest.xml", "utf8"),
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
]);

assert.match(rootBuild, /id\("com\.android\.application"\) version "9\.3\.0"/);
assert.match(rootBuild, /kotlin-gradle-plugin:2\.4\.10/);
assert.match(rootBuild, /id\("org\.jetbrains\.kotlin\.plugin\.compose"\) version "2\.4\.10"/);
assert.doesNotMatch(rootBuild, /org\.jetbrains\.kotlin\.android|kotlin-android/, "AGP 9 reference must use built-in Kotlin");

assert.match(settings, /google\(\)/);
assert.match(settings, /mavenCentral\(\)/);
assert.match(settings, /include\(":app"\)/);

assert.match(appBuild, /compileSdk = 37/);
assert.match(appBuild, /minSdk = 23/);
assert.match(appBuild, /targetSdk = 37/);
assert.match(appBuild, /compose = true/);
assert.match(appBuild, /JavaVersion\.VERSION_17/);
assert.match(appBuild, /sourceSets\.named\("main"\)/);
assert.match(appBuild, /kotlin\.directories \+= "\.\.\/\.\.\/\.\.\/packages\/adapter-compose\/src\/main\/kotlin"/);
assert.match(appBuild, /kotlin\.directories \+= "\.\.\/\.\.\/\.\.\/build\/compose"/);
assert.match(appBuild, /androidx\.compose:compose-bom:2026\.06\.01/);
assert.match(appBuild, /androidx\.activity:activity-compose:1\.13\.0/);
assert.doesNotMatch(appBuild, /androidx\.compose\.material/);

assert.match(manifest, /android:name="\.MainActivity"/);
assert.match(manifest, /android:exported="true"/);
assert.match(manifest, /android\.intent\.action\.MAIN/);

assert.match(source, /class MainActivity : ComponentActivity\(\)/);
assert.match(source, /setContent \{/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /GuiThemeId\.BASIC/);
assert.match(source, /paletteId = "reference-dark"/);
for (const component of ["GuiButton", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Android reference must exercise ${component}`);
}
assert.match(source, /mutableStateOf/);
assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/);
assert.doesNotMatch(source, /androidx\.compose\.material/);

console.log("Compose Android reference application source/build contract tests passed.");
