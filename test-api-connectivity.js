// Quick API Test Script
import { testAPIConnection, fetchProductByBarcode } from './src/services/reliableAPI.js';

console.log('🧪 TESTING API CONNECTIVITY...');
console.log('================================');

// Test 1: Check if APIs are responding
console.log('\n1️⃣ Testing API Connection...');
testAPIConnection().then(isConnected => {
  console.log(`API Status: ${isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
}).catch(error => {
  console.log(`API Error: ${error.message}`);
});

// Test 2: Try a known working barcode
console.log('\n2️⃣ Testing Known Product Barcode...');
const testBarcodes = [
  '5449000000996', // Coca Cola (food)
  '3274080003504', // L'Oreal product (cosmetic)
  '7622210449283', // Toblerone (food)
  '8712644034063'  // Dove soap (cosmetic)
];

for (const barcode of testBarcodes) {
  console.log(`\nTesting barcode: ${barcode}`);
  fetchProductByBarcode(barcode).then(product => {
    if (product) {
      console.log(`✅ Found: ${product.product_name || 'Unknown'}`);
      console.log(`   Source: ${product.source || 'Unknown'}`);
      console.log(`   Type: ${product.product_type || 'Unknown'}`);
    } else {
      console.log(`❌ Not found`);
    }
  }).catch(error => {
    console.log(`❌ Error: ${error.message}`);
  });
}

console.log('\n⏳ Testing in progress...');
