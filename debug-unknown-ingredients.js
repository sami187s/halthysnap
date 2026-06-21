// Debug Unknown Ingredient Issue
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

console.log('🔍 Debugging Unknown Ingredient Issue\n');

// Test with a simple ingredient that should be known
const testIngredient = "Glycerin";
const analysis = analyzeIngredients(testIngredient, 'cosmetic');

console.log(`📋 Testing ingredient: "${testIngredient}"`);
console.log(`📊 Analysis results:`);
console.log(`   Total analyzed ingredients: ${analysis.analyzedIngredients?.length || 0}`);
console.log(`   Good ingredients: ${analysis.goodIngredients?.length || 0}`);
console.log(`   Moderate ingredients: ${analysis.moderateIngredients?.length || 0}`);
console.log(`   Unknown ingredients: ${analysis.unknownIngredients?.length || 0}`);

if (analysis.analyzedIngredients && analysis.analyzedIngredients.length > 0) {
  const ingredient = analysis.analyzedIngredients[0];
  console.log(`\n🧪 First ingredient details:`);
  console.log(`   Name: "${ingredient.name}"`);
  console.log(`   Category: ${ingredient.category}`);
  console.log(`   Score: ${ingredient.score}`);
  console.log(`   Is Unknown: ${ingredient.isUnknown}`);
  console.log(`   Function: ${ingredient.function}`);
}

// Test the individual analysis function like the UI does
const analyzeIndividualIngredient = (ingredient, analysis) => {
  const lowerIngredient = ingredient.toLowerCase().trim();
  console.log(`\n🔍 Searching for: "${lowerIngredient}"`);
  
  // First check if this ingredient was already analyzed in our main analysis
  const existingAnalysis = analysis.analyzedIngredients?.find(item => {
    console.log(`   Comparing with: "${item.name?.toLowerCase()}"`);
    return item.name?.toLowerCase() === lowerIngredient;
  });
  
  if (existingAnalysis) {
    console.log(`   ✅ Found in analyzedIngredients!`);
    console.log(`   Score: ${existingAnalysis.score}, Unknown: ${existingAnalysis.isUnknown}`);
    return { found: true, data: existingAnalysis };
  } else {
    console.log(`   ❌ Not found in analyzedIngredients`);
    
    // Check in good ingredients
    const goodIngredient = analysis.goodIngredients?.find(item => {
      console.log(`   Checking good ingredients: "${item.name?.toLowerCase()}"`);
      return item.name?.toLowerCase() === lowerIngredient;
    });
    
    if (goodIngredient) {
      console.log(`   ✅ Found in goodIngredients!`);
      return { found: true, data: goodIngredient };
    }
    
    console.log(`   ❌ Not found anywhere`);
    return { found: false };
  }
};

console.log(`\n🎯 Testing individual ingredient lookup:`);
const result = analyzeIndividualIngredient("glycerin", analysis);
console.log(`Result: ${result.found ? 'FOUND' : 'NOT FOUND'}`);

if (result.found) {
  console.log(`✅ This should NOT show as unknown in the UI`);
} else {
  console.log(`❌ This explains why it shows as unknown in the UI`);
}
