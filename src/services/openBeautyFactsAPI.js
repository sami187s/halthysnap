import axios from 'axios';
import { localCrashReporter } from '../utils/crashReporting';

const OPEN_BEAUTY_FACTS_BASE_URL = 'https://world.openbeautyfacts.org/api/v0/product';
const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

export const fetchProductByBarcode = async (barcode) => {
  
  // Add timeout to prevent hanging
  const timeoutMs = 8000; // 8 seconds max per request
  
  try {
    // First try Open Beauty Facts (for cosmetics)
    const beautyResponse = await axios.get(`${OPEN_BEAUTY_FACTS_BASE_URL}/${barcode}.json`, {
      timeout: timeoutMs
    });
    
    if (beautyResponse.data.status === 1) {
      const product = beautyResponse.data.product;
      return {
        product_name: product.product_name || 'Unknown Product',
        brands: product.brands || 'Unknown Brand',
        image_url: product.image_url || product.image_front_url || null,
        ingredients_text: product.ingredients_text || '',
        ingredients: product.ingredients || [],
        categories: product.categories || '',
        barcode: barcode,
        nutriscore_grade: product.nutriscore_grade || null,
        labels: product.labels || '',
        source: 'Open Beauty Facts'
      };
    }
  } catch (error) {
    localCrashReporter.captureError(error, {
      component: 'openBeautyFactsAPI',
      function: 'fetchProductByBarcode',
      api: 'Open Beauty Facts',
      barcode
    });
  }

  try {
    // Fallback to Open Food Facts (sometimes has personal care items)
    const foodResponse = await axios.get(`${OPEN_FOOD_FACTS_BASE_URL}/${barcode}.json`, {
      timeout: timeoutMs
    });
    
    if (foodResponse.data.status === 1) {
      const product = foodResponse.data.product;
      return {
        product_name: product.product_name || 'Unknown Product',
        brands: product.brands || 'Unknown Brand',
        image_url: product.image_url || product.image_front_url || null,
        ingredients_text: product.ingredients_text || '',
        ingredients: product.ingredients || [],
        categories: product.categories || '',
        barcode: barcode,
        nutriscore_grade: product.nutriscore_grade || null,
        labels: product.labels || '',
        source: 'Open Food Facts'
      };
    }
  } catch (error) {
    localCrashReporter.captureError(error, {
      component: 'openBeautyFactsAPI',
      function: 'fetchProductByBarcode',
      api: 'Open Food Facts',
      barcode
    });
  }

  // If not found in either database, create a mock product for demonstration
  
  // Create different demo products based on barcode to show variety
  const demoProducts = {
    // Excellent products (75-100 score)
    excellent: {
      ingredients: 'aqua, glycerin, hyaluronic acid, ceramides, niacinamide, vitamin e, zinc oxide, allantoin',
      name: 'Premium Natural Face Cream',
      brand: 'NaturalCare',
      category: 'face care, moisturizer'
    },
    // Good products (50-74 score) 
    good: {
      ingredients: 'aqua, glycerin, cetyl alcohol, dimethicone, panthenol, vitamin e, phenoxyethanol',
      name: 'Daily Moisturizer',
      brand: 'SkinEssentials', 
      category: 'face care, daily care'
    },
    // Mediocre products (25-49 score)
    mediocre: {
      ingredients: 'aqua, sodium laureth sulfate, cocamidopropyl betaine, glycerin, parfum, citric acid, sodium chloride',
      name: 'Standard Shampoo',
      brand: 'BasicCare',
      category: 'hair care, shampoo'
    },
    // Poor products (0-24 score)
    poor: {
      ingredients: 'aqua, sodium lauryl sulfate, parabens, formaldehyde, triclosan, synthetic fragrances, phthalates, aluminum chloride',
      name: 'Harsh Chemical Cleanser',
      brand: 'ChemicalCorp',
      category: 'cleansing, harsh'
    }
  };

  // Determine demo product type based on barcode pattern
  let demoType;
  const lastDigit = parseInt(barcode.slice(-1));
  const secondLastDigit = parseInt(barcode.slice(-2, -1));
  
  if (lastDigit >= 7 || (lastDigit === 0 && secondLastDigit >= 5)) {
    demoType = 'excellent';
  } else if (lastDigit >= 4 || (lastDigit <= 3 && secondLastDigit >= 6)) {
    demoType = 'good'; 
  } else if (lastDigit >= 2 || (lastDigit <= 1 && secondLastDigit >= 3)) {
    demoType = 'mediocre';
  } else {
    demoType = 'poor';
  }

  const selectedDemo = demoProducts[demoType];
  
  return {
    product_name: `${selectedDemo.name} (${barcode})`,
    brands: selectedDemo.brand,
    image_url: null,
    ingredients_text: selectedDemo.ingredients,
    ingredients: selectedDemo.ingredients.split(', '),
    categories: selectedDemo.category,
    barcode: barcode,
    nutriscore_grade: null,
    labels: '',
    source: `Demo Data - ${demoType.charAt(0).toUpperCase() + demoType.slice(1)} quality product`
  };
};

export const searchProductByName = async (productName) => {
  try {
    // Search Open Beauty Facts first
    const beautyResponse = await axios.get(`https://world.openbeautyfacts.org/cgi/search.pl`, {
      params: {
        search_terms: productName,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 10
      }
    });

    if (beautyResponse.data.products && beautyResponse.data.products.length > 0) {
      return {
        success: true,
        data: beautyResponse.data.products.map(product => ({
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          image: product.image_url || product.image_front_url || null,
          barcode: product.code,
          categories: product.categories || '',
        }))
      };
    }

    // Fallback to Open Food Facts
    const foodResponse = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl`, {
      params: {
        search_terms: productName,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 10
      }
    });

    if (foodResponse.data.products && foodResponse.data.products.length > 0) {
      return {
        success: true,
        data: foodResponse.data.products.map(product => ({
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          image: product.image_url || product.image_front_url || null,
          barcode: product.code,
          categories: product.categories || '',
        }))
      };
    }

    return {
      success: false,
      error: 'No products found'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to search products'
    };
  }
};
