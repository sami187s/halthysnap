import { fetchProductByBarcode, testAPIConnection } from '../services/reliableAPI';

// Test function to debug API issues
export const debugProductFetch = async (barcode) => {
  
  try {
    // First test API connectivity
    const apiWorking = await testAPIConnection();
    
    // Try to fetch the product
    const product = await fetchProductByBarcode(barcode);
    return product;
    
  } catch (error) {
    
    // Return test data for debugging
    return createTestProduct(barcode);
  }
};

// Create test product data for debugging
const createTestProduct = (barcode) => {
  const isFood = Math.random() > 0.5; // Random food or beauty product
  
  if (isFood) {
    return {
      barcode: barcode,
      product_name: 'Test Food Product',
      brands: 'Test Brand',
      categories: 'food, snacks',
      ingredients_text: 'water, sugar, natural flavors, citric acid, vitamin c',
      image_url: null,
      source: 'Test Data - Open Food Facts',
      nutriments: {
        energy: 150,
        sugars: 12,
        salt: 0.1
      }
    };
  } else {
    return {
      barcode: barcode,
      product_name: 'Test Beauty Product',
      brands: 'Test Beauty Brand',
      categories: 'cosmetics, skincare',
      ingredients_text: 'aqua, glycerin, dimethicone, phenoxyethanol, fragrance',
      image_url: null,
      source: 'Test Data - Open Beauty Facts'
    };
  }
};

// Test with known working barcodes
export const testKnownBarcodes = async () => {
  const knownBarcodes = [
    '5449000000996', // Coca Cola
    '3017620422003', // Nutella
    '8712100849275', // Nivea Cream
    '3574661367022', // L'Oreal Shampoo
  ];
  
  
  for (const barcode of knownBarcodes) {
    try {
      const result = await debugProductFetch(barcode);
    } catch (error) {
    }
  }
};

export default debugProductFetch;
