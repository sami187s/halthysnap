// Test the improved ingredient descriptions
const testIngredients = [
  { name: 'aqua', status: 'EXCELLENT' },
  { name: 'glycerin', status: 'EXCELLENT' },
  { name: 'niacinamide', status: 'EXCELLENT' },
  { name: 'dimethicone', status: 'GOOD' },
  { name: 'fragrance', status: 'MODERATE' },
  { name: 'sodium lauryl sulfate', status: 'POOR' },
  { name: 'yellow corn extract', status: 'GOOD' } // Generic example
];

// Simulate the helper function
const getInformativeDescription = (ingredient, analysis) => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  const status = analysis.status;
  
  const ingredientExplanations = {
    'aqua': 'Essential base ingredient - completely safe and necessary for product stability',
    'glycerin': 'Natural humectant that draws moisture to skin - proven safe and effective',
    'niacinamide': 'Form of Vitamin B3 that reduces oil production and minimizes pores - clinically proven',
    'dimethicone': 'Silicone that creates protective barrier - safe but may cause buildup',
    'fragrance': 'Adds pleasant scent but can trigger allergies - patch test if sensitive',
    'sodium lauryl sulfate': 'Harsh surfactant that strips skin - can cause dryness and irritation'
  };
  
  if (ingredientExplanations[normalizedIngredient]) {
    return ingredientExplanations[normalizedIngredient];
  }
  
  switch (status) {
    case 'EXCELLENT':
      return 'Highly beneficial ingredient with proven safety and effectiveness';
    case 'GOOD':
      return 'Generally safe ingredient with good benefits for most skin types';
    case 'MODERATE':
      return 'Acceptable ingredient but may cause issues for sensitive individuals';
    case 'POOR':
      return 'Concerning ingredient that may cause irritation or other issues';
    default:
      return 'Standard cosmetic ingredient';
  }
};

console.log('🧪 Testing Improved Ingredient Descriptions\n');
console.log('===========================================\n');

testIngredients.forEach(ing => {
  const description = getInformativeDescription(ing.name, ing);
  console.log(`📋 ${ing.name.toUpperCase()}`);
  console.log(`   Status: ${ing.status}`);
  console.log(`   Description: ${description}`);
  console.log('');
});

console.log('🎯 These descriptions now explain WHY each ingredient is rated as it is!');
console.log('✅ Much more informative than just "safe ingredient" or "cosmetic use"');
