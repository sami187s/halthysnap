// Quick test for the reliable API
const { fetchProductByBarcode, testAPIConnection, checkAPIHealth } = require('./src/services/reliableAPI');

async function testAPI() {
  console.log('🧪 Testing Reliable API...\n');
  
  // Test API health
  console.log('1. Testing API Health...');
  try {
    const health = await checkAPIHealth();
    console.log('Health Results:', health);
  } catch (error) {
    console.error('Health Check Error:', error.message);
  }
  
  console.log('\n2. Testing API Connection...');
  const connection = await testAPIConnection();
  console.log('Connection Test:', connection);
  
  console.log('\n3. Testing Product Lookup (Real Barcode)...');
  try {
    // Test with a real Nutella barcode
    const product = await fetchProductByBarcode('3017620422003');
    console.log('Full Product Object:', JSON.stringify(product, null, 2));
    console.log('Product Summary:', {
      product_name: product.product_name,
      brands: product.brands,
      source: product.source,
      type: product.product_type,
      hasIngredients: !!product.ingredients_text
    });
  } catch (error) {
    console.error('Product Lookup Error:', error.message);
  }
  
  console.log('\n4. Testing Demo Product...');
  try {
    const demoProduct = await fetchProductByBarcode('1234567890123');
    console.log('Demo Product:', {
      name: demoProduct.name,
      brand: demoProduct.brand,
      score: demoProduct.healthScore,
      type: demoProduct.type
    });
  } catch (error) {
    console.error('Demo Product Error:', error.message);
  }
  
  console.log('\n✅ API Test Complete!');
}

testAPI().catch(console.error);
