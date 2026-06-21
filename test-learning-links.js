// Test script to verify learning links functionality
const { analyzeNonFoodProduct } = require('./src/utils/enhancedIngredientAnalyzer');
const { getQuickLearningLink } = require('./src/utils/ingredientLearningLinks');

console.log('🧪 Testing Learning Links for Unknown Ingredients\n');

// Test with some unknown ingredients
const testIngredients = [
  'dimethicone',
  'unknown-chemical-xyz',
  'cyclopentasiloxane',
  'mystery-ingredient-123',
  'phenoxyethanol'
];

testIngredients.forEach(ingredient => {
  console.log(`\n📍 Testing ingredient: "${ingredient}"`);
  
  // Test the learning link generator directly
  const learningLink = getQuickLearningLink(ingredient, 'cosmetic');
  console.log(`   📚 Learning link: ${learningLink}`);
  
  // Test the enhanced analyzer
  const analysis = analyzeNonFoodProduct(ingredient, 'cosmetic');
  
  // Check if any unknown ingredients have learning links
  const unknownIngredients = analysis.unknownIngredients || [];
  const unknownWithLinks = unknownIngredients.filter(ing => ing.learningLink);
  
  console.log(`   🔍 Analysis score: ${analysis.score}`);
  console.log(`   ❓ Unknown ingredients: ${unknownIngredients.length}`);
  console.log(`   🔗 Unknown with learning links: ${unknownWithLinks.length}`);
  
  if (unknownWithLinks.length > 0) {
    unknownWithLinks.forEach(ing => {
      console.log(`     - ${ing.name}: ${ing.learningLink}`);
    });
  }
});

console.log('\n✅ Learning links test completed!');
