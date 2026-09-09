const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

/**
 * Minimal Android build tweaks. Does NOT touch the Kotlin version — Expo SDK 52
 * ships a working Kotlin toolchain (1.9.24) and forcing a newer version splits
 * the Kotlin Gradle Plugin from the compose compiler and breaks
 * :expo-modules-core:compileReleaseKotlin.
 *
 * 1. Tolerate dependencies compiled with newer Kotlin metadata (RevenueCat).
 * 2. missingDimensionStrategy so libraries that declare product flavors resolve.
 * 3. pickFirst the native libs that show up from more than one dependency.
 */
module.exports = function withAndroidVariantFix(config) {
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('-Xskip-metadata-version-check')) {
      contents = contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ["-Xskip-metadata-version-check"]
        }
    }`
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    let { contents } = config.modResults;

    if (!contents.includes("missingDimensionStrategy 'store'")) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        missingDimensionStrategy 'store', 'play'`
      );
    }

    if (!contents.includes("pickFirst '**/libc++_shared.so'")) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libjsc.so'
        pickFirst '**/libfolly_runtime.so'
    }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
