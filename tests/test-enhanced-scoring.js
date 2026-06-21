// Test Enhanced Scoring with Ingredient Bonuses
const { calculateHealthScore } = require('./src/utils/enhancedScoring');

// Test product with good and bad ingredients
const testProduct = {
  product_name: "Test Smoothie",
  ingredients_text: "water, organic apple juice, vitamin c (ascorbic acid), natural flavor, citric acid, sodium benzoate",
  nutriments: {
    energy_100g: 50,
    sugars_100g: 12,
    sodium_100g: 0.1,
    fiber_100g: 2
  }
};

console.log('🧪 Testing Enhanced Scoring System...\n');

const result = calculateHealthScore(testProduct);

console.log('📊 Scoring Result:');
console.log(`Final Score: ${result.score} (${result.grade})`);
console.log('\n🔍 Detailed Breakdown:');
console.log(`Starting Score: +${result.breakdown.startingScore}`);
console.log(`Ingredient Penalties: -${result.breakdown.ingredientPenalty || 0}`);
console.log(`Ingredient Bonuses: +${result.breakdown.ingredientBonus || 0}`);
console.log(`Nutrition Penalties: -${result.breakdown.nutritionPenalty || 0}`);
console.log(`Nutrition Bonuses: +${result.breakdown.nutritionBonuses || 0}`);
console.log(`Final Score: ${result.breakdown.finalScore}`);

console.log('\n📝 Penalties:');
result.details.penalties.forEach(penalty => {
  console.log(`  - ${penalty.ingredient}: -${penalty.penalty} (${penalty.reason})`);
});

console.log('\n🌟 Bonuses:');
result.details.bonuses.forEach(bonus => {
  console.log(`  - ${bonus.ingredient}: +${bonus.bonus} (${bonus.reason})`);
});
