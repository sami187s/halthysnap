/**
 * TRIAL COUNTER TEST SCRIPT
 * =========================
 * 
 * Use this to test and debug the trial counter step by step
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Reset trial to 0 usage
export const resetTrial = async () => {
  try {
    await AsyncStorage.setItem('subscriptionType', 'Free');
    await AsyncStorage.removeItem('premiumTrialActivated');
    await AsyncStorage.setItem('premiumTrialUsedToday', '0');
    console.log('✅ Trial reset to Free mode');
  } catch (error) {
    console.error('❌ Error resetting trial:', error);
  }
};

// Activate trial mode
export const activateTrial = async () => {
  try {
    await AsyncStorage.setItem('subscriptionType', 'Trial');
    await AsyncStorage.setItem('premiumTrialActivated', 'true');
    await AsyncStorage.setItem('premiumTrialUsedToday', '0');
    console.log('✅ Trial activated - 0/2 scans used');
  } catch (error) {
    console.error('❌ Error activating trial:', error);
  }
};

// Check current trial status
export const checkTrialStatus = async () => {
  try {
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const trialActivated = await AsyncStorage.getItem('premiumTrialActivated');
    const trialUsed = await AsyncStorage.getItem('premiumTrialUsedToday');
    
    console.log('📊 Current Trial Status:');
    console.log('- Subscription Type:', subscriptionType);
    console.log('- Trial Activated:', trialActivated);
    console.log('- Scans Used:', trialUsed || '0');
    
    return {
      subscriptionType,
      trialActivated,
      trialUsed: parseInt(trialUsed || '0')
    };
  } catch (error) {
    console.error('❌ Error checking trial status:', error);
  }
};

// Manually increment trial usage (for testing)
export const incrementTrialUsage = async () => {
  try {
    const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
    const used = parseInt(usedStr || '0');
    const newUsed = used + 1;
    
    await AsyncStorage.setItem('premiumTrialUsedToday', newUsed.toString());
    console.log(`📈 Trial usage incremented to ${newUsed}/2`);
    
    return newUsed;
  } catch (error) {
    console.error('❌ Error incrementing trial usage:', error);
  }
};

// Test sequence
export const runTrialTest = async () => {
  console.log('\n🧪 STARTING TRIAL TEST SEQUENCE');
  console.log('================================');
  
  // Step 1: Reset to free
  await resetTrial();
  await checkTrialStatus();
  
  // Step 2: Activate trial
  await activateTrial();
  await checkTrialStatus();
  
  // Step 3: Simulate first scan
  console.log('\n📱 Simulating first scan...');
  await incrementTrialUsage();
  await checkTrialStatus();
  
  // Step 4: Simulate second scan
  console.log('\n📱 Simulating second scan...');
  await incrementTrialUsage();
  await checkTrialStatus();
  
  // Step 5: Try third scan (should be blocked)
  console.log('\n📱 Simulating third scan (should be blocked)...');
  const status = await checkTrialStatus();
  if (status.trialUsed >= 2) {
    console.log('✅ TRIAL EXHAUSTED - No more scans allowed');
  } else {
    console.log('❌ ERROR - Trial should be exhausted');
  }
  
  console.log('\n✅ Trial test sequence complete!');
};

// Quick debug function to call from React Native debugger
export const debugTrial = () => {
  console.log('🔍 Use these functions in debugger:');
  console.log('- resetTrial()');
  console.log('- activateTrial()');
  console.log('- checkTrialStatus()');
  console.log('- incrementTrialUsage()');
  console.log('- runTrialTest()');
};

// Auto-run when imported
if (__DEV__) {
  console.log('🧪 Trial Test Script Loaded');
  debugTrial();
}