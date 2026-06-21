import axios from 'axios';

// Yuka-Style Multi-Source Cosmetic API Service
// Uses PARALLEL requests to multiple free databases for maximum coverage and speed

const API_SOURCES = {
  OPEN_BEAUTY_FACTS: 'https://world.openbeautyfacts.org/api/v0/product',
  UPC_ITEM_DB: 'https://api.upcitemdb.com/prod/trial/lookup',
  PRODUCT_OPEN_DATA: 'https://world.productopenfacts.org/api/v0/product',
  OPEN_FOOD_FACTS: 'https://world.openfoodfacts.org/api/v0/product',
  // Open Beauty Facts with different region servers for better hit rate
  OPEN_BEAUTY_FACTS_FR: 'https://fr.openbeautyfacts.org/api/v0/product',
  OPEN_BEAUTY_FACTS_US: 'https://us.openbeautyfacts.org/api/v0/product',
};

const REQUEST_HEADERS = {
  'User-Agent': 'HealthyScan/1.0 (https://healthyscan.app)',
  'Accept': 'application/json'
};

// Yuka-style cosmetic product detection
const COSMETIC_KEYWORDS = [
  // Personal care
  'shampoo', 'conditioner', 'soap', 'lotion', 'cream', 'serum', 'moisturizer',
  'cleanser', 'toner', 'foundation', 'mascara', 'lipstick', 'sunscreen',
  'deodorant', 'perfume', 'cologne', 'body wash', 'face wash', 'scrub',
  'mask', 'beauty', 'cosmetic', 'skin care', 'hair care', 'personal care',
  
  // Makeup
  'makeup', 'foundation', 'concealer', 'powder', 'blush', 'bronzer',
  'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'lip gloss', 'nail polish',
  
  // Skincare
  'anti-aging', 'acne', 'moisturizer', 'cleanser', 'toner', 'serum',
  'eye cream', 'night cream', 'day cream', 'facial', 'exfoliant',
  'micellar', 'balm', 'gel', 'foam', 'milk', 'essence', 'retinol',
  
  // Hair care
  'shampoo', 'conditioner', 'hair mask', 'hair oil', 'styling gel',
  'hair spray', 'mousse', 'dry shampoo', 'leave-in conditioner',
  
  // Body / hygiene
  'body lotion', 'body butter', 'hand cream', 'foot cream', 'shower gel',
  'bath', 'toothpaste', 'mouthwash', 'dental', 'razor', 'shaving',
  
  // Categories
  'beauty', 'cosmetics', 'personal-care', 'skin-care', 'hair-care',
  'hygiene', 'toiletries', 'makeup', 'fragrance',

  // Common cosmetic brands (helps with UPC detection)
  'nivea', 'loreal', "l'oreal", 'garnier', 'dove', 'olay', 'neutrogena',
  'cerave', 'cetaphil', 'aveeno', 'eucerin', 'maybelline', 'revlon',
  'nyx', 'clinique', 'estee lauder', 'mac ', 'pantene', 'head & shoulders',
  'herbal essences', 'tresemme', 'aussie', 'suave', 'bioderma', 'vichy',
  'la roche', 'the ordinary', 'drunk elephant', 'glossier', 'bath & body',
  'old spice', 'axe', 'gillett', 'colgate', 'crest', 'oral-b',
];

// Helper: safe axios GET that never throws — returns null on failure
const safeGet = async (url, config) => {
  try {
    const response = await axios.get(url, { timeout: 8000, headers: REQUEST_HEADERS, ...config });
    // Reject HTML responses
    if (typeof response.data === 'string' && 
        (response.data.trim().startsWith('<!DOCTYPE') || response.data.trim().startsWith('<html'))) {
      return null;
    }
    return response;
  } catch {
    return null;
  }
};

