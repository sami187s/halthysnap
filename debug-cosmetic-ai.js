// Debug AI visibility for cosmetic products
const debugAI = async () => {
  console.log('=== DEBUGGING AI FOR COSMETIC PRODUCTS ===');
  
  try {
    // Import AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Test 1: Check current subscription status
    console.log('1️⃣ Checking subscription status...');
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    console.log('Subscription Type:', subscriptionType);
    
    // Test 2: Check premium logic
    const isPremium = subscriptionType === 'Premium';
    console.log('Is Premium:', isPremium);
    
    // Test 3: Simulate cosmetic product data
    const cosmeticProduct = {
      product_name: 'Face Moisturizer',
      categories: ['cosmetics', 'beauty', 'skincare'],
      ingredients_text: 'Aqua, Glycerin, Dimethicone, Fragrance, Phenoxyethanol'
    };
    
    const hasProduct = !!cosmeticProduct;
    const hasIngredients = !!cosmeticProduct.ingredients_text;
    
    console.log('\n2️⃣ Product checks:');
    console.log('Has Product:', hasProduct);
    console.log('Has Ingredients:', hasIngredients);
    console.log('Product Type:', cosmeticProduct.categories);
    
    // Test 4: Check AI section display conditions
    console.log('\n3️⃣ AI Section Display Logic:');
    console.log('isPremium:', isPremium);
    console.log('hasProduct:', hasProduct);
    console.log('hasIngredients:', hasIngredients);
    
    const shouldShowAI = isPremium && hasProduct && hasIngredients;
    console.log('Should Show AI Section:', shouldShowAI);
    
    if (!shouldShowAI) {
      console.log('\n❌ AI NOT SHOWING BECAUSE:');
      if (!isPremium) console.log('- Not Premium user');
      if (!hasProduct) console.log('- No product data');
      if (!hasIngredients) console.log('- No ingredients data');
    } else {
      console.log('\n✅ AI SHOULD BE VISIBLE');
    }
    
    console.log('\n=== SOLUTION ===');
    if (!isPremium) {
      console.log('🔧 Go to TestSubscription screen and click "Switch to Premium"');
    } else {
      console.log('✅ Premium status is correct');
      console.log('🔧 Make sure you scanned a cosmetic product with ingredients');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

debugAI();