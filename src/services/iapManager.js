/**
 * ✅ RevenueCat IAP Manager
 * Production-ready In-App Purchase system using RevenueCat SDK
 * Handles iOS subscriptions with automatic receipt validation
 */

import { Platform, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Purchases from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import StorageConfig, { STORAGE_KEYS } from '../config/asyncStorageConfig';

// RevenueCat API Keys - FROM REVENUECAT DASHBOARD
const REVENUECAT_API_KEY_IOS = 'appl_DhDIFQhAwGUxdVYqtoCuCAUDkAN';
const REVENUECAT_API_KEY_ANDROID = 'test_THUiKJthzOeXjQpEArrFRKQUHdu';

// Product identifiers - MUST match App Store Connect AND RevenueCat
const PRODUCT_ID = 'com.healthyscan.app'; // Weekly subscription
const ENTITLEMENT_ID = 'vee Pro'; // MUST match RevenueCat Dashboard entitlement name

class IAPManager {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.processingPurchase = false;
    this.currentCallbacks = null;
    this.appStateSubscription = null;
    this.customerInfo = null;
    this.offerings = null;
    this.lastInitError = null;
  }

  /**
   * Initialize RevenueCat SDK
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ RevenueCat already initialized');
      return true;
    }

    if (this.isInitializing) {
      console.log('⏳ RevenueCat initialization in progress');
      return false;
    }

    this.isInitializing = true;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 REVENUECAT INITIALIZATION START');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 Platform:', Platform.OS);
    console.log('🕐 Time:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Check platform
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('⚠️ Platform not supported for IAP:', Platform.OS);
        this.isInitializing = false;
        return false;
      }

      // Check network
      console.log('1️⃣ Checking network connection...');
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        console.error('❌ No internet connection');
        throw new Error('No internet connection available');
      }
      console.log('✅ Network connection OK');

      // Configure RevenueCat
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('2️⃣ CONFIGURING REVENUECAT SDK');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      
      if (apiKey === 'YOUR_IOS_API_KEY_HERE' || apiKey === 'YOUR_ANDROID_API_KEY_HERE') {
        console.error('❌ RevenueCat API key not configured!');
        console.error('⚠️ Please replace API keys in iapManager.js');
        throw new Error('RevenueCat API key not configured');
      }

      // Configure SDK
      Purchases.configure({ 
        apiKey,
        appUserID: null, // Let RevenueCat generate anonymous ID
        observerMode: false, // We want RevenueCat to handle purchases
        userDefaultsSuiteName: null,
        useAmazon: false,
      });
      console.log('✅ RevenueCat SDK configured');
      console.log('🔑 Using API Key:', apiKey.substring(0, 15) + '...');
      
      // Enable debug logging for App Store issues
      Purchases.setLogLevel('debug');
      console.log('📝 Debug logging enabled');

      // Set up customer info listener
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('📊 Customer info updated:', JSON.stringify(info, null, 2));
        this.customerInfo = info;
        this.checkSubscriptionStatus();
      });

      // Fetch offerings
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('3️⃣ FETCHING OFFERINGS FROM APP STORE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔗 Connecting to App Store to fetch products...');
      
      // Retry logic for offerings (important for Apple Review)
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`📡 Attempt ${retryCount + 1} to fetch offerings from Apple...`);
          this.offerings = await Purchases.getOfferings();
          console.log('📦 Offerings fetched successfully from App Store');
          console.log('📦 Number of offerings:', Object.keys(this.offerings.all).length);
          break;
        } catch (offerError) {
          retryCount++;
          console.warn(`⚠️ Offerings fetch attempt ${retryCount} failed:`, offerError.message);
          console.warn(`⚠️ Error code:`, offerError.code);
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in ${retryCount * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          } else {
            const detailedError = `Failed to connect to App Store after ${maxRetries} attempts.\n` +
              `Error: ${offerError.message}\n` +
              `Code: ${offerError.code}\n\n` +
              `This usually means:\n` +
              `1. No internet connection\n` +
              `2. App Store Connect product not approved\n` +
              `3. RevenueCat not synced with App Store Connect`;
            throw new Error(detailedError);
          }
        }
      }
      
      console.log('📦 Offerings:', JSON.stringify(this.offerings, null, 2));

      if (!this.offerings.current) {
        const errorMsg = '❌ No Current Offering Found!\n\n' +
          'RevenueCat cannot find products from App Store.\n\n' +
          'This means:\n' +
          '1. Product not approved in App Store Connect\n' +
          '2. RevenueCat offering not set as "Current"\n' +
          '3. Product not linked to offering\n\n' +
          'Fix in RevenueCat Dashboard:\n' +
          '• Go to https://app.revenuecat.com\n' +
          '• Products → Offerings → Set "default" as Current\n' +
          '• Ensure product ' + PRODUCT_ID + ' is in offering\n' +
          '• Entitlement "' + ENTITLEMENT_ID + '" must be linked';
        
        console.error('⚠️ No current offering found');
        console.error('⚠️ Available offerings:', Object.keys(this.offerings.all));
        this.lastInitError = errorMsg;
        throw new Error(errorMsg);
      } else {
        console.log('✅ Current offering:', this.offerings.current.identifier);
        console.log('📦 Available packages:', this.offerings.current.availablePackages.length);
        
        // Validate packages exist
        if (this.offerings.current.availablePackages.length === 0) {
          const errorMsg = '❌ No packages in offering!\n\n' +
            'Offering exists but has no products.\n' +
            'Add product ' + PRODUCT_ID + ' to the "default" offering in RevenueCat dashboard.';
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Log each package for debugging
        this.offerings.current.availablePackages.forEach((pkg, index) => {
          console.log(`  Package ${index + 1}:`, pkg.identifier, '→', pkg.product.identifier, '@', pkg.product.priceString);
        });
      }

      // Get initial customer info
      console.log('👤 Fetching customer info from Apple servers...');
      this.customerInfo = await Purchases.getCustomerInfo();
      console.log('👤 Customer info loaded');
      console.log('👤 Customer ID:', this.customerInfo.originalAppUserId);
      console.log('👤 Active entitlements:', Object.keys(this.customerInfo.entitlements.active));
      
      // Sync App Store receipts (critical for Apple Review)
      if (Platform.OS === 'ios') {
        console.log('🔄 Syncing iOS receipts with App Store...');
        try {
          // Force fresh receipt sync with Apple
          await Purchases.syncPurchases();
          console.log('✅ Receipts synced with App Store');
          
          // Fetch customer info again after sync to get latest data
          this.customerInfo = await Purchases.getCustomerInfo();
          console.log('✅ Customer info refreshed after sync');
        } catch (syncError) {
          console.warn('⚠️ Receipt sync warning:', syncError.message);
          // Don't fail initialization if sync fails
        }
      }

      // Check initial subscription status
      await this.checkSubscriptionStatus();

      // Setup app state listener
      this.setupAppStateListener();

      this.isInitialized = true;
      this.isInitializing = false;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ REVENUECAT INITIALIZATION COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return true;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ REVENUECAT INITIALIZATION FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Save error for later display
      this.lastInitError = error.message;
      
      // Send to Sentry
      Sentry.captureException(error, {
        tags: {
          feature: 'iap',
          action: 'initialize'
        },
        extra: {
          platform: Platform.OS,
          apiKey: REVENUECAT_API_KEY_IOS.substring(0, 10) + '...',
          offerings: this.offerings
        }
      });
      
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnection() {
    try {
      console.log('🔍 Calling NetInfo.fetch()...');
      const state = await NetInfo.fetch();
      console.log('📡 NetInfo response:', JSON.stringify(state, null, 2));
      
      const hasConnection = state.isConnected === true;
      console.log('🌐 Has connection:', hasConnection);
      
      return hasConnection;
    } catch (error) {
      console.error('⚠️ Network check failed:', error.message);
      return true; // Don't block IAP on network check failure
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus() {
    // Skip RevenueCat on web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('ℹ️ Subscription check skipped on web platform');
      return false;
    }

    try {
      // Always fetch fresh customer info
      this.customerInfo = await Purchases.getCustomerInfo();

      const isPremium = typeof this.customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💎 SUBSCRIPTION STATUS');
      console.log('Checking for:', ENTITLEMENT_ID);
      console.log('Is Premium:', isPremium);
      console.log('Active entitlements:', Object.keys(this.customerInfo.entitlements.active));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Update AsyncStorage with current status
      if (isPremium) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.PREMIUM_STATUS, JSON.stringify({
            isPremium: true,
            checkedAt: new Date().toISOString(),
          })],
          ['subscriptionType', 'Premium'],
          ['subscriptionExpiresAt', (Date.now() + (365 * 24 * 60 * 60 * 1000)).toString()]
        ]);
      } else {
        // Clear premium status if not active
        await AsyncStorage.multiRemove([
          'subscriptionType',
          'subscriptionExpiresAt',
          STORAGE_KEYS.PREMIUM_STATUS
        ]);
      }

      return isPremium;
    } catch (error) {
      console.error('⚠️ Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(callbacks = {}) {
    // Skip on web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('⚠️ Purchases not supported on web platform');
      Alert.alert(
        'Not Available',
        'In-app purchases are only available on iOS and Android devices.',
        [{ text: 'OK' }]
      );
      return { success: false, error: 'Platform not supported' };
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 PURCHASE SUBSCRIPTION STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🕐 Time:', new Date().toISOString());
    console.log('✅ Initialized:', this.isInitialized);
    console.log('🔄 Processing:', this.processingPurchase);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Prevent double-tap
    if (this.processingPurchase) {
      console.log('⚠️ Purchase already in progress');
      return { success: false, error: 'Purchase already in progress' };
    }

    this.currentCallbacks = callbacks;

    // Check network
    const isConnected = await this.checkNetworkConnection();
    if (!isConnected) {
      this.notifyPurchaseFailure('No internet connection. Please check your connection and try again.');
      return { success: false, error: 'No internet connection' };
    }

    // Ensure initialized
    if (!this.isInitialized) {
      console.log('🔄 RevenueCat not initialized, initializing now...');
      const initialized = await this.initialize();
      if (!initialized) {
        if (callbacks.onLoading) callbacks.onLoading(false);
        
        // Show detailed error for debugging
        const errorMsg = this.lastInitError || 'Unable to connect to App Store. Please try again later.';
        Alert.alert(
          'Subscription Error',
          `Initialization failed: ${errorMsg}\n\nThis error has been logged for investigation.`,
          [{ text: 'OK' }]
        );
        
        this.notifyPurchaseFailure(errorMsg);
        return { success: false, error: 'IAP not available' };
      }
    }

    try {
      this.processingPurchase = true;

      if (callbacks.onLoading) {
        callbacks.onLoading(true);
      }

      // Get the package to purchase
      if (!this.offerings || !this.offerings.current) {
        const errorMsg = 'No offerings available. Please ensure:\n' +
          '1. Product exists in App Store Connect\n' +
          '2. Product is "Ready to Submit"\n' +
          '3. Product is synced in RevenueCat dashboard';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('📦 Available packages:', this.offerings.current.availablePackages.length);
      console.log('📦 Package details:', JSON.stringify(
        this.offerings.current.availablePackages.map(p => ({
          id: p.identifier,
          productId: p.product.identifier
        })), null, 2
      ));

      // Try to find weekly package first, then fall back to first package
      let packageToPurchase = this.offerings.current.availablePackages.find(
        pkg => pkg.identifier === '$rc_weekly' || pkg.identifier.toLowerCase().includes('weekly')
      );
      
      if (!packageToPurchase) {
        packageToPurchase = this.offerings.current.availablePackages[0];
      }
      
      if (!packageToPurchase) {
        const errorMsg = 'No packages available in current offering.\n' +
          'RevenueCat dashboard shows packages, but SDK cannot access them.\n' +
          'This usually means App Store Connect product is not approved.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🛒 CALLING RevenueCat purchasePackage');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 Package:', packageToPurchase.identifier);
      console.log('📦 Product ID:', packageToPurchase.product.identifier);
      console.log('💰 Price:', packageToPurchase.product.priceString);
      console.log('💰 Price per week:', packageToPurchase.product.priceString);

      // Make the purchase
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PURCHASE SUCCESSFUL');
      console.log('📦 Product:', productIdentifier);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      this.customerInfo = customerInfo;
      
      // Check if premium is active
      console.log('🔍 Checking for entitlement:', ENTITLEMENT_ID);
      console.log('🔑 Available entitlements:', Object.keys(customerInfo.entitlements.active));
      const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';

      if (isPremium) {
        // Save premium status
        await AsyncStorage.setItem(
          STORAGE_KEYS.PREMIUM_STATUS,
          JSON.stringify({
            isPremium: true,
            purchasedAt: new Date().toISOString(),
            productId: productIdentifier,
          })
        );

        // Notify success
        if (callbacks.onLoading) callbacks.onLoading(false);
        if (callbacks.onPurchaseSuccess) {
          callbacks.onPurchaseSuccess();
        } else {
          Alert.alert(
            '🎉 Welcome to Premium!',
            'You now have unlimited access to all features.',
            [{ text: 'Get Started', onPress: () => {} }]
          );
        }

        return { success: true, customerInfo };
      } else {
        const errorMsg = `Purchase succeeded but ${ENTITLEMENT_ID} entitlement not active!\n` +
          `Expected: ${ENTITLEMENT_ID}\n` +
          `Received: ${Object.keys(customerInfo.entitlements.active).join(', ') || 'None'}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ PURCHASE FAILED');
      console.error('Error:', error.message);
      console.error('Error Code:', error.code);
      console.error('User Cancelled:', error.userCancelled);
      console.error('Full Error:', JSON.stringify(error, null, 2));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Send to Sentry
      Sentry.captureException(error, {
        tags: {
          feature: 'iap',
          action: 'purchase'
        },
        extra: {
          errorCode: error.code,
          packageId: packageToPurchase?.identifier,
          offerings: this.offerings,
          customerInfo: this.customerInfo
        }
      });

      if (callbacks.onLoading) callbacks.onLoading(false);

      // Handle user cancellation
      if (error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('ℹ️ User cancelled purchase');
        this.notifyPurchaseFailure('Purchase cancelled');
        return { success: false, error: 'cancelled' };
      }

      // Handle other errors
      this.notifyPurchaseFailure('Purchase failed. Please try again.');
      return { success: false, error: error.message };

    } finally {
      this.processingPurchase = false;
      this.currentCallbacks = null;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(callbacks = {}) {
    // Skip on web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('ℹ️ Restore purchases not supported on web platform');
      Alert.alert(
        'Not Available',
        'Purchase restoration is only available on iOS and Android devices.',
        [{ text: 'OK' }]
      );
      return { success: false, error: 'Platform not supported' };
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 RESTORE PURCHASES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      if (callbacks.onLoading) callbacks.onLoading(true);

      // Check network first
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your connection and try again.');
      }

      // Ensure initialized
      if (!this.isInitialized) {
        console.log('⚙️ Initializing RevenueCat before restore...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Unable to connect to the subscription service. Please try again later.');
        }
      }

      console.log('📱 Restoring purchases from Apple...');
      // Restore purchases
      this.customerInfo = await Purchases.restorePurchases();
      
      console.log('📊 Customer Info after restore:', JSON.stringify(this.customerInfo, null, 2));
      console.log('🔑 Active entitlements:', Object.keys(this.customerInfo.entitlements.active));
      console.log('🔍 Looking for entitlement:', ENTITLEMENT_ID);

      const isPremium = typeof this.customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';

      console.log('✅ Restore complete');
      console.log('💎 Premium active:', isPremium);

      if (isPremium) {
        // Save premium status
        await AsyncStorage.setItem(
          STORAGE_KEYS.PREMIUM_STATUS,
          JSON.stringify({
            isPremium: true,
            restoredAt: new Date().toISOString(),
          })
        );

        // Update subscription type
        await AsyncStorage.setItem('subscriptionType', 'Premium');

        if (callbacks.onLoading) callbacks.onLoading(false);
        if (callbacks.onRestoreSuccess) {
          callbacks.onRestoreSuccess();
        } else {
          Alert.alert(
            '✅ Purchases Restored',
            'Your premium subscription has been restored.',
            [{ text: 'OK' }]
          );
        }

        return { success: true, isPremium: true };
      } else {
        if (callbacks.onLoading) callbacks.onLoading(false);
        
        console.log('⚠️ No active subscriptions found');
        console.log('⚠️ Customer info:', JSON.stringify(this.customerInfo, null, 2));
        
        if (callbacks.onRestoreFailed) {
          callbacks.onRestoreFailed();
        } else {
          Alert.alert(
            'No Purchases Found',
            'No active subscriptions were found.\n\nPlease make sure:\n• You\'re signed in with the correct Apple ID\n• Your subscription is still active\n• You purchased through this app',
            [{ text: 'OK' }]
          );
        }
        return { success: true, isPremium: false };
      }

    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ RESTORE FAILED');
      console.error('Error:', error.message);
      console.error('Code:', error.code);
      console.error('User Cancelled:', error.userCancelled);
      console.error('Full Error:', JSON.stringify(error, null, 2));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Send to Sentry
      Sentry.captureException(error, {
        tags: { feature: 'iap', action: 'restore' },
        extra: { 
          errorMessage: error.message,
          errorCode: error.code,
          userCancelled: error.userCancelled
        }
      });
      
      if (callbacks.onLoading) callbacks.onLoading(false);
      
      // More helpful error message based on error type
      let errorMessage = 'Unable to restore purchases. Please try again.';
      let errorTitle = 'Restore Failed';
      
      if (error.message.includes('network') || error.message.includes('connection') || error.message.includes('internet')) {
        errorTitle = 'No Internet Connection';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (error.message.includes('user') || error.message.includes('Apple ID')) {
        errorTitle = 'Sign In Required';
        errorMessage = 'Please make sure you\'re signed in with the same Apple ID used for the purchase.';
      } else if (error.message.includes('initialize') || error.message.includes('service')) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'OK' }]
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is premium
   */
  async isPremium() {
    // Skip RevenueCat on web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('ℹ️ Premium check skipped on web platform');
      return false;
    }

    try {
      // Try to get from cache first
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_STATUS);
      if (cached) {
        const { isPremium, checkedAt } = JSON.parse(cached);
        const age = Date.now() - new Date(checkedAt).getTime();
        
        // If cache is less than 1 hour old, use it
        if (age < 60 * 60 * 1000) {
          return isPremium;
        }
      }

      // Fetch fresh status
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('⚠️ Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Cancel/Reset subscription - returns user to free tier
   */
  async cancelSubscription() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ CANCELING SUBSCRIPTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Clear all premium-related storage
      await AsyncStorage.multiRemove([
        'subscriptionType',
        'subscriptionExpiresAt',
        STORAGE_KEYS.PREMIUM_STATUS
      ]);

      // Reset trial counter
      await AsyncStorage.setItem('premiumTrialUsedToday', '0');

      console.log('✅ User returned to free tier');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Cancel subscription error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get subscription info
   */
  async getSubscriptionInfo() {
    // Skip on web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('ℹ️ Subscription info not available on web platform');
      return null;
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.offerings || !this.offerings.current) {
        return null;
      }

      const packageToPurchase = this.offerings.current.availablePackages[0];
      
      if (!packageToPurchase) {
        return null;
      }

      return {
        productId: packageToPurchase.product.identifier,
        title: packageToPurchase.product.title,
        description: packageToPurchase.product.description,
        price: packageToPurchase.product.priceString,
        currencyCode: packageToPurchase.product.currencyCode,
      };
    } catch (error) {
      console.error('⚠️ Error getting subscription info:', error);
      return null;
    }
  }

  /**
   * Notify purchase failure
   */
  notifyPurchaseFailure(message) {
    if (this.currentCallbacks?.onPurchaseFailure) {
      this.currentCallbacks.onPurchaseFailure(message);
    } else {
      Alert.alert('Purchase Failed', message, [{ text: 'OK' }]);
    }
  }

  /**
   * Setup app state listener
   */
  setupAppStateListener() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && this.isInitialized) {
        console.log('📱 App became active, refreshing subscription status');
        await this.checkSubscriptionStatus();
      }
    });
  }

  /**
   * Cleanup
   */
  async cleanup() {
    console.log('🧹 Cleaning up RevenueCat IAP Manager...');

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isInitialized = false;
    this.isInitializing = false;
    this.processingPurchase = false;
    this.currentCallbacks = null;

    console.log('✅ Cleanup complete');
  }
}

// Export singleton instance
export default new IAPManager();

