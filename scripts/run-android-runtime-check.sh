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

# Build the same application and instrumentation APKs used by connectedDebugAndroidTest,
# but execute the runner through adb directly. AGP/UTP's additional-output collector can
# fail while copying device-side failure artifacts (notably with "File name too long"),
# which hides the actual AndroidJUnitRunner assertion output and turns diagnostics into a
# collector failure. Direct instrumentation keeps the device/runtime coverage intact and
# emits the real test failure text into the CI log.
gradle -p examples/compose-android \
  :app:assembleDebug \
  :app:assembleDebugAndroidTest \
  --no-daemon

APP_APK="$(find examples/compose-android/app/build/outputs/apk/debug -type f -name '*.apk' -print -quit)"
TEST_APK="$(find examples/compose-android/app/build/outputs/apk/androidTest/debug -type f -name '*.apk' -print -quit)"

if [[ -z "${APP_APK}" || -z "${TEST_APK}" ]]; then
  echo "Unable to locate Android application or instrumentation APK" >&2
  exit 1
fi

echo "Installing runtime validation APKs:"
echo "  app: ${APP_APK}"
echo "  test: ${TEST_APK}"
adb install -r "${APP_APK}"
adb install -r "${TEST_APK}"

set +e
INSTRUMENTATION_OUTPUT="$(adb shell am instrument -w -r \
  gui.framework.examples.android.test/androidx.test.runner.AndroidJUnitRunner 2>&1)"
INSTRUMENTATION_STATUS=$?
set -e

printf '%s\n' "${INSTRUMENTATION_OUTPUT}"

if (( INSTRUMENTATION_STATUS != 0 )); then
  echo "Android instrumentation command failed with status ${INSTRUMENTATION_STATUS}" >&2
  exit "${INSTRUMENTATION_STATUS}"
fi

if grep -Eq 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed|shortMsg=Process crashed' <<<"${INSTRUMENTATION_OUTPUT}"; then
  echo "Android instrumentation reported test failures" >&2
  exit 1
fi

if ! grep -Eq '^OK \([0-9]+ tests?\)$|^OK \([0-9]+ test\)$' <<<"${INSTRUMENTATION_OUTPUT}"; then
  echo "Android instrumentation did not report a successful test summary" >&2
  exit 1
fi
