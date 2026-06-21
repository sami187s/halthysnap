const { withDangerousMod } = require('@expo/config-plugins');

function withFixedGradleSettings(config) {
  console.log('🔧 fix-gradle-plugin: Starting...');
  
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const fs = require('fs');
      const path = require('path');
      
      console.log('🔧 fix-gradle-plugin: Processing Android settings...');
      
      const settingsPath = path.join(
        config.modRequest.projectRoot,
        'android',
        'settings.gradle'
      );
      
      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (fs.existsSync(settingsPath)) {
        let content = fs.readFileSync(settingsPath, 'utf-8');
        const originalContent = content;
        
        console.log('📝 Fixing settings.gradle...');
        
        // Fix 0a: First variant without paths parameter
        content = content.replace(
          /includeBuild\(new File\(\["node", "--print", "require\.resolve\('@react-native\/gradle-plugin\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\.toString\(\)\)/g,
          'includeBuild(new File(settingsDir, "../node_modules/react-native/node_modules/@react-native/gradle-plugin"))'
        );
        
        // Fix 0b: Second variant with paths parameter
        content = content.replace(
          /includeBuild\(new File\(\["node", "--print", "require\.resolve\('@react-native\/gradle-plugin\/package\.json', \{ paths: \[require\.resolve\('react-native\/package\.json'\)\] \}\)"\]\.execute\(null, rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\)/g,
          'includeBuild(new File(settingsDir, "../node_modules/react-native/node_modules/@react-native/gradle-plugin"))'
        );
        
        // Fix 1: Replace incorrect relative path includeBuild (line 9)
        content = content.replace(
          /includeBuild\("react-settings-plugin"\)/g,
          'includeBuild(new File(settingsDir, "../node_modules/react-native/node_modules/@react-native/gradle-plugin/settings-plugin"))'
        );
        
        // Fix 2: Replace reactAndroidLibs .execute() call (line 53)
        content = content.replace(
          /from\(files\(new File\(\["node",\s*"--print",\s*"require\.resolve\('react-native\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\),\s*"\.\.\/gradle\/libs\.versions\.toml"\)\)\)/g,
          'from(files(new File(settingsDir, "../node_modules/react-native/gradle/libs.versions.toml")))'
        );
        
        // Fix 3: Replace expo autolinking .execute() call (line 57)
        content = content.replace(
          /apply from:\s*new File\(\["node",\s*"--print",\s*"require\.resolve\('expo\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\),\s*"\.\.\/scripts\/autolinking\.gradle"\);/g,
          'apply from: new File(settingsDir, "../node_modules/expo/scripts/autolinking.gradle");'
        );
        
        // Fix 4: Replace cli-platform-android .execute() call (line 61)
        content = content.replace(
          /apply from:\s*new File\(\["node",\s*"--print",\s*"require\.resolve\('@react-native-community\/cli-platform-android\/package\.json',\s*\{\s*paths:\s*\[require\.resolve\('react-native\/package\.json'\)\]\s*\}\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\),\s*"\.\.\/native_modules\.gradle"\);/g,
          'apply from: new File(settingsDir, "../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");'
        );
        
        // Fix 5: Remove duplicate includeBuild at end of file
        // The first includeBuild is in pluginManagement (around line 7)
        // Any standalone includeBuild after line 15 is likely a duplicate
        const lines = content.split('\n');
        const fixedLines = [];
        let duplicateRemoved = false;
        
        for (let i = 0; i < lines.length; i++) {
          const trimmedLine = lines[i].trim();
          
          // Fix 6: For RN 0.74.4+, remove the plugins line since settings-plugin isn't included
          if (trimmedLine === 'plugins { id("com.facebook.react.settings") }') {
            // Check if we have the conditional includeBuild for settings-plugin
            const prevLines = fixedLines.join('\n');
            if (prevLines.includes('if(reactNativeMinor == 74 && reactNativePatch <= 3)')) {
              // Remove this line - settings plugin only works with RN 0.74.0-0.74.3
              console.log('  ➜ Removed plugins line (settings-plugin not available for RN 0.74.4+)');
              continue;
            }
          }
          
          // Skip standalone includeBuild after line 15 that matches the gradle-plugin pattern
          if (i > 15 && 
              !lines[i].startsWith(' ') && 
              !lines[i].startsWith('\t') &&
              (trimmedLine === "includeBuild(new File(settingsDir, '../node_modules/react-native/node_modules/@react-native/gradle-plugin'))" ||
               trimmedLine === "includeBuild(new File(settingsDir, '../node_modules/@react-native/gradle-plugin'))")) {
            console.log('  ➜ Removed duplicate includeBuild at line', i + 1);
            duplicateRemoved = true;
            continue;
          }
          
          fixedLines.push(lines[i]);
        }
        
        if (!duplicateRemoved) {
          // Fallback: look for any duplicate after line 50
          const fixedLines2 = [];
          for (let i = 0; i < fixedLines.length; i++) {
            const trimmedLine = fixedLines[i].trim();
            if (i > 50 && trimmedLine.includes("includeBuild") && trimmedLine.includes("@react-native/gradle-plugin")) {
              console.log('  ➜ Removed duplicate includeBuild at line', i + 1, '(fallback method)');
              continue;
            }
            fixedLines2.push(fixedLines[i]);
          }
          content = fixedLines2.join('\n');
        } else {
          content = fixedLines.join('\n');
        }
        
        if (content !== originalContent) {
          fs.writeFileSync(settingsPath, content);
          console.log('✅ Fixed settings.gradle - all issues resolved:');
          console.log('  ➜ Fixed react-settings-plugin path');
          console.log('  ➜ Fixed reactAndroidLibs .execute() call');
          console.log('  ➜ Fixed expo autolinking .execute() call');
          console.log('  ➜ Fixed cli-platform-android .execute() call');
          console.log('  ➜ Removed duplicate includeBuild');
        } else {
          console.log('⚠️ No changes made - file may already be fixed');
        }
        
      } else {
        console.log('❌ settings.gradle not found at:', settingsPath);
      }
      
      return config;
    },
  ]);
}

module.exports = withFixedGradleSettings;
