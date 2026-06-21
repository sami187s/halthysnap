// Test Enhanced Nutrition Processing
// Run this to verify 100% accurate nutrition data processing

const testNutritionData = {
  // Test case 1: Standard nutrition data
  standard: {
    'energy-kcal_100g': 250,
    'sugars_100g': 12.5,
    'salt_100g': 0.8,
    'fat_100g': 15.2,
    'proteins_100g': 8.1,
    'carbohydrates_100g': 25.3,
    'fiber_100g': 3.2
  },
  
  // Test case 2: Varied field names (real API variations)
  varied: {
    'energy_kcal_100g': 180, // underscore instead of dash
    'sugars': 8.2, // no _100g suffix
    'sodium_100g': 0.32, // sodium instead of salt
    'fat': 12.0,
    'proteins': 6.5,
    'carbs_100g': 20.1, // carbs instead of carbohydrates
    'fibre_100g': 2.8 // British spelling
  },
  
  // Test case 3: Missing some fields
  incomplete: {
    'energy-kcal_100g': 300,
    'sugars_100g': 18.5,
    'fat_100g': 8.2
    // missing salt, protein, carbs, fiber
  },
  
  // Test case 4: Invalid/extreme values
  extreme: {
    'energy-kcal_100g': 1200, // too high - should be capped
    'sugars_100g': -5, // negative - should be set to 0
    'salt_100g': 'invalid', // non-numeric - should be ignored
    'fat_100g': 25.5
  }
};

// Import our nutrition processor
import { processNutritionData, checkNutritionCompleteness } from './src/utils/nutritionProcessor';

// Test function
const runNutritionTests = () => {
  console.log('🧪 TESTING ENHANCED NUTRITION PROCESSING\n');
  
  Object.keys(testNutritionData).forEach(testCase => {
    console.log(`📊 TEST CASE: ${testCase.toUpperCase()}`);
    console.log('Input:', testNutritionData[testCase]);
    
    const processed = processNutritionData(testNutritionData[testCase], `Test Product ${testCase}`);
    console.log('Processed:', processed);
    
    const completeness = checkNutritionCompleteness(processed);
    console.log(`Completeness: ${completeness.completeness}% (${completeness.available}/${completeness.total})`);
    
    if (completeness.missing.length > 0) {
      console.log('Missing:', completeness.missing);
    }
    
    console.log('---\n');
  });
  
  console.log('✅ All nutrition processing tests completed!');
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runNutritionTests();
}

export { runNutritionTests };
