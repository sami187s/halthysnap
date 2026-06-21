// Simple subscription manager for testing
export const SimpleSubscriptionManager = {
  // Current tier stored in memory for demo
  currentTier: 'free',
  
  // Available tiers
  TIERS: {
    FREE: 'free',      // 2 scans per day, no AI
    PREMIUM: 'premium' // Unlimited scans + AI
  },
  
  // Get current subscription tier
  getTier() {
    return this.currentTier;
  },
  
  // Set subscription tier
  setTier(tier) {
    this.currentTier = tier;
    console.log(`🔄 Subscription changed to: ${tier}`);
    return true;
  },
  
  // Check if premium
  isPremium() {
    return this.currentTier === this.TIERS.PREMIUM;
  },
  
  // Check if can use AI
  canUseAI() {
    return this.currentTier === this.TIERS.PREMIUM;
  },
  
  // Get subscription info for UI
  getSubscriptionInfo() {
    const tier = this.getTier();
    return {
      tier,
      canUseAI: this.canUseAI(),
      isPremium: this.isPremium(),
      isFree: tier === this.TIERS.FREE,
      remainingScans: tier === this.TIERS.PREMIUM ? 999 : 2,
      dailyLimit: tier === this.TIERS.PREMIUM ? 999 : 2
    };
  }
};