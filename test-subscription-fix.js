// Quick test to check subscription functionality
import AsyncStorage from '@react-native-async-storage/async-storage';

const testSubscription = async () => {
  console.log('=== SUBSCRIPTION TEST ===');
  
  // Test 1: Set Premium
  console.log('Setting Premium...');
  await AsyncStorage.setItem('subscriptionType', 'Premium');
  
  // Test 2: Read back
  const subscriptionType = await AsyncStorage.getItem('subscriptionType');
  console.log('Read subscription:', subscriptionType);
  
  // Test 3: Check logic
  const premium = subscriptionType === 'Premium';
  console.log('Is Premium:', premium);
  
  // Test 4: Set Free
  console.log('\nSetting Free...');
  await AsyncStorage.setItem('subscriptionType', 'Free');
  
  // Test 5: Read back
  const subscriptionType2 = await AsyncStorage.getItem('subscriptionType');
  console.log('Read subscription:', subscriptionType2);
  
  // Test 6: Check logic
  const premium2 = subscriptionType2 === 'Premium';
  console.log('Is Premium:', premium2);
  
  console.log('=== TEST COMPLETE ===');
};

testSubscription();