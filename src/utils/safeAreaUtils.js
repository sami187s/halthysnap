import { Platform, StatusBar, Dimensions, View } from 'react-native';
import Constants from 'expo-constants';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Utility functions for handling safe area insets in edge-to-edge design
 * Optimized for both Expo Go and production builds
 */

// Detection if running in Expo Go vs standalone
const isExpoGo = Constants.appOwnership === 'expo';
const isStandalone = Constants.appOwnership === 'standalone';

// Enhanced fallback values accounting for Expo Go limitations
const FALLBACK_INSETS = {
  ios: { 
    top: isExpoGo ? 44 : 44, 
    bottom: isExpoGo ? 34 : 34 
  },
  android: { 
    top: isExpoGo ? 24 : 0,  // Expo Go has its own status bar
    bottom: isExpoGo ? 0 : 0 
  },
  web: { top: 0, bottom: 0 }
};

export const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    return Constants.statusBarHeight || FALLBACK_INSETS.ios.top;
  } else if (Platform.OS === 'android') {
    return StatusBar.currentHeight || FALLBACK_INSETS.android.top;
  }
  return FALLBACK_INSETS.web.top;
};

export const getNavigationBarHeight = () => {
  if (Platform.OS === 'android') {
    const { height } = Dimensions.get('window');
    const screenData = Dimensions.get('screen');
    
    // Calculate navigation bar height on Android
    const navigationBarHeight = screenData.height - height;
    return navigationBarHeight > 0 ? navigationBarHeight : 0;
  }
  return Platform.OS === 'ios' ? FALLBACK_INSETS.ios.bottom : 0;
};

export const getSafeAreaInsets = () => {
  const platformKey = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const fallback = FALLBACK_INSETS[platformKey];
  
  return {
    top: getStatusBarHeight(),
    bottom: getNavigationBarHeight(),
    left: 0,
    right: 0,
  };
};

// Hook for safe area insets with fallback
export const useSafeAreaInsetsWithFallback = () => {
  try {
    const insets = useSafeAreaInsets();
    return {
      top: insets.top || getStatusBarHeight(),
      bottom: insets.bottom || getNavigationBarHeight(),
      left: insets.left || 0,
      right: insets.right || 0,
    };
  } catch (error) {
    // Fallback to manual calculation if hook is not available
    return getSafeAreaInsets();
  }
};

export const createEdgeToEdgeStyles = (backgroundColor = 'transparent') => {
  const insets = getSafeAreaInsets();
  
  return {
    container: {
      flex: 1,
      backgroundColor,
    },
    statusBarBackground: {
      height: insets.top,
      backgroundColor,
    },
    contentContainer: {
      flex: 1,
      paddingTop: 0, // Content starts immediately after status bar
    },
    safeContent: {
      flex: 1,
      paddingTop: insets.top, // Content with safe padding
    },
    bottomSafeArea: {
      height: insets.bottom,
      backgroundColor,
    },
  };
};

// Higher-order component for edge-to-edge design
export const withEdgeToEdge = (Component, options = {}) => {
  return (props) => {
    const { 
      backgroundColor = 'transparent', 
      statusBarStyle = 'light',
      includeBottomSafeArea = false 
    } = options;
    
    const styles = createEdgeToEdgeStyles(backgroundColor);
    
    return (
      <View style={styles.container}>
        <Component {...props} styles={styles} />
        {includeBottomSafeArea && <View style={styles.bottomSafeArea} />}
      </View>
    );
  };
};
