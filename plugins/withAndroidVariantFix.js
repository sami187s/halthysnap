const { withProjectBuildGradle, withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

/**
 * Android build fix for:
 * 1. Kotlin version compatibility (force 2.1.0 for billing library 8.0.0)
 * 2. react-native-iap variant selection
 * 3. Packaging options for duplicate files
 * 4. Build optimization (reduced memory for 32-bit Java compatibility)
 * 
 * NOTE: iOS is NOT affected by this plugin - iOS IAP works perfectly!
 */
module.exports = function withAndroidVariantFix(config) {
  // Step 1: Force Kotlin 2.1.0 in project build.gradle (CRITICAL for billing library 8.0.0)
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // Replace any existing kotlinVersion with 2.1.0
    if (contents.includes('kotlinVersion')) {
      contents = contents.replace(
        /kotlinVersion\s*=\s*["'][^"']*["']/g,
        'kotlinVersion = "2.1.0"'
      );
    } else {
      // Add kotlinVersion to buildscript ext block
      contents = contents.replace(
        /buildscript\s*\{/,
        `buildscript {
    ext {
        kotlinVersion = "2.1.0"
        kotlin_version = "2.1.0"
    }`
      );
    }
    
    // Add Kotlin compiler arguments to force version and skip metadata check
    if (!contents.includes('freeCompilerArgs')) {
      contents = contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
            freeCompilerArgs += ["-Xskip-metadata-version-check"]
        }
    }`
      );
    }
    
    config.modResults.contents = contents;
    console.log('✅ Forced Kotlin version to 2.1.0 with metadata check skip');
    return config;
  });

  // Step 2: Configure app build.gradle for variant strategy and packaging
  config = withAppBuildGradle(config, (config) => {
    let { contents } = config.modResults;
    
    // Add missingDimensionStrategy for react-native-iap
    if (!contents.includes("missingDimensionStrategy 'store'")) {
      contents = contents.replace(
        /defaultConfig\s*{/,
        `defaultConfig {
        missingDimensionStrategy 'store', 'play'`
      );
      console.log('✅ Added missingDimensionStrategy for react-native-iap');
    }
    
    // Add packagingOptions for duplicate files
    if (!contents.includes("pickFirst '**/libc++_shared.so'")) {
      contents = contents.replace(
        /android\s*{/,
        `android {
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libjsc.so'
        pickFirst '**/libfolly_runtime.so'
    }`
      );
      console.log('✅ Added packagingOptions to app build.gradle');
    }
    
    config.modResults.contents = contents;
    return config;
  });
  
  // Step 3: Add Gradle properties for better build configuration
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      item => item.type !== 'property' || (
        item.key !== 'org.gradle.jvmargs' && 
        item.key !== 'kotlin.version' &&
        item.key !== 'kotlinVersion' &&
        item.key !== 'android.kotlinVersion'
      )
    );
    
    config.modResults.push(
      {
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx1024m -XX:MaxMetaspaceSize=384m'
      },
      {
        type: 'property',
        key: 'kotlin.version',
        value: '2.1.0'
      },
      {
        type: 'property',
        key: 'kotlinVersion',
        value: '2.1.0'
      },
      {
        type: 'property',
        key: 'android.kotlinVersion',
        value: '2.1.0'
      },
      {
        type: 'property',
        key: 'kotlin.compiler.execution.strategy',
        value: 'in-process'
      },
      {
        type: 'property',
        key: 'org.gradle.daemon',
        value: 'false'
      },
      {
        type: 'property',
        key: 'android.useAndroidX',
        value: 'true'
      },
      {
        type: 'property',
        key: 'android.enableJetifier',
        value: 'true'
      },
      {
        type: 'property',
        key: 'NODE_ENV',
        value: 'production'
      }
    );
    
    console.log('✅ Added Gradle properties with Kotlin 2.1.0 and optimized memory for 32-bit Java');
    return config;
  });
  
  return config;
};
