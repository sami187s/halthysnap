/**
 * IAP Configuration
 * Central configuration for In-App Purchases
 */

import { Platform } from 'react-native';

// Environment detection
export const IS_PRODUCTION = !__DEV__;
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

// Product IDs - Configure these in App Store Connect / Google Play Console
export const PRODUCT_IDS = {
  ios: {
    subscription: 'com.healthyscan.app',
  },
  android: {
    subscription: 'com.healthyscan.app.android',
  }
};

// Get current platform's product IDs
export const getCurrentProductIds = () => {
  if (IS_IOS) {
    return ['com.healthyscan.app'];
  } else if (IS_ANDROID) {
    return ['com.healthyscan.app.android'];
  }
  return [];
};

// ✅ SECURITY FIX: Apple Shared Secret removed from client
// Secret is now ONLY on your server - see server-validation-template.js
// This prevents hackers from extracting the secret and creating fake receipts

// Receipt Validation Endpoints
export const RECEIPT_VALIDATION = {
  // ⚠️ DEPRECATED: Direct Apple validation removed for security
  // Use server-side validation instead
  apple: {
    production: 'https://buy.itunes.apple.com/verifyReceipt',
    sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt',
  },
  // ✅ Your backend validation endpoint (REQUIRED for production)
  // Deploy server-validation-template.js and update this URL
  backend: {
    validate: 'https://your-server.com/api/validate-receipt', // UPDATE THIS
    restore: 'https://your-server.com/api/restore-purchase',
  }
};

// Subscription Configuration
export const SUBSCRIPTION_CONFIG = {
  // Trial period (for free trial)
  trialDuration: 2, // days
  
  // Grace period before hard lock
  gracePeriod: 3, // days after expiry
  
  // ✅ FIX #54: Reasonable retry limits
  maxRetries: 3,
  retryDelay: 2000, // ms - will use exponential backoff
  
  // Cache duration
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  
  // ✅ FIX #28: Receipt validation interval
  validationInterval: 24 * 60 * 60 * 1000, // 24 hours
};

// Feature Flags
export const FEATURES = {
  // Enable/disable IAP (useful for testing)
  iapEnabled: true,
  
  // ✅ Enable backend validation (REQUIRED for production)
  backendValidation: true, // Must be true - client validation removed for security
  
  // ✅ Sandbox detection automatic - no manual flag needed
  sandboxMode: !IS_PRODUCTION,
  
  // Enable debug logging
  debugLogging: __DEV__,
  
  // Enable test purchases (free in dev mode)
  testMode: __DEV__,
  
  // Android support (not yet implemented)
  androidEnabled: false,
};

// Error Messages
export const ERROR_MESSAGES = {
  NOT_SUPPORTED: 'In-App Purchases are not supported on this device',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  PURCHASE_FAILED: 'Purchase failed. Please try again',
  RESTORE_FAILED: 'No active subscription found. Purchase a subscription to continue.',
  VALIDATION_FAILED: 'Could not verify your purchase. Please try again.',
  ALREADY_OWNED: 'You already have an active subscription',
  CANCELLED: 'Purchase cancelled',
  PENDING: 'Purchase is pending approval. Please check back later.',
  CONNECTION_TIMEOUT: 'Connection timeout. Please check your internet and try again.',
  PARENTAL_CONTROLS: 'Purchases are restricted. Check your device settings.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PURCHASE_SUCCESS: 'Premium activated! All features unlocked 🎉',
  RESTORE_SUCCESS: 'Subscription restored successfully',
  TRIAL_ACTIVATED: 'Free trial activated! Enjoy premium features',
};

// Pricing (fallback if products don't load)
export const FALLBACK_PRICING = {
  weekly: {
    price: '$0.00',
    period: 'week',
  },
  monthly: {
    price: '$0.00',
    period: 'month',
  },
  yearly: {
    price: '$0.00',
    period: 'year',
  },
};

// App Store URLs (for manage subscription)
export const STORE_URLS = {
  ios: {
    manageSubscriptions: 'https://apps.apple.com/account/subscriptions',
    appPage: 'https://apps.apple.com/app/healthyscan/id123456789',
  },
  android: {
    manageSubscriptions: 'https://play.google.com/store/account/subscriptions',
    appPage: 'https://play.google.com/store/apps/details?id=com.healthyscan.app',
  },
};

// Logging helper
export const logIAP = (message, data = null) => {
  if (FEATURES.debugLogging) {
    console.log(`[IAP] ${message}`, data || '');
  }
};

// Export default config object
export default {
  PRODUCT_IDS,
  getCurrentProductIds,
  // APPLE_SHARED_SECRET removed for security - now server-side only
  RECEIPT_VALIDATION,
  SUBSCRIPTION_CONFIG,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FALLBACK_PRICING,
  STORE_URLS,
  IS_PRODUCTION,
  IS_IOS,
  IS_ANDROID,
  logIAP,
};
