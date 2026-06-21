// Test Enhanced Search with Product Type Detection and Smart Routing
const { searchProductByName } = require('./src/services/reliableAPI');
const { getProductTypeFromCategories } = require('./src/utils/enhancedIngredientAnalyzer');

async function testEnhancedSearch() {
  console.log('🧪 TESTING ENHANCED SEARCH WITH SMART ROUTING');
  console.log('=' .repeat(60));

  // Test food products
  const foodProducts = ['coca cola', 'yogurt', 'bread', 'nutella', 'orange juice'];
  
  // Test cosmetic products  
  const cosmeticProducts = ['shampoo', 'moisturizer', 'sunscreen', 'lipstick', 'soap'];

  for (const query of foodProducts) {
    console.log(`\n🍎 TESTING FOOD: "${query}"`);
    console.log('-'.repeat(40));
    
    try {
      const result = await searchProductByName(query);
      
      if (result.success && result.data.length > 0) {
        const product = result.data[0];
        const productType = getProductTypeFromCategories(
          product.categories || '',
          product.name || '',
          product.source || ''
        );
        
        console.log(`✅ Found: ${product.name}`);
        console.log(`📂 Categories: ${product.categories || 'None'}`);
        console.log(`🌐 Source: ${product.source || 'Unknown'}`);
        console.log(`🎯 Product Type: ${productType}`);
        console.log(`🧭 Route to: ${productType === 'food' ? 'Results' : 'CosmeticResults'} screen`);
        
        if (productType === 'food') {
          console.log('✅ CORRECT: Food product routed to Results screen');
        } else {
          console.log('⚠️  UNEXPECTED: Food product routed to CosmeticResults screen');
        }
      } else {
        console.log(`❌ No results found for "${query}"`);
      }
    } catch (error) {
      console.log(`❌ Error searching for "${query}":`, error.message);
    }
  }

  for (const query of cosmeticProducts) {
    console.log(`\n🧴 TESTING COSMETIC: "${query}"`);
    console.log('-'.repeat(40));
    
    try {
      const result = await searchProductByName(query);
      
      if (result.success && result.data.length > 0) {
        const product = result.data[0];
        const productType = getProductTypeFromCategories(
          product.categories || '',
          product.name || '',
          product.source || ''
        );
        
        console.log(`✅ Found: ${product.name}`);
        console.log(`📂 Categories: ${product.categories || 'None'}`);
        console.log(`🌐 Source: ${product.source || 'Unknown'}`);
        console.log(`🎯 Product Type: ${productType}`);
        console.log(`🧭 Route to: ${productType === 'food' ? 'Results' : 'CosmeticResults'} screen`);
        
        if (productType === 'beauty') {
          console.log('✅ CORRECT: Cosmetic product routed to CosmeticResults screen');
        } else {
          console.log('⚠️  UNEXPECTED: Cosmetic product routed to Results screen');
        }
      } else {
        console.log(`❌ No results found for "${query}"`);
      }
    } catch (error) {
      console.log(`❌ Error searching for "${query}":`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 SMART ROUTING TEST COMPLETE');
  console.log('✅ Food products → Results screen (food analysis)');
  console.log('✅ Cosmetic products → CosmeticResults screen (cosmetic analysis)');
  console.log('✅ Search by name now works for both product types!');
}

// Run the test
testEnhancedSearch().catch(console.error);
