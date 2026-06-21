// Smart Subscription Flow Manager
// Handles when to show upgrade prompts vs allowing free usage

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_FLOW_CONFIG = {
  // Storage keys
  USER_SUBSCRIPTION_PREFERENCE: 'user_subscription_preference',
  UPGRADE_PROMPT_COUNT: 'upgrade_prompt_count',
  LAST_UPGRADE_PROMPT: 'last_upgrade_prompt',
  
  // Flow settings
  MAX_PROMPTS_PER_DAY: 2, // Only show upgrade prompt 2 times per day
  PROMPT_COOLDOWN_HOURS: 4, // Wait 4 hours between prompts
  FREE_SCANS_BEFORE_PROMPT: 3, // Show prompt after 3 free scans
};

class SubscriptionFlowManager {
  constructor() {
    this.userPreference = null;
    this.promptCount = 0;
    this.lastPromptTime = null;
  }

  // Initialize the flow manager
  async initialize() {
    try {
      const preference = await AsyncStorage.getItem(SUBSCRIPTION_FLOW_CONFIG.USER_SUBSCRIPTION_PREFERENCE);
      const promptCount = await AsyncStorage.getItem(SUBSCRIPTION_FLOW_CONFIG.UPGRADE_PROMPT_COUNT);
      const lastPrompt = await AsyncStorage.getItem(SUBSCRIPTION_FLOW_CONFIG.LAST_UPGRADE_PROMPT);

      this.userPreference = preference ? JSON.parse(preference) : {
        wantsUpgrade: null, // null = not decided, true = interested, false = not interested
        dismissedAt: null,
        totalScansUsed: 0
      };

      this.promptCount = parseInt(promptCount || '0');
      this.lastPromptTime = lastPrompt ? new Date(JSON.parse(lastPrompt)) : null;

      // Reset daily counters if it's a new day
      await this.resetDailyCountersIfNeeded();

    } catch (error) {
      console.error('SubscriptionFlowManager initialization error:', error);
    }
  }

  // Reset counters if it's a new day
  async resetDailyCountersIfNeeded() {
    const today = new Date().toDateString();
    const lastPromptDate = this.lastPromptTime?.toDateString();

    if (lastPromptDate !== today) {
      this.promptCount = 0;
      await AsyncStorage.setItem(SUBSCRIPTION_FLOW_CONFIG.UPGRADE_PROMPT_COUNT, '0');
    }
  }

  // Check if we should show upgrade prompt
  async shouldShowUpgradePrompt(currentScanCount = 0) {
    // Never show if user is already subscribed
    if (await this.isUserSubscribed()) {
      return false;
    }

    // Don't show if user explicitly dismissed recently
    if (this.userPreference.wantsUpgrade === false) {
      const dismissedAt = new Date(this.userPreference.dismissedAt);
      const hoursSinceDismissal = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
      
      // Wait 24 hours before showing again if user dismissed
      if (hoursSinceDismissal < 24) {
        return false;
      }
    }

    // Check daily prompt limits
    if (this.promptCount >= SUBSCRIPTION_FLOW_CONFIG.MAX_PROMPTS_PER_DAY) {
      return false;
    }

    // Check cooldown period
    if (this.lastPromptTime) {
      const hoursSinceLastPrompt = (Date.now() - this.lastPromptTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastPrompt < SUBSCRIPTION_FLOW_CONFIG.PROMPT_COOLDOWN_HOURS) {
        return false;
      }
    }

    // Show prompt after user has used some free scans
    if (currentScanCount >= SUBSCRIPTION_FLOW_CONFIG.FREE_SCANS_BEFORE_PROMPT) {
      return true;
    }

    return false;
  }

  // Record that upgrade prompt was shown
  async recordUpgradePromptShown() {
    this.promptCount++;
    this.lastPromptTime = new Date();

    await AsyncStorage.setItem(
      SUBSCRIPTION_FLOW_CONFIG.UPGRADE_PROMPT_COUNT, 
      this.promptCount.toString()
    );
    
    await AsyncStorage.setItem(
      SUBSCRIPTION_FLOW_CONFIG.LAST_UPGRADE_PROMPT, 
      JSON.stringify(this.lastPromptTime)
    );
  }

  // User expressed interest in upgrading
  async userInterestedInUpgrade() {
    this.userPreference = {
      ...this.userPreference,
      wantsUpgrade: true,
      dismissedAt: null
    };

    await AsyncStorage.setItem(
      SUBSCRIPTION_FLOW_CONFIG.USER_SUBSCRIPTION_PREFERENCE,
      JSON.stringify(this.userPreference)
    );
  }

  // User dismissed upgrade (not interested)
  async userDismissedUpgrade() {
    this.userPreference = {
      ...this.userPreference,
      wantsUpgrade: false,
      dismissedAt: new Date().toISOString()
    };

    await AsyncStorage.setItem(
      SUBSCRIPTION_FLOW_CONFIG.USER_SUBSCRIPTION_PREFERENCE,
      JSON.stringify(this.userPreference)
    );
  }

  // Increment free scan usage
  async incrementFreeUsage() {
    this.userPreference = {
      ...this.userPreference,
      totalScansUsed: (this.userPreference.totalScansUsed || 0) + 1
    };

    await AsyncStorage.setItem(
      SUBSCRIPTION_FLOW_CONFIG.USER_SUBSCRIPTION_PREFERENCE,
      JSON.stringify(this.userPreference)
    );
  }

  // Check if user is subscribed (integration with your IAP system)
  async isUserSubscribed() {
    try {
      // Primary check — matches what iapManager.js writes on purchase
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      if (subscriptionType === 'Premium') {
        const expiresAt = await AsyncStorage.getItem('subscriptionExpiresAt');
        if (!expiresAt) return true; // Legacy/test account without expiry
        const expireDate = parseInt(expiresAt, 10);
        return Number.isFinite(expireDate) && expireDate > Date.now();
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get upgrade prompt configuration
  getUpgradePromptConfig() {
    return {
      shouldShowAfterScan: this.userPreference.wantsUpgrade !== false,
      allowFreeUsage: true,
      promptType: this.userPreference.totalScansUsed > 10 ? 'power_user' : 'new_user'
    };
  }

  // Smart upgrade flow - determines what to show after scan
  async getPostScanAction(scanCount = 0) {
    const isSubscribed = await this.isUserSubscribed();
    
    if (isSubscribed) {
      return { action: 'continue', message: null };
    }

    const shouldPrompt = await this.shouldShowUpgradePrompt(scanCount);
    
    if (shouldPrompt) {
      await this.recordUpgradePromptShown();
      return { 
        action: 'show_upgrade_prompt', 
        message: 'upgrade_suggestion',
        allowDismiss: true
      };
    }

    // Allow free usage without prompts
    return { 
      action: 'continue_free', 
      message: 'free_scan_complete'
    };
  }

  // Reset user preferences (for testing or user request)
  async resetUserPreferences() {
    await AsyncStorage.multiRemove([
      SUBSCRIPTION_FLOW_CONFIG.USER_SUBSCRIPTION_PREFERENCE,
      SUBSCRIPTION_FLOW_CONFIG.UPGRADE_PROMPT_COUNT,
      SUBSCRIPTION_FLOW_CONFIG.LAST_UPGRADE_PROMPT
    ]);
    
    await this.initialize();
  }
}

// Export singleton instance
const subscriptionFlowManager = new SubscriptionFlowManager();

export { subscriptionFlowManager, SUBSCRIPTION_FLOW_CONFIG };
export default subscriptionFlowManager;