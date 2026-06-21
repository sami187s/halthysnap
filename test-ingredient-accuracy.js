// Test Ingredient Analysis Accuracy
// This will show if ratings are real or random

const testIngredientAccuracy = () => {
  console.log('🧪 TESTING INGREDIENT ANALYSIS ACCURACY');
  console.log('======================================\n');
  
  // Test ingredients with known safety profiles
  const testIngredients = [
    'water',           // Should be EXCELLENT (safe)
    'hyaluronic acid', // Should be EXCELLENT (very safe)
    'niacinamide',     // Should be EXCELLENT (vitamin B3)
    'retinol',         // Should be GOOD (effective but has warnings)
    'methylparaben',   // Should be BAD (hormone disruptor)
    'sodium lauryl sulfate', // Should be BAD (harsh detergent)
    'fragrance',       // Should be MODERATE (can cause allergies)
    'phenoxyethanol',  // Should be MODERATE (preservative)
    'unknown chemical xyz' // Should be analyzed as unknown
  ];
  
  // Import the professional database
  let professionalData = null;
  try {
    professionalData = require('./src/data/professional_database.json');
    console.log('✅ Professional database loaded successfully\n');
  } catch (error) {
    console.log('❌ Could not load professional database\n');
    return;
  }
  
  console.log('🔬 TESTING EACH INGREDIENT:');
  console.log('============================\n');
  
  for (const ingredient of testIngredients) {
    console.log(`📋 INGREDIENT: ${ingredient.toUpperCase()}`);
    console.log('----------------------------');
    
    // Check cosmetic database
    const cosmeticDB = professionalData.cosmetic?.ingredients;
    const key = ingredient.replace(/\s+/g, '_');
    
    if (cosmeticDB && cosmeticDB[key]) {
      const data = cosmeticDB[key];
      console.log('✅ FOUND in Professional Database!');
      console.log(`   Safety Score: ${data.safety}/100`);
      console.log(`   Function: ${data.function}`);
      console.log(`   Pregnancy Safe: ${data.pregnancy ? 'YES' : 'NO'}`);
      console.log(`   Acne Risk: ${data.acne}/5`);
      console.log(`   Irritation: ${data.irritation}/5`);
      console.log(`   Evidence Quality: ${data.evidence}`);
      console.log(`   Notes: ${data.notes}`);
      
      // Determine category based on score
      let category = 'UNKNOWN';
      if (data.safety >= 90) category = '🟢 EXCELLENT';
      else if (data.safety >= 75) category = '🟡 GOOD'; 
      else if (data.safety >= 50) category = '🟠 MODERATE';
      else category = '🔴 BAD';
      
      console.log(`   CATEGORY: ${category}`);
      
    } else {
      console.log('❌ NOT FOUND in Professional Database');
      console.log('   Would use fallback analysis (pattern-based)');
    }
    console.log('');
  }
  
  console.log('🎯 ACCURACY TEST RESULTS:');
  console.log('=========================');
  console.log('✅ Water → Should be EXCELLENT (100% safe)');
  console.log('✅ Hyaluronic Acid → Should be EXCELLENT (proven safe humectant)');
  console.log('✅ Niacinamide → Should be EXCELLENT (vitamin B3, very safe)');
  console.log('⚠️  Retinol → Should be GOOD (effective but pregnancy warning)');
  console.log('❌ Methylparaben → Should be BAD (endocrine disruptor)');
  console.log('❌ Sodium Lauryl Sulfate → Should be BAD (harsh irritant)');
  console.log('🟠 Fragrance → Should be MODERATE (allergy risk)');
  console.log('🟠 Phenoxyethanol → Should be MODERATE (safe preservative)');
  console.log('');
  
  console.log('💡 HOW TO VERIFY ACCURACY:');
  console.log('1. Compare ratings above with known scientific facts');
  console.log('2. Check if dangerous ingredients get low scores');
  console.log('3. Check if safe ingredients get high scores');
  console.log('4. Look for evidence-based notes, not generic descriptions');
};

testIngredientAccuracy();
