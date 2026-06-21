// Test Cosmetic Scoring Accuracy
// This will help identify if the app is correctly categorizing ingredients

console.log('🧪 Testing Cosmetic Scoring Accuracy');
console.log('=====================================\n');

// Import the enhanced ingredient analyzer to test
const fs = require('fs');
const path = require('path');

// Mock some real cosmetic ingredient lists to test
const testProducts = [
  {
    name: "Typical Shampoo",
    ingredients: "Water, Sodium Lauryl Sulfate, Cocamidopropyl Betaine, Sodium Chloride, Fragrance, Methylparaben, Propylparaben, Citric Acid"
  },
  {
    name: "Natural Moisturizer", 
    ingredients: "Aloe Barbadensis Leaf Juice, Glycerin, Shea Butter, Jojoba Oil, Vitamin E, Xanthan Gum, Potassium Sorbate"
  },
  {
    name: "Harsh Foundation",
    ingredients: "Dimethicone, Talc, Titanium Dioxide, Parabens, Formaldehyde, Aluminum, Mineral Oil, Fragrance, BHA"
  },
  {
    name: "Clean Sunscreen",
    ingredients: "Zinc Oxide, Coconut Oil, Shea Butter, Vitamin E, Aloe Vera, Jojoba Oil, Beeswax"
  }
];

console.log('📊 Testing Different Product Types:');
console.log('===================================\n');

// Simulate the ingredient analysis logic from CosmeticResultsScreen.js
function analyzeTestProduct(product) {
  console.log(`🧴 ${product.name}`);
  console.log(`Ingredients: ${product.ingredients}`);
  
  const ingredients = product.ingredients.toLowerCase()
    .split(/[,;.]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 2);
  
  console.log(`📝 Parsed ${ingredients.length} ingredients:`);
  
  let totalScore = 70; // Starting score
  let excellentCount = 0;
  let goodCount = 0;
  let riskyCount = 0;
  let unknownCount = 0;
  
  // Simplified analysis based on known patterns
  ingredients.forEach((ingredient, index) => {
    let status = 'GOOD';
    let scoreImpact = +2;
    let reason = 'Generally safe ingredient';
    
    // Check for harmful ingredients
    const harmfulKeywords = [
      'paraben', 'sulfate', 'sls', 'formaldehyde', 'aluminum', 
      'mineral oil', 'petrolatum', 'phthalate', 'triclosan', 'bha', 'talc'
    ];
    
    // Check for beneficial ingredients  
    const beneficialKeywords = [
      'aloe', 'vitamin', 'glycerin', 'shea', 'jojoba', 'coconut oil',
      'zinc oxide', 'titanium dioxide', 'hyaluronic', 'ceramide'
    ];
    
    const isHarmful = harmfulKeywords.some(keyword => 
      ingredient.includes(keyword));
    const isBeneficial = beneficialKeywords.some(keyword => 
      ingredient.includes(keyword));
    
    if (isHarmful) {
      status = 'RISKY';
      scoreImpact = -15;
      reason = 'Potentially harmful ingredient';
      riskyCount++;
    } else if (isBeneficial) {
      status = 'EXCELLENT';
      scoreImpact = +10;
      reason = 'Beneficial for skin health';
      excellentCount++;
    } else if (ingredient === 'water' || ingredient === 'aqua') {
      status = 'EXCELLENT';
      scoreImpact = +5;
      reason = 'Safe base ingredient';
      excellentCount++;
    } else {
      status = 'GOOD';
      scoreImpact = +2;
      goodCount++;
    }
    
    totalScore += scoreImpact;
    
    console.log(`   ${index + 1}. ${ingredient} → ${status} (${scoreImpact > 0 ? '+' : ''}${scoreImpact})`);
  });
  
  // Apply composition bonuses/penalties
  const totalIngredients = ingredients.length;
  const excellentPercentage = (excellentCount / totalIngredients) * 100;
  const riskyPercentage = (riskyCount / totalIngredients) * 100;
  
  if (excellentPercentage > 30) totalScore += 15;
  if (riskyPercentage > 20) totalScore -= 25;
  else if (riskyPercentage > 10) totalScore -= 15;
  
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));
  
  console.log(`\n📊 Final Analysis:`);
  console.log(`   Score: ${totalScore}/100`);
  console.log(`   Excellent: ${excellentCount} (${Math.round(excellentPercentage)}%)`);
  console.log(`   Good: ${goodCount}`);
  console.log(`   Risky: ${riskyCount} (${Math.round(riskyPercentage)}%)`);
  console.log(`   Rating: ${totalScore >= 70 ? '🟢 GOOD' : totalScore >= 40 ? '🟡 MODERATE' : '🔴 POOR'}`);
  console.log('   ' + '='.repeat(50) + '\n');
  
  return {
    score: totalScore,
    excellent: excellentCount,
    risky: riskyCount,
    rating: totalScore >= 70 ? 'GOOD' : totalScore >= 40 ? 'MODERATE' : 'POOR'
  };
}

// Test all products
const results = testProducts.map(analyzeTestProduct);

console.log('🎯 Summary of Results:');
console.log('======================');
results.forEach((result, index) => {
  console.log(`${testProducts[index].name}: ${result.score}/100 (${result.rating})`);
});

console.log('\n🤔 Analysis:');
console.log('============');
console.log('If most products are showing as GOOD, it might be because:');
console.log('1. The scoring starts at 70 (already in GOOD range)');
console.log('2. Many common ingredients get +2 points (GOOD status)');
console.log('3. Not enough risky ingredients to significantly lower score');
console.log('4. The ingredient database might be too lenient');
console.log('\n💡 Suggestions:');
console.log('1. Lower starting score to 50 (neutral)');
console.log('2. Make scoring more strict for unknown ingredients');
console.log('3. Add more harmful ingredients to the database');
console.log('4. Adjust scoring thresholds (GOOD = 75+, MODERATE = 50-74, POOR = <50)');
