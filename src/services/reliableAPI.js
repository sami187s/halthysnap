import axios from 'axios';
import { processNutritionData, checkNutritionCompleteness } from '../utils/nutritionProcessor';
import { fetchCosmeticByBarcodeYukaStyle, searchCosmeticByNameYukaStyle } from './yukaStyleCosmeticAPI';
import { lookupProductRemote, fetchProductFromTurso, searchProductsInTurso, saveProductToTurso, updateNutritionInTurso, updateProductImageInTurso, updateIngredientsInTurso, fetchCosmeticFromTurso, saveCosmeticToTurso } from './tursoDB';

// Food products are served from our own Turso database.
// Cosmetics still use the Open Beauty Facts / Yuka-style sources.
const OPEN_BEAUTY_FACTS_BASE_URL = 'https://world.openbeautyfacts.org/api/v0/product';

// Add response interceptor to catch HTML responses
axios.interceptors.response.use(
  (response) => {
    // Check if response is HTML instead of JSON
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.log('❌ API returned HTML instead of JSON');
      return Promise.reject(new Error('API returned HTML instead of JSON'));
    }
    
    // Check if response data is a string starting with HTML tags
    if (typeof response.data === 'string' && 
        (response.data.trim().startsWith('<!DOCTYPE') || 
         response.data.trim().startsWith('<html'))) {
      console.log('❌ API returned HTML content');
      return Promise.reject(new Error('API returned HTML content'));
    }
    
    return response;
  },
  (error) => {
    // Enhanced error logging — use optional chaining: iOS can pass null as error object
    console.log('🔴 API Request Error:', {
      message: error?.message,
      url: error?.config?.url,
      status: error?.response?.status
    });
    return Promise.reject(error);
  }
);

// Test function to check API connectivity
export const testAPIConnection = async () => {
  try {
    // Test with a known barcode against our Turso DB
    const testBarcode = '5449000000996';
    const product = await fetchProductFromTurso(testBarcode);
    return product !== null;
  } catch {
    return false;
  }
};

// In-memory barcode cache to avoid redundant API calls during scan flow
// (Preview → SmartNav → ResultsScreen all fetch the same barcode)
const _barcodeCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

const getCachedProduct = (barcode) => {
  const entry = _barcodeCache.get(barcode);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    console.log('⚡ ReliableAPI: Cache hit for', barcode);
    return entry.data;
  }
  if (entry) _barcodeCache.delete(barcode);
  return null;
};

const setCachedProduct = (barcode, data) => {
  _barcodeCache.set(barcode, { data, ts: Date.now() });
  // Evict old entries
  if (_barcodeCache.size > 50) {
    const oldest = _barcodeCache.keys().next().value;
    _barcodeCache.delete(oldest);
  }
};

// USDA FoodData Central key
const USDA_API_KEY = '9PFcnzr3jitMIFX7wwluYn8FMIh56ioCiYoy0prl';

// USDA nutrient IDs → nutriments keys
const USDA_NUTRIENT_MAP = [
  { id: 1008, key: 'energy-kcal_100g' },
  { id: 1004, key: 'fat_100g' },
  { id: 1258, key: 'saturated-fat_100g' },
  { id: 2000, key: 'sugars_100g' },
  { id: 1003, key: 'proteins_100g' },
  { id: 1079, key: 'fiber_100g' },
  { id: 1093, key: '_sodium_mg' }, // intermediate — converted to salt below
];

/**
 * Returns true when a product is missing 2 or more of the 5 main nutrition fields.
 */
const isNutritionIncomplete = (nutriments) => {
  if (!nutriments || typeof nutriments !== 'object') return true;
  const keys = ['energy-kcal_100g', 'fat_100g', 'sugars_100g', 'proteins_100g', 'salt_100g'];
  const missing = keys.filter(k => nutriments[k] == null || nutriments[k] === '');
  return missing.length >= 2;
};

/**
 * Call USDA FoodData Central to fill in missing nutrients for a product.
 * Returns a merged nutriments object (only fills in fields that were null/missing).
 * Picks the best-matching result by name similarity — not just the first.
 * Silently returns null on any error — never blocks the scan result.
 */
