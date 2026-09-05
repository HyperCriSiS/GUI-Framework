from pathlib import Path

runtime_path = Path("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt")
runtime = runtime_path.read_text()
anchor = '''            val settingsDestinations = composeRule.onAllNodesWithContentDescription("Settings destination")
            settingsDestinations.assertCountEquals(2)
            settingsDestinations[1].performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Active destination: settings").assertIsDisplayed()

'''
block = anchor + '''            val hierarchy = composeRule.onNodeWithContentDescription("Project hierarchy tree")
            hierarchy.performScrollTo().assertIsDisplayed()
            val workspaceNode = composeRule.onNodeWithContentDescription("Workspace node")
            val atlasNode = composeRule.onNodeWithContentDescription("Atlas node")
            val archiveTreeNode = composeRule.onNodeWithContentDescription("Archive node")
            val settingsTreeNode = composeRule.onNodeWithContentDescription("Settings node")
            workspaceNode.performScrollTo().assertIsDisplayed().assertIsSelected()
            atlasNode.assertIsDisplayed().assertIsNotSelected()
            archiveTreeNode.assertIsDisplayed().assertIsNotEnabled()

            workspaceNode.performSemanticsAction(SemanticsActions.Collapse)
            composeRule.waitForIdle()
            atlasNode.assertDoesNotExist()
            val collapsedTreeStatus = composeRule.onNodeWithText("Workspace branch: collapsed")
            collapsedTreeStatus.performScrollTo().assertIsDisplayed()

            workspaceNode.performScrollTo().assertIsDisplayed()
            workspaceNode.performSemanticsAction(SemanticsActions.Expand)
            composeRule.waitForIdle()
            atlasNode.performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            workspaceNode.assertIsNotSelected()
            atlasNode.assertIsSelected()
            val atlasTreeSelectionStatus = composeRule.onNodeWithText("Selected tree node: atlas")
            atlasTreeSelectionStatus.performScrollTo().assertIsDisplayed()

            settingsTreeNode.performScrollTo().assertIsDisplayed()
            settingsTreeNode.performTouchInput { doubleClick() }
            composeRule.waitForIdle()
            settingsTreeNode.assertIsSelected()
            val settingsTreeSelectionStatus = composeRule.onNodeWithText("Selected tree node: settings")
            settingsTreeSelectionStatus.performScrollTo().assertIsDisplayed()
            val settingsTreeActivationStatus = composeRule.onNodeWithText("Activated tree node: settings")
            settingsTreeActivationStatus.performScrollTo().assertIsDisplayed()

'''
if block not in runtime:
    if anchor not in runtime:
        raise RuntimeError("missing Android Tree runtime insertion anchor")
    runtime = runtime.replace(anchor, block, 1)
runtime_path.write_text(runtime)

gate_path = Path("scripts/test-compose-android-reference.mjs")
gate = gate_path.read_text()
assertions = '''assert.match(runtimeTest, /onNodeWithContentDescription\\("Project hierarchy tree"\\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\\("Workspace node"\\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\\("Atlas node"\\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\\("Archive node"\\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\\("Settings node"\\)/);
assert.match(runtimeTest, /performSemanticsAction\\(SemanticsActions\\.Collapse\\)/);
assert.match(runtimeTest, /performSemanticsAction\\(SemanticsActions\\.Expand\\)/);
assert.match(runtimeTest, /Selected tree node: atlas/);
assert.match(runtimeTest, /Activated tree node: settings/);
'''
if assertions not in gate:
    idx = gate.rfind('console.log(')
    if idx < 0:
        raise RuntimeError("missing Android reference gate console anchor")
    gate = gate[:idx] + assertions + gate[idx:]
gate_path.write_text(gate)
