/**
 * Turso Database Service
 * Queries the self-hosted product database through a Cloudflare Worker proxy
 * (cf-turso-proxy/) instead of talking to Turso directly. The real Turso
 * token lives only in that Worker as a secret — the app only ever sends a
 * named action + params, never raw SQL or a DB credential. This replaces an
 * earlier version that shipped a live read-write Turso token inside the app
 * bundle.
 * Schema: code, product_name, ingredients_text, nutriscore_grade, nova_group,
 *         energy_100g, fat_100g, saturated_fat_100g, sugars_100g, salt_100g,
 *         proteins_100g, fiber_100g, additives_tags, labels_tags, countries_tags,
 *         allergens, image_url
 */

const PROXY_URL = 'https://vee-turso-proxy.samis1979s4.workers.dev';

/**
 * Call the Turso proxy Worker with a named action + params.
 * @param {number} timeoutMs - Reject after this many ms (default 10s). Pass lower for search queries.
 */
async function tursoAction(action, params = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Turso proxy HTTP error: ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error);
    }

    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convert raw Turso result rows into an array of plain objects.
 * Handles Turso cell format: { type: 'text'|'null'|..., value: string|null }
 */
function tursoRowsToObjects(result) {
  const cols = result.cols.map((c) => c.name);
  return result.rows.map((row) => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      // A NULL DB value comes back as { type: 'null', value: null }.
      // We must check the type field, not just .value, to distinguish
      // an actual null from a missing cell.
      if (!cell || cell.type === 'null') {
        obj[col] = null;
      } else {
        obj[col] = cell.value ?? null;
      }
    });
    return obj;
  });
}

/**
 * Build an Open Food Facts image URL from a barcode as a fallback.
 * Format: https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.400.jpg
 */
function getOFFImageFallback(barcode) {
  if (!barcode) return null;
  const b = String(barcode).replace(/\D/g, '');
  if (b.length === 13) {
    return `https://images.openfoodfacts.org/images/products/${b.substring(0,3)}/${b.substring(3,6)}/${b.substring(6,9)}/${b.substring(9)}/front_en.400.jpg`;
  }
  if (b.length === 8) {
    return `https://images.openfoodfacts.org/images/products/${b.substring(0,4)}/${b.substring(4)}/front_en.400.jpg`;
  }
  return `https://images.openfoodfacts.org/images/products/${b}/front_en.400.jpg`;
}

/**
 * Convert a Turso product row into the shape that reliableAPI's formatProductData expects.
 */
function tursoRowToProduct(row) {
  // Build nutriments object from individual columns
  const nutriments = {};
  // Parse a numeric column — include 0 values, skip only null/empty/NaN
  const _n = (v) => { if (v === null || v === '' || v === undefined) return null; const p = parseFloat(v); return isNaN(p) ? null : p; };
  if (_n(row.energy_100g) != null)        nutriments['energy-kcal_100g'] = _n(row.energy_100g);
  if (_n(row.fat_100g) != null)           nutriments['fat_100g'] = _n(row.fat_100g);
  if (_n(row.saturated_fat_100g) != null) nutriments['saturated-fat_100g'] = _n(row.saturated_fat_100g);
  if (_n(row.sugars_100g) != null)        nutriments['sugars_100g'] = _n(row.sugars_100g);
  if (_n(row.salt_100g) != null)          nutriments['salt_100g'] = _n(row.salt_100g);
  if (_n(row.proteins_100g) != null)      nutriments['proteins_100g'] = _n(row.proteins_100g);
  if (_n(row.fiber_100g) != null)         nutriments['fiber_100g'] = _n(row.fiber_100g);

  return {
    product_name: row.product_name || 'Unknown Product',
    brands: '',
    categories: '',
    ingredients_text: row.ingredients_text || '',
    ingredients: [],
    image_url: row.image_url || null,
    nutriments,
    nutriscore_grade: row.nutriscore_grade || null,
    nova_group: row.nova_group || null,
    ecoscore_grade: null,
    labels: row.labels_tags || '',
    allergens_tags: row.allergens ? row.allergens.split(',').map((a) => a.trim()) : [],
    additives_tags: row.additives_tags ? row.additives_tags.split(',').map((a) => a.trim()) : [],
    barcode: row.code,
    source: 'HealthyScan DB',
    product_type: 'food',
    scans_n: 0,
    unique_scans_n: 0,
  };
}

