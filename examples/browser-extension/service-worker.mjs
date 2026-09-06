// SPDX-License-Identifier: AGPL-3.0-or-later

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "gui-framework-reference-ping") {
    sendResponse({ ok: true });
  }
});
