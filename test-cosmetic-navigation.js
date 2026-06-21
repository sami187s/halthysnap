// Test script to verify cosmetic navigation is working

console.log('🧪 Testing Cosmetic Navigation Flow...');

// Test 1: Check if CosmeticResultsScreen component exists
console.log('\n📁 Test 1: Checking CosmeticResultsScreen...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const cosmeticScreenPath = './src/screens/CosmeticResultsScreen.js';
  if (fs.existsSync(cosmeticScreenPath)) {
    console.log('✅ CosmeticResultsScreen.js exists');
    
    const content = fs.readFileSync(cosmeticScreenPath, 'utf8');
    if (content.includes('export default function CosmeticResultsScreen')) {
      console.log('✅ CosmeticResultsScreen component properly exported');
    } else {
      console.log('❌ CosmeticResultsScreen component export issue');
    }
  } else {
    console.log('❌ CosmeticResultsScreen.js not found');
  }
} catch (error) {
  console.log('❌ Error checking CosmeticResultsScreen:', error.message);
}

// Test 2: Check navigation registration in App.js
console.log('\n📱 Test 2: Checking App.js navigation...');
try {
  const fs = require('fs');
  const appContent = fs.readFileSync('./App.js', 'utf8');
  
  if (appContent.includes('name="CosmeticResults"')) {
    console.log('✅ CosmeticResults screen registered in navigation');
  } else {
    console.log('❌ CosmeticResults screen NOT registered in navigation');
  }
  
  if (appContent.includes('import CosmeticResultsScreen')) {
    console.log('✅ CosmeticResultsScreen imported in App.js');
  } else {
    console.log('❌ CosmeticResultsScreen NOT imported in App.js');
  }
} catch (error) {
  console.log('❌ Error checking App.js:', error.message);
}

// Test 3: Check smart navigation logic
console.log('\n🧠 Test 3: Checking smart navigation...');
try {
  const fs = require('fs');
  const navContent = fs.readFileSync('./src/utils/smartNavigation.js', 'utf8');
  
  if (navContent.includes('CosmeticResults')) {
    console.log('✅ CosmeticResults navigation exists in smartNavigation');
  } else {
    console.log('❌ CosmeticResults navigation missing in smartNavigation');
  }
  
  if (navContent.includes('COSMETIC FIX')) {
    console.log('✅ Temporary cosmetic fix is active - all products will go to CosmeticResults');
  } else {
    console.log('⚠️  Temporary cosmetic fix is NOT active');
  }
} catch (error) {
  console.log('❌ Error checking smartNavigation:', error.message);
}

console.log('\n🎯 Next Steps:');
console.log('1. Scan any barcode with the app');
console.log('2. Check Metro bundler console for navigation logs');
console.log('3. If it works, the cosmetic screen should appear');
console.log('4. If it still shows blank, check Metro bundler errors');

console.log('\n✅ Test completed!');