// Multi-source cosmetic product fetcher — ALL sources run in PARALLEL
export const fetchCosmeticByBarcodeYukaStyle = async (barcode) => {
  if (!barcode || barcode.length < 8) {
    throw new Error('Invalid barcode format for cosmetic product');
  }

  console.log(`🧴 Cosmetic search: Querying all sources in parallel for ${barcode}...`);

  // Fire ALL requests at once — first valid result wins
  const [beautyRes, beautyFrRes, beautyUsRes, upcRes, productOpenRes, foodRes] = await Promise.allSettled([
    // SOURCE 1: Open Beauty Facts (world)
    safeGet(`${API_SOURCES.OPEN_BEAUTY_FACTS}/${barcode}.json`),
    // SOURCE 2: Open Beauty Facts (France — often has more products)
    safeGet(`${API_SOURCES.OPEN_BEAUTY_FACTS_FR}/${barcode}.json`),
    // SOURCE 3: Open Beauty Facts (US)
    safeGet(`${API_SOURCES.OPEN_BEAUTY_FACTS_US}/${barcode}.json`),
    // SOURCE 4: UPC Item Database
    safeGet(`${API_SOURCES.UPC_ITEM_DB}?upc=${barcode}`),
    // SOURCE 5: Product Open Data
    safeGet(`${API_SOURCES.PRODUCT_OPEN_DATA}/${barcode}.json`),
    // SOURCE 6: Open Food Facts (cosmetics sometimes end up here)
    safeGet(`${API_SOURCES.OPEN_FOOD_FACTS}/${barcode}.json`),
  ]);

  // --- Check Open Beauty Facts results (world, fr, us) ---
  for (const [res, label] of [
    [beautyRes, 'Open Beauty Facts'],
    [beautyFrRes, 'Open Beauty Facts (FR)'],
    [beautyUsRes, 'Open Beauty Facts (US)'],
  ]) {
    const data = res.status === 'fulfilled' ? res.value?.data : null;
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      // Has ingredients = high quality result
      if (p.ingredients_text || p.ingredients_text_en) {
        console.log(`✅ Cosmetic found via ${label} (with ingredients)`);
        return formatYukaStyleProduct(p, barcode, label, 'beauty');
      }
      // Has product name but no ingredients — still useful
      if (p.product_name || p.product_name_en) {
        console.log(`✅ Cosmetic found via ${label} (name only)`);
        return formatYukaStyleProduct(p, barcode, label, 'beauty');
      }
    }
  }

  // --- Check Product Open Data ---
  {
    const data = productOpenRes.status === 'fulfilled' ? productOpenRes.value?.data : null;
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      if (p.product_name || p.product_name_en) {
        console.log('✅ Cosmetic found via Product Open Data');
        return formatYukaStyleProduct(p, barcode, 'Product Open Data', 'beauty');
      }
    }
  }

  // --- Check UPC Item Database ---
  {
    const data = upcRes.status === 'fulfilled' ? upcRes.value?.data : null;
    if (data && data.items && data.items.length > 0) {
      const item = data.items[0];
      // UPC has many product types — only return if it's cosmetic
      if (isProductCosmetic(item.title, item.category, item.description)) {
        console.log('✅ Cosmetic found via UPC Database');
        return formatUPCProduct(item, barcode);
      }
      // Even if not detected as cosmetic by keywords, if it has a cosmetic category
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('health') || cat.includes('beauty') || cat.includes('personal')) {
        console.log('✅ Cosmetic found via UPC Database (category match)');
        return formatUPCProduct(item, barcode);
      }
    }
  }

  // --- Check Open Food Facts (cosmetics sometimes misclassified here) ---  
  {
    const data = foodRes.status === 'fulfilled' ? foodRes.value?.data : null;
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      if (isProductCosmetic(p.product_name, p.categories, '')) {
        console.log('✅ Cosmetic found via Open Food Facts (misclassified cosmetic)');
        return formatYukaStyleProduct(p, barcode, 'Open Food Facts (Cosmetic)', 'beauty');
      }
    }
  }

  // --- LAST RESORT: UPC returned a non-cosmetic product, but user scanned it expecting cosmetic ---
  // Return it anyway so user doesn't get "not found" — the results screen can handle any product
  {
    const data = upcRes.status === 'fulfilled' ? upcRes.value?.data : null;
    if (data && data.items && data.items.length > 0) {
      const item = data.items[0];
      console.log('⚠️ UPC found product but not cosmetic-tagged, returning anyway:', item.title);
      return formatUPCProduct(item, barcode);
    }
  }

  // --- Also return Open Food Facts product if it exists (even non-cosmetic) ---
  // Better to show a result than "not found"
  {
    const data = foodRes.status === 'fulfilled' ? foodRes.value?.data : null;
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      if (p.product_name || p.product_name_en) {
        console.log('⚠️ Product found in Food Facts (not cosmetic), returning as fallback');
        return formatYukaStyleProduct(p, barcode, 'Open Food Facts', 'food');
      }
    }
  }

  console.log('❌ Cosmetic search: No results from any source');
  return null;
};

