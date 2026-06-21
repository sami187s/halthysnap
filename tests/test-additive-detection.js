// Test script to debug additive detection and scoring issues
const { analyzeIngredients } = require('./src/utils/enhancedIngredientAnalyzer');

// Test product with common additives
const testProduct = {
  product: {
    product_name: "Test Cookies",
    brands: "Test Brand",
    ingredients_text: "Wheat flour, sugar, palm oil, sodium benzoate, artificial flavor, high fructose corn syrup, BHA, MSG, red dye 40, aspartame"
  }
};

console.log('🧪 Testing additive detection...');
console.log('Ingredients:', testProduct.product.ingredients_text);

const analysis = analyzeIngredients(testProduct.product.ingredients_text, 'food', {});

console.log('\n📊 Analysis Results:');
console.log('Overall Score:', analysis.overallScore);
console.log('Total Ingredients:', analysis.totalIngredients);
console.log('Matched Ingredients:', analysis.matchedIngredients);
console.log('Good Ingredients:', analysis.goodIngredients.length);
console.log('Bad Ingredients:', analysis.badIngredients.length);
console.log('Moderate Ingredients:', analysis.moderateIngredients.length);
console.log('Unknown Ingredients:', analysis.unknownIngredients.length);
console.log('Additives Found:', analysis.additives.length);

if (analysis.additives.length > 0) {
  console.log('\n🧪 Detected Additives:');
  analysis.additives.forEach((additive, index) => {
    console.log(`${index + 1}. ${additive.name} - ${additive.type} (${additive.level})`);
  });
} else {
  console.log('\n❌ No additives detected - this is the problem!');
}

// Test simple product for comparison
const testSimpleProduct = {
  product: {
    product_name: "Organic Apple",
    brands: "Nature Brand", 
    ingredients_text: "Organic apples, vitamin C"
  }
};

console.log('\n\n🍎 Testing simple product...');
console.log('Ingredients:', testSimpleProduct.product.ingredients_text);

const simpleAnalysis = analyzeIngredients(testSimpleProduct.product.ingredients_text, 'food', {});

console.log('\n📊 Simple Product Results:');
console.log('Overall Score:', simpleAnalysis.overallScore);
console.log('Additives Found:', simpleAnalysis.additives.length);
console.log('Good Ingredients:', simpleAnalysis.goodIngredients.length);
console.log('Bad Ingredients:', simpleAnalysis.badIngredients.length);
