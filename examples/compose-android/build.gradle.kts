// SPDX-License-Identifier: AGPL-3.0-or-later

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        // AGP 9 uses built-in Kotlin. Pin the higher KGP used by the Compose adapter toolchain.
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.10")
    }
}

plugins {
    id("com.android.application") version "9.3.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false
}
