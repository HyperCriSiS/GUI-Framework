from pathlib import Path

# Reference-only controllers for deterministic browser regression control.
p = Path('examples/web-reference/app.mjs')
s = p.read_text()
s = s.replace(
    '''      .then((capabilityIr) => {\n        mountReferenceApp(document, root, {''',
    '''      .then((capabilityIr) => {\n        globalThis.__guiReferenceController = mountReferenceApp(document, root, {'''
)
p.write_text(s)

p = Path('examples/web-reference/select-reference.mjs')
s = p.read_text()
s = s.replace(
    '''    mountSelectReference(document, root, {\n      density: query.get("density") ?? "standard",''',
    '''    globalThis.__guiSelectReferenceController = mountSelectReference(document, root, {\n      density: query.get("density") ?? "standard",'''
)
p.write_text(s)

# Real browser CompositionEvent/InputEvent regression for Input.
p = Path('tests/browser/web-reference.spec.mjs')
s = p.read_text()
addition = r'''

test("controlled Input preserves real browser IME preedit across stale host echoes", async ({ page }) => {
  await page.goto("/examples/web-reference/index.html?theme=basic");
  await page.waitForFunction(() => Boolean(globalThis.__guiReferenceController));
  const input = page.locator("#gui-reference-name");

  await page.evaluate(() => {
    const element = document.querySelector("#gui-reference-name");
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.value = "に";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "に",
      inputType: "insertCompositionText",
      isComposing: true,
    }));
    globalThis.__guiReferenceController.components.nameInput.update({ value: "Ada Lovelace" });
  });
  await expect(input).toHaveValue("に");

  await page.evaluate(() => {
    const element = document.querySelector("#gui-reference-name");
    element.value = "日本語 🧑🏽‍💻";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "日本語 🧑🏽‍💻",
      inputType: "insertCompositionText",
      isComposing: true,
    }));
    globalThis.__guiReferenceController.components.nameInput.update({ value: "に" });
  });
  await expect(input).toHaveValue("日本語 🧑🏽‍💻");

  await page.evaluate(() => {
    const element = document.querySelector("#gui-reference-name");
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "日本語 🧑🏽‍💻" }));
  });
  await page.waitForFunction(() => globalThis.__guiReferenceController.getState().name === "日本語 🧑🏽‍💻");
  await page.evaluate(() => {
    const controller = globalThis.__guiReferenceController;
    controller.components.nameInput.update({ value: controller.getState().name });
  });
  await expect(input).toHaveValue("日本語 🧑🏽‍💻");
});
'''
if 'controlled Input preserves real browser IME preedit' not in s:
    s += addition
p.write_text(s)

# Real browser composition + candidate-key passthrough regression for editable ComboBox.
p = Path('tests/browser/select-reference.spec.mjs')
s = p.read_text()
addition = r'''

test("editable ComboBox preserves real browser composition and leaves candidate keys to the IME", async ({ page }) => {
  await page.goto(`${referencePath}?editable=true`);
  await page.waitForFunction(() => Boolean(globalThis.__guiSelectReferenceController));
  const combo = page.getByRole("combobox", { name: "Find delivery channel" });

  const composingKeys = await page.evaluate(() => {
    const element = document.querySelector("#gui-select-reference-control");
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.value = "か";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "か",
      inputType: "insertCompositionText",
      isComposing: true,
    }));
    globalThis.__guiSelectReferenceController.select.update({ query: "seed" });
    const enter = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter", isComposing: true });
    const down = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown", isComposing: true });
    element.dispatchEvent(enter);
    element.dispatchEvent(down);
    return { enterPrevented: enter.defaultPrevented, downPrevented: down.defaultPrevented };
  });
  expect(composingKeys).toEqual({ enterPrevented: false, downPrevented: false });
  await expect(combo).toHaveValue("か");

  await page.evaluate(() => {
    const element = document.querySelector("#gui-select-reference-control");
    element.value = "かな 🧑🏽‍💻";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "かな 🧑🏽‍💻",
      inputType: "insertCompositionText",
      isComposing: true,
    }));
    globalThis.__guiSelectReferenceController.select.update({ query: "か" });
  });
  await expect(combo).toHaveValue("かな 🧑🏽‍💻");

  await page.evaluate(() => {
    const element = document.querySelector("#gui-select-reference-control");
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "かな 🧑🏽‍💻" }));
    const controller = globalThis.__guiSelectReferenceController;
    controller.select.update({ query: controller.getState().query });
  });
  await expect(combo).toHaveValue("かな 🧑🏽‍💻");

  await combo.press("ArrowDown");
  await combo.press("Enter");
  await expect(page.getByText(/Selected (email|push|digest)\./)).toBeVisible();
});
'''
if 'editable ComboBox preserves real browser composition' not in s:
    s += addition
