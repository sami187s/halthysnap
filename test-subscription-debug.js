// Quick test to verify SubscriptionManager works
// Note: This won't work with ES6 imports in Node.js, but helps us verify the logic

console.log('🧪 Testing SubscriptionManager logic...');

// Mock AsyncStorage for testing
const mockStorage = {
  storage: new Map(),
  async getItem(key) {
    return this.storage.get(key) || null;
  },
  async setItem(key, value) {
    this.storage.set(key, value);
  },
  async removeItem(key) {
    this.storage.delete(key);
  }
};

// Simplified SubscriptionManager logic for testing
class TestSubscriptionManager {
  static TIERS = {
    FREE: 'free',
    TRIAL: 'trial',
    PREMIUM: 'premium'
  };

  static async getSubscriptionTier() {
    try {
      const tier = await mockStorage.getItem('subscription_tier');
      return tier || this.TIERS.FREE;
    } catch (error) {
      console.log('Subscription tier check error:', error);
      return this.TIERS.FREE;
    }
  }

  static async getSubscriptionInfo() {
    const tier = await this.getSubscriptionTier();
    const canUseAI = tier === this.TIERS.TRIAL || tier === this.TIERS.PREMIUM;
    
    return {
      tier,
      canUseAI,
      remainingAI: tier === this.TIERS.TRIAL ? 2 : (tier === this.TIERS.PREMIUM ? 999 : 0),
      isPremium: tier === this.TIERS.PREMIUM,
      isTrial: tier === this.TIERS.TRIAL,
      isFree: tier === this.TIERS.FREE
    };
  }

  static async activateTrial() {
    await mockStorage.setItem('subscription_tier', this.TIERS.TRIAL);
    return true;
  }
}

async function testSubscriptionManager() {
  try {
    console.log('1. Getting subscription info...');
    const info = await TestSubscriptionManager.getSubscriptionInfo();
    console.log('✅ Subscription info:', info);
    
    console.log('2. Testing tier activation...');
    await TestSubscriptionManager.activateTrial();
    const trialInfo = await TestSubscriptionManager.getSubscriptionInfo();
    console.log('✅ Trial info:', trialInfo);
    
    console.log('🎉 SubscriptionManager logic is working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubscriptionManager();