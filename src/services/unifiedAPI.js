import axios from 'axios';
import { localCrashReporter } from '../utils/crashReporting';

// API Base URLs
const OPEN_BEAUTY_FACTS_BASE_URL = 'https://world.openbeautyfacts.org/api/v0/product';
const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

// Unified product fetcher that searches across all available APIs
export const fetchProductByBarcode = async (barcode) => {
  
  const timeoutMs = 8000; // 8 seconds max per request
  
  // API search order (most relevant first)
  const apis = [
    {
      name: 'Open Beauty Facts',
      url: `${OPEN_BEAUTY_FACTS_BASE_URL}/${barcode}.json`,
      type: 'beauty'
    },
    {
      name: 'Open Food Facts', 
      url: `${OPEN_FOOD_FACTS_BASE_URL}/${barcode}.json`,
      type: 'food'
    }
  ];

  // Try each API sequentially
  for (const api of apis) {
    try {
      const response = await axios.get(api.url, { timeout: timeoutMs });
      
      if (response.data.status === 1) {
        const product = response.data.product;
        
        return formatProductData(product, barcode, api.name, api.type);
      }
    } catch (error) {
      localCrashReporter.captureError(error, {
        component: 'unifiedAPI',
        function: 'fetchProductByBarcode',
        api: api.name,
        barcode
      });
    }
  }

  // If not found, return demo data
  return createDemoProduct(barcode);
};

// Format product data from any API into standardized format
const formatProductData = (product, barcode, source, type) => {
  return {
    product_name: product.product_name || 'Unknown Product',
    brands: product.brands || 'Unknown Brand',
    image_url: product.image_url || product.image_front_url || null,
    ingredients_text: product.ingredients_text || '',
    ingredients: product.ingredients || [],
    categories: product.categories || '',
    barcode: barcode,
    nutriscore_grade: product.nutriscore_grade || null,
    nova_group: product.nova_group || null,
    nutrition_grades: product.nutrition_grades || null,
    labels: product.labels || '',
    source: source,
    product_type: type,
    // Additional nutrition data for food products
    nutriments: product.nutriments || {},
    // Additional beauty/cosmetic data
    ingredients_analysis: product.ingredients_analysis || {},
    ecoscore_grade: product.ecoscore_grade || null
  };
};

// Create demo products for testing
const createDemoProduct = (barcode) => {
  const demoProducts = {
    excellent: {
      ingredients: 'aqua, glycerin, hyaluronic acid, ceramides, niacinamide, vitamin e, zinc oxide, allantoin',
      name: 'Premium Natural Face Cream',
      brand: 'NaturalCare',
      category: 'face care, moisturizer',
      type: 'beauty'
    },
    good: {
      ingredients: 'aqua, glycerin, cetyl alcohol, dimethicone, panthenol, vitamin e, phenoxyethanol',
      name: 'Daily Moisturizer',
      brand: 'SkinEssentials', 
      category: 'face care, daily care',
      type: 'beauty'
    },
    food_good: {
      ingredients: 'organic wheat flour, organic sugar, organic eggs, organic butter, baking powder, vanilla extract',
      name: 'Organic Cookies',
      brand: 'HealthyBites',
      category: 'snacks, cookies, organic',
      type: 'food'
    },
    food_mediocre: {
      ingredients: 'wheat flour, sugar, palm oil, corn syrup, artificial flavors, preservatives (E202, E211), colorants',
      name: 'Standard Crackers',
      brand: 'SnackCorp',
      category: 'snacks, crackers',
      type: 'food'
    },
    poor: {
      ingredients: 'aqua, sodium lauryl sulfate, parabens, formaldehyde, triclosan, synthetic fragrances, phthalates',
      name: 'Harsh Chemical Cleanser',
      brand: 'ChemicalCorp',
      category: 'cleansing, harsh',
      type: 'beauty'
    }
  };

  // Determine demo product type based on barcode pattern
  let demoType;
  const lastDigit = parseInt(barcode.slice(-1));
  const secondLastDigit = parseInt(barcode.slice(-2, -1));
  
  if (lastDigit >= 8) {
    demoType = 'excellent';
  } else if (lastDigit >= 6) {
    demoType = 'good';
  } else if (lastDigit >= 4) {
    demoType = 'food_good';
  } else if (lastDigit >= 2) {
    demoType = 'food_mediocre';
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
    nutriscore_grade: selectedDemo.type === 'food' ? (demoType.includes('good') ? 'b' : 'c') : null,
    nova_group: selectedDemo.type === 'food' ? (demoType.includes('good') ? 1 : 3) : null,
    labels: selectedDemo.type === 'food' && demoType.includes('good') ? 'organic' : '',
    source: `Demo Data - ${demoType.charAt(0).toUpperCase() + demoType.slice(1)}`,
    product_type: selectedDemo.type,
    nutriments: selectedDemo.type === 'food' ? {
      energy: Math.floor(Math.random() * 500) + 200,
      fat: Math.floor(Math.random() * 20) + 5,
      sugars: Math.floor(Math.random() * 30) + 5,
      salt: Math.floor(Math.random() * 2) + 0.5
    } : {},
    ingredients_analysis: {}
  };
};

