#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

: "${GUI_TEST_DENSITY:?GUI_TEST_DENSITY is required}"
: "${GUI_TEST_FONT_SCALE:?GUI_TEST_FONT_SCALE is required}"

adb wait-for-device
adb shell wm density "${GUI_TEST_DENSITY}"
adb shell settings put system font_scale "${GUI_TEST_FONT_SCALE}"
adb shell am force-stop gui.framework.examples.android || true

echo "Android runtime validation configuration:"
adb shell getprop ro.build.version.sdk | tr -d '\r' | xargs -I{} echo "  API: {}"
adb shell wm density | sed 's/^/  /'
adb shell settings get system font_scale | tr -d '\r' | xargs -I{} echo "  font_scale: {}"
adb shell cat /proc/meminfo | head -n 1 | sed 's/^/  /'

gradle -p examples/compose-android :app:connectedDebugAndroidTest --no-daemon
