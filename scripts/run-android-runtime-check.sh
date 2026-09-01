#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

adb wait-for-device

GUI_TEST_FONT_SCALE="${GUI_TEST_FONT_SCALE:-${1:-}}"
if [[ -z "${GUI_TEST_FONT_SCALE}" ]]; then
  echo "GUI_TEST_FONT_SCALE or positional font-scale argument is required" >&2
  exit 1
fi

if [[ -z "${GUI_TEST_DENSITY:-}" ]]; then
  GUI_TEST_DENSITY="$(adb shell getprop qemu.sf.lcd_density | tr -d '\r')"
fi
if [[ -z "${GUI_TEST_DENSITY}" ]]; then
  GUI_TEST_DENSITY="$(adb shell wm density | sed -n 's/^Physical density: //p' | tr -d '\r')"
fi
if [[ -z "${GUI_TEST_DENSITY}" ]]; then
  echo "Unable to resolve GUI_TEST_DENSITY from the environment or emulator" >&2
  exit 1
fi

adb shell wm density "${GUI_TEST_DENSITY}"
adb shell settings put system font_scale "${GUI_TEST_FONT_SCALE}"
adb shell am force-stop gui.framework.examples.android || true

echo "Android runtime validation configuration:"
adb shell getprop ro.build.version.sdk | tr -d '\r' | xargs -I{} echo "  API: {}"
adb shell wm density | sed 's/^/  /'
adb shell settings get system font_scale | tr -d '\r' | xargs -I{} echo "  font_scale: {}"
adb shell cat /proc/meminfo | head -n 1 | sed 's/^/  /'

gradle -p examples/compose-android :app:connectedDebugAndroidTest --no-daemon