const enrichNutritionFromUSDA = async (barcode, existingNutriments) => {
  if (!barcode) return null;
  try {
    const resp = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: { query: barcode, api_key: USDA_API_KEY, pageSize: 10, dataType: 'Branded' },
      timeout: 8000,
    });
    const foods = resp?.data?.foods;
    if (!Array.isArray(foods) || !foods.length) return null;

    // Only accept an EXACT barcode match. Name matching used to pull nutrition
    // from a different product (e.g. 70g sugar instead of 6g) and save it to Turso.
    const strip = (s) => String(s || '').replace(/^0+/, '');
    const food = foods.find(f => f.gtinUpc && strip(f.gtinUpc) === strip(barcode));
    if (!food) return null;

    const merged = { ...(existingNutriments || {}) };
    let sodiumMg = null;
    for (const { id, key } of USDA_NUTRIENT_MAP) {
      const n = (food.foodNutrients || []).find(fn => fn.nutrientId === id);
      if (n == null || n.value == null) continue;
      if (key === '_sodium_mg') {
        sodiumMg = n.value;
      } else if (merged[key] == null || merged[key] === '') {
        merged[key] = n.value;
      }
    }
    if (sodiumMg != null && (merged['salt_100g'] == null || merged['salt_100g'] === '')) {
      merged['salt_100g'] = parseFloat((sodiumMg * 2.5 / 1000).toFixed(3));
    }
    const ingredients_text = food.ingredients || null;
    console.log(`✅ USDA enrichment: exact barcode match ${barcode} (${food.description})`);
    return { nutriments: merged, ingredients_text };
  } catch (err) {
    console.log('⚠️ USDA enrichment skipped:', err.message);
    return null;
  }
};

// The per-100g columns we store in Turso, taken from a formatted product
// (processed values first: kJ already converted to kcal, sodium to salt).
const nutritionForSave = (result) => {
  const p = result.processed_nutrition || {};
  const raw = result.nutriments || {};
  const pick = (k) => (p[k] != null ? p[k] : raw[k] != null ? raw[k] : null);
  return {
    'energy-kcal_100g': pick('energy-kcal_100g'),
    fat_100g: pick('fat_100g'),
    'saturated-fat_100g': pick('saturated-fat_100g'),
    sugars_100g: pick('sugars_100g'),
    salt_100g: pick('salt_100g'),
    proteins_100g: pick('proteins_100g'),
    fiber_100g: pick('fiber_100g'),
  };
};

// Save a food product found through a public API (looked up BY BARCODE, so it is
// the right product) into our own database — but only if it carries real data.
const saveFoodIfUseful = (barcode, result) => {
  const nutrition = nutritionForSave(result);
  const nutritionFields = Object.values(nutrition).filter((v) => v != null).length;
  const hasIngredients = (result.ingredients_text || '').trim().length >= 3;
  if (!result.product_name || (!hasIngredients && nutritionFields < 3)) return;
  saveProductToTurso(barcode, { ...result, nutriments: nutrition });
};

