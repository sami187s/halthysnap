/**
 * Debug Trial Limitation - Test Script
 * 
 * This script helps test the trial limitation functionality
 * Run this to reset trial state and test the 2-scan limit
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function debugTrialState() {
  console.log('\n🧪 TRIAL LIMITATION DEBUG');
  console.log('========================');
  
  try {
    // Check current state
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const trialActivated = await AsyncStorage.getItem('premiumTrialActivated');
    const trialUsed = await AsyncStorage.getItem('premiumTrialUsedToday');
    
    console.log('\n📊 Current State:');
    console.log('- Subscription Type:', subscriptionType);
    console.log('- Trial Activated:', trialActivated);
    console.log('- Trial Scans Used:', trialUsed);
    
    console.log('\n🔧 Expected Behavior:');
    console.log('1. Free users: Unlimited basic scans (no AI)');
    console.log('2. Trial users: Exactly 2 scans with AI features');
    console.log('3. After 2 scans: Show subscription options');
    console.log('4. Premium users: Unlimited AI scans');
    
    console.log('\n✅ Test Steps:');
    console.log('1. Click "Try 2 Premium Scans" button');
    console.log('2. Scan first product - should show AI analysis');
    console.log('3. Scan second product - should show AI analysis');
    console.log('4. Scan third product - should show subscription popup');
    
  } catch (error) {
    console.error('❌ Error checking trial state:', error);
  }
}

async function resetTrialState() {
  console.log('\n🔄 Resetting trial state...');
  
  try {
    await AsyncStorage.setItem('subscriptionType', 'Free');
    await AsyncStorage.removeItem('premiumTrialActivated');
    await AsyncStorage.setItem('premiumTrialUsedToday', '0');
    
    console.log('✅ Trial state reset to Free mode');
    
  } catch (error) {
    console.error('❌ Error resetting trial state:', error);
  }
}

async function activateTestTrial() {
  console.log('\n🎯 Activating test trial...');
  
  try {
    await AsyncStorage.setItem('subscriptionType', 'Trial');
    await AsyncStorage.setItem('premiumTrialActivated', 'true');
    await AsyncStorage.setItem('premiumTrialUsedToday', '0');
    
    console.log('✅ Test trial activated (0/2 scans used)');
    
  } catch (error) {
    console.error('❌ Error activating test trial:', error);
  }
}

// Export functions for use in app
module.exports = {
  debugTrialState,
  resetTrialState,
  activateTestTrial
};

// Run debug if called directly
if (require.main === module) {
  debugTrialState();
}