/**
 * Turso Database Service
 * Queries the self-hosted product database via Turso HTTP API.
 * Schema: code, product_name, ingredients_text, nutriscore_grade, nova_group,
 *         energy_100g, fat_100g, saturated_fat_100g, sugars_100g, salt_100g,
 *         proteins_100g, fiber_100g, additives_tags, labels_tags, countries_tags,
 *         allergens, image_url
 */

const TURSO_URL = 'https://vee-2-samis187s.aws-us-east-2.turso.io';
const TURSO_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU2MTY1MDUsImlkIjoiMDE5ZDZhZmItZjcwMS03NmI5LTk3ZjgtNjM2Yzg0YjNkYmQ0IiwicmlkIjoiZTkyNmY2ZmYtNzdhZC00M2YyLWI5MDUtYTQ0MDU5MWI1MmQxIn0.f6SltaZu58g1QIBN21rhEDjd7LFp4gbUGKPEHSGoQNoCg8gXgwQeNKjlwk9UVNDSBoXxAL8QPzR7keRlSSe6BA';

/**
 * Execute a SQL query against the Turso database via the HTTP pipeline API.
 * @param {number} timeoutMs - Reject after this many ms (default 10s). Pass lower for search queries.
 */
async function tursoQuery(sql, args = [], timeoutMs = 10000) {
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map((v) => ({ type: 'text', value: String(v) })),
        },
      },
      { type: 'close' },
    ],
  };

  // Use Promise.race for timeout — works reliably across all RN/Hermes versions
  const fetchPromise = fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TURSO_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Turso query timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) {
    throw new Error(`Turso HTTP error: ${response.status}`);
  }

  const json = await response.json();
  const result = json?.results?.[0];
  if (!result || result.type !== 'ok') {
    throw new Error('Turso query failed');
  }

  return result.response.result;
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
    await tursoQuery('UPDATE products SET image_url = ? WHERE code = ?', [url, barcode]);
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
    const result = await tursoQuery(
      'SELECT * FROM products WHERE code = ? LIMIT 1',
      [barcode]
    );

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
    // 6s timeout — enough for a good connection, short enough to not block
    // USDA + Open Beauty Facts results on slow cellular.
    const result = await tursoQuery(
      "SELECT * FROM products WHERE product_name LIKE ? LIMIT 20",
      [`%${query}%`],
      6000
    );

    const rows = tursoRowsToObjects(result);
    return rows.filter((r) => r.product_name).map(tursoRowToProduct);
  } catch (error) {
    console.log('⚠️ TursoDB: Search failed for', query, '-', error?.message);
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
    await tursoQuery(
      'UPDATE products SET image_url = ? WHERE code = ?',
      [imageUrl, barcode]
    );
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
    await tursoQuery(
      'UPDATE products SET ingredients_text = ? WHERE code = ?',
      [ingredientsText.trim(), barcode]
    );
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
  const n = nutriments;
  // Build SET clause only for columns that have a value to write
  const updates = [];
  const params = [];
  const add = (col, val) => {
    if (val != null) { updates.push(`${col} = COALESCE(${col}, ?)`); params.push(String(val)); }
  };
  add('energy_100g',        n['energy-kcal_100g']);
  add('fat_100g',           n['fat_100g']);
  add('saturated_fat_100g', n['saturated-fat_100g']);
  add('sugars_100g',        n['sugars_100g']);
  add('salt_100g',          n['salt_100g']);
  add('proteins_100g',      n['proteins_100g']);
  add('fiber_100g',         n['fiber_100g']);
  if (!updates.length) return;
  params.push(barcode);
  try {
    await tursoQuery(`UPDATE products SET ${updates.join(', ')} WHERE code = ?`, params);
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
    const n = product.nutriments || {};
    await tursoQuery(
      `INSERT OR IGNORE INTO products
         (code, product_name, ingredients_text, image_url,
          energy_100g, fat_100g, saturated_fat_100g, sugars_100g,
          salt_100g, proteins_100g, fiber_100g,
          nutriscore_grade, nova_group, labels_tags, allergens, additives_tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode,
        product.product_name || '',
        product.ingredients_text || '',
        product.image_url || '',
        n['energy-kcal_100g'] != null ? String(n['energy-kcal_100g']) : null,
        n['fat_100g'] != null ? String(n['fat_100g']) : null,
        n['saturated-fat_100g'] != null ? String(n['saturated-fat_100g']) : null,
        n['sugars_100g'] != null ? String(n['sugars_100g']) : null,
        n['salt_100g'] != null ? String(n['salt_100g']) : null,
        n['proteins_100g'] != null ? String(n['proteins_100g']) : null,
        n['fiber_100g'] != null ? String(n['fiber_100g']) : null,
        product.nutriscore_grade || null,
        product.nova_group ? String(product.nova_group) : null,
        product.categories || product.labels || '',
        Array.isArray(product.allergens_tags) ? product.allergens_tags.join(',') : '',
        Array.isArray(product.additives_tags) ? product.additives_tags.join(',') : '',
      ]
    );
    console.log('✅ TursoDB: Saved new product', barcode, '-', product.product_name);
  } catch (error) {
    console.log('⚠️ TursoDB: Save failed for', barcode, '-', error.message);
  }
}

export async function fetchAlternativesByCategory(categoryKeyword, excludeBarcode, limit = 30) {
  try {
    // Prefer products that have an image_url
    const result = await tursoQuery(
      `SELECT * FROM products
       WHERE product_name LIKE ?
         AND code != ?
         AND image_url IS NOT NULL
         AND image_url != ''
       LIMIT ?`,
      [`%${categoryKeyword}%`, excludeBarcode || '', String(limit)]
    );

    const rows = tursoRowsToObjects(result);
    if (rows.length < 5) {
      // Fallback: also fetch without image filter and mix in
      const fallback = await tursoQuery(
        `SELECT * FROM products
         WHERE product_name LIKE ?
           AND code != ?
         LIMIT ?`,
        [`%${categoryKeyword}%`, excludeBarcode || '', String(limit)]
      );
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
