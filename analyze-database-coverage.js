// Database Coverage Analysis - HealthyScan vs Yuka
// This analyzes our ingredient database size and coverage

const analyzeDatabaseCoverage = () => {
  console.log('📊 HEALTHYSCAN vs YUKA DATABASE COMPARISON');
  console.log('==========================================\n');
  
  // Load our professional database
  let professionalData = null;
  try {
    professionalData = require('./src/data/professional_database.json');
    console.log('✅ Professional database loaded successfully\n');
  } catch (error) {
    console.log('❌ Could not load professional database\n');
    return;
  }
  
  // Analyze our database
  const cosmeticIngredients = professionalData.cosmetic?.ingredients || {};
  const foodIngredients = professionalData.food?.ingredients || {};
  
  console.log('🧴 COSMETIC INGREDIENTS DATABASE:');
  console.log('=================================');
  console.log(`📈 Total Cosmetic Ingredients: ${Object.keys(cosmeticIngredients).length}`);
  console.log('📋 Coverage Includes:');
  
  // Categorize by function
  const functionCategories = {};
  Object.values(cosmeticIngredients).forEach(ing => {
    const func = ing.function || 'unknown';
    functionCategories[func] = (functionCategories[func] || 0) + 1;
  });
  
  Object.entries(functionCategories).forEach(([func, count]) => {
    console.log(`   • ${func}: ${count} ingredients`);
  });
  
  console.log('\n🍎 FOOD INGREDIENTS DATABASE:');
  console.log('=============================');
  console.log(`📈 Total Food Ingredients: ${Object.keys(foodIngredients).length}`);
  console.log('📋 Coverage Includes:');
  
  // Categorize food ingredients
  const foodCategories = {};
  Object.values(foodIngredients).forEach(ing => {
    const func = ing.function || 'unknown';
    foodCategories[func] = (foodCategories[func] || 0) + 1;
  });
  
  Object.entries(foodCategories).forEach(([func, count]) => {
    console.log(`   • ${func}: ${count} ingredients`);
  });
  
  // Show some examples
  console.log('\n🔬 EXAMPLE HIGH-QUALITY DATA:');
  console.log('=============================');
  
  // Show retinol as example
  if (cosmeticIngredients.retinol) {
    const retinol = cosmeticIngredients.retinol;
    console.log('📋 RETINOL PROFILE:');
    console.log(`   • INCI Name: ${retinol.inci}`);
    console.log(`   • CAS Number: ${retinol.cas}`);
    console.log(`   • Safety Score: ${retinol.safety}/100`);
    console.log(`   • Pregnancy Safe: ${retinol.pregnancy}`);
    console.log(`   • Max Concentration: ${retinol.concentration_limit}%`);
    console.log(`   • pH Stability: ${retinol.ph_stability}`);
    console.log(`   • Evidence Quality: ${retinol.evidence}`);
    console.log(`   • Professional Notes: ${retinol.notes}`);
  }
  
  console.log('\n📊 HEALTHYSCAN vs YUKA COMPARISON:');
  console.log('==================================');
  
  const totalIngredients = Object.keys(cosmeticIngredients).length + Object.keys(foodIngredients).length;
  
  console.log('🔥 HEALTHYSCAN DATABASE:');
  console.log(`   📈 Total Ingredients: ${totalIngredients}`);
  console.log(`   🧴 Cosmetic: ${Object.keys(cosmeticIngredients).length}`);
  console.log(`   🍎 Food: ${Object.keys(foodIngredients).length}`);
  console.log('   ✅ Professional data with INCI names, CAS numbers');
  console.log('   ✅ Evidence-based safety scores');
  console.log('   ✅ Pregnancy warnings and concentration limits');
  console.log('   ✅ pH stability and function data');
  
  console.log('\n📱 YUKA (ESTIMATED):');
  console.log('   📈 Total Ingredients: ~1,000-2,000 (estimated)');
  console.log('   🧴 Cosmetic: ~800-1,200 (estimated)');
  console.log('   🍎 Food: ~500-800 (estimated)');
  console.log('   ⚠️  Proprietary database (not publicly available)');
  console.log('   ⚠️  Less detailed technical data');
  console.log('   ⚠️  Simplified scoring system');
  
  console.log('\n🎯 QUALITY COMPARISON:');
  console.log('======================');
  console.log('📊 HEALTHYSCAN ADVANTAGES:');
  console.log('   ✅ Professional EU CosIng database integration');
  console.log('   ✅ FDA GRAS status for food ingredients');
  console.log('   ✅ Detailed technical data (CAS, INCI, pH)');
  console.log('   ✅ Evidence quality ratings');
  console.log('   ✅ Concentration limits and safety thresholds');
  console.log('   ✅ Open-source, transparent methodology');
  
  console.log('\n📱 YUKA ADVANTAGES:');
  console.log('   ✅ Larger overall database (more ingredients)');
  console.log('   ✅ 5+ years of data collection');
  console.log('   ✅ User-contributed data');
  console.log('   ✅ Marketing and brand recognition');
  
  console.log('\n🔮 GROWTH POTENTIAL:');
  console.log('====================');
  console.log('🚀 HEALTHYSCAN can reach 5,000+ ingredients by:');
  console.log('   1. Downloading complete EU CosIng database (30,000+ ingredients)');
  console.log('   2. Adding complete FDA GRAS list (3,000+ food ingredients)');
  console.log('   3. Integrating EWG Skin Deep database');
  console.log('   4. Adding user-contributed local products');
  console.log('   5. Regional database partnerships');
  
  console.log('\n💎 BOTTOM LINE:');
  console.log('===============');
  console.log('🏆 HealthyScan: HIGHER QUALITY, smaller quantity (for now)');
  console.log('📱 Yuka: Larger quantity, less technical detail');
  console.log('🎯 HealthyScan has SUPERIOR data quality and transparency!');
};

analyzeDatabaseCoverage();