/**
 * Returns true for flat-format constructed URLs like:
 * https://images.openfoodfacts.org/images/products/{barcode}/front_en.400.jpg
 * These are invalid — real OFF URLs have a revision number before .400.jpg
 */
function isConstructedUrl(url) {
  return !!url && url.endsWith('/front_en.400.jpg');
}

/**
 * Force-write an image URL to Turso, replacing whatever is stored (including bad URLs).
 */
async function forceSetImageUrl(barcode, url) {
  if (!barcode || !url) return;
  try {
    await tursoAction('updateProductImage', { barcode, imageUrl: url });
  } catch { /* non-critical */ }
}

/**
 * Background image resolver — never blocks the scan result.
 * Chain: constructed barcode URL → HEAD check → OFF API → save to Turso → give up silently.
 */
async function resolveAndPersistImage(barcode) {
  if (!barcode) return;
  try {
    // Step 1: try the constructed OFF CDN URL (split-path format)
    const constructedUrl = getOFFImageFallback(barcode);
    if (constructedUrl) {
      try {
        const head = await fetch(constructedUrl, { method: 'HEAD' });
        if (head.ok) {
          forceSetImageUrl(barcode, constructedUrl);
          return;
        }
      } catch { /* network error — fall through */ }
    }

    // Step 2: CDN URL 404'd — call OFF API (v2 is more reliable and faster)
    const apiResp = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=image_front_url`,
      { headers: { 'User-Agent': 'HealthyScan/1.0' } }
    );
    // Silently give up on rate-limit (429) or any other error
    if (!apiResp.ok) return;
    const json = await apiResp.json();
    const imageUrl = json?.product?.image_front_url;
    if (imageUrl) {
      forceSetImageUrl(barcode, imageUrl);
    }
    // OFF has no image — nothing to save, HeroImage will show the placeholder cleanly
  } catch { /* never crash the app */ }
}

/**
 * Fetch a product from the Turso database by barcode.
 * If image_url is missing, fetches it from Open Food Facts (1 extra call per scan — acceptable).
 * Returns null if not found.
 */
export async function fetchProductFromTurso(barcode) {
  try {
    const result = await tursoAction('getProduct', { barcode });

    const rows = tursoRowsToObjects(result);
    if (!rows.length || !rows[0].product_name) return null;

    const row = rows[0];

    console.log('✅ TursoDB: Product found for', barcode, '-', row.product_name);
    const product = tursoRowToProduct(row);
    // If no stored image, OR if the stored URL is a flat-format constructed one (likely 404),
    // kick off background resolution — never blocks the caller
    if (!row.image_url || row.image_url.trim() === '' || isConstructedUrl(row.image_url)) {
      resolveAndPersistImage(row.code || barcode);
    }
    return product;
  } catch (error) {
    console.log('⚠️ TursoDB: Query failed for', barcode, '-', error.message);
    return null;
  }
}

/**
 * Search products by name in the Turso database (for search screen).
 * Returns an array of matching products (max 20).
 */
export async function searchProductsInTurso(query) {
  try {
    const result = await tursoAction('searchProducts', { query }, 6000);
    const rows = tursoRowsToObjects(result);
    return rows.filter((r) => r.product_name).map(tursoRowToProduct);
  } catch (error) {
    console.log('⚠️ TursoDB: Search failed for', query, '-', error?.message);
    return [];
  }
}

// ─── CURATED / BEST PRODUCTS (shared across ALL users) ───────────────────────

/**
 * Save a product to the shared curated list (visible to ALL users).
 * Table creation is handled inside the proxy Worker.
 */
export async function saveCuratedProduct(entry) {
  try {
    await tursoAction('saveCuratedProduct', { entry }, 8000);
    return true;
  } catch (e) {
    console.log('⚠️ saveCuratedProduct error:', e?.message);
    return false;
  }
}

/**
 * Fetch all curated products from Turso (for VeeList screen).
 * Returns [] on failure so the hardcoded list still shows.
 */
export async function fetchCuratedProducts() {
  try {
    const result = await tursoAction('fetchCuratedProducts', {}, 8000);
    const rows = tursoRowsToObjects(result);
    return rows.map(r => ({
      id: r.barcode,
      barcode: r.barcode,
      name: r.name,
      brand: r.brand,
      category: r.product_type === 'food' ? 'FOOD' : 'COSMETIC',
      filterCat: r.product_type === 'food' ? 'Food' : 'Cosmetic',
      tag: 'TOP PICK',
      defaultScore: parseInt(r.score) || 0,
      image: r.image_url || null,
      productType: r.product_type || 'food',
      ingredients: r.ingredients || '',
      nutriments: {},
    }));
  } catch (e) {
    console.log('⚠️ fetchCuratedProducts error:', e?.message);
    return [];
  }
}

/**
 * Fetch alternatives for a product by category keyword.
 * Returns up to `limit` products (with images preferred) that are NOT the current barcode.
 * Sorted by nothing here — caller is responsible for scoring & sorting.
 */
/**
 * Persist an image URL back to Turso for a product that had none.
 * Fire-and-forget — never blocks the UI.
 */
export async function updateProductImageInTurso(barcode, imageUrl) {
  if (!barcode || !imageUrl) return;
  try {
    // Always overwrite — replaces broken constructed URLs with real ones
    await tursoAction('updateProductImage', { barcode, imageUrl });
  } catch {
    // Non-critical
  }
}

/**
 * Save full ingredients text back to Turso for a product that had none or partial.
 * Fire-and-forget — never blocks the UI.
 */
export async function updateIngredientsInTurso(barcode, ingredientsText) {
  // Require at least 15 characters to avoid overwriting with garbage or stub values
  if (!barcode || !ingredientsText || ingredientsText.trim().length < 15) return;
  try {
    await tursoAction('updateIngredients', { barcode, ingredientsText: ingredientsText.trim() });
  } catch {
    // Non-critical
  }
}

/**
 * Persist USDA-enriched nutrition columns back into Turso — only overwrites NULL columns.
 * Fire-and-forget — never blocks the UI.
 */
export async function updateNutritionInTurso(barcode, nutriments) {
  if (!barcode || !nutriments) return;
  // Only-fill-if-null logic (COALESCE) lives server-side in the proxy Worker now.
  try {
    await tursoAction('updateNutrition', { barcode, nutriments });
  } catch { /* non-critical */ }
}

/**
 * Save a product discovered via fallback APIs (UPC Item DB, Open Food Facts)
 * into Turso so the database grows automatically.
 * Uses INSERT OR IGNORE — existing products are never overwritten.
 */
export async function saveProductToTurso(barcode, product) {
  if (!barcode || !product || !product.product_name) return;
  try {
    await tursoAction('saveProduct', { barcode, product });
    console.log('✅ TursoDB: Saved new product', barcode, '-', product.product_name);
  } catch (error) {
    console.log('⚠️ TursoDB: Save failed for', barcode, '-', error.message);
  }
}

// ── Ingredient Info Cache ────────────────────────────────────────────────────
// Caches ingredient definitions + health verdict + WHO notes in Turso so we
// never call USDA more than once per unique ingredient name.

export async function getIngredientInfoFromTurso(name) {
  if (!name) return null;
  try {
    const result = await tursoAction('getIngredientInfo', { name }, 5000);
    if (!result) return null;
    const rows = tursoRowsToObjects(result);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      name: r.name,
      whatItIs:      r.what_it_is,
      whatItDoes:    r.what_it_does,
      healthVerdict: r.health_verdict,
      whoSays:       r.who_says,
      source:        r.source,
    };
  } catch {
    return null;
  }
}

export async function saveIngredientInfoToTurso(info) {
  if (!info || !info.name) return;
  try {
    await tursoAction('saveIngredientInfo', { info });
  } catch { /* non-critical */ }
}

export async function fetchAlternativesByCategory(categoryKeyword, excludeBarcode, limit = 30) {
  try {
    // Proxy returns { withImage, fallback } — fallback is only present when
    // withImage had fewer than 5 rows, same condition the merge below used to
    // decide with when this ran as two separate direct Turso queries.
    const { withImage, fallback } = await tursoAction('fetchAlternatives', { categoryKeyword, excludeBarcode, limit });

    const rows = tursoRowsToObjects(withImage);
    if (fallback) {
      const fbRows = tursoRowsToObjects(fallback);
      const merged = [...rows];
      for (const r of fbRows) {
        if (!merged.find((x) => x.code === r.code)) merged.push(r);
        if (merged.length >= limit) break;
      }
      return merged.filter((r) => r.product_name).map(tursoRowToProduct);
    }

    return rows.filter((r) => r.product_name).map(tursoRowToProduct);
  } catch (error) {
    console.log('⚠️ TursoDB: fetchAlternativesByCategory failed -', error.message);
    return [];
  }
}
