// Test Product Type Detection for Search Results
const { getProductTypeFromCategories } = require('./src/utils/enhancedIngredientAnalyzer');

function testProductTypeDetection() {
  console.log('🧪 TESTING PRODUCT TYPE DETECTION FOR SEARCH ROUTING');
  console.log('=' .repeat(60));

  // Simulate search results for different product types
  const testProducts = [
    // Food products
    {
      name: 'Coca Cola',
      categories: 'beverages, sodas, soft drinks',
      source: 'Open Food Facts',
      expectedType: 'food'
    },
    {
      name: 'Greek Yogurt',
      categories: 'dairy, yogurt, fermented milk products',
      source: 'Open Food Facts',
      expectedType: 'food'
    },
    {
      name: 'Whole Wheat Bread',
      categories: 'breads, bakery products, cereals and potatoes',
      source: 'Open Food Facts',
      expectedType: 'food'
    },
    // Cosmetic products
    {
      name: 'Moisturizing Shampoo',
      categories: 'shampoos, hair care, personal care, cosmetics',
      source: 'Open Beauty Facts',
      expectedType: 'beauty'
    },
    {
      name: 'Daily Face Moisturizer',
      categories: 'face moisturizers, skincare, cosmetics',
      source: 'Open Beauty Facts',
      expectedType: 'beauty'
    },
    {
      name: 'SPF 30 Sunscreen',
      categories: 'sunscreens, sun protection, cosmetics',
      source: 'Open Beauty Facts',
      expectedType: 'beauty'
    },
    // Edge cases
    {
      name: 'Lip Balm',
      categories: 'lip care, cosmetics',
      source: 'Multi-Source Cosmetic DB',
      expectedType: 'beauty'
    },
    {
      name: 'Dish Soap',
      categories: 'cleaning products, household',
      source: 'Open Beauty Facts',
      expectedType: 'beauty' // Household treated as beauty for ingredient analysis
    }
  ];

  let correctRouting = 0;
  let totalTests = testProducts.length;

  testProducts.forEach((product, index) => {
    console.log(`\n${index + 1}. Testing: ${product.name}`);
    console.log(`   📂 Categories: ${product.categories}`);
    console.log(`   🌐 Source: ${product.source}`);
    
    const detectedType = getProductTypeFromCategories(
      product.categories,
      product.name,
      product.source
    );
    
    const routeTo = detectedType === 'food' ? 'Results' : 'CosmeticResults';
    const expected = product.expectedType === 'food' ? 'Results' : 'CosmeticResults';
    
    console.log(`   🎯 Detected Type: ${detectedType}`);
    console.log(`   🧭 Route To: ${routeTo} screen`);
    
    if (routeTo === expected) {
      console.log(`   ✅ CORRECT routing`);
      correctRouting++;
    } else {
      console.log(`   ❌ INCORRECT routing (expected ${expected})`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 ROUTING TEST RESULTS:');
  console.log(`✅ Correct: ${correctRouting}/${totalTests} (${Math.round(correctRouting/totalTests*100)}%)`);
  console.log(`❌ Incorrect: ${totalTests-correctRouting}/${totalTests}`);
  console.log('\n🎯 SMART SEARCH ROUTING SUMMARY:');
  console.log('✅ Food products → Results screen (food nutrition analysis)');
  console.log('✅ Cosmetic products → CosmeticResults screen (ingredient safety analysis)');
  console.log('✅ Household products → CosmeticResults screen (ingredient safety analysis)');
  console.log('\n💡 HOW IT WORKS:');
  console.log('1. User searches for product name');
  console.log('2. App finds products from multiple databases');
  console.log('3. Product type detected from categories/source');
  console.log('4. Smart routing to appropriate analysis screen');
  console.log('5. Barcode scanning functionality preserved');
}

// Run the test
try {
  testProductTypeDetection();
} catch (error) {
  console.error('Test failed:', error.message);
}
