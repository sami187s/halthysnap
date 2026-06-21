/**
 * AsyncStorage Configuration
 * Ensures data persistence and proper storage management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys - centralized for consistency
export const STORAGE_KEYS = {
  // Subscription
  PREMIUM_STATUS: 'premiumStatus',
  SUBSCRIPTION_TYPE: 'subscriptionType',
  SUBSCRIPTION_EXPIRES_AT: 'subscriptionExpiresAt',
  ORIGINAL_TRANSACTION_ID: 'originalTransactionId',
  LAST_RECEIPT_VALIDATION: 'lastReceiptValidation',
  
  // Trial
  PREMIUM_TRIAL_ACTIVATED: 'premiumTrialActivated',
  PREMIUM_TRIAL_USED_TODAY: 'premiumTrialUsedToday',
  SUBSCRIPTION_PROMPT_DISMISSED_TODAY: 'subscriptionPromptDismissedToday',
  
  // App State
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
  AFFILIATE_SOURCE: 'affiliateSource',
  
  // Premium Features
  SCAN_HISTORY: 'scan_history',
  AI_CHAT_MESSAGES_SENT: 'aiChatMessagesSent',
  AI_CHAT_LAST_RESET: 'aiChatLastReset',
  AI_CHAT_HISTORY: 'aiChatHistory',
  
  // Cache
  LAST_SUBSCRIPTION_CHECK: 'lastSubscriptionCheck',
};

/**
 * Store configuration with error handling
 */
export const StorageConfig = {
  /**
   * Set item with error handling
   */
  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      console.log(`📦 Stored: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Storage error (set ${key}):`, error);
      return false;
    }
  },

  /**
   * Get item with error handling
   */
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        console.log(`📦 Retrieved: ${key}`);
      }
      return value;
    } catch (error) {
      console.error(`❌ Storage error (get ${key}):`, error);
      return null;
    }
  },

  /**
   * Remove item with error handling
   */
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Storage error (remove ${key}):`, error);
      return false;
    }
  },

  /**
   * Set multiple items at once
   */
  async multiSet(keyValuePairs) {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      console.log(`📦 Batch stored: ${keyValuePairs.length} items`);
      return true;
    } catch (error) {
      console.error('❌ Storage error (multiSet):', error);
      return false;
    }
  },

  /**
   * Remove multiple items at once
   */
  async multiRemove(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
      console.log(`🗑️ Batch removed: ${keys.length} items`);
      return true;
    } catch (error) {
      console.error('❌ Storage error (multiRemove):', error);
      return false;
    }
  },

  /**
   * Clear all app data (use with caution!)
   */
  async clearAll() {
    try {
      await AsyncStorage.clear();
      console.log('🗑️ All storage cleared');
      return true;
    } catch (error) {
      console.error('❌ Storage error (clear):', error);
      return false;
    }
  },

  /**
   * Get all keys in storage
   */
  async getAllKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log(`📋 Total keys in storage: ${keys.length}`);
      return keys;
    } catch (error) {
      console.error('❌ Storage error (getAllKeys):', error);
      return [];
    }
  },

  /**
   * Check storage size (for debugging)
   */
  async checkStorageSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      items.forEach(([key, value]) => {
        totalSize += (key.length + (value?.length || 0));
      });
      
      console.log(`💾 Storage size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`📊 Items count: ${items.length}`);
      
      return {
        sizeKB: (totalSize / 1024).toFixed(2),
        itemCount: items.length,
        items: items.map(([key]) => key)
      };
    } catch (error) {
      console.error('❌ Storage error (checkSize):', error);
      return null;
    }
  },

  /**
   * Backup subscription data
   */
  async backupSubscriptionData() {
    try {
      const data = {
        subscriptionType: await this.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE),
        expiresAt: await this.getItem(STORAGE_KEYS.SUBSCRIPTION_EXPIRES_AT),
        transactionId: await this.getItem(STORAGE_KEYS.ORIGINAL_TRANSACTION_ID),
        lastValidation: await this.getItem(STORAGE_KEYS.LAST_RECEIPT_VALIDATION),
        timestamp: Date.now()
      };
      
      await this.setItem('subscriptionBackup', JSON.stringify(data));
      console.log('✅ Subscription data backed up');
      return true;
    } catch (error) {
      console.error('❌ Backup error:', error);
      return false;
    }
  },

  /**
   * Restore subscription data from backup
   */
  async restoreSubscriptionData() {
    try {
      const backupStr = await this.getItem('subscriptionBackup');
      if (!backupStr) {
        console.log('ℹ️ No backup found');
        return false;
      }
      
      const backup = JSON.parse(backupStr);
      
      // Only restore if backup is recent (within 7 days)
      const backupAge = Date.now() - backup.timestamp;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (backupAge > sevenDays) {
        console.log('⚠️ Backup too old, not restoring');
        return false;
      }
      
      const pairs = [];
      if (backup.subscriptionType) pairs.push([STORAGE_KEYS.SUBSCRIPTION_TYPE, backup.subscriptionType]);
      if (backup.expiresAt) pairs.push([STORAGE_KEYS.SUBSCRIPTION_EXPIRES_AT, backup.expiresAt]);
      if (backup.transactionId) pairs.push([STORAGE_KEYS.ORIGINAL_TRANSACTION_ID, backup.transactionId]);
      if (backup.lastValidation) pairs.push([STORAGE_KEYS.LAST_RECEIPT_VALIDATION, backup.lastValidation]);
      
      if (pairs.length > 0) {
        await this.multiSet(pairs);
        console.log('✅ Subscription data restored from backup');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Restore error:', error);
      return false;
    }
  },

  /**
   * Verify data integrity
   */
  async verifyIntegrity() {
    try {
      const keys = await this.getAllKeys();
      const invalidKeys = [];
      
      for (const key of keys) {
        const value = await this.getItem(key);
        if (value === null || value === 'null' || value === 'undefined') {
          invalidKeys.push(key);
        }
      }
      
      if (invalidKeys.length > 0) {
        console.warn(`⚠️ Found ${invalidKeys.length} invalid keys:`, invalidKeys);
        // Clean up invalid keys
        await this.multiRemove(invalidKeys);
        console.log('🧹 Cleaned up invalid keys');
      } else {
        console.log('✅ Storage integrity verified');
      }
      
      return {
        valid: invalidKeys.length === 0,
        invalidKeys,
        totalKeys: keys.length
      };
    } catch (error) {
      console.error('❌ Integrity check error:', error);
      return null;
    }
  }
};

// Export singleton instance
export default StorageConfig;
