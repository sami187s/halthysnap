import { registerRootComponent } from 'expo';
import { LogBox, Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import App from './App';
import { localCrashReporter } from './src/utils/crashReporting';

// 🌐 Fix web scrolling: ensure html/body/root containers fill the viewport
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root, #main {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
}

// 🔧 CRITICAL: Initialize RevenueCat FIRST (before anything else)
// This MUST happen before any component tries to check subscription status
const REVENUECAT_IOS_KEY = 'appl_DhDIFQhAwGUxdVYqtoCuCAUDkAN';
const REVENUECAT_ANDROID_KEY = 'test_THUiKJthzOeXjQpEArrFRKQUHdu';

if (Platform.OS === 'ios') {
  console.log('🔧 Setting up RevenueCat for iOS...');
  try {
    Purchases.setup(REVENUECAT_IOS_KEY);
    console.log('✅ RevenueCat configured for iOS');
  } catch (error) {
    console.error('❌ RevenueCat setup failed:', error);
  }
} else if (Platform.OS === 'android') {
  console.log('🔧 Setting up RevenueCat for Android...');
  try {
    Purchases.setup(REVENUECAT_ANDROID_KEY);
    console.log('✅ RevenueCat configured for Android');
  } catch (error) {
    console.error('❌ RevenueCat setup failed:', error);
  }
} else {
  console.log('ℹ️ RevenueCat not available on web platform');
}

// Ignore specific warnings in production
if (!__DEV__) {
  LogBox.ignoreLogs([
    'Remote debugger',
    'Require cycle',
    'VirtualizedLists should never be nested',
    'Cannot find native module',
    'ExpoSQLite',
  ]);
}

// Global error handlers
const setupGlobalErrorHandlers = () => {
  // Handle JavaScript errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (__DEV__) {
      originalConsoleError(...args);
    }
    
    // Capture errors in production
    if (!__DEV__ && args.length > 0) {
      const error = args[0];
      if (error instanceof Error) {
        localCrashReporter.captureError(error, { 
          source: 'console.error',
          args: args.slice(1) 
        });
      }
    }
  };

  // Handle unhandled promise rejections
  if (Platform.OS !== 'web') {
    // For React Native
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      console.error('Unhandled Promise Rejection:', event);
      localCrashReporter.captureError(
        new Error(event.reason || 'Unhandled Promise Rejection'),
        { type: 'unhandledRejection', source: 'global' }
      );
      
      if (originalHandler) {
        originalHandler(event);
      }
    };
  }

  // Handle native module errors
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Suppress known platform incompatibility warnings
    if (
      message.includes('Cannot find native module') ||
      message.includes('ExpoSQLite') ||
      message.includes('not available on web')
    ) {
      // Silently ignore these expected warnings
      return;
    }
    
    originalWarn(...args);
  };
};

// Initialize error handling
setupGlobalErrorHandlers();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
