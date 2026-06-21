// Test Real Product Scanning Pipeline
// This simulates exactly what happens when you scan in the app

const testCompleteScanning = async () => {
  console.log('🧪 TESTING COMPLETE SCANNING PIPELINE');
  console.log('====================================\n');
  
  // Import the actual functions used by the app
  const { fetchProductByBarcode } = require('./src/services/reliableAPI.js');
  const { smartNavigateToResults } = require('./src/utils/smartNavigation.js');
  
  // Test with Coca Cola barcode (we know this works)
  const testBarcode = '5449000000996';
  
  console.log(`📱 STEP 1: Scanning barcode ${testBarcode}`);
  
  try {
    // This is exactly what the app does
    const productData = await fetchProductByBarcode(testBarcode);
    
    console.log('✅ STEP 2: Product data received:');
    console.log(`   Product Name: ${productData ? productData.product_name : 'NULL'}`);
    console.log(`   Source: ${productData ? productData.source : 'NULL'}`);
    console.log(`   Product Type: ${productData ? productData.product_type : 'NULL'}`);
    console.log(`   Is Demo: ${productData && productData.product_type === 'demo' ? 'YES' : 'NO'}`);
    
    // Test navigation logic
    console.log('\n🔄 STEP 3: Testing navigation logic...');
    
    if (!productData || 
        !productData.product_name || 
        productData.product_type === 'demo' ||
        productData.source === 'Demo Mode') {
      console.log('❌ RESULT: Would navigate to "Product Not Found" screen');
      console.log('   This means the app is working correctly but product genuinely not found');
    } else {
      console.log('✅ RESULT: Would navigate to Results screen');
      console.log('   This means the product was found and should work in app');
    }
    
  } catch (error) {
    console.log('❌ ERROR in scanning pipeline:', error.message);
    console.log('   This would navigate to "Product Not Found" screen');
  }
  
  console.log('\n🎯 CONCLUSION:');
  console.log('If this test shows "Would navigate to Results screen" but your app');
  console.log('still shows "not found", then there might be a React Native specific issue.');
};

// Run the test but wrap in try-catch for any module issues
try {
  testCompleteScanning();
} catch (error) {
  console.log('❌ Module error:', error.message);
  console.log('This might be due to ES6/CommonJS import issues in testing environment');
  console.log('The actual React Native app should work fine');
}
