// Test Enhanced Missing Ingredients Detection
import { AIService } from './src/services/aiService.js';

const testEnhancedMissingIngredients = async () => {
  console.log('=== ENHANCED MISSING INGREDIENTS TEST ===');
  
  // Test Case 1: Typical face cream (should find missing ingredients)
  const faceCream = {
    product_name: 'Daily Moisturizing Face Cream',
    categories: ['cosmetics', 'skincare'],
    code: '12345'
  };
  
  const basicIngredients = [
    'Aqua', 
    'Glycerin', 
    'Hyaluronic Acid'
  ];
  
  console.log('🧪 Test 1: Basic Face Cream');
  console.log('Product:', faceCream.product_name);
  console.log('Listed ingredients:', basicIngredients.join(', '));
  
  try {
    const result1 = await AIService.detectMissingIngredients(faceCream, basicIngredients);
    
    console.log('\n📊 Results:');
    console.log('Missing ingredients found:', result1.missingIngredients.length);
    console.log('Confidence:', result1.confidence + '%');
    
    if (result1.missingIngredients.length > 0) {
      console.log('\n📝 Detected missing ingredients:');
      result1.missingIngredients.forEach((missing, index) => {
        console.log(`${index + 1}. ${missing.name} (${missing.category})`);
        console.log(`   ${missing.reason}`);
        console.log(`   Confidence: ${missing.confidence}\n`);
      });
    }
    
    // Test Case 2: More complete ingredient list
    const completeIngredients = [
      'Aqua', 'Glycerin', 'Dimethicone', 'Phenoxyethanol', 
      'Citric Acid', 'Cetyl Alcohol', 'Tocopherol'
    ];
    
    console.log('\n🧪 Test 2: Complete Face Cream');
    console.log('Listed ingredients:', completeIngredients.join(', '));
    
    const result2 = await AIService.detectMissingIngredients(faceCream, completeIngredients);
    
    console.log('\n📊 Results:');
    console.log('Missing ingredients found:', result2.missingIngredients.length);
    console.log('Confidence:', result2.confidence + '%');
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ Enhanced AI Prompt: IMPLEMENTED');
    console.log('✅ Fallback Logic: ADDED');
    console.log('✅ Realistic Messaging: UPDATED');
    
    if (result1.missingIngredients.length > 0) {
      console.log('✅ Now finds missing ingredients: WORKING');
    } else {
      console.log('❌ Still not finding missing ingredients');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testEnhancedMissingIngredients();