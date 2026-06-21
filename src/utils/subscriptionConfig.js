// Subscription Configuration and Management
// This file manages subscription features and premium access

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_CONFIG = {
  // Product Configuration
  PRODUCT_ID: 'com.healthyscan.app',
  SUBSCRIPTION_GROUP: 'Vee Premium',
  
  // Feature Limits
  FREE_SCAN_LIMIT: 3,
  PREMIUM_SCAN_LIMIT: -1, // -1 = unlimited
  
  // Grace Period
  GRACE_PERIOD_DAYS: 3,
  
  // Trial Configuration
  TRIAL_PERIOD_DAYS: 2,
  
  // Storage Keys
  STORAGE_KEYS: {
    SCAN_COUNT: 'healthyscan_scan_count',
    LAST_RESET_DATE: 'healthyscan_last_reset',
    SUBSCRIPTION_STATUS: 'healthyscan_subscription_status',
    TRIAL_START_DATE: 'healthyscan_trial_start',
    GRACE_PERIOD_START: 'healthyscan_grace_period_start',
    PREMIUM_FEATURES: 'healthyscan_premium_features'
  }
};

class SubscriptionManager {
  constructor() {
    this.subscriptionStatus = null;
    this.premiumFeatures = null;
  }

  // Initialize subscription manager
  async initialize() {
    try {
      await this.loadSubscriptionStatus();
      await this.loadPremiumFeatures();
      console.log('✅ Subscription Manager initialized');
    } catch (error) {
      console.error('❌ Subscription Manager initialization failed:', error);
    }
  }

