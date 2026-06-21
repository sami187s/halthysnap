// Test script to validate AI health analysis lecithin fix
const { AIService } = require('./src/services/aiService');

async function testAIHealthAnalysisLecithinFix() {
  console.log('🧪 Testing AI Health Analysis - Lecithin Fix...\n');
  
  // Test products with lecithin
  const testProducts = [
    {
      product_name: 'Test Cosmetic with Lecithin',
      categories: 'cosmetics',
      ingredients: ['water', 'glycerin', 'lecithin', 'fragrance']
    },
    {
      product_name: 'Test Food with Soy Lecithin', 
      categories: 'food',
      ingredients: ['sugar', 'cocoa', 'soy lecithin', 'vanilla']
    },
    {
      product_name: 'Test Product with Sunflower Lecithin',
      categories: 'food',
      ingredients: ['flour', 'oil', 'sunflower lecithin', 'salt']
    }
  ];
  
  for (const product of testProducts) {
    console.log(`\n📋 Testing: ${product.product_name}`);
    console.log(`Ingredients: ${product.ingredients.join(', ')}`);
    
    try {
      // Test AI analysis
      const analysis = await AIService.analyzeProduct(product, product.ingredients);
      
      console.log('✅ AI Analysis Result:');
      console.log(`Score: ${analysis.aiScore}`);
      console.log(`Summary: ${analysis.summary}`);
      
      // Check for incorrect dairy references
      const analysisText = JSON.stringify(analysis).toLowerCase();
      const hasDairyReference = analysisText.includes('dairy') || 
                               analysisText.includes('milk') || 
                               analysisText.includes('skimmed');
      
      if (hasDairyReference) {
        console.log('❌ WARNING: Still contains dairy references!');
        console.log('Full analysis:', JSON.stringify(analysis, null, 2));
      } else {
        console.log('✅ No incorrect dairy references found');
      }
      
      // Test ingredient research
      if (product.ingredients.some(ing => ing.includes('lecithin'))) {
        const lecithinIngredient = product.ingredients.find(ing => ing.includes('lecithin'));
        console.log(`\n🔍 Testing ingredient research for: ${lecithinIngredient}`);
        
        const research = await AIService.researchIngredient(lecithinIngredient);
        if (research) {
          console.log(`Function: ${research.function}`);
          console.log(`Description: ${research.commonUses}`);
          
          const researchText = JSON.stringify(research).toLowerCase();
          const hasIncorrectInfo = researchText.includes('dairy') || 
                                  researchText.includes('milk') || 
                                  researchText.includes('skimmed');
          
          if (hasIncorrectInfo) {
            console.log('❌ WARNING: Research still contains incorrect info!');
            console.log('Full research:', JSON.stringify(research, null, 2));
          } else {
            console.log('✅ Research shows correct information');
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${product.product_name}:`, error.message);
    }
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('- Enhanced AI prompts with explicit lecithin corrections');
  console.log('- Updated all AI functions to prevent dairy misidentification');
  console.log('- Added comprehensive system messages');
  console.log('- The AI health analysis should now correctly identify lecithin as plant-based');
}

// Run the test
if (require.main === module) {
  testAIHealthAnalysisLecithinFix()
    .then(() => console.log('\n✅ Test completed'))
    .catch(err => console.error('\n❌ Test failed:', err));
}

module.exports = { testAIHealthAnalysisLecithinFix };