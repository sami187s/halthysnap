/**
 * AI Chat Manager - Track AI Nutritionist message limits
 * Free users: 3 total messages (no reset)
 * Premium users: Unlimited messages
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/asyncStorageConfig';

const MAX_FREE_MESSAGES = 0;

/**
 * Check if user has active premium subscription
 */
export const checkPremiumStatus = async () => {
  try {
    const subscriptionType = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE);
    const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_EXPIRES_AT);

    if (subscriptionType === 'Premium') {
      // Support legacy/test accounts where expiry may not be present.
      if (!expiresAt) {
        return true;
      }
      const expireDate = parseInt(expiresAt, 10);
      return Number.isFinite(expireDate) && expireDate > Date.now();
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking premium status:', error);
    return false;
  }
};

/**
 * Get current AI chat usage for the day
 * @returns {Object} Usage stats with remaining messages
 */
export const getAIChatUsage = async () => {
  try {
    const isPremium = await checkPremiumStatus();
    
    if (isPremium) {
      return {
        sent: 0,
        remaining: Infinity,
        total: Infinity,
        isPremium: true,
        canSend: true
      };
    }

    const sentRaw = await AsyncStorage.getItem(STORAGE_KEYS.AI_CHAT_MESSAGES_SENT);
    const sentCount = sentRaw ? parseInt(sentRaw, 10) : 0;
    const remaining = Math.max(0, MAX_FREE_MESSAGES - sentCount);
    
    return {
      sent: sentCount,
      remaining,
      total: MAX_FREE_MESSAGES,
      isPremium: false,
      canSend: remaining > 0
    };
  } catch (error) {
    console.error('❌ Error getting AI chat usage:', error);
    return {
      sent: 0,
      remaining: 0,
      total: MAX_FREE_MESSAGES,
      isPremium: false,
      canSend: false
    };
  }
};

/**
 * Use one AI chat message (increment counter)
 * @returns {Object} Success status and remaining messages
 */
export const useAIChatMessage = async () => {
  try {
    const usage = await getAIChatUsage();
    
    // Premium users have unlimited access
    if (usage.isPremium) {
      return {
        success: true,
        remaining: Infinity,
        limitReached: false
      };
    }
    
    // Check if limit reached
    if (usage.remaining <= 0) {
      console.log('⚠️ AI chat message limit reached');
      return {
        success: false,
        remaining: 0,
        limitReached: true
      };
    }
    
    // Increment counter
    const newCount = usage.sent + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.AI_CHAT_MESSAGES_SENT, newCount.toString());
    
    const remaining = MAX_FREE_MESSAGES - newCount;
    console.log(`✅ AI chat message used (${newCount}/${MAX_FREE_MESSAGES})`);
    
    return {
      success: true,
      remaining,
      limitReached: remaining <= 0
    };
  } catch (error) {
    console.error('❌ Error using AI chat message:', error);
    return {
      success: false,
      remaining: 0,
      limitReached: true,
      error
    };
  }
};

/**
 * Save chat history to AsyncStorage (Premium only)
 * @param {Array} messages - Array of message objects
 */
export const saveChatHistory = async (messages) => {
  try {
    const isPremium = await checkPremiumStatus();
    
    if (!isPremium) {
      console.log('ℹ️ Chat history save skipped - Premium feature only');
      return { success: false, reason: 'not_premium' };
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify(messages));
    console.log(`💾 Chat history saved (${messages.length} messages)`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving chat history:', error);
    return { success: false, error };
  }
};

/**
 * Load chat history from AsyncStorage (Premium only)
 * @returns {Array} Array of message objects
 */
export const loadChatHistory = async () => {
  try {
    const isPremium = await checkPremiumStatus();
    
    if (!isPremium) {
      return { success: false, reason: 'not_premium', messages: [] };
    }
    
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.AI_CHAT_HISTORY);
    const messages = historyJson ? JSON.parse(historyJson) : [];
    
    console.log(`📖 Chat history loaded (${messages.length} messages)`);
    return { success: true, messages };
  } catch (error) {
    console.error('❌ Error loading chat history:', error);
    return { success: false, messages: [], error };
  }
};

/**
 * Clear chat history
 */
export const clearChatHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AI_CHAT_HISTORY);
    console.log('🗑️ Chat history cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing chat history:', error);
    return { success: false, error };
  }
};

export default {
  checkPremiumStatus,
  getAIChatUsage,
  useAIChatMessage,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
};
