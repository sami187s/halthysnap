// Test Enhanced Cosmetic Database Integration
// This script tests the improved ingredient analysis with comprehensive databases

const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

// Test cosmetic products with common ingredients
const testProducts = [
  {
    name: "L'Oreal Moisturizer",
    ingredients: "Aqua, Glycerin, Dimethicone, Niacinamide, Sodium Hyaluronate, Phenoxyethanol, Fragrance, Tocopherol"
  },
  {
    name: "Neutrogena Cleanser", 
    ingredients: "Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Sodium Chloride, Citric Acid"
  },
  {
    name: "CeraVe Cream",
    ingredients: "Aqua, Glycerin, Cetyl Alcohol, Dimethicone, Phenoxyethanol, Ceramides, Hyaluronic Acid"
  },
  {
    name: "The Ordinary Serum",
    ingredients: "Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum"
  }
];

console.log('🧪 Testing Enhanced Cosmetic Database Integration\n');
console.log('===============================================\n');

testProducts.forEach((product, index) => {
  console.log(`\n📦 Testing Product ${index + 1}: ${product.name}`);
  console.log(`📋 Ingredients: ${product.ingredients}`);
  console.log('----------------------------------------');
  
  try {
    const analysis = analyzeIngredients(product.ingredients, 'cosmetic');
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Overall Score: ${analysis.score}/100`);
    console.log(`   Total Ingredients: ${analysis.analyzedIngredients?.length || 0}`);
    console.log(`   Good Ingredients: ${analysis.goodIngredients?.length || 0}`);
    console.log(`   Moderate Ingredients: ${analysis.moderateIngredients?.length || 0}`);
    console.log(`   Bad Ingredients: ${analysis.badIngredients?.length || 0}`);
    console.log(`   Unknown Ingredients: ${analysis.unknownIngredients?.length || 0}`);
    
    // Check if we reduced unknown ingredients
    const unknownPercentage = (analysis.unknownIngredients?.length || 0) / (analysis.analyzedIngredients?.length || 1) * 100;
    
    if (unknownPercentage < 30) {
      console.log(`   ✅ GREAT: Only ${unknownPercentage.toFixed(1)}% unknown ingredients`);
    } else if (unknownPercentage < 50) {
      console.log(`   ⚠️  OKAY: ${unknownPercentage.toFixed(1)}% unknown ingredients`);
    } else {
      console.log(`   ❌ POOR: ${unknownPercentage.toFixed(1)}% unknown ingredients`);
    }
    
    // Show detailed breakdown
    console.log(`\n📋 Detailed Breakdown:`);
    
    if (analysis.goodIngredients?.length > 0) {
      console.log(`   ✅ Good Ingredients:`);
      analysis.goodIngredients.forEach(ing => {
        console.log(`      • ${ing.name} (${ing.score}/100) - ${ing.function || 'skincare'}`);
      });
    }
    
    if (analysis.moderateIngredients?.length > 0) {
      console.log(`   ⚠️  Moderate Ingredients:`);
      analysis.moderateIngredients.forEach(ing => {
        console.log(`      • ${ing.name} (${ing.score}/100) - ${ing.function || 'unknown'}`);
      });
    }
    
    if (analysis.badIngredients?.length > 0) {
      console.log(`   ❌ Bad Ingredients:`);
      analysis.badIngredients.forEach(ing => {
        console.log(`      • ${ing.name} (${ing.score}/100) - ${ing.concerns || 'safety concerns'}`);
      });
    }
    
    if (analysis.unknownIngredients?.length > 0) {
      console.log(`   ❓ Unknown Ingredients:`);
      analysis.unknownIngredients.forEach(ing => {
        console.log(`      • ${ing.name} - ${ing.function || 'Unknown ingredient'}`);
      });
    }
    
  } catch (error) {
    console.error(`   ❌ Error analyzing product: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50));
});

console.log('\n🎯 Summary:');
console.log('If you see fewer "Unknown Ingredients" compared to before,');
console.log('the enhanced database integration is working correctly!');
console.log('\n💡 Tips for further improvement:');
console.log('- The system now uses multiple databases to identify ingredients');
console.log('- Common names, INCI names, and aliases are all checked');
console.log('- Fuzzy matching helps identify ingredient variations');
console.log('- Unknown ingredients get learning links for user education');
