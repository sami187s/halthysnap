// Debug why common ingredients aren't matching
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

console.log('🔍 Debug: Testing individual ingredient matching\n');

const testIngredients = [
  'glycerin',
  'dimethicone', 
  'niacinamide',
  'fragrance',
  'water',
  'ceramides'
];

testIngredients.forEach(ingredient => {
  console.log(`\n🧪 Testing: "${ingredient}"`);
  console.log(`   Normalized: "${ingredient.toLowerCase().trim()}"`);
  
  const analysis = analyzeIngredients(ingredient, 'cosmetic');
  
  if (analysis.analyzedIngredients && analysis.analyzedIngredients.length > 0) {
    const analyzed = analysis.analyzedIngredients[0];
    console.log(`   Result: ${analyzed.category} (${analyzed.score}/100)`);
    console.log(`   Function: ${analyzed.function}`);
    console.log(`   Unknown: ${analyzed.isUnknown ? 'YES' : 'NO'}`);
  } else {
    console.log(`   Result: No analysis found`);
  }
});
