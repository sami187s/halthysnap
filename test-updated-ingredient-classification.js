// Test Updated Individual Ingredient Classification
// This will show the improved classification with ACCEPTABLE category

console.log('🧪 Testing UPDATED Individual Ingredient Classification');
console.log('====================================================\n');

// Sample cosmetic product ingredients
const testIngredients = [
  'aqua',                    // Should now be ACCEPTABLE 
  'sodium lauryl sulfate',   // Should be RISKY
  'glycerin',               // Should be GOOD (truly good)
  'paraben',                // Should be RISKY  
  'hyaluronic acid',        // Should be EXCELLENT
  'dimethicone',            // Should now be ACCEPTABLE
  'parfum',                 // Should now be ACCEPTABLE
  'tocopherol',             // Should be EXCELLENT
  'methylparaben',          // Should be RISKY
  'jojoba oil',             // Should be GOOD (truly good)
  'phenoxyethanol',         // Should now be ACCEPTABLE
  'alcohol denat',          // Should now be ACCEPTABLE
  'unknown-chemical-123'    // Should be UNKNOWN
];

console.log('🔍 NEW Classification Logic:');
console.log('=============================');
console.log('1. Check harmfulIngredients → 🔴 RISKY');
console.log('2. Check excellentIngredients → 🟢 EXCELLENT');  
console.log('3. Check acceptableIngredients → 🟡 ACCEPTABLE');
console.log('4. Check goodIngredients → 🟢 GOOD');
console.log('5. Not found → ⚪ UNKNOWN');

console.log('\n📊 Updated Test Results:');
console.log('=========================');

testIngredients.forEach(ingredient => {
  const clean = ingredient.toLowerCase().trim();
  let status = 'UNKNOWN';
  let reason = 'Not classified';
  
  // Simplified version of the updated logic
  const harmfulIngredients = {
    'sodium lauryl sulfate': 'Harsh surfactant, strips natural oils, causes irritation',
    'paraben': 'Preservative that may disrupt hormones and cause skin irritation',
    'methylparaben': 'Preservative linked to hormone disruption'
  };
  
  const excellentIngredients = {
    'hyaluronic acid': 'Exceptional hydrating agent, holds 1000x its weight in water',
    'tocopherol': 'Vitamin E, powerful antioxidant, protects from free radicals'
  };
  
  const acceptableIngredients = {
    'aqua': 'Water base, essential but neutral component',
    'dimethicone': 'Silicone, provides smooth feel but can build up over time',
    'parfum': 'Fragrance, acceptable but common allergen',
    'phenoxyethanol': 'Preservative, safer than parabens but still synthetic',
    'alcohol denat': 'Denatured alcohol, drying but sometimes necessary'
  };
  
  const goodIngredients = {
    'glycerin': 'Excellent humectant, draws moisture from air to skin',
    'jojoba oil': 'Plant wax that closely mimics skin\'s natural sebum'
  };
  
  // Check classification (same order as in app)
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
    for (const acceptable in acceptableIngredients) {
      if (clean.includes(acceptable)) {
        status = 'ACCEPTABLE';
        reason = acceptableIngredients[acceptable];
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
                    status === 'GOOD' ? '🟢' :
                    status === 'ACCEPTABLE' ? '🟡' : '⚪';
  
  console.log(`${statusIcon} ${ingredient.padEnd(20)} → ${status.padEnd(10)} | ${reason.substring(0, 50)}...`);
});

console.log('\n✅ Improvements Made:');
console.log('=====================');
console.log('• Added ACCEPTABLE category for common but neutral ingredients');
console.log('• Water, silicones, basic emulsifiers now ACCEPTABLE instead of GOOD');
console.log('• Reserved GOOD for truly beneficial ingredients');
console.log('• More realistic representation of ingredient quality');
console.log('• Users will see more balanced mix of colors in All Ingredients');

console.log('\n🎯 Expected Results:');
console.log('====================');
console.log('• Fewer ingredients showing as "GOOD" (green)');
console.log('• More ingredients showing as "ACCEPTABLE" (orange)'); 
console.log('• Only genuinely good ingredients showing as "GOOD"');
console.log('• More accurate representation of cosmetic quality');
console.log('• Better user trust in the scoring system');
