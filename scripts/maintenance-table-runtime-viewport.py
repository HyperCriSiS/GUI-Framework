from pathlib import Path

path = Path("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt")
source = path.read_text()

if "import androidx.compose.ui.test.performScrollTo\n" not in source:
    anchor = "import androidx.compose.ui.test.performClick\n"
    if anchor not in source:
        raise RuntimeError("performClick import anchor missing")
    source = source.replace(anchor, anchor + "import androidx.compose.ui.test.performScrollTo\n", 1)

old = '''            composeRule.onNodeWithText("Selected project row: nova").assertIsDisplayed()\n\n            atlasRow.performTouchInput { doubleClick() }\n            composeRule.waitForIdle()\n            atlasRow.assertIsSelected()\n            novaRow.assertIsNotSelected()\n            composeRule.onNodeWithText("Selected project row: atlas").assertIsDisplayed()\n            composeRule.onNodeWithText("Activated project row: atlas").assertIsDisplayed()\n'''
new = '''            val novaSelectionStatus = composeRule.onNodeWithText("Selected project row: nova")\n            novaSelectionStatus.performScrollTo()\n            novaSelectionStatus.assertIsDisplayed()\n\n            atlasRow.performScrollTo()\n            atlasRow.performTouchInput { doubleClick() }\n            composeRule.waitForIdle()\n            atlasRow.assertIsSelected()\n            novaRow.assertIsNotSelected()\n            val atlasSelectionStatus = composeRule.onNodeWithText("Selected project row: atlas")\n            atlasSelectionStatus.performScrollTo()\n            atlasSelectionStatus.assertIsDisplayed()\n            val atlasActivationStatus = composeRule.onNodeWithText("Activated project row: atlas")\n            atlasActivationStatus.performScrollTo()\n            atlasActivationStatus.assertIsDisplayed()\n'''
if old not in source:
    raise RuntimeError("Table runtime status assertion anchor missing")
source = source.replace(old, new, 1)
path.write_text(source)
