// Test the cosmetic results screen ingredient analysis fix
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

console.log('🧪 Testing Cosmetic Ingredient Display Fix\n');

// Simulate a cosmetic product with ingredients that should be recognized
const testProduct = {
  product_name: "Test Moisturizer",
  ingredients_text: "Aqua, Glycerin, Dimethicone, Niacinamide, Sodium Hyaluronate, Phenoxyethanol, Fragrance, Tocopherol"
};

console.log('📦 Testing Product:', testProduct.product_name);
console.log('📋 Ingredients:', testProduct.ingredients_text);
console.log('----------------------------------------');

// Run the enhanced analysis
const analysis = analyzeIngredients(testProduct.ingredients_text, 'cosmetic');

console.log('\n📊 Main Analysis Results:');
console.log(`   Overall Score: ${analysis.score}/100`);
console.log(`   Total Ingredients: ${analysis.analyzedIngredients?.length || 0}`);
console.log(`   Good Ingredients: ${analysis.goodIngredients?.length || 0}`);
console.log(`   Moderate Ingredients: ${analysis.moderateIngredients?.length || 0}`);
console.log(`   Bad Ingredients: ${analysis.badIngredients?.length || 0}`);
console.log(`   Unknown Ingredients: ${analysis.unknownIngredients?.length || 0}`);

// Simulate the individual ingredient analysis function
const analyzeIndividualIngredient = (ingredient, analysis) => {
  const lowerIngredient = ingredient.toLowerCase().trim();
  
  // First check if this ingredient was already analyzed in our main analysis
  const existingAnalysis = analysis.analyzedIngredients?.find(item => 
    item.name?.toLowerCase() === lowerIngredient
  );
  
  if (existingAnalysis) {
    let status, color, reason;
    
    // Use the enhanced analysis results directly based on score and isUnknown flag
    if (existingAnalysis.isUnknown) {
      status = 'UNKNOWN';
      color = '#9E9E9E';
      reason = 'Ingredient not in database';
    } else if (existingAnalysis.score >= 90) {
      status = 'EXCELLENT';
      color = '#1B5E20';
      reason = existingAnalysis.notes || `Safe ingredient (${existingAnalysis.function || 'cosmetic use'})`;
    } else if (existingAnalysis.score >= 75) {
      status = 'GOOD';
      color = '#4CAF50';
      reason = existingAnalysis.notes || `Generally safe (${existingAnalysis.function || 'cosmetic use'})`;
    } else if (existingAnalysis.score >= 45) {
      status = 'MODERATE';
      color = '#FF9800';
      reason = existingAnalysis.concerns || existingAnalysis.notes || `Some concerns (${existingAnalysis.function || 'cosmetic use'})`;
    } else {
      status = 'POOR';
      color = '#F44336';
      reason = existingAnalysis.concerns || existingAnalysis.notes || `Safety concerns (${existingAnalysis.function || 'cosmetic use'})`;
    }
    
    return { status, reason, score: existingAnalysis.score };
  }
  
  return { status: 'NOT_FOUND', reason: 'Not in analysis results', score: 0 };
};

console.log('\n📋 Individual Ingredient Analysis (How UI will display):');
const ingredients = testProduct.ingredients_text
  .toLowerCase()
  .split(/[,;.]/)
  .map(ingredient => ingredient.trim())
  .filter(ingredient => ingredient.length > 2);

ingredients.forEach((ingredient, index) => {
  const result = analyzeIndividualIngredient(ingredient, analysis);
  console.log(`   ${index + 1}. ${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}`);
  console.log(`      Status: ${result.status} (${result.score}/100)`);
  console.log(`      Reason: ${result.reason}`);
  console.log('');
});

console.log('🎯 Summary:');
console.log('If the individual ingredient statuses match the main analysis,');
console.log('then the UI display fix is working correctly!');
console.log('\n✅ Expected: Most ingredients should show as GOOD, EXCELLENT, or MODERATE');
console.log('❌ Problem: If ingredients show as UNKNOWN despite being in main analysis');