p.write_text(s)

# Shared Compose IME reference controls.
for file_name in [
    'examples/compose-desktop/src/main/kotlin/Main.kt',
    'examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt',
]:
    p = Path(file_name)
    s = p.read_text()
    if 'var imeInputValue by remember' not in s:
        s = s.replace(
            '    var selectExpanded by remember { mutableStateOf(false) }\n',
            '''    var selectExpanded by remember { mutableStateOf(false) }\n    var imeInputValue by remember { mutableStateOf("") }\n    var imeQuery by remember { mutableStateOf("") }\n    var imeValue by remember { mutableStateOf("") }\n    var imeExpanded by remember { mutableStateOf(false) }\n'''
        )
    marker = '''                    GuiTabs(\n'''
    controls = '''                    GuiInput(\n                        value = imeInputValue,\n                        onValueChange = { imeInputValue = it },\n                        placeholder = "日本語 or emoji",\n                        accessibilityLabel = "IME composition input",\n                        size = inputSize,\n                    )\n                    BasicText("IME input: $imeInputValue")\n                    GuiSelect(\n                        value = imeValue,\n                        options = listOf(\n                            GuiSelectOption(value = "jp", label = "日本語"),\n                            GuiSelectOption(value = "zh", label = "北京"),\n                            GuiSelectOption(value = "emoji", label = "🧑🏽‍💻"),\n                        ),\n                        onValueChange = { imeValue = it },\n                        query = imeQuery,\n                        onQueryChange = { imeQuery = it },\n                        editable = true,\n                        expanded = imeExpanded,\n                        onExpandedChange = { imeExpanded = it },\n                        placeholder = "かな / 北京 / 🧑🏽‍💻",\n                        accessibilityLabel = "IME editable ComboBox",\n                        size = selectSize,\n                    )\n                    BasicText("IME query: $imeQuery")\n'''
    if 'accessibilityLabel = "IME composition input"' not in s:
        s = s.replace(marker, controls + marker, 1)
    p.write_text(s)

# Android instrumentation uses the real Foundation editing semantics with CJK + emoji.
p = Path('examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt')
s = p.read_text()
anchor = '''            val deliverySelect = composeRule.onNodeWithContentDescription("Delivery channel")\n            deliverySelect.assertIsDisplayed().performClick()\n            composeRule.waitForIdle()\n            composeRule.onNodeWithContentDescription("Legacy channel").performScrollTo().assertIsDisplayed().assertIsNotEnabled()\n            composeRule.onNodeWithContentDescription("Push").performScrollTo().assertIsDisplayed().performClick()\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("Push").assertIsDisplayed()\n'''
runtime = anchor + '''\n            val imeInput = composeRule.onNodeWithContentDescription("IME composition input")\n            imeInput.performScrollTo().assertIsDisplayed().performTextReplacement("日本語 🧑🏽‍💻")\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("IME input: 日本語 🧑🏽‍💻").performScrollTo().assertIsDisplayed()\n\n            val imeCombo = composeRule.onNodeWithContentDescription("IME editable ComboBox")\n            imeCombo.performScrollTo().assertIsDisplayed().performTextReplacement("かな 北京 🧑🏽‍💻")\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("IME query: かな 北京 🧑🏽‍💻").performScrollTo().assertIsDisplayed()\n'''
if 'IME input: 日本語 🧑🏽‍💻' not in s:
    s = s.replace(anchor, runtime)
