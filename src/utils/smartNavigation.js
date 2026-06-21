import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';

export const smartNavigateToResults = async (navigation, barcode) => {
  try {
    console.log('🔍 Smart navigation starting for barcode:', barcode);
    
    // Check premium status and trial count with error handling
    let subscriptionType = null;
    let usedTrialScans = 0;
    
    try {
      subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      usedTrialScans = usedStr ? parseInt(usedStr) : 0;
    } catch (storageError) {
      console.log('⚠️ AsyncStorage error (using defaults):', storageError.message);
    }
    
    const isPremium = subscriptionType === 'Premium';
    
    // AI access: Premium users OR first 2 trial scans
    const hasAIAccess = isPremium || usedTrialScans < 2;
    
    console.log('💎 Premium:', isPremium);
    console.log('🎯 Trial scans used:', usedTrialScans);
    console.log('✨ AI Access:', hasAIAccess);
    
    // First, fetch the product to determine its type
    const productData = await fetchProductByBarcode(barcode);
    console.log('📦 Product data received:', productData ? 'Found' : 'Not found');
    
    // Check if product was not found
    if (!productData || !productData.product_name) {
      console.log('❌ Product not found, going to ProductNotFound screen');
      navigation.navigate('ProductNotFound', { 
        barcode,
        productType: 'unknown' 
      });
      return;
    }
    
    // Determine product type using enhanced detection
    const productType = getProductTypeFromCategories(
      productData.categories,
      productData.product_name,
      productData.source
    );
    
    console.log('🎯 Product type determined:', productType);
    console.log('📝 Product details for type detection:');
    console.log('   - Categories:', productData.categories);
    console.log('   - Name:', productData.product_name);
    console.log('   - Source:', productData.source);
    
    // ✅ REMOVED: Trial counter increment moved to results screen
    // Trial counter will increment AFTER user views results, not before
    
    // Navigate to the appropriate screen based on product type
    if (productType === 'food') {
      console.log(`🍎 Navigating to Food Results (AI: ${hasAIAccess})`);
      navigation.navigate('Results', { 
        barcode,
        freeAIAccess: hasAIAccess // AI only for premium or first 2 trials
      });
    } else {
      console.log(`🧴 Navigating to Cosmetic Results (AI: ${hasAIAccess})`);
      navigation.navigate('CosmeticResults', { 
        barcode,
        freeAIAccess: hasAIAccess // AI only for premium or first 2 trials
      });
    }
    
    console.log('✅ Navigation command sent successfully');
    
  } catch (error) {
    console.log('❌ Smart navigation error:', error.message);
    console.log('❌ Error stack:', error.stack);
    
    // Fallback to Product Not Found screen on error
    navigation.navigate('ProductNotFound', { 
      barcode,
      productType: 'unknown' 
    });
  }
};

export default smartNavigateToResults;