  // Load subscription status from storage
  async loadSubscriptionStatus() {
    try {
      const status = await AsyncStorage.getItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.SUBSCRIPTION_STATUS);
      this.subscriptionStatus = status ? JSON.parse(status) : {
        isSubscribed: false,
        subscriptionType: null,
        expirationDate: null,
        isInGracePeriod: false
      };
    } catch (error) {
      console.error('Error loading subscription status:', error);
      this.subscriptionStatus = { isSubscribed: false };
    }
  }

  // Save subscription status to storage
  async saveSubscriptionStatus(status) {
    try {
      this.subscriptionStatus = status;
      await AsyncStorage.setItem(
        SUBSCRIPTION_CONFIG.STORAGE_KEYS.SUBSCRIPTION_STATUS,
        JSON.stringify(status)
      );
    } catch (error) {
      console.error('Error saving subscription status:', error);
    }
  }

  // Load premium features configuration
  async loadPremiumFeatures() {
    try {
      const features = await AsyncStorage.getItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.PREMIUM_FEATURES);
      this.premiumFeatures = features ? JSON.parse(features) : {
        unlimitedScans: false,
        advancedAI: false,
        detailedReports: false,
        personalizedRecommendations: false,
        adFree: false,
        prioritySupport: false
      };
    } catch (error) {
      console.error('Error loading premium features:', error);
      this.premiumFeatures = {};
    }
  }

  // Update premium features based on subscription
  async updatePremiumFeatures(isSubscribed) {
    const features = {
      unlimitedScans: isSubscribed,
      advancedAI: isSubscribed,
      detailedReports: isSubscribed,
      personalizedRecommendations: isSubscribed,
      adFree: isSubscribed,
      prioritySupport: isSubscribed
    };

    try {
      this.premiumFeatures = features;
      await AsyncStorage.setItem(
        SUBSCRIPTION_CONFIG.STORAGE_KEYS.PREMIUM_FEATURES,
        JSON.stringify(features)
      );
    } catch (error) {
      console.error('Error updating premium features:', error);
    }
  }

  // Check if user has access to premium features
  hasPremiumAccess() {
    if (!this.subscriptionStatus) return false;
    
    return this.subscriptionStatus.isSubscribed || 
           this.subscriptionStatus.isInGracePeriod ||
           this.isInTrialPeriod();
  }

  // Check if specific feature is available
  hasFeatureAccess(featureName) {
    if (!this.premiumFeatures) return false;
    
    return this.hasPremiumAccess() && this.premiumFeatures[featureName];
  }

  // Check if user is in trial period
  isInTrialPeriod() {
    // Trial logic would be implemented here
    // For now, return false
    return false;
  }

  // Get remaining scan count for free users
  async getRemainingScans() {
    if (this.hasPremiumAccess()) {
      return SUBSCRIPTION_CONFIG.PREMIUM_SCAN_LIMIT; // Unlimited
    }

    try {
      const scanCount = await AsyncStorage.getItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.SCAN_COUNT);
      const lastResetDate = await AsyncStorage.getItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.LAST_RESET_DATE);
      
      const currentDate = new Date().toDateString();
      
      // Reset daily scan count
      if (lastResetDate !== currentDate) {
        await AsyncStorage.setItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.SCAN_COUNT, '0');
        await AsyncStorage.setItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.LAST_RESET_DATE, currentDate);
        return SUBSCRIPTION_CONFIG.FREE_SCAN_LIMIT;
      }

      const usedScans = parseInt(scanCount || '0');
      return Math.max(0, SUBSCRIPTION_CONFIG.FREE_SCAN_LIMIT - usedScans);
    } catch (error) {
      console.error('Error getting remaining scans:', error);
      return SUBSCRIPTION_CONFIG.FREE_SCAN_LIMIT;
    }
  }

  // Increment scan count
  async incrementScanCount() {
    if (this.hasPremiumAccess()) {
      return true; // Premium users have unlimited scans
    }

    try {
      const remainingScans = await this.getRemainingScans();
      
      if (remainingScans <= 0) {
        return false; // No scans remaining
      }

      const scanCount = await AsyncStorage.getItem(SUBSCRIPTION_CONFIG.STORAGE_KEYS.SCAN_COUNT);
      const usedScans = parseInt(scanCount || '0');
      
      await AsyncStorage.setItem(
        SUBSCRIPTION_CONFIG.STORAGE_KEYS.SCAN_COUNT,
        (usedScans + 1).toString()
      );

      return true;
    } catch (error) {
      console.error('Error incrementing scan count:', error);
      return false;
    }
  }

  // Get subscription info for display
  getSubscriptionInfo() {
    return {
      isSubscribed: this.subscriptionStatus?.isSubscribed || false,
      subscriptionType: this.subscriptionStatus?.subscriptionType || null,
      expirationDate: this.subscriptionStatus?.expirationDate || null,
      isInGracePeriod: this.subscriptionStatus?.isInGracePeriod || false,
      hasPremiumAccess: this.hasPremiumAccess(),
      premiumFeatures: this.premiumFeatures || {}
    };
  }

  // Premium feature descriptions for UI
  getPremiumFeatures() {
    return [
      {
        id: 'unlimitedScans',
        title: 'Unlimited Scans',
        description: 'Scan as many products as you want',
        icon: 'infinite',
        enabled: this.hasFeatureAccess('unlimitedScans')
      },
      {
        id: 'advancedAI',
        title: 'Advanced AI Analysis',
        description: 'Get detailed health insights powered by AI',
        icon: 'brain',
        enabled: this.hasFeatureAccess('advancedAI')
      },
      {
        id: 'detailedReports',
        title: 'Detailed Reports',
        description: 'Comprehensive ingredient analysis and scoring',
        icon: 'analytics',
        enabled: this.hasFeatureAccess('detailedReports')
      },
      {
        id: 'personalizedRecommendations',
        title: 'Personal Recommendations',
        description: 'Get suggestions based on your preferences',
        icon: 'person-circle',
        enabled: this.hasFeatureAccess('personalizedRecommendations')
      },
      {
        id: 'adFree',
        title: 'Ad-Free Experience',
        description: 'Enjoy the app without any advertisements',
        icon: 'remove-circle',
        enabled: this.hasFeatureAccess('adFree')
      },
      {
        id: 'prioritySupport',
        title: 'Priority Support',
        description: 'Get faster responses from our support team',
        icon: 'headset',
        enabled: this.hasFeatureAccess('prioritySupport')
      }
    ];
  }
}

// Export singleton instance
const subscriptionManager = new SubscriptionManager();

export { subscriptionManager, SUBSCRIPTION_CONFIG };
export default subscriptionManager;