// Unified search across all APIs
export const searchProductByName = async (productName) => {
  
  const searchAPIs = [
    {
      name: 'Open Beauty Facts',
      url: 'https://world.openbeautyfacts.org/cgi/search.pl',
      type: 'beauty'
    },
    {
      name: 'Open Food Facts',
      url: 'https://world.openfoodfacts.org/cgi/search.pl', 
      type: 'food'
    }
  ];

  let allResults = [];

  for (const api of searchAPIs) {
    try {
      const response = await axios.get(api.url, {
        params: {
          search_terms: productName,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 5 // Limit results per API
        },
        timeout: 8000
      });

      if (response.data.products && response.data.products.length > 0) {
        const formattedProducts = response.data.products.map(product => ({
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          image: product.image_url || product.image_front_url || null,
          barcode: product.code,
          categories: product.categories || '',
          source: api.name,
          type: api.type
        }));
        
        allResults = [...allResults, ...formattedProducts];
      }
    } catch (error) {
      localCrashReporter.captureError(error, {
        component: 'unifiedAPI',
        function: 'searchProductByName',
        api: api.name,
        searchTerm: productName
      });
    }
  }

  if (allResults.length > 0) {
    return {
      success: true,
      data: allResults,
      totalResults: allResults.length,
      sources: [...new Set(allResults.map(r => r.source))]
    };
  }

  return {
    success: false,
    error: 'No products found in any database',
    searchedAPIs: searchAPIs.map(api => api.name)
  };
};

// Get product suggestions based on category
export const getProductSuggestions = async (category, limit = 10) => {
  
  try {
    // Search Open Food Facts for category suggestions
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: category,
        search_tag: 'categories',
        action: 'process',
        json: 1,
        page_size: limit
      },
      timeout: 8000
    });

    if (response.data.products && response.data.products.length > 0) {
      return {
        success: true,
        data: response.data.products.map(product => ({
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          image: product.image_url || product.image_front_url || null,
          barcode: product.code,
          categories: product.categories || '',
          nutriscore: product.nutriscore_grade || null,
          source: 'Open Food Facts'
        }))
      };
    }

    return {
      success: false,
      error: 'No suggestions found for this category'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get product suggestions'
    };
  }
};

// API health check
export const checkAPIHealth = async () => {
  const apis = [
    { name: 'Open Beauty Facts', url: 'https://world.openbeautyfacts.org/api/v0/product/3274080005003.json' },
    { name: 'Open Food Facts', url: 'https://world.openfoodfacts.org/api/v0/product/3017620422003.json' }
  ];

  const results = {};

  for (const api of apis) {
    try {
      const start = Date.now();
      await axios.get(api.url, { timeout: 5000 });
      const responseTime = Date.now() - start;
      
      results[api.name] = {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      results[api.name] = {
        status: 'error',
        error: error.message
      };
    }
  }

  return results;
};