p.write_text(s)

# Permanent reference source gates.
p = Path('scripts/test-compose-android-reference.mjs')
s = p.read_text()
addition = r'''
assert.match(source, /var imeInputValue by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /var imeQuery by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /var imeValue by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /accessibilityLabel = "IME composition input"/);
assert.match(source, /accessibilityLabel = "IME editable ComboBox"/);
assert.match(source, /editable = true/);
assert.match(source, /GuiSelectOption\(value = "jp", label = "日本語"\)/);
assert.match(source, /GuiSelectOption\(value = "zh", label = "北京"\)/);
assert.match(source, /GuiSelectOption\(value = "emoji", label = "🧑🏽‍💻"\)/);
assert.match(source, /IME input: \$imeInputValue/);
assert.match(source, /IME query: \$imeQuery/);
assert.match(runtimeTest, /onNodeWithContentDescription\("IME composition input"\)/);
assert.match(runtimeTest, /performTextReplacement\("日本語 🧑🏽‍💻"\)/);
assert.match(runtimeTest, /onNodeWithText\("IME input: 日本語 🧑🏽‍💻"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("IME editable ComboBox"\)/);
assert.match(runtimeTest, /performTextReplacement\("かな 北京 🧑🏽‍💻"\)/);
assert.match(runtimeTest, /onNodeWithText\("IME query: かな 北京 🧑🏽‍💻"\)/);
'''
if 'IME composition input' not in s:
    s = s.replace('console.log("Compose Android reference application source/build/runtime contract tests passed', addition + 'console.log("Compose Android reference application source/build/runtime contract tests passed')
p.write_text(s)

p = Path('scripts/test-compose-desktop-reference.mjs')
s = p.read_text()
addition = r'''
assert.match(source, /var imeInputValue by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /var imeQuery by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /var imeValue by remember \{ mutableStateOf\(""\) \}/);
assert.match(source, /accessibilityLabel = "IME composition input"/);
assert.match(source, /accessibilityLabel = "IME editable ComboBox"/);
assert.match(source, /editable = true/);
assert.match(source, /GuiSelectOption\(value = "jp", label = "日本語"\)/);
assert.match(source, /GuiSelectOption\(value = "zh", label = "北京"\)/);
assert.match(source, /GuiSelectOption\(value = "emoji", label = "🧑🏽‍💻"\)/);
assert.match(source, /IME input: \$imeInputValue/);
assert.match(source, /IME query: \$imeQuery/);
'''
if 'IME composition input' not in s:
    s = s.replace('console.log("Compose Desktop reference application source contract tests passed', addition + 'console.log("Compose Desktop reference application source contract tests passed')
p.write_text(s)

p = Path('scripts/test-reference-parity.mjs')
s = p.read_text()
addition = r'''
for (const [name, source] of [["Desktop", desktop], ["Android", android]]) {
  assert.match(source, /var imeInputValue by remember \{ mutableStateOf\(""\) \}/, `${name} must expose the shared IME Input state`);
  assert.match(source, /var imeQuery by remember \{ mutableStateOf\(""\) \}/, `${name} must expose the shared editable ComboBox query`);
  assert.match(source, /accessibilityLabel = "IME composition input"/, `${name} must expose the shared IME Input semantics`);
  assert.match(source, /accessibilityLabel = "IME editable ComboBox"/, `${name} must expose the shared IME ComboBox semantics`);
  assert.match(source, /GuiSelectOption\(value = "jp", label = "日本語"\)/, `${name} must expose the shared Japanese IME option`);
  assert.match(source, /GuiSelectOption\(value = "zh", label = "北京"\)/, `${name} must expose the shared CJK IME option`);
  assert.match(source, /GuiSelectOption\(value = "emoji", label = "🧑🏽‍💻"\)/, `${name} must expose the shared emoji IME option`);
}
'''
if 'shared IME Input state' not in s:
    s = s.replace('console.log("Cross-platform reference application parity tests passed', addition + 'console.log("Cross-platform reference application parity tests passed')
p.write_text(s)