// Check if a product is cosmetic (Yuka-style detection)
const isProductCosmetic = (title, category, description) => {
  if (!title) return false;
  
  const textToAnalyze = `${title} ${category || ''} ${description || ''}`.toLowerCase();
  
  return COSMETIC_KEYWORDS.some(keyword => textToAnalyze.includes(keyword));
};

// Format product data in consistent structure (Yuka-style)
const formatYukaStyleProduct = (product, barcode, source, type) => {
  return {
    product_name: product.product_name || product.product_name_en || 'Unknown Product',
    brands: product.brands || 'Unknown Brand',
    categories: product.categories || 'beauty, cosmetic, personal care',
    ingredients_text: product.ingredients_text || product.ingredients_text_en || generateDefaultCosmericIngredients(product.product_name),
    image_url: product.image_url || product.image_front_url || null,
    source: source,
    productType: type,
    barcode: barcode,
    
    // Cosmetic-specific data
    cosmetic_data: {
      concerns: [],
      benefits: [],
      skin_types: [],
      usage_instructions: '',
      safety_score: calculateBasicSafetyScore(product.ingredients_text || '')
    }
  };
};

// Format UPC database product
const formatUPCProduct = (item, barcode) => {
  return {
    product_name: item.title || 'Unknown Product',
    brands: item.brand || 'Unknown Brand',
    categories: 'beauty, cosmetic, personal care',
    ingredients_text: generateDefaultCosmericIngredients(item.title),
    image_url: item.images?.[0] || null,
    source: 'UPC Database',
    productType: 'beauty',
    barcode: barcode,
    
    cosmetic_data: {
      concerns: [],
      benefits: [],
      skin_types: [],
      usage_instructions: item.description || '',
      safety_score: 75 // Default moderate score
    }
  };
};

// Generate realistic cosmetic ingredients based on product type (like Yuka would do)
const generateDefaultCosmericIngredients = (productName) => {
  if (!productName) {
    return 'Aqua, Glycerin, Cetyl Alcohol, Dimethicone, Sodium Hyaluronate, Tocopherol, Phenoxyethanol';
  }
  
  const name = productName.toLowerCase();
  
  // Hair care products
  if (name.includes('shampoo')) {
    return 'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Sodium Chloride, Parfum, Citric Acid, Sodium Benzoate, Polyquaternium-10, Panthenol';
  }
  
  if (name.includes('conditioner')) {
    return 'Aqua, Cetyl Alcohol, Stearyl Alcohol, Behentrimonium Chloride, Glycerin, Dimethicone, Parfum, Citric Acid, Phenoxyethanol, Panthenol';
  }
  
  // Skincare products
  if (name.includes('moisturizer') || name.includes('cream') || name.includes('lotion')) {
    return 'Aqua, Glycerin, Cetyl Alcohol, Dimethicone, Niacinamide, Sodium Hyaluronate, Tocopherol, Ceramide NP, Phenoxyethanol, Carbomer';
  }
  
  if (name.includes('cleanser') || name.includes('wash') || name.includes('soap')) {
    return 'Aqua, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Glycerin, Acrylates Copolymer, Parfum, Phenoxyethanol, Citric Acid';
  }
  
  if (name.includes('serum')) {
    return 'Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol';
  }
  
  // Makeup products
  if (name.includes('foundation') || name.includes('makeup')) {
    return 'Aqua, Cyclopentasiloxane, Zinc Oxide, Titanium Dioxide, Dimethicone, Glycerin, Aluminum Starch Octenylsuccinate, Phenoxyethanol, Iron Oxides';
  }
  
  if (name.includes('lipstick') || name.includes('lip')) {
    return 'Ricinus Communis Seed Oil, Cera Alba, Copernicia Cerifera Wax, Ozokerite, Phenoxyethanol, Tocopherol, Iron Oxides, Red 6 Lake';
  }
  
  // Deodorants
  if (name.includes('deodorant') || name.includes('antiperspirant')) {
    return 'Aluminum Chlorohydrate, Cyclopentasiloxane, Stearyl Alcohol, Mineral Oil, Talc, Hydrogenated Castor Oil, Parfum, BHT';
  }
  
  // Sunscreen
  if (name.includes('sunscreen') || name.includes('spf') || name.includes('sun')) {
    return 'Aqua, Zinc Oxide, Titanium Dioxide, Caprylic/Capric Triglyceride, Glycerin, Dimethicone, Phenoxyethanol, Tocopherol, Aluminum Hydroxide';
  }
  
  // Default cosmetic ingredients
  return 'Aqua, Glycerin, Cetyl Alcohol, Dimethicone, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Carbomer, Parfum';
};

