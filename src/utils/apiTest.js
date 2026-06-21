// Quick API test file to verify connectivity
import axios from 'axios';

// Test popular products that are definitely in the databases (like Yuka uses)
const testProducts = [
  { barcode: '3017620422003', name: 'Nutella', type: 'food' },
  { barcode: '5449000000996', name: 'Coca Cola', type: 'food' },
  { barcode: '3175680011480', name: 'Badoit', type: 'food' },
  { barcode: '8712566355730', name: 'Rexona', type: 'beauty' },
  { barcode: '3274080005003', name: 'L\'Oreal', type: 'beauty' }
];

export const testAPI = async () => {
  
  for (const product of testProducts) {
    try {
      const url = product.type === 'food' 
        ? `https://world.openfoodfacts.org/api/v0/product/${product.barcode}.json`
        : `https://world.openbeautyfacts.org/api/v0/product/${product.barcode}.json`;
      
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'HealthyScan/1.0 (https://healthyscan.app)',
        }
      });
      
      if (response.data && response.data.status === 1) {
      } else {
      }
    } catch (error) {
    }
  }
};

// Test a specific barcode
export const testBarcode = async (barcode) => {
  
  // Try food first
  try {
    const foodUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const foodResponse = await axios.get(foodUrl, { timeout: 5000 });
    
    if (foodResponse.data && foodResponse.data.status === 1) {
      return { success: true, type: 'food', data: foodResponse.data.product };
    }
  } catch (error) {
  }
  
  // Try beauty
  try {
    const beautyUrl = `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`;
    const beautyResponse = await axios.get(beautyUrl, { timeout: 5000 });
    
    if (beautyResponse.data && beautyResponse.data.status === 1) {
      return { success: true, type: 'beauty', data: beautyResponse.data.product };
    }
  } catch (error) {
  }
  
  return { success: false, error: 'Product not found' };
};
