// Simple Navigation Test - Debug why scanning doesn't work
const axios = require('axios');

const testBasicAPI = async () => {
  console.log('🔍 TESTING BASIC API FUNCTIONALITY');
  console.log('=================================\n');

  // Test 1: Direct API call
  console.log('1️⃣ Testing direct API call...');
  const testBarcode = '5449000000996'; // Coca Cola
  
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${testBarcode}.json`;
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.status === 1) {
      console.log('✅ API is working!');
      console.log(`   Product: ${response.data.product.product_name}`);
      console.log(`   Categories: ${response.data.product.categories}`);
      
      // This should be FOOD type
      if (response.data.product.categories && response.data.product.categories.includes('food')) {
        console.log('🍎 → This should go to Results screen (food)');
      } else {
        console.log('🧴 → This should go to CosmeticResults screen (cosmetic)');
      }
    } else {
      console.log('❌ API returned no data');
    }
    
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
  }
  
  console.log('\n2️⃣ Testing cosmetic API...');
  try {
    const cosmeticUrl = `https://world.openbeautyfacts.org/api/v0/product/${testBarcode}.json`;
    const cosmeticResponse = await axios.get(cosmeticUrl, { timeout: 5000 });
    
    if (cosmeticResponse.data && cosmeticResponse.data.status === 1) {
      console.log('✅ Cosmetic API also responded');
    } else {
      console.log('❌ Cosmetic API no data (expected for food product)');
    }
  } catch (error) {
    console.log(`❌ Cosmetic API Error: ${error.message}`);
  }
  
  console.log('\n🎯 If APIs work but navigation fails, the issue is in:');
  console.log('   - smartNavigateToResults function');
  console.log('   - getProductTypeFromCategories function');
  console.log('   - HomeScreen barcode handling');
};

testBasicAPI();
