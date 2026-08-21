// SPDX-License-Identifier: AGPL-3.0-or-later

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "gui.framework.examples.android"
    compileSdk = 37

    defaultConfig {
        applicationId = "gui.framework.examples.android"
        minSdk = 23
        targetSdk = 37
        versionCode = 1
        versionName = "0.0.0-development"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // AGP 9 built-in Kotlin supports extra Kotlin roots only through AndroidSourceSet.kotlin.
    // The reference app deliberately compiles the exact adapter and generated contracts used elsewhere.
    sourceSets.named("main") {
        kotlin.directories += "../../../packages/adapter-compose/src/main/kotlin"
        kotlin.directories += "../../../build/compose"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.06.01")
    implementation(composeBom)
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
}