// Enhanced product fetcher that actually scans real barcodes like Yuka
export const fetchProductByBarcode = async (barcode, onUpdate = null) => {
  // Product barcodes are digits only (EAN-8/UPC-E/UPC-A/EAN-13/GTIN-14). Anything
  // else (QR text, URLs) must never be dropped into an API URL.
  barcode = String(barcode || '').trim();
  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error('Invalid barcode format - barcode must be 8-14 digits');
  }

  // Check cache first — eliminates triple-fetch (preview → smartNav → results)
  const cached = getCachedProduct(barcode);
  if (cached) return cached;

  // ── MAIN FLOW: one request to our worker ─────────────────────────────────────
  // The worker checks OUR database first, fills any gaps (ingredients / nutrition / image /
  // brand) from Open Food Facts then USDA, saves everything it finds, and returns the
  // finished product. Popular products never touch a public API again.
  try {
    const remote = await lookupProductRemote(barcode);
    if (remote && remote.status === 'ok' && remote.product) {
      const p = remote.product;
      const result = formatProductData(p, barcode, p.source, p.product_type);
      setCachedProduct(barcode, result);
      return result;
    }
    if (remote && remote.status === 'notfound') return null;
    // 'busy' / 'invalid' → use the direct path below
  } catch (e) {
    console.log('⚠️ Worker lookup unavailable, using the direct API path:', e && e.message);
  }

  // ── FALLBACK: the phone asks our database and the public APIs itself ─────────
  const timeoutMs = 10000; // 10 seconds timeout like Yuka

  // STEP 1: Try our Turso database (1M+ food products) — primary source for food
  const tursoProduct = await fetchProductFromTurso(barcode);
  if (tursoProduct) {
    const result = formatProductData(tursoProduct, barcode, 'HealthyScan DB', 'food');

    // Many database rows have no nutrition yet. Fetch it from Open Food Facts BY BARCODE
    // (exact product, per-100g) BEFORE the score is shown, then save it to our database
    // so the next scan is instant. Only empty fields are filled — nothing is overwritten.
    if (isNutritionIncomplete(result.nutriments)) {
      try {
        const dbCode = tursoProduct.barcode || barcode;
        const offRes = await axios.get(
          `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=nutriments,nutriscore_grade,nova_group,ingredients_text,additives_tags`,
          { headers: { 'User-Agent': 'HealthyScan/1.0' }, timeout: 6000 }
        );
        const off = offRes?.data?.product;
        if (off) {
          const offNutrition = processNutritionData(off.nutriments || {}, tursoProduct.product_name);
          const merged = { ...(result.nutriments || {}) };
          let filled = 0;
          for (const [k, v] of Object.entries(offNutrition)) {
            if ((merged[k] == null || merged[k] === '') && v != null) { merged[k] = v; filled += 1; }
          }
          const grade = /^[a-e]$/i.test(String(off.nutriscore_grade || '')) ? String(off.nutriscore_grade).toLowerCase() : null;
          const nova = [1, 2, 3, 4].includes(Number(off.nova_group)) ? Number(off.nova_group) : null;
          if (filled > 0 || (grade && !result.nutriscore_grade) || (nova && !result.nova_group)) {
            result.nutriments = merged;
            const processed = processNutritionData(merged, result.product_name);
            result.processed_nutrition = processed;
            result.nutrition_completeness = checkNutritionCompleteness(processed).completeness;
            if (grade && !result.nutriscore_grade) result.nutriscore_grade = grade;
            if (nova && !result.nova_group) result.nova_group = nova;
            updateNutritionInTurso(dbCode, merged, { nutriscore_grade: grade, nova_group: nova });
          }
          if (off.ingredients_text && off.ingredients_text.length > (result.ingredients_text || '').length) {
            result.ingredients_text = off.ingredients_text;
            updateIngredientsInTurso(dbCode, off.ingredients_text);
          }
          if ((!result.additives_tags || result.additives_tags.length === 0) && Array.isArray(off.additives_tags) && off.additives_tags.length > 0) {
            result.additives_tags = off.additives_tags;
          }
        }
      } catch { /* Open Food Facts unreachable or product not there — carry on with what we have */ }
    }

    // If nutrition is still mostly empty, enrich from USDA in the background.
    // Fire-and-forget — does not block results screen. Calls onUpdate when done so
    // the screen refreshes live without requiring a second scan.
    const needsIngredients = !result.ingredients_text || result.ingredients_text.length < 100;
    const needsAdditives   = !result.additives_tags || result.additives_tags.length === 0;

    if (isNutritionIncomplete(result.nutriments) || needsIngredients) {
      console.log('🔍 USDA: Enriching missing nutrition/ingredients for', tursoProduct.product_name);
      enrichNutritionFromUSDA(tursoProduct.barcode || barcode, result.nutriments).then(usda => {
        if (!usda) return;
        const updates = {};
        if (usda.nutriments) {
          updateNutritionInTurso(tursoProduct.barcode || barcode, usda.nutriments);
          updates.nutriments = usda.nutriments;
        }
        if (needsIngredients && usda.ingredients_text && usda.ingredients_text.length > (result.ingredients_text || '').length) {
          updates.ingredients_text = usda.ingredients_text;
          updateIngredientsInTurso(tursoProduct.barcode || barcode, usda.ingredients_text);
        }
        if (Object.keys(updates).length > 0) {
          _barcodeCache.delete(barcode);
          if (onUpdate) onUpdate(updates);
        }
      });
    }

    // Open Food Facts fills additives_tags and any ingredients still missing after USDA.
    if (needsIngredients || needsAdditives) {
      if (onUpdate) onUpdate({ _fetchingIngredients: true });
      const fields = ['ingredients_text'];
      if (needsAdditives) fields.push('additives_tags');
      axios.get(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields.join(',')}`,
        { headers: { 'User-Agent': 'HealthyScan/1.0' }, timeout: 8000 }
      ).then(offRes => {
        const offProduct = offRes?.data?.product || {};
        const updates = { _fetchingIngredients: false };
        const fullIngredients = offProduct.ingredients_text;
        if (fullIngredients && fullIngredients.length > (result.ingredients_text || '').length) {
          updates.ingredients_text = fullIngredients;
          updateIngredientsInTurso(tursoProduct.barcode || barcode, fullIngredients);
          _barcodeCache.delete(barcode);
        }
        if (needsAdditives && offProduct.additives_tags && offProduct.additives_tags.length > 0) {
          updates.additives_tags = offProduct.additives_tags;
        }
        if (onUpdate) onUpdate(updates);
      }).catch(() => { if (onUpdate) onUpdate({ _fetchingIngredients: false }); });
    }

    setCachedProduct(barcode, result);
    return result;
  }

  // STEP 1.5: Not in the food table — check our own saved cosmetics and Open Food Facts
  // at the same time. OpenFoodFacts is food-only, so a hit there definitively means food.
  const [cosmeticSaved, offSettled] = await Promise.allSettled([
    fetchCosmeticFromTurso(barcode),
    axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'HealthyScan/1.0' }, timeout: 8000 }
    ),
  ]);

  if (cosmeticSaved.status === 'fulfilled' && cosmeticSaved.value) {
    const result = formatProductData(cosmeticSaved.value, barcode, 'HealthyScan Cosmetic DB', 'beauty');
    setCachedProduct(barcode, result);
    return result;
  }

  const offProduct = offSettled.status === 'fulfilled' ? offSettled.value?.data?.product : null;
  if (offProduct && offProduct.product_name) {
    console.log('✅ ReliableAPI: Found on OpenFoodFacts (food):', offProduct.product_name);
    const result = formatProductData(offProduct, barcode, 'Open Food Facts', 'food');
    setCachedProduct(barcode, result);
    // Write-through: keep it in our own database for next time.
    saveFoodIfUseful(barcode, result);
    return result;
  }

  // STEP 2: Not in any food DB — try cosmetic sources
  console.log('🔍 ReliableAPI: Not in food DB, trying cosmetic databases...');
  let cosmeticProduct = null;
  try {
    cosmeticProduct = await fetchCosmeticByBarcodeYukaStyle(barcode);
  } catch {
    cosmeticProduct = null;
  }

  if (cosmeticProduct) {
    console.log('✅ ReliableAPI: Cosmetic product found:', cosmeticProduct.product_name);
    const result = formatProductData(
      cosmeticProduct,
      barcode,
      cosmeticProduct.source || 'Multi-Source Cosmetic DB',
      cosmeticProduct.productType || cosmeticProduct.product_type || 'beauty'
    );
    setCachedProduct(barcode, result);
    // Write-through: keep it in our own database for next time (needs a real ingredient list).
    saveCosmeticToTurso(barcode, result);
    return result;
  }

  // STEP 2: Try UPC database as additional fallback (if not already tried by cosmetic search)
  try {
    const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
    
    const upcResponse = await axios.get(upcUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'HealthyScan/1.0 (https://healthyscan.app)',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status === 200
    });

    if (typeof upcResponse.data === 'string') {
      throw new Error('Invalid API response format');
    }
    
    if (upcResponse.data && upcResponse.data.items && upcResponse.data.items.length > 0) {
      const item = upcResponse.data.items[0];
      const isCosmetic = checkIfCosmetic(item.title, item.category, item.description);
      
      if (isCosmetic) {
        // The UPC database has no ingredient lists. Never invent one — treat as not found.
        console.log('❌ UPC cosmetic has no real ingredient data — not found');
      } else {
        const result = createFoodProduct(item, barcode);
        // Enrich with USDA (exact barcode match only) if nutrition is sparse
        if (isNutritionIncomplete(result.nutriments)) {
          const usda = await enrichNutritionFromUSDA(barcode, result.nutriments);
          if (usda?.nutriments) result.nutriments = usda.nutriments;
          if (usda?.ingredients_text && !result.ingredients_text) result.ingredients_text = usda.ingredients_text;
        }
        setCachedProduct(barcode, result);
        // Only save records that carry real data — never empty shells.
        saveFoodIfUseful(barcode, result);
        return result;
      }
    }
  } catch (error) {
    console.log('⚠️ UPC API error:', error?.message);
  }

  // STEP 3: Return null when product not found
  console.log('❌ ReliableAPI: Product not found in any database');
  return null;
};

// Enhanced search function with Yuka-style multi-source approach
export const searchProductByName = async (productName) => {
  // 🔍 SEARCH: Turso DB, OpenFoodFacts, Open Beauty Facts, USDA — IN PARALLEL
  let foodResults = [];
  let beautyResults = [];
  let usdaResults = [];

  const searchHeaders = {
    'User-Agent': 'HealthyScan/1.0 (https://healthyscan.app)',
    'Accept': 'application/json',
  };

  try {
    const [tursoSettled, beautySettled, usdaSettled, offSettled] = await Promise.allSettled([
      // SEARCH 1: Our Turso database (food products)
      searchProductsInTurso(productName),
      // SEARCH 2: Open Beauty Facts (cosmetic/beauty products)
      axios.get('https://world.openbeautyfacts.org/cgi/search.pl', {
        params: {
          search_terms: productName,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 15,
        },
        headers: searchHeaders,
        timeout: 8000,
      }),
      // SEARCH 3: (USDA name search removed on purpose) — one USDA key is shared by ALL
      // users and is limited to ~1,000 requests/hour, so a busy hour would lock everyone
      // out. Our own database + Open Food Facts cover search; USDA is still used for
      // exact-barcode nutrition lookups only.
      Promise.resolve({ data: { foods: [] } }),
      // SEARCH 4: Open Food Facts (food products — reliable fallback when Turso/USDA unavailable)
      axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
        params: {
          search_terms: productName,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 15,
          fields: 'code,product_name,brands,image_url,categories,nutriments,ingredients_text',
        },
        headers: searchHeaders,
        timeout: 8000,
      }),
    ]);

    // Process food results from Turso
    try {
      if (tursoSettled.status === 'fulfilled' && Array.isArray(tursoSettled.value)) {
        foodResults = tursoSettled.value
          .filter(p => p && p.product_name && p.product_name.trim() !== '' && p.barcode)
          .map(p => ({
            name: p.product_name,
            brand: p.brands || 'Unknown Brand',
            image: p.image_url || null,
            barcode: String(p.barcode),
            categories: 'food',
            source: 'HealthyScan DB',
            productType: 'food',
            nutriments: p.nutriments || {},
            ingredients_text: p.ingredients_text || '',
          }));
        console.log(`✅ Turso food search returned ${foodResults.length} results`);
      } else {
        console.log('⚠️ Turso search returned 0 products');
      }
    } catch (e) {
      console.log('⚠️ Turso result processing error:', e?.message);
      foodResults = [];
    }

    // Process USDA results — only include products with a barcode not already in Turso
    const tursoBarcodesFound = new Set(foodResults.map(r => r.barcode).filter(Boolean));
    try {
      if (usdaSettled.status === 'fulfilled') {
        const usdaFoods = usdaSettled.value?.data?.foods;
        if (Array.isArray(usdaFoods)) {
          for (const item of usdaFoods) {
            try {
              const rawUpc = item.gtinUpc;
              const barcode = rawUpc != null ? String(rawUpc).replace(/^0+/, '') : null;
              if (!barcode || tursoBarcodesFound.has(barcode)) continue;

              const getNutrient = (id) => {
                const nutrients = item.foodNutrients;
                if (!Array.isArray(nutrients)) return null;
                const n = nutrients.find(fn => fn && fn.nutrientId === id);
                return n ? n.value : null;
              };
              const sodiumMg = getNutrient(1093);
              const nutriments = {
                'energy-kcal_100g': getNutrient(1008),
                'fat_100g': getNutrient(1004),
                'saturated-fat_100g': getNutrient(1258),
                'sugars_100g': getNutrient(2000),
                'salt_100g': sodiumMg != null ? parseFloat((Number(sodiumMg) * 2.5 / 1000).toFixed(3)) : null,
                'proteins_100g': getNutrient(1003),
                'fiber_100g': getNutrient(1079),
              };

              const usdaProduct = {
                product_name: item.description || 'Food Product',
                brands: item.brandOwner || item.brandName || 'Unknown Brand',
                image_url: null,
                ingredients_text: item.ingredients || '',
                nutriments,
                categories: item.foodCategory || 'food',
                nutriscore_grade: null,
                nova_group: null,
                allergens_tags: [],
                additives_tags: [],
                labels: '',
              };

              usdaResults.push({
                name: usdaProduct.product_name,
                brand: usdaProduct.brands,
                image: null,
                barcode,
                categories: usdaProduct.categories,
                source: 'USDA FoodData',
                productType: 'food',
                nutriments: usdaProduct.nutriments,
                ingredients_text: usdaProduct.ingredients_text,
              });

              // (No auto-save of search results: USDA name matches were never verified,
              // and saving them polluted the product database.)
              tursoBarcodesFound.add(barcode);
            } catch (itemErr) {
              // Skip this individual item — don't abort the whole loop
            }
          }
        }
        console.log(`✅ USDA search returned ${usdaResults.length} new results`);
      } else {
        console.log('⚠️ USDA search error:', usdaSettled.reason?.message || 'Unknown');
      }
    } catch (e) {
      console.log('⚠️ USDA result processing error:', e?.message);
      usdaResults = [];
    }

    // Interleave Turso + USDA — 2 USDA for every 1 Turso, so USDA appears more
    try {
      const mixed = [];
      let t = 0, u = 0;
      while (t < foodResults.length || u < usdaResults.length) {
        if (u < usdaResults.length) { mixed.push(usdaResults[u++]); }
        if (u < usdaResults.length) { mixed.push(usdaResults[u++]); }
        if (t < foodResults.length) { mixed.push(foodResults[t++]); }
      }
      foodResults = mixed;
    } catch (e) {
      console.log('⚠️ Interleave error:', e?.message);
      foodResults = [...foodResults, ...usdaResults];
    }

    // Process Open Food Facts results (fallback food search)
    try {
      if (offSettled.status === 'fulfilled') {
        const offData = offSettled.value?.data;
        if (offData && Array.isArray(offData.products) && offData.products.length > 0) {
          const existingBarcodes = new Set(foodResults.map(r => r.barcode).filter(Boolean));
          const offFoodResults = offData.products
            .filter(p => p && p.product_name && p.product_name.trim() !== '' && p.code && !existingBarcodes.has(String(p.code)))
            .map(p => ({
              name: p.product_name,
              brand: p.brands || 'Unknown Brand',
              image: p.image_url || null,
              barcode: String(p.code),
              categories: p.categories || 'food',
              source: 'Open Food Facts',
              productType: 'food',
              nutriments: p.nutriments || {},
              ingredients_text: p.ingredients_text || '',
            }));
          console.log(`✅ OpenFoodFacts search returned ${offFoodResults.length} new results`);
          foodResults = [...foodResults, ...offFoodResults];
        }
      } else {
        console.log('⚠️ OpenFoodFacts search error:', offSettled.reason?.message || 'Unknown');
      }
    } catch (e) {
      console.log('⚠️ OFF result processing error:', e?.message);
    }

    // Process beauty results
    try {
      if (beautySettled.status === 'fulfilled') {
        const beautyData = beautySettled.value?.data;
        if (beautyData && Array.isArray(beautyData.products) && beautyData.products.length > 0) {
          beautyResults = beautyData.products
            .filter(p => p && p.product_name && p.product_name.trim() !== '' && p.code)
            .map(product => ({
              name: product.product_name,
              brand: product.brands || 'Unknown Brand',
              image: product.image_url || product.image_front_url || null,
              barcode: String(product.code),
              categories: product.categories || 'beauty, cosmetic',
              source: 'Open Beauty Facts',
              productType: 'cosmetic',
              ingredients_text: product.ingredients_text || '',
            }));
          console.log(`✅ Beauty search returned ${beautyResults.length} results`);
        } else {
          console.log('⚠️ Beauty search returned 0 products');
        }
      } else {
        console.log('❌ Beauty search FAILED:', beautySettled.reason?.message || 'Unknown error');
      }
    } catch (e) {
      console.log('⚠️ Beauty result processing error:', e?.message);
      beautyResults = [];
    }

    // STEP 3: Try Yuka-Style cosmetic search ONLY if keyword is clearly cosmetic
    const isLikelyCosmetic = checkIfCosmetic(productName, '', '');
    if (isLikelyCosmetic && !checkIfLikelyFood(productName)) {
      try {
        const cosmeticResult = await searchCosmeticByNameYukaStyle(productName);
        
        if (cosmeticResult && cosmeticResult.product_name && cosmeticResult.product_name.trim() !== '') {
          beautyResults.unshift({
            name: cosmeticResult.product_name,
            brand: cosmeticResult.brands || 'Unknown Brand',
            image: cosmeticResult.image_url || null,
            barcode: cosmeticResult.barcode || '',
            categories: cosmeticResult.categories || 'beauty, cosmetic',
            source: cosmeticResult.source || 'Multi-Source Cosmetic DB',
            productType: 'cosmetic',
            ingredients_text: cosmeticResult.ingredients_text || '',
          });
        }
      } catch (error) {
        console.log('Yuka-style search error:', error?.message);
      }
    }

    // STEP 4: Smart interleaving — prioritize based on search intent
    const isSearchingFood = checkIfLikelyFood(productName);
    const isSearchingCosmetic = checkIfCosmetic(productName, '', '');

    let allResults = [];

    if (isSearchingFood && !isSearchingCosmetic) {
      // Food-focused search: show food first, then cosmetic
      allResults = [...foodResults, ...beautyResults];
    } else if (isSearchingCosmetic && !isSearchingFood) {
      // Cosmetic-focused search: show cosmetic first, then food
      allResults = [...beautyResults, ...foodResults];
    } else {
      // Balanced search: interleave food and cosmetic, food first
      const maxLen = Math.max(foodResults.length, beautyResults.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < foodResults.length) allResults.push(foodResults[i]);
        if (i < beautyResults.length) allResults.push(beautyResults[i]);
      }
    }

    // De-duplicate by barcode (keep first occurrence)
    const seen = new Set();
    const uniqueResults = allResults.filter(item => {
      if (!item.barcode || seen.has(item.barcode)) return false;
      seen.add(item.barcode);
      return true;
    });

    console.log(`🔍 Search balanced: ${foodResults.length} food (incl. USDA), ${beautyResults.length} cosmetic, ${uniqueResults.length} total`);
    console.log(`🎯 Search intent: food=${isSearchingFood}, cosmetic=${isSearchingCosmetic}`);

    if (uniqueResults.length > 0) {
      return {
        success: true,
        data: uniqueResults,
        counts: { food: foodResults.length, cosmetic: beautyResults.length }
      };
    }

    // Distinguish "APIs unreachable" from "no matching products"
    const apisFailed =
      beautySettled.status === 'rejected' &&
      usdaSettled.status === 'rejected' &&
      offSettled.status === 'rejected' &&
      foodResults.length === 0;

    return {
      success: false,
      error: apisFailed
        ? 'Could not reach search servers. Please check your connection and try again.'
        : 'No products found. Try different keywords.',
    };
  } catch (error) {
    console.log('❌ Search overall error:', error?.message || String(error), error?.stack);
    // Return any results collected before the error instead of discarding them
    const partialResults = [...foodResults, ...beautyResults];
    if (partialResults.length > 0) {
      return {
        success: true,
        data: partialResults,
        counts: { food: foodResults.length, cosmetic: beautyResults.length },
      };
    }
    return {
      success: false,
      error: 'Could not reach search servers. Please check your connection and try again.',
    };
  }
};

// Helper: check if search term is likely a food product
const checkIfLikelyFood = (searchTerm) => {
  if (!searchTerm) return false;
  const text = searchTerm.toLowerCase();
  const foodKeywords = [
    'food', 'eat', 'drink', 'snack', 'meal', 'breakfast', 'lunch', 'dinner',
    'chocolate', 'candy', 'cookie', 'biscuit', 'cake', 'bread', 'pasta', 'rice',
    'cereal', 'granola', 'oat', 'yogurt', 'yoghurt', 'milk', 'cheese', 'butter',
    'juice', 'soda', 'cola', 'pepsi', 'water', 'tea', 'coffee', 'beer', 'wine',
    'chip', 'crisp', 'pretzel', 'popcorn', 'nut', 'almond', 'peanut',
    'fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry',
    'vegetable', 'tomato', 'potato', 'carrot', 'onion', 'garlic',
    'meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna',
    'pizza', 'burger', 'sandwich', 'wrap', 'taco', 'burrito',
    'sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'vinegar',
    'sugar', 'honey', 'syrup', 'jam', 'jelly', 'spread',
    'frozen', 'canned', 'organic', 'gluten', 'vegan',
    'nutella', 'oreo', 'doritos', 'lays', 'pringles', 'kitkat',
    'nestle', 'kellogg', 'heinz', 'kraft', 'barilla',
    'coca', 'fanta', 'sprite', 'mountain dew', 'gatorade',
    'ice cream', 'gelato', 'pudding', 'custard', 'mousse',
    'soup', 'broth', 'stew', 'noodle', 'ramen',
    'protein', 'energy', 'bar', 'supplement', 'vitamin',
    'olive', 'coconut', 'sunflower', 'canola',
  ];
  return foodKeywords.some(keyword => text.includes(keyword));
};

// Helper function to format product data consistently
const formatProductData = (product, barcode, source, type) => {
  // Only use real image URLs returned by the API — never construct/guess them
  // Guessed URLs always 404 because they're missing the revision number in the path
  let image_url = product.image_url || product.image_front_url || null;

  const formattedProduct = {
    product_name: product.product_name || 'Unknown Product',
    brands: product.brands || 'Unknown Brand',
    categories: product.categories || '',
    ingredients_text: product.ingredients_text || '',
    ingredients: product.ingredients || [],
    image_url: image_url,
    nutriments: product.nutriments || {},
    nutriscore_grade: product.nutriscore_grade || null,
    nova_group: product.nova_group || null,
    ecoscore_grade: product.ecoscore_grade || null,
    labels: product.labels || '',
    additives_tags: product.additives_tags || [],
    allergens_tags: product.allergens_tags || [],
    barcode: barcode,
    source: source,
    product_type: type,
    scans_n: product.scans_n || product.popularity_key || 0,
    unique_scans_n: product.unique_scans_n || 0,
  };

  // Process nutrition data if available
  if (formattedProduct.nutriments && Object.keys(formattedProduct.nutriments).length > 0) {
    const processedNutrition = processNutritionData(formattedProduct.nutriments, formattedProduct.product_name);
    const nutritionCheck = checkNutritionCompleteness(processedNutrition);
    
    formattedProduct.processed_nutrition = processedNutrition;
    formattedProduct.nutrition_completeness = nutritionCheck.completeness;
  }

  return formattedProduct;
};

// Helper function to format barcode for image URL
const formatBarcodeForImage = (barcode) => {
  const paddedBarcode = barcode.padStart(13, '0');
  return paddedBarcode.match(/.{1,3}/g).join('/');
};

// Helper function to check if a product is likely a cosmetic/personal care item
const checkIfCosmetic = (title, category, description) => {
  if (!title) return false;
  
  const text = `${title} ${category || ''} ${description || ''}`.toLowerCase();
  
  const cosmeticKeywords = [
    // Hair care
    'shampoo', 'conditioner', 'hair mask', 'hair oil', 'hair spray', 'hair gel', 
    'hair wax', 'hair serum', 'hair treatment', 'dry shampoo',
    
    // Skin care
    'soap', 'lotion', 'cream', 'serum', 'moisturizer', 'cleanser', 'toner', 
    'facial', 'face wash', 'face cream', 'day cream', 'night cream',
    'eye cream', 'hand cream', 'body cream', 'body lotion', 'body butter',
    'scrub', 'exfoliant', 'peeling', 'mask', 'face mask', 'sheet mask',
    'micellar', 'oil', 'balm', 'gel', 'foam', 'milk', 'essence',
    'anti-aging', 'anti-wrinkle', 'acne', 'blemish', 'pimple',
    
    // Sun care
    'sunscreen', 'sunblock', 'spf', 'sun protection', 'after sun',
    
    // Body care
    'body wash', 'shower gel', 'bath', 'deodorant', 'antiperspirant',
    
    // Makeup
    'foundation', 'concealer', 'powder', 'blush', 'bronzer', 'highlighter',
    'mascara', 'eyeliner', 'eyeshadow', 'lipstick', 'lip gloss', 'lip balm',
    'nail polish', 'nail', 'makeup', 'cosmetic',
    
    // Fragrance
    'perfume', 'cologne', 'eau de toilette', 'eau de parfum', 'fragrance',
    
    // Categories
    'beauty', 'skin care', 'hair care', 'personal care', 'hygiene',
    'cosmetics', 'toiletries', 'grooming',
    
    // Brands (common cosmetic brands)
    'nivea', 'loreal', 'garnier', 'dove', 'olay', 'neutrogena', 'cerave',
    'cetaphil', 'aveeno', 'eucerin', 'vaseline', 'johnson', 'gillette',
    'head & shoulders', 'pantene', 'herbal essences', 'maybelline',
    'revlon', 'covergirl', 'max factor', 'nyx', 'urban decay',
    
    // Skin types
    'dry skin', 'oily skin', 'sensitive skin', 'combination skin',
    'normal skin', 'mature skin', 'acne-prone'
  ];
  
  return cosmeticKeywords.some(keyword => text.includes(keyword));
};

// Create food product from UPC data
const createFoodProduct = (item, barcode) => {
  return {
    product_name: item.title || 'Food Product',
    brands: item.brand || 'Unknown Brand',
    image_url: item.images && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    ingredients_text: '',
    ingredients: [],
    categories: item.category || 'food',
    barcode: barcode,
    nutriscore_grade: null,
    nova_group: null,
    labels: '',
    source: 'UPC Database (Food)',
    product_type: 'food',
    nutriments: {},
    ecoscore_grade: null
  };
};

// Create demo product for unknown barcodes
const createDemoProduct = (barcode) => {
  return {
    product_name: 'Product Analysis Demo',
    brands: 'Demo Brand',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    ingredients_text: 'This is a demonstration. Scan a real product barcode to see actual ingredient analysis.',
    ingredients: [],
    categories: 'demo',
    barcode: barcode,
    nutriscore_grade: null,
    nova_group: null,
    labels: 'demo',
    source: 'Demo Mode',
    product_type: 'demo',
    nutriments: {},
    ecoscore_grade: null
  };
};

// API health check
export const checkAPIHealth = async () => {
  const results = {};
  
  try {
    const beautyTest = await axios.get(`${OPEN_BEAUTY_FACTS_BASE_URL}/3274080005003.json`, { timeout: 5000 });
    results['Open Beauty Facts'] = { status: 'healthy', responseTime: 'Fast' };
  } catch (error) {
    results['Open Beauty Facts'] = { status: 'error', error: error.message };
  }

  try {
    const foodTest = await axios.get('https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=code', { timeout: 5000 });
    results['Open Food Facts'] = { status: 'healthy', responseTime: 'Fast' };
  } catch (error) {
    results['Open Food Facts'] = { status: 'error', error: error.message };
  }

  return results;
};
