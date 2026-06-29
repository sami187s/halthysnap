/**
 * History Manager - Premium-Only Scan History
 * Stores up to 100 scanned products locally for premium subscribers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/asyncStorageConfig';

const MAX_HISTORY_ITEMS = 1000; // Maximum number of scans to keep
const MAX_HISTORY_AGE_DAYS = 7; // Auto-delete scans older than 7 days (free/trial only)
const MAX_HISTORY_AGE_MS = MAX_HISTORY_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Clean up old history items (older than 7 days)
 * @param {Array} history - Current history array
 * @returns {Array} Cleaned history array
 */
const cleanupOldHistory = (history) => {
  const now = Date.now();
  const cleaned = history.filter(item => {
    const age = now - item.scannedAt;
    return age < MAX_HISTORY_AGE_MS;
  });
  
  const removed = history.length - cleaned.length;
  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} old scans (older than ${MAX_HISTORY_AGE_DAYS} days)`);
  }
  
  return cleaned;
};

/**
 * Check if user has active premium subscription
 */
export const checkPremiumStatus = async () => {
  try {
    // Developer / free-premium override
    const freePremium = await AsyncStorage.getItem('freePremiumGranted');
    if (freePremium === 'true') return true;

    const subscriptionType = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE);
    const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_EXPIRES_AT);

    if (subscriptionType === 'Premium') {
      // Support legacy/test accounts where expiry may not be present.
      if (!expiresAt) return true;
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
 * Save a scanned product to history (Premium only)
 * @param {Object} product - Product data to save
 * @param {string} product.barcode - Product barcode
 * @param {string} product.productName - Product name
 * @param {string} product.productImage - Product image URL
 * @param {string} product.productType - 'food' or 'cosmetic'
 * @param {number} product.score - Health score (0-100)
 * @param {string} product.ingredients - Ingredients list
 * @param {string} product.source - Data source (Open Food Facts, etc)
 */
export const saveToHistory = async (product) => {
  try {
    // Validate required fields first
    if (!product.barcode || !product.productName) {
      console.warn('⚠️ Invalid product data - missing barcode or name');
      return { success: false, reason: 'invalid_data' };
    }

    const isPremium = await checkPremiumStatus();

    // Get existing history
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    let history = historyJson ? JSON.parse(historyJson) : [];

    // Clean up old scans (older than 7 days) for non-premium users
    if (!isPremium) {
      history = cleanupOldHistory(history);
    }

    // Check if product already exists (update if so)
    const existingIndex = history.findIndex(item => item.barcode === product.barcode);
    
    const historyItem = {
      id: existingIndex >= 0 ? history[existingIndex].id : `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode: product.barcode,
      productName: product.productName,
      productImage: product.productImage || null,
      productType: product.productType || 'food',
      score: product.score || 0,
      scannedAt: Date.now(),
      ingredients: product.ingredients || '',
      source: product.source || 'Unknown'
    };

    if (existingIndex >= 0) {
      // Update existing item (move to front)
      history.splice(existingIndex, 1);
      history.unshift(historyItem);
      console.log('📝 Updated existing scan in history');
    } else {
      // Add new item to front
      history.unshift(historyItem);
      console.log('💾 Added new scan to history');
    }

    // Enforce limit — premium gets 1000, free gets 20
    const limit = isPremium ? MAX_HISTORY_ITEMS : 20;
    if (history.length > limit) {
      history = history.slice(0, limit);
      console.log(`✂️ Trimmed history to ${limit} items`);
    }

    // Save updated history
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
    console.log(`✅ History saved (${history.length} items)`);

    return { success: true, count: history.length };
  } catch (error) {
    console.error('❌ Error saving to history:', error);
    return { success: false, reason: 'storage_error', error };
  }
};

/**
 * Get scan history (Premium only)
 * @returns {Array} Array of scan history items, newest first
 */
export const getHistory = async () => {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    console.log(`📖 Retrieved ${history.length} history items`);
    return { success: true, data: history };
  } catch (error) {
    console.error('❌ Error retrieving history:', error);
    return { success: false, reason: 'storage_error', data: [], error };
  }
};

/**
 * Delete a specific history item
 * @param {string} itemId - ID of the item to delete
 */
export const deleteHistoryItem = async (itemId) => {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    let history = historyJson ? JSON.parse(historyJson) : [];

    const filteredHistory = history.filter(item => item.id !== itemId);
    
    if (filteredHistory.length === history.length) {
      console.warn('⚠️ Item not found in history');
      return { success: false, reason: 'not_found' };
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(filteredHistory));
    console.log(`🗑️ Deleted history item (${filteredHistory.length} remaining)`);

    return { success: true, count: filteredHistory.length };
  } catch (error) {
    console.error('❌ Error deleting history item:', error);
    return { success: false, reason: 'storage_error', error };
  }
};

/**
 * Clear all history
 */
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
    console.log('🗑️ History cleared');

    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    return { success: false, reason: 'storage_error', error };
  }
};

/**
 * Search history by product name
 * @param {string} query - Search query
 */
export const searchHistory = async (query) => {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history = historyJson ? JSON.parse(historyJson) : [];

    if (!query || query.trim() === '') {
      return { success: true, data: history };
    }

    const lowerQuery = query.toLowerCase();
    const filtered = history.filter(item => 
      item.productName.toLowerCase().includes(lowerQuery) ||
      item.barcode.includes(query)
    );

    console.log(`🔍 Found ${filtered.length} items matching "${query}"`);
    return { success: true, data: filtered };
  } catch (error) {
    console.error('❌ Error searching history:', error);
    return { success: false, reason: 'storage_error', data: [], error };
  }
};

/**
 * Get history statistics
 */
export const getHistoryStats = async () => {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history = historyJson ? JSON.parse(historyJson) : [];

    const stats = {
      totalScans: history.length,
      foodScans: history.filter(item => item.productType === 'food').length,
      cosmeticScans: history.filter(item => item.productType === 'cosmetic').length,
      averageScore: history.length > 0 
        ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
        : 0,
      healthyCount: history.filter(item => item.score >= 70).length,
      moderateCount: history.filter(item => item.score >= 40 && item.score < 70).length,
      riskyCount: history.filter(item => item.score < 40).length,
    };

    return { success: true, stats };
  } catch (error) {
    console.error('❌ Error getting history stats:', error);
    return { success: false, reason: 'storage_error', error };
  }
};

export default {
  checkPremiumStatus,
  saveToHistory,
  getHistory,
  deleteHistoryItem,
  clearHistory,
  searchHistory,
  getHistoryStats,
};
