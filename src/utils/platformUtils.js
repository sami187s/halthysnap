import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if platform supports native features
export const platformSupports = {
  camera: Platform.OS === 'ios' || Platform.OS === 'android',
  sqlite: Platform.OS === 'ios' || Platform.OS === 'android',
  filesystem: Platform.OS === 'ios' || Platform.OS === 'android',
  notifications: Platform.OS === 'ios' || Platform.OS === 'android'
};

// Platform-specific component loader
export const loadPlatformComponent = (nativeComponent, webFallback) => {
  if (platformSupports.camera) {
    return nativeComponent;
  }
  return webFallback;
};

// Safe native module access
export const safeNativeCall = async (moduleCall, fallback = null) => {
  try {
    return await moduleCall();
  } catch (error) {
    return fallback;
  }
};

// Safe module import wrapper - simplified
export const createSafeImport = (importFunction, fallback = null) => {
  try {
    return importFunction();
  } catch (error) {
    return fallback;
  }
};

// Debug info
export const getDebugInfo = () => {
  return {
    platform: Platform.OS,
    isDevice: Constants.isDevice,
    expoGoApp: Constants.executionEnvironment === 'storeClient',
    appOwnership: Constants.appOwnership,
    supportedFeatures: platformSupports
  };
};