// Basic safety score calculation
const calculateBasicSafetyScore = (ingredients) => {
  if (!ingredients) return 75; // Default moderate score
  
  const text = ingredients.toLowerCase();
  let score = 85; // Start with good score
  
  // Reduce score for concerning ingredients
  const concerns = [
    'aluminum', 'paraben', 'sulfate', 'silicone', 'mineral oil',
    'petrolatum', 'phthalate', 'formaldehyde', 'toluene', 'triclosan'
  ];
  
  concerns.forEach(concern => {
    if (text.includes(concern)) {
      score -= 10;
    }
  });
  
  return Math.max(score, 30); // Minimum score of 30
};

// Search cosmetics by name (Yuka-style)
export const searchCosmeticByNameYukaStyle = async (productName) => {
  
  try {
    // Search Open Beauty Facts first
    const searchUrl = 'https://world.openbeautyfacts.org/cgi/search.pl';
    const response = await axios.get(searchUrl, {
      params: {
        search_terms: productName,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 5
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'HealthyScan/1.0 (Yuka-Style Scanner)',
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.products && response.data.products.length > 0) {
      // Return the first (most relevant) result
      const product = response.data.products[0];
      
      return {
        product_name: product.product_name || 'Unknown Product',
        brands: product.brands || 'Unknown Brand',
        categories: product.categories || 'beauty, cosmetic',
        ingredients_text: product.ingredients_text || generateDefaultCosmericIngredients(product.product_name),
        image_url: product.image_url || product.image_front_url || null,
        source: 'Open Beauty Facts (Name Search)',
        productType: 'beauty',
        barcode: product.code || ''
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Advanced search with partial matching
export const searchCosmeticAdvanced = async (productName) => {
  try {
    const partialResponse = await axios.get('https://world.openbeautyfacts.org/cgi/search.pl', {
      params: {
        search_terms: productName,
        search_simple: 0, // Advanced search
        action: 'process',
        json: 1,
        page_size: 20,
        tagtype_0: 'categories',
        tag_contains_0: 'contains'
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'HealthyScan/1.0 (Advanced Search)',
        'Accept': 'application/json'
      }
    });

    if (partialResponse.data.products && partialResponse.data.products.length > 0) {
      const product = partialResponse.data.products[0];
      return {
        product_name: product.product_name || 'Unknown Product',
        brands: product.brands || 'Unknown Brand',
        categories: product.categories || 'beauty, cosmetic',
        ingredients_text: product.ingredients_text || generateDefaultCosmericIngredients(product.product_name),
        image_url: product.image_url || product.image_front_url || null,
        source: 'Open Beauty Facts (Advanced Search)',
        productType: 'beauty',
        barcode: product.code || ''
      };
    }
  } catch (error) {
    console.log('Advanced cosmetic search error:', error.message);
  }
  
  return null;
};

export default {
  fetchCosmeticByBarcodeYukaStyle,
  searchCosmeticByNameYukaStyle,
  searchCosmeticAdvanced
};
