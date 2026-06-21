// Comprehensive Product Scanning Debug
// This will show exactly why products are returning "not found"

const axios = require('axios');

const debugProductScanning = async () => {
  console.log('🔍 COMPREHENSIVE PRODUCT SCANNING DEBUG');
  console.log('=====================================\n');
  
  const testBarcodes = [
    '7622210422453', // Nutella
    '5449000000996', // Coca Cola
    '3017620422003', // Evian
    '8437013856508', // Random barcode
    '123456789012',  // Fake barcode
  ];
  
  for (const barcode of testBarcodes) {
    console.log(`\n📱 TESTING BARCODE: ${barcode}`);
    console.log('======================================');
    
    // Test 1: Open Food Facts
    console.log('🍎 STEP 1: Testing Open Food Facts...');
    try {
      const foodUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      const foodResponse = await axios.get(foodUrl, { timeout: 10000 });
      
      if (foodResponse.data && foodResponse.data.status === 1) {
        console.log('✅ FOUND in Open Food Facts!');
        console.log(`   Name: ${foodResponse.data.product.product_name}`);
        console.log(`   Brand: ${foodResponse.data.product.brands}`);
        console.log('   → This should work in app');
      } else {
        console.log('❌ NOT FOUND in Open Food Facts');
      }
    } catch (error) {
      console.log('❌ ERROR with Open Food Facts:', error.message);
    }
    
    // Test 2: Open Beauty Facts
    console.log('🧴 STEP 2: Testing Open Beauty Facts...');
    try {
      const beautyUrl = `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`;
      const beautyResponse = await axios.get(beautyUrl, { timeout: 10000 });
      
      if (beautyResponse.data && beautyResponse.data.status === 1) {
        console.log('✅ FOUND in Open Beauty Facts!');
        console.log(`   Name: ${beautyResponse.data.product.product_name}`);
        console.log('   → This should work in app');
      } else {
        console.log('❌ NOT FOUND in Open Beauty Facts');
      }
    } catch (error) {
      console.log('❌ ERROR with Open Beauty Facts:', error.message);
    }
    
    // Test 3: UPC Database (Trial)
    console.log('🔍 STEP 3: Testing UPC Database...');
    try {
      const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
      const upcResponse = await axios.get(upcUrl, { timeout: 10000 });
      
      if (upcResponse.data && upcResponse.data.items && upcResponse.data.items.length > 0) {
        console.log('✅ FOUND in UPC Database!');
        console.log(`   Name: ${upcResponse.data.items[0].title}`);
        console.log(`   Brand: ${upcResponse.data.items[0].brand}`);
        console.log('   → This should work in app');
      } else {
        console.log('❌ NOT FOUND in UPC Database');
        console.log('   Response:', JSON.stringify(upcResponse.data, null, 2).substring(0, 200));
      }
    } catch (error) {
      console.log('❌ ERROR with UPC Database:', error.message);
    }
    
    // Final verdict
    console.log('\n🎯 VERDICT:');
    console.log('If ALL THREE APIs return "NOT FOUND", then app correctly shows "Product Not Found"');
    console.log('If ANY API finds the product, but app still shows "not found", then there\'s a bug');
  }
  
  console.log('\n\n🔧 TROUBLESHOOTING GUIDE:');
  console.log('========================');
  console.log('1. If APIs find products but app says "not found" → Bug in app logic');
  console.log('2. If NO APIs find your products → Database coverage issue (normal)');
  console.log('3. If APIs have errors → Network/connectivity issue');
  console.log('4. UPC Database may have rate limits on trial version');
};

debugProductScanning();
