import { Alert, DevSettings } from 'react-native';
import Constants from 'expo-constants';

export const enableRemoteDebugging = () => {
  if (__DEV__) {
    // In development, use the normal debug menu
    DevSettings.openDeveloperMenus();
  } else {
    // In production APK, show manual instructions
    Alert.alert(
      'Enable Remote Debugging',
      'To debug your APK:\n\n1. Shake your device\n2. Select "Debug Remote JS"\n3. Open Chrome and go to chrome://inspect\n4. Click "inspect" on your app\n5. Check the Console tab for errors',
      [
        { text: 'OK' },
        { 
          text: 'Open Dev Menu', 
          onPress: () => {
            try {
              DevSettings.openDeveloperMenus();
            } catch (error) {
              Alert.alert('Debug Menu', 'Shake your device to open debug menu');
            }
          }
        }
      ]
    );
  }
};

export const logError = (error, context = '') => {
  const errorInfo = {
    message: error.message || String(error),
    stack: error.stack || 'No stack trace',
    context,
    timestamp: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version || '1.0.0',
    buildVersion: Constants.expoConfig?.android?.versionCode || 1,
  };
  
  
  // In production, you could send this to your logging service
  if (!__DEV__) {
    // Store errors locally or send to crash reporting service
  }
  
  return errorInfo;
};

export const showDebugInfo = () => {
  const info = {
    'App Version': Constants.expoConfig?.version || '1.0.0',
    'Build Version': Constants.expoConfig?.android?.versionCode || 1,
    'Expo Version': Constants.expoVersion,
    'Platform': Constants.platform?.android ? 'Android' : 'iOS',
    'Device Year Class': Constants.deviceYearClass,
    'Is Device': Constants.isDevice,
  };
  
  const infoText = Object.entries(info)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
    
  Alert.alert('Debug Info', infoText, [
    { text: 'OK' },
    { text: 'Enable Debugging', onPress: enableRemoteDebugging }
  ]);
};
