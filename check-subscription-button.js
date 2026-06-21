// Script to reset subscription to Free to see the subscription button
console.log('🔧 Resetting subscription to Free mode...');

// This script would be run in React Native debugger console or you can add it temporarily to your app
// To reset subscription status and see the subscription button:

// AsyncStorage.setItem('subscriptionType', 'Free');
// AsyncStorage.removeItem('premiumTrialActivated');
// AsyncStorage.setItem('premiumTrialUsedToday', '0');

console.log('✅ To see the subscription button:');
console.log('1. Open your app');
console.log('2. Go to subscription page');
console.log('3. If you see "You\'re Premium!" - you need to reset to Free first');
console.log('4. The subscription button should show: "Subscribe to Premium"');
console.log('   with "$1.99/week • Cancel anytime" underneath');

console.log('🎯 SUBSCRIPTION BUTTON LOCATION:');
console.log('- Should be a large green button');
console.log('- Has credit card icon 💳');
console.log('- Says "Subscribe to Premium"');
console.log('- Shows pricing on the button');
console.log('- Only visible when NOT already premium');