// Test the "not found" fix
const { fetchProductByBarcode } = require('./src/services/reliableAPI.js');

const testNotFound = async () => {
  console.log('🧪 Testing "Not Found" Fix');
  console.log('===========================\n');
  
  // Test with a fake barcode that definitely won't be found
  const fakeBarcode = '999999999999';
  
  try {
    console.log(`📱 Scanning fake barcode: ${fakeBarcode}`);
    const result = await fetchProductByBarcode(fakeBarcode);
    
    if (result === null) {
      console.log('✅ PERFECT! API correctly returns null for unknown products');
      console.log('   → This will navigate to "Product Not Found" screen');
    } else {
      console.log('❌ ISSUE: API still returns a product:');
      console.log(`   Name: ${result.product_name}`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Type: ${result.product_type}`);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
};

testNotFound();
