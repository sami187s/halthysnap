/**
 * Complete Navigation Flow Test
 * Tests the entire scanning → navigation flow
 */

const { fetchProductByBarcode } = require('./src/services/reliableAPI.js');
const { getProductTypeFromCategories } = require('./src/utils/enhancedIngredientAnalyzer.js');

const testNavigationFlow = async () => {
  console.log('🔍 TESTING COMPLETE NAVIGATION FLOW');
  console.log('==================================\n');

  // Test barcodes that should work
  const testBarcodes = [
    { code: '5449000000996', name: 'Coca Cola (Food)', expected: 'food' },
    { code: '3017620422003', name: 'Nutella (Food)', expected: 'food' },
    { code: '8717418078119', name: 'Skincare Product', expected: 'cosmetic' },
    { code: '7622210422453', name: 'Milka Chocolate', expected: 'food' }
  ];

  for (const test of testBarcodes) {
    console.log(`🧪 Testing: ${test.name} (${test.code})`);
    console.log('─'.repeat(50));

    try {
      // Step 1: Fetch product data
      console.log('1️⃣ Fetching product data...');
      const productData = await fetchProductByBarcode(test.code);
      
      if (productData) {
        console.log('✅ Product found!');
        console.log(`   Name: ${productData.product_name}`);
        console.log(`   Source: ${productData.source}`);
        console.log(`   Type: ${productData.product_type}`);
        
        // Step 2: Determine product type
        console.log('2️⃣ Determining product type...');
        const detectedType = getProductTypeFromCategories(
          productData.categories,
          productData.product_name,
          productData.source
        );
        console.log(`   Detected type: ${detectedType}`);
        
        // Step 3: Navigation decision
        console.log('3️⃣ Navigation decision...');
        if (detectedType === 'food') {
          console.log('🍎 → Should navigate to Results screen (food analysis)');
        } else {
          console.log('🧴 → Should navigate to CosmeticResults screen (cosmetic analysis)');
        }
        
        console.log(`   Expected: ${test.expected}, Actual: ${detectedType}`);
        if (test.expected === detectedType) {
          console.log('✅ CORRECT navigation decision!');
        } else {
          console.log('❌ WRONG navigation decision!');
        }
        
      } else {
        console.log('❌ Product not found');
        console.log('🔍 → Should navigate to ProductNotFound screen');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('🔍 → Should navigate to ProductNotFound screen');
    }
    
    console.log(''); // Empty line between tests
  }
  
  console.log('🎯 SUMMARY:');
  console.log('- If products are found but going to wrong screens: Type detection issue');
  console.log('- If no products found: API or connectivity issue');
  console.log('- If errors during fetch: Network or barcode format issue');
};

// Run the test
testNavigationFlow().catch(console.error);
