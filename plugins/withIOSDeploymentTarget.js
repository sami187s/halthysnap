const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin to ensure iOS deployment target is set to 15.0
 * This fixes the issue where OpenIAP requires iOS 15.0 but build defaults to 13.4
 */
module.exports = function withIOSDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
        
        // Replace any existing platform declaration
        podfileContent = podfileContent.replace(
          /platform :ios, ['"][0-9.]+['"]/g,
          "platform :ios, '15.0'"
        );
        
        // Check if our custom code is already added
        if (podfileContent.includes('post_install do |installer|') && 
            !podfileContent.includes('# Force iOS 15.0 for all targets')) {
          
          // Add our deployment target code after the post_install line
          podfileContent = podfileContent.replace(
            /(post_install do \|installer\|\s*)/,
            `$1
  # Force iOS 15.0 for all targets
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
  end
  
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  end
  `
          );
        }
        
        fs.writeFileSync(podfilePath, podfileContent);
      }
      
      return config;
    }
  ]);
};

