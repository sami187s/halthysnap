import { fetchProductByBarcode } from '../services/reliableAPI';
import { getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';

export const smartNavigateToResults = async (navigation, barcode) => {
  try {
    console.log('🔍 Smart navigation starting for barcode:', barcode);
    
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
    
    // Navigate to the appropriate screen based on product type
    if (productType === 'food') {
      console.log('🍎 Navigating to Food Results');
      navigation.navigate('Results', { barcode });
    } else {
      console.log('🧴 Navigating to Cosmetic Results');
      navigation.navigate('CosmeticResults', { barcode });
    }
    
    console.log('✅ Navigation command sent successfully');
    
  } catch (error) {
    console.log('❌ Smart navigation error:', error.message);
    // Fallback to Product Not Found screen on error
    navigation.navigate('ProductNotFound', { 
      barcode,
      productType: 'unknown' 
    });
  }
};

export default smartNavigateToResults;
