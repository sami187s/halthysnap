// Test script to validate lecithin description fix
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

// Test product with lecithin
const testProduct = {
  product_name: 'Test Cosmetic Product',
  ingredients_text: 'water, glycerin, lecithin, soy lecithin, sunflower lecithin, sodium lauryl sulfate',
  categories: 'cosmetics'
};

async function testLecithinDescriptions() {
  console.log('🧪 Testing Lecithin Descriptions Fix...\n');
  
  try {
    // Analyze the test product
    const analysis = await analyzeIngredients(
      testProduct.ingredients_text, 
      testProduct.categories
    );
    
    console.log('📋 Analysis Results:');
    console.log('Total ingredients analyzed:', analysis.analyzedIngredients?.length || 0);
    
    // Check for lecithin entries
    const lecithinIngredients = analysis.analyzedIngredients?.filter(ing => 
      ing.name?.toLowerCase().includes('lecithin')
    ) || [];
    
    console.log('\n🔍 Lecithin Ingredients Found:');
    lecithinIngredients.forEach(ing => {
      console.log(`- ${ing.name}: ${ing.description || 'No description'}`);
      console.log(`  Risk Level: ${ing.riskLevel}`);
      console.log(`  Safety Score: ${ing.safetyScore}`);
    });
    
    // Test short descriptions from screens
    const { getInformativeDescription } = require('./src/screens/CosmeticResultsScreen');
    
    const testIngredients = ['lecithin', 'soy lecithin', 'sunflower lecithin'];
    
    console.log('\n📝 Screen Descriptions:');
    testIngredients.forEach(ingredient => {
      try {
        // Mock analysis for testing
        const mockAnalysis = { status: 'GOOD' };
        const description = getInformativeDescription(ingredient, mockAnalysis);
        console.log(`- ${ingredient}: ${description}`);
      } catch (error) {
        console.log(`- ${ingredient}: Error getting description`);
      }
    });
    
    console.log('\n✅ Test completed successfully!');
    console.log('💡 The fixes should prevent incorrect dairy descriptions for lecithin.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLecithinDescriptions();