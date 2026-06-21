// Test the fixed scoring system
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

// Test different product scenarios
const testProducts = [
  {
    name: "Good Organic Product",
    ingredients: "water, glycerin, vitamin e, aloe vera, chamomile extract, shea butter",
    type: "beauty"
  },
  {
    name: "Bad Chemical Product",
    ingredients: "water, sodium lauryl sulfate, parabens, formaldehyde, triclosan, phthalates",
    type: "beauty"
  },
  {
    name: "Mixed Product",
    ingredients: "water, glycerin, sodium lauryl sulfate, vitamin e, parabens, aloe vera",
    type: "beauty"
  },
  {
    name: "Simple Natural Product",
    ingredients: "water, olive oil, vitamin e",
    type: "beauty"
  },
  {
    name: "Healthy Food",
    ingredients: "whole grain oats, organic honey, almonds, vitamin d",
    type: "food"
  }
];

console.log('🧪 Testing Fixed Scoring System\n');

testProducts.forEach(product => {
  console.log(`\n📦 Testing: ${product.name}`);
  console.log(`📝 Ingredients: ${product.ingredients}`);
  
  const analysis = analyzeIngredients(product.ingredients, product.type);
  
  console.log(`📊 Score: ${analysis.overallScore}/100`);
  console.log(`✅ Good: ${analysis.goodIngredients.length}`);
  console.log(`⚠️ Moderate: ${analysis.moderateIngredients.length}`);
  console.log(`❌ Bad: ${analysis.badIngredients.length}`);
  console.log(`❓ Unknown: ${analysis.unknownIngredients.length}`);
  
  let grade = 'VERY POOR';
  if (analysis.overallScore >= 75) grade = 'EXCELLENT';
  else if (analysis.overallScore >= 50) grade = 'GOOD';
  else if (analysis.overallScore >= 25) grade = 'POOR';
  
  console.log(`🏆 Grade: ${grade}`);
  console.log('─'.repeat(50));
});

console.log('\n✅ Test Complete!');
