  expo start /**
 * Debug script to test Search & Scan Limits
 * 
 * This script helps you test the new search/scan limit system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Test functions for debugging search/scan limits

export const debugSearchLimits = async () => {
  console.log('\n=== 🔍 SEARCH LIMITS DEBUG ===\n');
  
  try {
    // Get current values
    const searchUsed = await AsyncStorage.getItem('premiumSearchUsedToday');
    const scanUsed = await AsyncStorage.getItem('premiumTrialUsedToday');
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const lastReset = await AsyncStorage.getItem('lastResetDate');
    
    console.log('📊 Current Status:');
    console.log(`   Subscription: ${subscriptionType || 'Not set'}`);
    console.log(`   Search Usage: ${searchUsed || '0'}/2`);
    console.log(`   Scan Usage: ${scanUsed || '0'}/2`);
    console.log(`   Last Reset: ${lastReset || 'Never'}`);
    
    // Calculate remaining
    const searchRemaining = Math.max(0, 2 - parseInt(searchUsed || '0'));
    const scanRemaining = Math.max(0, 2 - parseInt(scanUsed || '0'));
    
    console.log('\n✨ Remaining Premium Features:');
    console.log(`   Premium Searches: ${searchRemaining}`);
    console.log(`   Premium Scans: ${scanRemaining}`);
    
    if (searchRemaining === 0) {
      console.log('\n⚠️ Search limit reached - Free search mode active');
    }
    if (scanRemaining === 0) {
      console.log('\n⚠️ Scan limit reached - Free scan mode active');
    }
    
    console.log('\n=== END DEBUG ===\n');
    
    return {
      searchUsed: parseInt(searchUsed || '0'),
      scanUsed: parseInt(scanUsed || '0'),
      searchRemaining,
      scanRemaining,
      subscriptionType
    };
  } catch (error) {
    console.error('❌ Error debugging limits:', error);
    return null;
  }
};

// Reset search usage (for testing)
export const resetSearchUsage = async () => {
  try {
    await AsyncStorage.setItem('premiumSearchUsedToday', '0');
    console.log('✅ Search usage reset to 0');
    return true;
  } catch (error) {
    console.error('❌ Error resetting search usage:', error);
    return false;
  }
};

// Reset scan usage (for testing)
export const resetScanUsage = async () => {
  try {
    await AsyncStorage.setItem('premiumTrialUsedToday', '0');
    console.log('✅ Scan usage reset to 0');
    return true;
  } catch (error) {
    console.error('❌ Error resetting scan usage:', error);
    return false;
  }
};

// Reset both (for testing)
export const resetAllUsage = async () => {
  try {
    await AsyncStorage.multiSet([
      ['premiumSearchUsedToday', '0'],
      ['premiumTrialUsedToday', '0']
    ]);
    console.log('✅ All usage counters reset to 0');
    return true;
  } catch (error) {
    console.error('❌ Error resetting all usage:', error);
    return false;
  }
};

// Simulate using a search
export const simulateSearch = async () => {
  try {
    const current = await AsyncStorage.getItem('premiumSearchUsedToday');
    const newValue = (parseInt(current || '0') + 1).toString();
    await AsyncStorage.setItem('premiumSearchUsedToday', newValue);
    console.log(`✅ Search simulated. Now at ${newValue}/2`);
    return parseInt(newValue);
  } catch (error) {
    console.error('❌ Error simulating search:', error);
    return null;
  }
};

// Simulate using a scan
export const simulateScan = async () => {
  try {
    const current = await AsyncStorage.getItem('premiumTrialUsedToday');
    const newValue = (parseInt(current || '0') + 1).toString();
    await AsyncStorage.setItem('premiumTrialUsedToday', newValue);
    console.log(`✅ Scan simulated. Now at ${newValue}/2`);
    return parseInt(newValue);
  } catch (error) {
    console.error('❌ Error simulating scan:', error);
    return null;
  }
};

// Set subscription type (for testing)
export const setTestSubscription = async (type = 'Free') => {
  try {
    if (!['Free', 'Trial', 'Premium'].includes(type)) {
      console.error('❌ Invalid subscription type. Use: Free, Trial, or Premium');
      return false;
    }
    await AsyncStorage.setItem('subscriptionType', type);
    console.log(`✅ Subscription set to: ${type}`);
    return true;
  } catch (error) {
    console.error('❌ Error setting subscription:', error);
    return false;
  }
};

// Test the complete flow
export const testCompleteFlow = async () => {
  console.log('\n=== 🧪 TESTING COMPLETE FLOW ===\n');
  
  // 1. Reset everything
  console.log('1️⃣ Resetting counters...');
  await resetAllUsage();
  await setTestSubscription('Free');
  
  // 2. Check initial status
  console.log('\n2️⃣ Initial status:');
  await debugSearchLimits();
  
  // 3. Simulate first search
  console.log('\n3️⃣ Simulating first search...');
  await simulateSearch();
  await debugSearchLimits();
  
  // 4. Simulate second search
  console.log('\n4️⃣ Simulating second search...');
  await simulateSearch();
  await debugSearchLimits();
  
  // 5. Simulate third search (should be free)
  console.log('\n5️⃣ Simulating third search (should be FREE mode)...');
  await simulateSearch();
  await debugSearchLimits();
  
  console.log('\n=== END TEST ===\n');
};

// Quick commands for console
export const debugCommands = {
  status: debugSearchLimits,
  reset: resetAllUsage,
  resetSearch: resetSearchUsage,
  resetScan: resetScanUsage,
  search: simulateSearch,
  scan: simulateScan,
  setPremium: () => setTestSubscription('Premium'),
  setFree: () => setTestSubscription('Free'),
  test: testCompleteFlow
};

// Usage in console:
// import { debugCommands } from './debug-search-limits';
// await debugCommands.status();
// await debugCommands.search();
// await debugCommands.reset();
