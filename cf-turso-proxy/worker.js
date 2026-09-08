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

// ── Referral program ───────────────────────────────────────────────────────
// Device-based (the app has no user accounts): identity is a random install id
// generated on the device and stored in AsyncStorage. A referral only counts
// once the referred device completes its first real scan ("qualified"). When a
// referrer reaches REFERRAL_GOAL qualified referrals their status flips to
// 'unlocked' (lifetime free) — this is separate from IAP 'pro'.
const REFERRAL_GOAL = 10;

let referralTablesReady = false;
async function ensureReferralTables(env) {
  if (referralTablesReady) return;
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS referral_users (
    install_id TEXT PRIMARY KEY,
    code       TEXT UNIQUE,
    status     TEXT DEFAULT 'free',
    created_at INTEGER
  )`, [], 8000);
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS referrals (
    referred_id TEXT PRIMARY KEY,
    referrer_id TEXT,
    qualified   INTEGER DEFAULT 0,
    created_at  INTEGER
  )`, [], 8000);
  await tursoQuery(env, `CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)`, [], 8000);
  referralTablesReady = true;
}

// Unambiguous alphabet (no 0/O/1/I) — 7 chars ≈ 27 billion combos.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() {
  let s = '';
  for (let i = 0; i < 7; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return 'SG-' + s;
}

// Turso rows come back as arrays of { type, value }; flatten to plain values.
function rowsOf(result) {
  return (result.rows || []).map((r) => r.map((c) => (c && c.type !== 'null' ? c.value : null)));
}

// Get this device's referral row, creating it with a guaranteed-unique code.
async function ensureReferralUser(env, installId) {
  const existing = await tursoQuery(env,
    `SELECT code, status FROM referral_users WHERE install_id = ? LIMIT 1`, [installId]);
  const exRow = rowsOf(existing)[0];
  if (exRow && exRow[0]) return { code: exRow[0], status: exRow[1] || 'free' };

  let code = randomCode();
  for (let attempt = 0; attempt < 8; attempt++) {
    const taken = await tursoQuery(env,
      `SELECT install_id FROM referral_users WHERE code = ? LIMIT 1`, [code]);
    const takenBy = rowsOf(taken)[0]?.[0];
    if (!takenBy || takenBy === installId) break;
    code = randomCode();
  }
  await tursoQuery(env, `INSERT OR IGNORE INTO referral_users (install_id, code, status, created_at)
    VALUES (?, ?, 'free', ?)`, [installId, code, String(Date.now())]);

  // Re-read: covers a concurrent create for the same install id.
  const after = await tursoQuery(env,
    `SELECT code, status FROM referral_users WHERE install_id = ? LIMIT 1`, [installId]);
  const afterRow = rowsOf(after)[0];
  return { code: afterRow?.[0] || code, status: afterRow?.[1] || 'free' };
}

async function referralSnapshot(env, installId) {
  const { code, status: rowStatus } = await ensureReferralUser(env, installId);

  const cntRes = await tursoQuery(env,
    `SELECT COUNT(*) FROM referrals WHERE referrer_id = ? AND qualified = 1`, [installId]);
  const count = Number(rowsOf(cntRes)[0]?.[0] || 0);

  let status = rowStatus || 'free';
  if (count >= REFERRAL_GOAL && status !== 'unlocked') {
    await tursoQuery(env, `UPDATE referral_users SET status = 'unlocked' WHERE install_id = ?`, [installId]);
    status = 'unlocked';
  }
  return { code, status, referral_count: count, goal: REFERRAL_GOAL };
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

  // ── Referral actions ─────────────────────────────────────────────────────

  // Idempotent. Call on every app launch and when the paywall opens.
  // Returns { code, status, referral_count, goal }.
  async syncReferral(env, { installId }) {
    if (!installId) return { error: 'missing installId' };
    await ensureReferralTables(env);
    return referralSnapshot(env, String(installId));
  },

  // Call once on first launch if the app arrived with a referral code, or when
  // the user types a code on the paywall. Records referrer -> referred (pending
  // until the referred device completes its first scan).
  async trackReferral(env, { installId, refCode }) {
    if (!installId || !refCode) return { ok: false, reason: 'missing_params' };
    await ensureReferralTables(env);
    const code = String(refCode).trim().toUpperCase();

    // One referral per device, ever — check this before validating the code so
    // the "you already used a code" message is accurate.
    const exRes = await tursoQuery(env,
      `SELECT referred_id FROM referrals WHERE referred_id = ? LIMIT 1`, [installId]);
    if (rowsOf(exRes).length) return { ok: false, reason: 'already_referred' };

    const refRes = await tursoQuery(env,
      `SELECT install_id FROM referral_users WHERE code = ? LIMIT 1`, [code]);
    const referrerId = rowsOf(refRes)[0]?.[0];
    if (!referrerId) return { ok: false, reason: 'invalid_code' };
    if (referrerId === String(installId)) return { ok: false, reason: 'self' };

    await tursoQuery(env, `INSERT OR IGNORE INTO referrals (referred_id, referrer_id, qualified, created_at)
      VALUES (?, ?, 0, ?)`, [installId, referrerId, String(Date.now())]);
    return { ok: true, reason: 'pending_first_scan' };
  },

  // Call after the referred device's first successful scan. Flips the pending
  // referral to qualified and refreshes the referrer's unlock status.
  async qualifyReferral(env, { installId }) {
    if (!installId) return { ok: false, reason: 'missing_params' };
    await ensureReferralTables(env);
    await tursoQuery(env,
      `UPDATE referrals SET qualified = 1 WHERE referred_id = ? AND qualified = 0`, [installId]);

    const refRes = await tursoQuery(env,
      `SELECT referrer_id FROM referrals WHERE referred_id = ? LIMIT 1`, [installId]);
    const referrerId = rowsOf(refRes)[0]?.[0];
    if (!referrerId) return { ok: true, matched: false };

    const snap = await referralSnapshot(env, referrerId);
    return { ok: true, matched: true, referrerStatus: snap.status };
  },

  // Cleanup helper for automated tests: removes rows for install ids prefixed
  // "test-", plus any explicit ids passed. Safe to keep.
  async purgeTestReferrals(env, { ids } = {}) {
    await ensureReferralTables(env);
    await tursoQuery(env, `DELETE FROM referrals WHERE referrer_id LIKE 'test-%' OR referred_id LIKE 'test-%'`);
    await tursoQuery(env, `DELETE FROM referral_users WHERE install_id LIKE 'test-%'`);
    for (const id of Array.isArray(ids) ? ids.slice(0, 50) : []) {
      await tursoQuery(env, `DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?`, [id, id]);
      await tursoQuery(env, `DELETE FROM referral_users WHERE install_id = ?`, [id]);
    }
    return { ok: true };
  },
};

// The website (vee.app) calls this Worker from a browser, so every response —
// including errors and the OPTIONS preflight — must carry CORS headers or the
// browser blocks the request before the app ever sees it. The mobile app's
// fetch() ignores CORS, so this is purely additive for it.
// Origin is '*' because the Worker exposes only a fixed allowlist of
// parameterized actions and holds no user credentials/cookies — nothing here is
// protected by the caller's origin.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    // Preflight: a browser sends this before any POST with a JSON body.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const { action, ...params } = payload || {};
    const handler = actions[action];
    if (!handler) {
      return json({ error: `Unknown action: ${action}` }, 400);
    }
    try {
      const result = await handler(env, params);
      return json({ result });
    } catch (err) {
      return json({ error: err.message || 'Query failed' }, 500);
    }
  },
};
