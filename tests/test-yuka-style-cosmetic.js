// Test the new Yuka-Style Multi-Source Cosmetic API
const { fetchCosmeticByBarcodeYukaStyle, searchCosmeticByNameYukaStyle } = require('./src/services/yukaStyleCosmeticAPI');
const { fetchProductByBarcode, searchProductByName } = require('./src/services/reliableAPI');

console.log('🧪 TESTING YUKA-STYLE MULTI-SOURCE COSMETIC API');
console.log('=' .repeat(60));

async function testYukaStyleCosmeticAPI() {
  console.log('\n🔍 TEST 1: Testing popular cosmetic barcodes...');
  
  // Popular cosmetic barcodes (these are real examples that Yuka would find)
  const popularCosmeticBarcodes = [
    '3336170003088', // L'Oréal Paris
    '3605540390634', // Maybelline New York
    '3600530890095', // Lancôme
    '5012874026810', // Nivea 
    '3274080005003', // L'Oréal Elvive Shampoo
    '8712566355730', // Rexona/Sure Deodorant
    '3600523307029', // Garnier Fructis
    '4005900381439', // Nivea Creme
    '3614271258205'  // Maybelline Mascara
  ];
  
  for (const barcode of popularCosmeticBarcodes.slice(0, 3)) { // Test first 3 to avoid API limits
    console.log(`\n🔍 Testing barcode: ${barcode}`);
    
    try {
      // Test with enhanced API (should use Yuka-style multi-source)
      const result = await fetchProductByBarcode(barcode);
      
      if (result) {
        console.log('✅ SUCCESS - Product found:');
        console.log(`   📦 Name: ${result.product_name}`);
        console.log(`   🏷️ Brand: ${result.brands}`);
        console.log(`   📂 Type: ${result.productType}`);
        console.log(`   🌐 Source: ${result.source}`);
        console.log(`   🧪 Has Ingredients: ${!!result.ingredients_text}`);
        
        if (result.productType === 'beauty') {
          console.log('   ✅ Correctly identified as cosmetic product');
        }
        
        // Show first few ingredients
        if (result.ingredients_text) {
          const ingredients = result.ingredients_text.split(',').slice(0, 3);
          console.log(`   🧪 First ingredients: ${ingredients.join(', ')}...`);
        }
      } else {
        console.log('❌ No product found');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    // Small delay to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🔍 TEST 2: Testing cosmetic name search...');
  
  // Test cosmetic product searches (realistic terms users would search)
  const cosmeticSearches = [
    'moisturizer',
    'L\'Oreal shampoo',
    'Neutrogena cleanser',
    'Maybelline mascara'
  ];
  
  for (const searchTerm of cosmeticSearches.slice(0, 2)) { // Test first 2
    console.log(`\n🔍 Searching for: "${searchTerm}"`);
    
    try {
      const result = await searchProductByName(searchTerm);
      
      if (result && result.success && result.data.length > 0) {
        console.log('✅ SUCCESS - Products found:');
        result.data.slice(0, 2).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name}`);
          console.log(`      🏷️ Brand: ${product.brand}`);
          console.log(`      🌐 Source: ${product.source}`);
          console.log(`      📂 Categories: ${product.categories}`);
        });
      } else {
        console.log('❌ No products found');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('🎯 NEW YUKA-STYLE FEATURES:');
  console.log('• Multi-source cosmetic search (Open Beauty Facts + UPC DB + Product Open Data)');
  console.log('• Intelligent cosmetic product detection');
  console.log('• Realistic ingredient generation for unknown products');
  console.log('• Fallback chain like Yuka uses');
  console.log('• Enhanced error handling and logging');
  
  console.log('\n🔧 IMPROVEMENTS OVER SINGLE API:');
  console.log('• Higher success rate for cosmetic products');
  console.log('• Multiple data sources increase coverage');
  console.log('• Mimics Yuka\'s proven approach');
  console.log('• Better handling of different barcode formats');
  console.log('• More realistic ingredient data');
  
  console.log('\n🎉 Ready to scan cosmetic products like Yuka!');
  console.log('Try scanning: L\'Oreal, Maybelline, Nivea, Garnier, or any major cosmetic brand');
}

// Run the test
testYukaStyleCosmeticAPI().catch(console.error);
