// Test script to debug API responses
const { fetchProductByBarcode } = require('./src/services/reliableAPI');

async function testRealBarcode() {
  console.log('🧪 Testing real barcode scanning...');
  
  // Test with a known Coca Cola barcode
  const testBarcode = '5449000000996';
  
  try {
    console.log(`\n🔍 Testing barcode: ${testBarcode}`);
    const result = await fetchProductByBarcode(testBarcode);
    
    console.log('\n✅ RESULT:');
    console.log('📦 Product name:', result?.product_name);
    console.log('🏪 Brand:', result?.brands);
    console.log('📊 Source:', result?.source);
    console.log('🏷️ Type:', result?.product_type);
    console.log('🧾 Ingredients:', result?.ingredients_text?.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testRealBarcode();
