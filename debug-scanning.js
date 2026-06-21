// Barcode Scan Debugger
// This script helps debug why scans return "not found"

import { fetchProductByBarcode } from './src/services/reliableAPI.js';

const testBarcodes = [
  '7622210422453', // Nutella
  '5449000000996', // Coca Cola
  '3017620422003', // Evian water
  '8437013856508', // Spanish product
  '8000500037560', // Ferrero Rocher
  '123456789012',  // Fake barcode
  '12345',         // Too short
];

console.log('🔍 DEBUGGING BARCODE SCANNING ISSUES');
console.log('==================================\n');

const testScan = async (barcode) => {
  console.log(`📱 Testing barcode: ${barcode}`);
  console.log('----------------------------');
  
  try {
    const result = await fetchProductByBarcode(barcode);
    
    console.log('✅ SCAN RESULT:');
    console.log(`   Product Name: ${result.product_name}`);
    console.log(`   Source: ${result.source}`);
    console.log(`   Product Type: ${result.product_type}`);
    console.log(`   Is Demo: ${result.product_type === 'demo' ? 'YES' : 'NO'}`);
    
    // Check what navigation logic would do
    if (!result || 
        !result.product_name || 
        result.product_type === 'demo' ||
        result.source === 'Demo Mode') {
      console.log('🔄 NAVIGATION: Would go to "Product Not Found" screen');
    } else {
      console.log('🔄 NAVIGATION: Would go to Results screen');
    }
    
  } catch (error) {
    console.log('❌ SCAN ERROR:', error.message);
    console.log('🔄 NAVIGATION: Would go to "Product Not Found" screen (error)');
  }
  
  console.log('');
};

const runAllTests = async () => {
  for (const barcode of testBarcodes) {
    await testScan(barcode);
  }
  
  console.log('🎯 SUMMARY:');
  console.log('- If you see "Demo Mode" products, that means the API found nothing');
  console.log('- Real products should show actual product names and data');
  console.log('- Check the navigation logic to see where each would go');
};

runAllTests();
