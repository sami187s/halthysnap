// Test the new short ingredient descriptions
const testIngredients = [
  { name: 'aqua', status: 'EXCELLENT' },
  { name: 'glycerin', status: 'EXCELLENT' },
  { name: 'niacinamide', status: 'EXCELLENT' },
  { name: 'dimethicone', status: 'GOOD' },
  { name: 'fragrance', status: 'MODERATE' },
  { name: 'sodium lauryl sulfate', status: 'POOR' },
  { name: 'yellow corn extract', status: 'GOOD' } // Generic example
];

// Simulate the helper function with short descriptions
const getInformativeDescription = (ingredient, analysis) => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  const status = analysis.status;
  
  const ingredientExplanations = {
    'aqua': 'Essential base ingredient',
    'glycerin': 'Natural moisturizer',
    'niacinamide': 'Reduces pores & oil',
    'dimethicone': 'Protective silicone',
    'fragrance': 'May cause allergies',
    'sodium lauryl sulfate': 'Harsh cleanser'
  };
  
  if (ingredientExplanations[normalizedIngredient]) {
    return ingredientExplanations[normalizedIngredient];
  }
  
  switch (status) {
    case 'EXCELLENT':
      return 'Highly beneficial';
    case 'GOOD':
      return 'Generally safe';
    case 'MODERATE':
      return 'Use with caution';
    case 'POOR':
      return 'Potential concerns';
    default:
      return 'Cosmetic ingredient';
  }
};

console.log('🧪 Testing SHORT Ingredient Descriptions\n');
console.log('========================================\n');

testIngredients.forEach(ing => {
  const description = getInformativeDescription(ing.name, ing);
  console.log(`📋 ${ing.name.toUpperCase()}`);
  console.log(`   Status: ${ing.status}`);
  console.log(`   Description: ${description}`);
  console.log('');
});

console.log('🎯 Much shorter and cleaner descriptions!');
console.log('✅ Just a few words instead of long sentences');
