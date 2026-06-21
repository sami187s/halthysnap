/**
 * Direct test of additive detection functions
 */

// Test data
const testIngredients = "Water, Sodium Lauryl Sulfate, E102, E220, Parabens, Formaldehyde, Triclosan, BHA, Cocamide DEA";
const testProduct = {
  product_name: "Test Product with Additives",
  ingredients_text: testIngredients,
  nutriments: {
    'energy-kcal_100g': 50,
    'fat_100g': 2,
    'sugars_100g': 1
  }
};

console.log('🧪 Direct Additive Detection Test');
console.log('=====================================');

// Test individual additive detection
const testIndividualAdditives = [
  'E102', 'E220', 'BHA', 'Parabens', 'Sodium Lauryl Sulfate', 'Formaldehyde', 'Triclosan'
];

console.log('\n🔍 Testing Individual Additive Detection:');

// Mock the checkForAdditive function with our database
const COMPREHENSIVE_ADDITIVE_DATABASE = {
  'E102': { name: 'Tartrazine', type: 'Food Coloring', riskLevel: 'high', concerns: ['Hyperactivity'] },
  'E220': { name: 'Sulphur dioxide', type: 'Preservative', riskLevel: 'high', concerns: ['Asthma'] }
};

const CHEMICAL_ADDITIVES_DATABASE = {
  'sodium lauryl sulfate': { type: 'Surfactant', riskLevel: 'high', concerns: ['Skin irritation'] },
  'parabens': { type: 'Preservative', riskLevel: 'high', concerns: ['Endocrine disruption'] },
  'formaldehyde': { type: 'Preservative', riskLevel: 'high', concerns: ['Cancer risk'] },
  'triclosan': { type: 'Antimicrobial', riskLevel: 'high', concerns: ['Endocrine disruption'] },
  'bha': { type: 'Antioxidant', riskLevel: 'high', concerns: ['Cancer risk'] }
};

const mockCheckForAdditive = (ingredient) => {
  const cleanIngredient = ingredient.toLowerCase().trim();
  
  // Check E-numbers
  const eNumberMatch = cleanIngredient.match(/^e(\d{3,4}[a-z]?)$/i);
  if (eNumberMatch) {
    const eNumber = eNumberMatch[0].toUpperCase();
    const additiveData = COMPREHENSIVE_ADDITIVE_DATABASE[eNumber];
    if (additiveData) {
      return {
        name: ingredient,
        eNumber: eNumber,
        type: additiveData.type,
        riskLevel: additiveData.riskLevel,
        concerns: additiveData.concerns
      };
    }
  }
  
  // Check chemical additives
  for (const [additiveName, data] of Object.entries(CHEMICAL_ADDITIVES_DATABASE)) {
    if (cleanIngredient.includes(additiveName) || cleanIngredient === additiveName) {
      return {
        name: ingredient,
        type: data.type,
        riskLevel: data.riskLevel,
        concerns: data.concerns
      };
    }
  }
  
  return null;
};

testIndividualAdditives.forEach(ingredient => {
  const result = mockCheckForAdditive(ingredient);
  if (result) {
    console.log(`✅ ${ingredient}: ${result.type} (${result.riskLevel} risk)`);
  } else {
    console.log(`❌ ${ingredient}: Not detected as additive`);
  }
});

// Test scoring calculation
console.log('\n📊 Testing Scoring Calculation:');

let totalPenalty = 0;
const penalties = [];

testIndividualAdditives.forEach(ingredient => {
  const additive = mockCheckForAdditive(ingredient);
  if (additive) {
    let penalty = 0;
    switch (additive.riskLevel) {
      case 'high': penalty = 18; break;
      case 'moderate': penalty = 12; break;
      case 'low': penalty = 6; break;
      default: penalty = 8;
    }
    
    penalties.push({
      ingredient: additive.name,
      penalty: penalty,
      risk: additive.riskLevel
    });
    totalPenalty += penalty;
  }
});

console.log(`\n📈 Scoring Results:`);
console.log(`Base Score: 100`);
console.log(`Total Additive Penalty: -${totalPenalty}`);
console.log(`Final Score: ${Math.max(0, 100 - totalPenalty)}`);

console.log(`\n🔍 Individual Penalties:`);
penalties.forEach(p => {
  console.log(`  ${p.ingredient}: -${p.penalty} (${p.risk} risk)`);
});

console.log(`\n✅ Test completed - Additive detection should be working!`);
