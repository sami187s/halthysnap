/**
 * Test AI System Functionality
 * This script tests the complete AI system including error handling
 */

const aiService = require('./src/services/aiService');

// Mock product data for testing
const mockProduct = {
  product_name: "Test Moisturizer",
  brands: "Test Brand",
  ingredients_text: "aqua, glycerin, dimethicone, parabens, fragrance"
};

const mockIngredients = ["aqua", "glycerin", "dimethicone", "parabens", "fragrance"];

async function testAISystem() {
  console.log('🧪 Testing AI System...\n');

  // Test 1: Normal AI Analysis
  console.log('1️⃣ Testing Normal AI Analysis:');
  try {
    const analysis = await aiService.analyzeProduct(mockProduct, mockIngredients);
    console.log('✅ AI Analysis successful!');
    console.log('📊 AI Score:', analysis.aiScore);
    console.log('📝 Summary:', analysis.summary.substring(0, 100) + '...');
    console.log('🔍 Has error flag:', analysis.error || 'No error');
    console.log('');
  } catch (error) {
    console.log('❌ AI Analysis failed:', error.message);
  }

  // Test 2: AI Chat
  console.log('2️⃣ Testing AI Chat:');
  try {
    const response = await aiService.askQuestion(mockProduct, mockIngredients, "Is this product safe?");
    console.log('✅ AI Chat successful!');
    console.log('💬 Response:', response.substring(0, 100) + '...');
    console.log('');
  } catch (error) {
    console.log('❌ AI Chat failed:', error.message);
  }

  // Test 3: Test with invalid API key (simulate error)
  console.log('3️⃣ Testing Error Handling:');
  try {
    // Temporarily save the original API key
    const originalKey = process.env.OPENAI_API_KEY;
    
    // Set invalid key to force error
    process.env.OPENAI_API_KEY = 'invalid-key-test';
    
    const errorAnalysis = await aiService.analyzeProduct(mockProduct, mockIngredients);
    console.log('✅ Error handling works!');
    console.log('📊 Fallback AI Score:', errorAnalysis.aiScore);
    console.log('📝 Fallback Summary:', errorAnalysis.summary);
    console.log('🚨 Error flag:', errorAnalysis.error);
    
    // Restore original key
    process.env.OPENAI_API_KEY = originalKey;
    console.log('');
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }

  console.log('🎉 AI System Test Complete!');
}

// Run the test
testAISystem().catch(console.error);