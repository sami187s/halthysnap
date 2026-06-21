import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reset daily counters at midnight
 * This function checks if it's a new day and resets premium trial usage
 */
export const checkAndResetDailyCounters = async () => {
  try {
    const now = new Date();
    const today = now.toDateString(); // "Mon Oct 23 2023" format
    
    const lastResetDate = await AsyncStorage.getItem('lastResetDate');
    
    if (lastResetDate !== today) {
      // It's a new day - reset counters
      console.log('🔄 New day detected - resetting premium trial counters');
      
      // Check if user was previously in trial mode
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const wasInTrialMode = subscriptionType === 'Trial';
      
      await AsyncStorage.multiSet([
        ['lastResetDate', today],
        ['premiumTrialUsedToday', '0'], // Reset daily scan usage to 0
        ['premiumSearchUsedToday', '0'], // Reset daily search usage to 0        ['freeRecommendationUsedToday', '0'], // Reset free recommendation usage to 0        ['subscriptionPromptDismissedToday', 'false'], // Reset subscription prompt dismissal
        // Keep trial activated if user was already in trial mode
        ['premiumTrialActivated', wasInTrialMode ? 'true' : 'false']
      ]);
      
      // If user was in trial mode, keep them in trial mode with fresh scans
      if (wasInTrialMode) {
        console.log('🎯 Daily trial scans refreshed for existing trial user');
      }
      
      console.log('✅ Daily counters reset successfully');
      return true; // Indicates reset occurred
    }
    
    return false; // No reset needed
  } catch (error) {
    console.error('❌ Error resetting daily counters:', error);
    return false;
  }
};

/**
 * Get current premium trial usage for today
 */
export const getPremiumTrialUsage = async () => {
  try {
    // First check if we need to reset
    await checkAndResetDailyCounters();
    
    const premiumTrialActivated = await AsyncStorage.getItem('premiumTrialActivated');
    const premiumTrialUsed = await AsyncStorage.getItem('premiumTrialUsedToday');
    const usedCount = premiumTrialUsed ? parseInt(premiumTrialUsed) : 0;
    
    // If trial not activated, show 2 available
    // If activated, show remaining based on usage
    const remaining = premiumTrialActivated === 'true' ? Math.max(0, 2 - usedCount) : 2;
    
    return {
      used: usedCount,
      remaining: remaining,
      total: 2,
      activated: premiumTrialActivated === 'true'
    };
  } catch (error) {
    console.error('❌ Error getting premium trial usage:', error);
    return {
      used: 0,
      remaining: 2,
      total: 2,
      activated: false
    };
  }
};

/**
 * Use a premium trial scan
 */
/**
 * Get free recommendation usage for today (2x per day for free users)
 */
export const getFreeRecommendationUsage = async () => {
  try {
    await checkAndResetDailyCounters();
    const used = await AsyncStorage.getItem('freeRecommendationUsedToday');
    const usedCount = used ? parseInt(used) : 0;
    return { used: usedCount, remaining: Math.max(0, 2 - usedCount), total: 2 };
  } catch (error) {
    console.error('Error getting free recommendation usage:', error);
    return { used: 0, remaining: 2, total: 2 };
  }
};

/**
 * Use one free recommendation slot
 */
export const useFreeRecommendation = async () => {
  try {
    const usage = await getFreeRecommendationUsage();
    if (usage.remaining <= 0) {
      return { success: false, usage };
    }
    const newUsed = usage.used + 1;
    await AsyncStorage.setItem('freeRecommendationUsedToday', newUsed.toString());
    return { success: true, usage: { used: newUsed, remaining: Math.max(0, 2 - newUsed), total: 2 } };
  } catch (error) {
    console.error('Error using free recommendation:', error);
    return { success: false, usage: { used: 0, remaining: 2, total: 2 } };
  }
};

export const usePremiumTrial = async () => {
  try {
    const usage = await getPremiumTrialUsage();
    
    if (usage.remaining <= 0) {
      return {
        success: false,
        message: 'No premium trials remaining today',
        usage: usage
      };
    }
    
    const newUsed = usage.used + 1;
    await AsyncStorage.setItem('premiumTrialUsedToday', newUsed.toString());
    
    return {
      success: true,
      message: `Used ${newUsed}/2 premium trials today`,
      usage: {
        used: newUsed,
        remaining: Math.max(0, 2 - newUsed),
        total: 2
      }
    };
  } catch (error) {
    console.error('❌ Error using premium trial:', error);
    return {
      success: false,
      message: 'Error tracking premium trial usage',
      usage: { used: 0, remaining: 2, total: 2 }
    };
  }
};