// Test Individual Ingredient Classification
// This will show how each ingredient gets classified in the "All Ingredients" section

console.log('🧪 Testing Individual Ingredient Classification');
console.log('===============================================\n');

// Sample cosmetic product ingredients (like from a real product)
const testIngredients = [
  'aqua',
  'sodium lauryl sulfate', // Should be RISKY
  'glycerin',
  'paraben', // Should be RISKY  
  'hyaluronic acid', // Should be EXCELLENT
  'alcohol denat',
  'parfum',
  'dimethicone',
  'tocopherol', // Should be EXCELLENT
  'methylparaben', // Should be RISKY
  'unknown-chemical-123' // Should be UNKNOWN
];

console.log('🔍 Current Classification Logic:');
console.log('================================');
console.log('1. Check if ingredient is in harmfulIngredients list → RISKY');
console.log('2. Check if ingredient is in excellentIngredients list → EXCELLENT');  
console.log('3. Check if ingredient is in goodIngredients list → GOOD');
console.log('4. If not found anywhere → UNKNOWN');

console.log('\n📊 Test Results:');
console.log('=================');

testIngredients.forEach(ingredient => {
  const clean = ingredient.toLowerCase().trim();
  let status = 'UNKNOWN';
  let reason = 'Not classified';
  
  // Simplified version of the actual logic
  const harmfulIngredients = {
    'sodium lauryl sulfate': 'Harsh surfactant, strips natural oils, causes irritation',
    'paraben': 'Preservative that may disrupt hormones and cause skin irritation',
    'methylparaben': 'Preservative linked to hormone disruption'
  };
  
  const excellentIngredients = {
    'hyaluronic acid': 'Exceptional hydrating agent, holds 1000x its weight in water',
    'tocopherol': 'Vitamin E, powerful antioxidant, protects from free radicals'
  };
  
  const goodIngredients = {
    'aqua': 'Water base, essential and completely safe',
    'glycerin': 'Excellent humectant, draws moisture from air to skin',
    'dimethicone': 'Silicone that provides smooth feel, safe for most people'
  };
  
  // Check classification
  for (const harmful in harmfulIngredients) {
    if (clean.includes(harmful)) {
      status = 'RISKY';
      reason = harmfulIngredients[harmful];
      break;
    }
  }
  
  if (status === 'UNKNOWN') {
    for (const excellent in excellentIngredients) {
      if (clean.includes(excellent)) {
        status = 'EXCELLENT';
        reason = excellentIngredients[excellent];
        break;
      }
    }
  }
  
  if (status === 'UNKNOWN') {
    for (const good in goodIngredients) {
      if (clean.includes(good)) {
        status = 'GOOD';
        reason = goodIngredients[good];
        break;
      }
    }
  }
  
  const statusIcon = status === 'RISKY' ? '🔴' : 
                    status === 'EXCELLENT' ? '🟢' : 
                    status === 'GOOD' ? '🟡' : '⚪';
  
  console.log(`${statusIcon} ${ingredient.padEnd(20)} → ${status.padEnd(10)} | ${reason.substring(0, 50)}...`);
});

console.log('\n🎯 The Issue:');
console.log('==============');
console.log('❌ Most common cosmetic ingredients are classified as "GOOD"');
console.log('❌ This makes almost every product look "good" in All Ingredients section');
console.log('❌ Users see mostly green/good status badges');

console.log('\n💡 Possible Solutions:');
console.log('======================');
console.log('1. ✅ Make classification more strict - fewer ingredients as "GOOD"');
console.log('2. ✅ Add more categories: SAFE, ACCEPTABLE, QUESTIONABLE, AVOID');
console.log('3. ✅ Change default unknown ingredients to "NEUTRAL" instead of falling back to "GOOD"');
console.log('4. ✅ Be more specific about concentration-dependent effects');
console.log('5. ✅ Consider ingredient interactions and formulation context');

console.log('\n📈 Recommended Fix:');
console.log('===================');
console.log('• Change many "GOOD" ingredients to "NEUTRAL" or "ACCEPTABLE"');
console.log('• Reserve "GOOD" for truly beneficial ingredients');
console.log('• Add "MODERATE" category for questionable but common ingredients');
console.log('• Make the scoring more balanced and realistic');
