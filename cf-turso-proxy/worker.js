/**
 * Turso DB proxy for the HealthyScan/Vee app.
 *
 * Why this exists: the app used to talk to Turso directly from the client with
 * a hardcoded bearer token that could execute ANY SQL. That token shipped
 * inside the app bundle, so anyone could extract it and run arbitrary queries
 * against production. This worker replaces that: the real Turso token lives
 * only here (as a secret), and the client can only invoke a fixed allowlist of
 * actions below, each with a hardcoded, parameterized query. No raw SQL ever
 * crosses the wire from the client.
 */

async function tursoQuery(env, sql, args = [], timeoutMs = 10000) {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${env.TURSO_URL}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.TURSO_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Turso HTTP error: ${response.status}`);
    const json = await response.json();
    const result = json?.results?.[0];
    if (!result || result.type !== 'ok') throw new Error('Turso query failed');
    return result.response.result;
  } finally {
    clearTimeout(timer);
  }
}

let curatedTableReady = false;
async function ensureCuratedTable(env) {
  if (curatedTableReady) return;
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS curated_products (
    barcode TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    score INTEGER,
    image_url TEXT,
    product_type TEXT DEFAULT 'food',
    ingredients TEXT DEFAULT '',
    added_at TEXT
  )`, [], 8000);
  curatedTableReady = true;
}

let ingredientTableReady = false;
async function ensureIngredientInfoTable(env) {
  if (ingredientTableReady) return;
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS ingredient_info (
    name          TEXT PRIMARY KEY,
    what_it_is    TEXT,
    what_it_does  TEXT,
    health_verdict TEXT,
    who_says      TEXT,
    source        TEXT,
    created_at    INTEGER
  )`);
  ingredientTableReady = true;
}

// Each handler returns the raw Turso "result" shape (cols/rows), matching what
// the app's existing tursoRowsToObjects()/tursoRowToProduct() helpers expect,
// so the client only needs to change transport, not parsing logic.
const actions = {
  async getProduct(env, { barcode }) {
    return tursoQuery(env, 'SELECT * FROM products WHERE code = ? LIMIT 1', [barcode]);
  },

  async searchProducts(env, { query }) {
    return tursoQuery(env, 'SELECT * FROM products WHERE product_name LIKE ? LIMIT 20', [`%${query}%`], 6000);
  },

  // Returns { withImage, fallback } — fallback is only populated when withImage
  // has fewer than 5 rows, matching the app's original merge-with-dedup behavior
  // (which now happens client-side in tursoDB.js, same as before this proxy existed).
  async fetchAlternatives(env, { categoryKeyword, excludeBarcode, limit }) {
    const lim = Number(limit) || 30;
    const withImage = await tursoQuery(env, `SELECT * FROM products
       WHERE product_name LIKE ? AND code != ? AND image_url IS NOT NULL AND image_url != ''
       LIMIT ?`, [`%${categoryKeyword}%`, excludeBarcode || '', String(lim)]);
    let fallback = null;
    if ((withImage.rows || []).length < 5) {
      fallback = await tursoQuery(env, `SELECT * FROM products WHERE product_name LIKE ? AND code != ? LIMIT ?`,
        [`%${categoryKeyword}%`, excludeBarcode || '', String(lim)]);
    }
    return { withImage, fallback };
  },

  async updateProductImage(env, { barcode, imageUrl }) {
    if (!barcode || !imageUrl) return { ok: true, skipped: true };
    await tursoQuery(env, 'UPDATE products SET image_url = ? WHERE code = ?', [imageUrl, barcode]);
    return { ok: true };
  },

  async updateIngredients(env, { barcode, ingredientsText }) {
    if (!barcode || !ingredientsText || ingredientsText.trim().length < 15) return { ok: true, skipped: true };
    await tursoQuery(env, 'UPDATE products SET ingredients_text = ? WHERE code = ?', [ingredientsText.trim(), barcode]);
    return { ok: true };
  },

  async updateNutrition(env, { barcode, nutriments }) {
    if (!barcode || !nutriments) return { ok: true, skipped: true };
    const n = nutriments;
    const updates = [];
    const params = [];
    const add = (col, val) => {
      if (val != null) { updates.push(`${col} = COALESCE(${col}, ?)`); params.push(String(val)); }
    };
    add('energy_100g', n['energy-kcal_100g']);
    add('fat_100g', n['fat_100g']);
    add('saturated_fat_100g', n['saturated-fat_100g']);
    add('sugars_100g', n['sugars_100g']);
    add('salt_100g', n['salt_100g']);
    add('proteins_100g', n['proteins_100g']);
    add('fiber_100g', n['fiber_100g']);
    if (!updates.length) return { ok: true, skipped: true };
    params.push(barcode);
    await tursoQuery(env, `UPDATE products SET ${updates.join(', ')} WHERE code = ?`, params);
    return { ok: true };
  },

  async saveProduct(env, { barcode, product }) {
    if (!barcode || !product || !product.product_name) return { ok: true, skipped: true };
    const n = product.nutriments || {};
    await tursoQuery(env, `INSERT OR IGNORE INTO products
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
      ]);
    return { ok: true };
  },

  async saveCuratedProduct(env, { entry }) {
    await ensureCuratedTable(env);
    await tursoQuery(env, `INSERT OR REPLACE INTO curated_products
        (barcode, name, brand, score, image_url, product_type, ingredients, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(entry.barcode),
        entry.name || '',
        entry.brand || '',
        String(Math.round(entry.score || 0)),
        entry.image || '',
        entry.productType || 'food',
        entry.ingredients || '',
        new Date().toISOString(),
      ], 8000);
    return { ok: true };
  },

  async fetchCuratedProducts(env) {
    await ensureCuratedTable(env);
    return tursoQuery(env, 'SELECT * FROM curated_products ORDER BY added_at DESC', [], 8000);
  },

  async getIngredientInfo(env, { name }) {
    if (!name) return null;
    await ensureIngredientInfoTable(env);
    return tursoQuery(env, 'SELECT * FROM ingredient_info WHERE name = ? LIMIT 1', [String(name).toLowerCase().trim()], 5000);
  },

  async saveIngredientInfo(env, { info }) {
    if (!info || !info.name) return { ok: true, skipped: true };
    await ensureIngredientInfoTable(env);
    await tursoQuery(env, `INSERT OR IGNORE INTO ingredient_info
        (name, what_it_is, what_it_does, health_verdict, who_says, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        info.name.toLowerCase().trim(),
        info.whatItIs || '',
        info.whatItDoes || '',
        info.healthVerdict || 'moderate',
        info.whoSays || '',
        info.source || 'USDA FoodData Central',
        String(Date.now()),
      ]);
    return { ok: true };
  },
};

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
    }
    const { action, ...params } = payload || {};
    const handler = actions[action];
    if (!handler) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
    }
    try {
      const result = await handler(env, params);
      return new Response(JSON.stringify({ result }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Query failed' }), { status: 500 });
    }
  },
};
