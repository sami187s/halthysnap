// Quick API Test Script
const axios = require('axios');

const testAPI = async () => {
  console.log('🔍 Testing API connectivity...\n');
  
  // Test real barcode: Coca Cola (known product)
  const testBarcode = '5449000000996';
  
  try {
    const foodUrl = `https://world.openfoodfacts.org/api/v0/product/${testBarcode}.json`;
    console.log(`📡 Testing URL: ${foodUrl}`);
    
    const response = await axios.get(foodUrl, { timeout: 10000 });
    
    if (response.data && response.data.status === 1) {
      console.log('✅ API Working! Product found:');
      console.log(`   Name: ${response.data.product.product_name}`);
      console.log(`   Brand: ${response.data.product.brands}`);
      console.log(`   Categories: ${response.data.product.categories}`);
    } else {
      console.log('❌ API returned no product data');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.log('❌ API Error:', error.message);
  }
  
  // Test beauty product
  console.log('\n🧴 Testing beauty product API...');
  try {
    const beautyUrl = `https://world.openbeautyfacts.org/api/v0/product/${testBarcode}.json`;
    console.log(`📡 Testing URL: ${beautyUrl}`);
    
    const response = await axios.get(beautyUrl, { timeout: 10000 });
    
    if (response.data && response.data.status === 1) {
      console.log('✅ Beauty API Working! Product found:');
      console.log(`   Name: ${response.data.product.product_name}`);
    } else {
      console.log('❌ Beauty API: No product found (expected for food barcode)');
    }
  } catch (error) {
    console.log('❌ Beauty API Error:', error.message);
  }
};

testAPI();
