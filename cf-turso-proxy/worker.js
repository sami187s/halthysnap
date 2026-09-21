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
  // If the database says "too busy" (429/503), wait a moment and try again (max 2 retries).
  for (let attempt = 0; ; attempt++) {
    try {
      return await tursoQueryOnce(env, sql, args, timeoutMs);
    } catch (e) {
      const busy = /Turso HTTP error: (429|503)/.test(String(e && e.message));
      if (!busy || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1) + Math.random() * 250));
    }
  }
}

async function tursoQueryOnce(env, sql, args = [], timeoutMs = 10000) {
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          // A missing value must be a real NULL — String(null) used to store the TEXT "null",
          // which then looked like data and blocked later gap-filling.
          args: args.map((v) => (v === null || v === undefined ? { type: 'null' } : { type: 'text', value: String(v) })),
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

// ── Input hygiene + abuse limits ────────────────────────────────────────────
// The app has no accounts, so these actions are reachable by anyone who knows the
// URL. We can't make that airtight without user auth, but we CAN stop the cheap
// attacks: oversized/garbage input, overwriting good data, and hammering.
const isBarcode = (b) => typeof b === 'string' && /^\d{8,14}$/.test(b);
const clip = (v, max) => String(v == null ? '' : v).slice(0, max);
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
};
// Escape LIKE wildcards so user text can't act as a pattern.
const escapeLike = (s) => String(s).replace(/[\\%_]/g, (c) => '\\' + c);
const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\/[^\s]{3,480}$/.test(u);

// Best-effort per-IP limiter (memory is per Worker instance, so this only slows
// abuse; it does not replace real authentication).
const hits = new Map();
function rateLimited(ip, bucket, max, windowMs) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  }
  return arr.length > max;
}

// Short-lived memory cache (per Worker instance). Popular searches / alternatives /
// the Top list are asked for again and again; answering from memory saves database
// reads (which are billed per row scanned) and makes the app faster.
const memCache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  memCache.set(key, { t: Date.now(), v });
  if (memCache.size > 400) memCache.delete(memCache.keys().next().value);
  return v;
}
// After a product changes (nutrition/ingredients/image filled in), forget its cached copy.
function bustProduct(barcode) {
  if (!barcode) return;
  const b = String(barcode);
  for (const k of [...memCache.keys()]) if ((k.startsWith('p:') || k.startsWith('lk:')) && k.includes(b)) memCache.delete(k);
}
// Remove one product (by its code column) from a cached Turso result.
function dropCode(result, code) {
  if (!result || !code) return result;
  const idx = (result.cols || []).findIndex((c) => c.name === 'code');
  if (idx < 0) return result;
  return { ...result, rows: (result.rows || []).filter((r) => !(r[idx] && r[idx].value === code)) };
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

// Cosmetics found through the public APIs (Open Beauty Facts etc.) are saved here
// so the next scan comes straight from our own database. Kept separate from the
// food `products` table so a cosmetic can never be mistaken for a food.
let cosmeticTableReady = false;
async function ensureCosmeticTable(env) {
  if (cosmeticTableReady) return;
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS cosmetic_products (
    code TEXT PRIMARY KEY,
    product_name TEXT,
    brands TEXT,
    ingredients_text TEXT,
    image_url TEXT,
    categories TEXT,
    source TEXT,
    created_at INTEGER
  )`, [], 8000);
  cosmeticTableReady = true;
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
  // Network address of the referred device — used so one person can't create ten
  // fake "friends" from the same connection. (Column added later; ignore if it exists.)
  try { await tursoQuery(env, `ALTER TABLE referrals ADD COLUMN ip TEXT`, [], 8000); } catch { /* already there */ }
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

  // Count DISTINCT network addresses (rows without an address, i.e. older ones, count individually).
  const cntRes = await tursoQuery(env,
    `SELECT COUNT(DISTINCT COALESCE(ip, referred_id)) FROM referrals WHERE referrer_id = ? AND qualified = 1`, [installId]);
  const count = Number(rowsOf(cntRes)[0]?.[0] || 0);

  let status = rowStatus || 'free';
  if (count >= REFERRAL_GOAL && status !== 'unlocked') {
    await tursoQuery(env, `UPDATE referral_users SET status = 'unlocked' WHERE install_id = ?`, [installId]);
    status = 'unlocked';
  }
  return { code, status, referral_count: count, goal: REFERRAL_GOAL };
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCT LOOKUP FLOW (runs here, once, for everybody)
// ═════════════════════════════════════════════════════════════════════════════
//   1. our database
//   2. gaps (ingredients / nutrition / image / brand / categories)  → Open Food Facts
//   3. still gaps                                                    → USDA (exact barcode)
//   4. not in our database:  Open Food Facts → USDA → (cosmetics) Open Beauty Facts
//   5. EVERYTHING found is saved, so the next scan — by anyone — is answered from our
//      own database without calling any public API.
// Public APIs are only called for products that are NEW or have GAPS, and a product whose
// gaps the APIs cannot fill is not retried for 14 days. That is what lets 10,000+ users a
// day scan without hammering (or getting blocked by) the public APIs.

const UA_HEADERS = { 'User-Agent': 'Vee/1.0 (https://veehealth.ca)', Accept: 'application/json' };
const NUT_COLS = ['energy_100g', 'fat_100g', 'saturated_fat_100g', 'sugars_100g', 'salt_100g', 'proteins_100g', 'fiber_100g'];
const RETRY_GAPS_MS = 14 * 24 * 60 * 60 * 1000; // don't re-ask the APIs about the same gaps for 14 days
const RETRY_MISS_MS = 24 * 60 * 60 * 1000;      // don't re-ask about a barcode nobody knows for 24 h
let activeExternal = 0;                          // simultaneous public-API jobs (protects the APIs and us)
const MAX_EXTERNAL = 12;

const isEmptyVal = (v) => v === null || v === undefined || String(v).trim() === '' || String(v).trim().toLowerCase() === 'null';

async function getJson(url, timeoutMs = 4500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: UA_HEADERS, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Columns added after the table was first imported (adding a column is instant, even on 1M+ rows).
let productColsReady = false;
async function ensureProductColumns(env) {
  if (productColsReady) return;
  try {
    await tursoQuery(env, 'SELECT brands, categories, enriched_at, sources FROM products LIMIT 1', [], 6000);
  } catch {
    for (const col of ['brands TEXT', 'categories TEXT', 'enriched_at INTEGER', 'sources TEXT']) {
      try { await tursoQuery(env, `ALTER TABLE products ADD COLUMN ${col}`, [], 8000); } catch { /* exists */ }
    }
  }
  productColsReady = true;
}

let missTableReady = false;
async function ensureMissTable(env) {
  if (missTableReady) return;
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS barcode_misses (
    code TEXT PRIMARY KEY, last_try INTEGER, tries INTEGER DEFAULT 1)`, [], 8000);
  missTableReady = true;
}

// Every spelling of one barcode (UPC-A 12 / EAN-13 with leading 0 / no leading zeros).
function serverVariants(barcode) {
  const digits = String(barcode).replace(/\D/g, '');
  const stripped = digits.replace(/^0+/, '');
  const set = [digits];
  if (stripped && stripped !== digits) set.push(stripped);
  if (digits.length === 12) set.push('0' + digits);
  if (digits.length === 13 && digits[0] === '0') set.push(digits.slice(1));
  if (stripped && stripped.length < 13) set.push(stripped.padStart(13, '0'));
  return [...new Set(set)].filter(isBarcode).slice(0, 4);
}

function firstRow(result) {
  if (!result || !(result.rows || []).length) return null;
  const cols = result.cols.map((c) => c.name);
  const o = {};
  result.rows[0].forEach((c, i) => { o[cols[i]] = c && c.type !== 'null' ? c.value : null; });
  return o;
}

// Reject impossible nutrition sets (per 100 g) so bad API data never enters our database.
function cleanNutrition(n) {
  const out = {};
  for (const k of NUT_COLS) { const v = numOrNull(n && n[k]); if (v !== null) out[k] = v; }
  const cap = { energy_100g: 950, fat_100g: 100, saturated_fat_100g: 100, sugars_100g: 100, salt_100g: 100, proteins_100g: 100, fiber_100g: 100 };
  for (const k of Object.keys(out)) if (out[k] > cap[k]) return {};
  if (out.saturated_fat_100g != null && out.fat_100g != null && out.saturated_fat_100g > out.fat_100g + 0.5) return {};
  if ((out.fat_100g || 0) + (out.sugars_100g || 0) + (out.proteins_100g || 0) + (out.fiber_100g || 0) > 110) return {};
  return out;
}

async function offLookup(barcode, host = 'world.openfoodfacts.org') {
  const fields = 'product_name,brands,categories,ingredients_text,ingredients_text_en,image_front_url,image_url,nutriments,nutriscore_grade,nova_group,additives_tags,allergens_tags,labels';
  const j = await getJson(`https://${host}/api/v2/product/${barcode}.json?fields=${fields}`);
  const p = j && j.product && (j.status === 1 || j.product.product_name) ? j.product : null;
  if (!p || isEmptyVal(p.product_name)) return null;
  const n = p.nutriments || {};
  const kcal = numOrNull(n['energy-kcal_100g']);
  const kj = numOrNull(n['energy_100g']);
  const sodium = numOrNull(n['sodium_100g']);
  return {
    product_name: clip(p.product_name, 200),
    brands: clip(p.brands, 120),
    categories: clip(p.categories, 300),
    ingredients_text: clip(p.ingredients_text_en || p.ingredients_text, 5000),
    image_url: p.image_front_url || p.image_url || '',
    nutrition: cleanNutrition({
      energy_100g: kcal !== null ? kcal : (kj !== null ? Math.round((kj / 4.184) * 10) / 10 : null),
      fat_100g: n['fat_100g'],
      saturated_fat_100g: n['saturated-fat_100g'],
      sugars_100g: n['sugars_100g'],
      salt_100g: numOrNull(n['salt_100g']) !== null ? n['salt_100g'] : (sodium !== null ? sodium * 2.5 : null),
      proteins_100g: n['proteins_100g'],
      fiber_100g: n['fiber_100g'],
    }),
    nutriscore_grade: /^[a-e]$/i.test(String(p.nutriscore_grade || '')) ? String(p.nutriscore_grade).toLowerCase() : null,
    nova_group: [1, 2, 3, 4].includes(Number(p.nova_group)) ? Number(p.nova_group) : null,
    additives_tags: Array.isArray(p.additives_tags) ? p.additives_tags.join(',') : '',
    allergens: Array.isArray(p.allergens_tags) ? p.allergens_tags.join(',') : '',
    labels_tags: clip(p.labels, 300),
  };
}

// USDA branded foods — accepted ONLY on an exact barcode match (name matching gave wrong products).
async function usdaLookup(env, barcode) {
  if (!env.USDA_API_KEY) return null;
  const j = await getJson(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=10&api_key=${env.USDA_API_KEY}`);
  const strip = (s) => String(s || '').replace(/^0+/, '');
  const f = ((j && j.foods) || []).find((x) => x.gtinUpc && strip(x.gtinUpc) === strip(barcode));
  if (!f) return null;
  const val = (id) => {
    const nn = (f.foodNutrients || []).find((x) => x.nutrientId === id);
    return nn && nn.value != null ? Number(nn.value) : null;
  };
  const sodiumMg = val(1093);
  return {
    product_name: clip(f.description, 200),
    brands: clip(f.brandOwner || f.brandName, 120),
    categories: clip(f.foodCategory, 300),
    ingredients_text: clip(f.ingredients, 5000),
    nutrition: cleanNutrition({
      energy_100g: val(1008), fat_100g: val(1004), saturated_fat_100g: val(1258), sugars_100g: val(2000),
      proteins_100g: val(1003), fiber_100g: val(1079), salt_100g: sodiumMg != null ? (sodiumMg * 2.5) / 1000 : null,
    }),
  };
}

// What is still missing on a stored row?
function gapsOf(o) {
  const nCount = NUT_COLS.filter((k) => !isEmptyVal(o[k])).length;
  return {
    ingredients: isEmptyVal(o.ingredients_text) || String(o.ingredients_text).trim().length < 3,
    nutrition: nCount < 4,
    image: isEmptyVal(o.image_url),
    brands: isEmptyVal(o.brands),
    categories: isEmptyVal(o.categories),
  };
}
const hasGaps = (g) => g.ingredients || g.nutrition || g.image || g.brands || g.categories;

// Values from `inc` that fit an EMPTY slot in `cur` (never overwrites anything real).
function computeFill(cur, inc) {
  const up = {};
  const setIf = (col, val) => { if (!isEmptyVal(val) && isEmptyVal(cur[col]) && isEmptyVal(up[col])) up[col] = val; };
  setIf('brands', inc.brands);
  setIf('categories', inc.categories);
  setIf('image_url', isHttpUrl(inc.image_url) ? inc.image_url : null);
  setIf('nutriscore_grade', inc.nutriscore_grade);
  setIf('nova_group', inc.nova_group);
  setIf('additives_tags', inc.additives_tags);
  setIf('allergens', inc.allergens);
  setIf('labels_tags', inc.labels_tags);
  const ing = String(inc.ingredients_text || '').trim();
  if (ing.length >= 3 && (isEmptyVal(cur.ingredients_text) || String(cur.ingredients_text).trim().length < 3)) up.ingredients_text = ing;
  for (const k of NUT_COLS) if (inc.nutrition && inc.nutrition[k] != null && isEmptyVal(cur[k])) up[k] = inc.nutrition[k];
  return up;
}

async function writeFill(env, row, up, sources) {
  const sets = [];
  const params = [];
  for (const [col, val] of Object.entries(up)) {
    sets.push(`${col} = CASE WHEN ${col} IS NULL OR ${col} IN ('', 'null') THEN ? ELSE ${col} END`);
    params.push(val);
  }
  // enriched_at is set even when nothing could be filled → the APIs are not asked again for 14 days.
  sets.push('enriched_at = ?'); params.push(Date.now());
  sets.push('sources = ?'); params.push(sources.join(',') || 'none');
  params.push(row.code);
  await tursoQuery(env, `UPDATE products SET ${sets.join(', ')} WHERE code = ?`, params);
}

async function enrichExisting(env, row, trace) {
  const sources = [];
  let cur = { ...row };
  const up = {};
  const off = await offLookup(row.code); trace.external++;
  if (off) { Object.assign(up, computeFill(cur, off)); sources.push('off'); cur = { ...cur, ...up }; }
  const g = gapsOf(cur);
  if (g.ingredients || g.nutrition) {
    const us = await usdaLookup(env, row.code); trace.external++;
    if (us) { const more = computeFill(cur, us); Object.assign(up, more); sources.push('usda'); cur = { ...cur, ...up }; }
  }
  await writeFill(env, row, up, sources);
  trace.filled = Object.keys(up);
  return cur;
}

async function insertProduct(env, code, p, sources) {
  const n = p.nutrition || {};
  await tursoQuery(env, `INSERT OR IGNORE INTO products
      (code, product_name, ingredients_text, image_url,
       energy_100g, fat_100g, saturated_fat_100g, sugars_100g, salt_100g, proteins_100g, fiber_100g,
       nutriscore_grade, nova_group, labels_tags, allergens, additives_tags,
       brands, categories, enriched_at, sources)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code, p.product_name, p.ingredients_text || '', isHttpUrl(p.image_url) ? p.image_url : '',
      n.energy_100g ?? null, n.fat_100g ?? null, n.saturated_fat_100g ?? null, n.sugars_100g ?? null,
      n.salt_100g ?? null, n.proteins_100g ?? null, n.fiber_100g ?? null,
      p.nutriscore_grade || null, p.nova_group || null, p.labels_tags || '', p.allergens || '', p.additives_tags || '',
      p.brands || '', p.categories || '', Date.now(), sources.join(','),
    ]);
}

const numOr = (v) => { const n = numOrNull(v); return n === null ? undefined : n; };
// Stored row → the shape the app uses.
function toAppProduct(o, type) {
  const nutriments = {};
  const map = { 'energy-kcal_100g': o.energy_100g, fat_100g: o.fat_100g, 'saturated-fat_100g': o.saturated_fat_100g,
    sugars_100g: o.sugars_100g, salt_100g: o.salt_100g, proteins_100g: o.proteins_100g, fiber_100g: o.fiber_100g };
  for (const [k, v] of Object.entries(map)) { const n = numOr(v); if (n !== undefined) nutriments[k] = n; }
  const list = (s) => (isEmptyVal(s) ? [] : String(s).split(',').map((x) => x.trim()).filter(Boolean));
  const cosmetic = type === 'beauty';
  return {
    product_name: o.product_name,
    brands: isEmptyVal(o.brands) ? '' : o.brands,
    categories: isEmptyVal(o.categories) ? (cosmetic ? 'cosmetics' : '') : o.categories,
    ingredients_text: isEmptyVal(o.ingredients_text) ? '' : o.ingredients_text,
    ingredients: [],
    image_url: isEmptyVal(o.image_url) ? null : o.image_url,
    nutriments,
    nutriscore_grade: isEmptyVal(o.nutriscore_grade) ? null : o.nutriscore_grade,
    nova_group: isEmptyVal(o.nova_group) ? null : o.nova_group,
    ecoscore_grade: null,
    labels: isEmptyVal(o.labels_tags) ? '' : o.labels_tags,
    allergens_tags: list(o.allergens),
    additives_tags: list(o.additives_tags),
    barcode: o.code,
    source: cosmetic ? 'HealthyScan Cosmetic DB' : 'HealthyScan DB',
    product_type: cosmetic ? 'beauty' : 'food',
    scans_n: 0,
    unique_scans_n: 0,
  };
}

async function lookupCore(env, barcode, meta) {
  const trace = { path: 'db', external: 0, filled: [] };
  await ensureProductColumns(env);
  const variants = serverVariants(barcode);
  const inList = variants.map(() => '?').join(',');

  // 1 ─ our database
  let row = firstRow(await tursoQuery(env, `SELECT * FROM products WHERE code IN (${inList}) LIMIT 1`, variants));
  if (row && !isEmptyVal(row.product_name)) {
    const recently = !isEmptyVal(row.enriched_at) && Date.now() - Number(row.enriched_at) < RETRY_GAPS_MS;
    if (hasGaps(gapsOf(row)) && !recently && activeExternal < MAX_EXTERNAL) {
      activeExternal++;
      const work = enrichExisting(env, row, trace).finally(() => { activeExternal--; });
      // Answer within 3.5 s; if the APIs are slow the work finishes in the background for the next scan.
      const done = await Promise.race([work, new Promise((r) => setTimeout(() => r(null), 3500))]);
      if (done) { row = done; trace.path = 'db+filled-gaps'; }
      else { trace.path = 'db (gaps filling in background)'; if (meta.waitUntil) meta.waitUntil(work.catch(() => {})); }
    }
    return { status: 'ok', product: toAppProduct(row, 'food'), trace };
  }

  // 2 ─ a cosmetic we saved earlier
  await ensureCosmeticTable(env);
  const cos = firstRow(await tursoQuery(env, `SELECT * FROM cosmetic_products WHERE code IN (${inList}) LIMIT 1`, variants));
  if (cos && !isEmptyVal(cos.product_name) && !isEmptyVal(cos.ingredients_text)) {
    trace.path = 'cosmetic db';
    return { status: 'ok', product: toAppProduct(cos, 'beauty'), trace };
  }

  // 3 ─ a barcode nobody knew recently → don't ask the public APIs again yet
  await ensureMissTable(env);
  const miss = firstRow(await tursoQuery(env, 'SELECT last_try FROM barcode_misses WHERE code = ?', [barcode]));
  if (miss && Date.now() - Number(miss.last_try) < RETRY_MISS_MS) {
    return { status: 'notfound', trace: { path: 'remembered miss', external: 0 } };
  }
  if (activeExternal >= MAX_EXTERNAL) return { status: 'busy', trace: { path: 'busy', external: 0 } };

  activeExternal++;
  try {
    // 4a ─ food: Open Food Facts, then USDA for anything still missing
    let p = await offLookup(barcode); trace.external++;
    const sources = [];
    if (p) sources.push('off');
    const missing = p ? gapsOf({ ingredients_text: p.ingredients_text, ...Object.fromEntries(NUT_COLS.map((k) => [k, p.nutrition[k]])) }) : { ingredients: true, nutrition: true };
    if (!p || missing.ingredients || missing.nutrition) {
      const us = await usdaLookup(env, barcode); trace.external++;
      if (us) {
        sources.push('usda');
        if (!p) p = { ...us, image_url: '', nutriscore_grade: null, nova_group: null, additives_tags: '', allergens: '', labels_tags: '' };
        else {
          const more = computeFill({ brands: p.brands, categories: p.categories, ingredients_text: p.ingredients_text, ...p.nutrition }, us);
          if (more.ingredients_text) p.ingredients_text = more.ingredients_text;
          if (more.brands) p.brands = more.brands;
          if (more.categories) p.categories = more.categories;
          p.nutrition = { ...(p.nutrition || {}), ...Object.fromEntries(NUT_COLS.filter((k) => more[k] != null).map((k) => [k, more[k]])) };
        }
      }
    }
    if (p && !isEmptyVal(p.product_name)) {
      await insertProduct(env, variants[0], p, sources);
      trace.path = 'new (saved to our database)';
      trace.sources = sources;
      const saved = { ...p, code: variants[0], ...p.nutrition };
      return { status: 'ok', product: toAppProduct({ ...saved }, 'food'), trace };
    }

    // 4b ─ cosmetic: Open Beauty Facts (saved only with a real ingredient list)
    const obf = await offLookup(barcode, 'world.openbeautyfacts.org'); trace.external++;
    if (obf && String(obf.ingredients_text || '').trim().length >= 10) {
      await tursoQuery(env, `INSERT OR IGNORE INTO cosmetic_products
          (code, product_name, brands, ingredients_text, image_url, categories, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [variants[0], obf.product_name, obf.brands || '', obf.ingredients_text, isHttpUrl(obf.image_url) ? obf.image_url : '',
          obf.categories || '', 'off-beauty', Date.now()]);
      trace.path = 'new cosmetic (saved to our database)';
      return { status: 'ok', product: toAppProduct({ ...obf, code: variants[0] }, 'beauty'), trace };
    }

    // 5 ─ nobody has it: remember that for 24 h
    await tursoQuery(env, `INSERT INTO barcode_misses (code, last_try, tries) VALUES (?, ?, 1)
      ON CONFLICT(code) DO UPDATE SET last_try = excluded.last_try, tries = tries + 1`, [barcode, Date.now()]);
    trace.path = 'not found anywhere';
    return { status: 'notfound', trace };
  } finally {
    activeExternal--;
  }
}

const inflight = new Map(); // same barcode asked by many phones at once → ONE lookup
function singleFlight(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// Each handler returns the raw Turso "result" shape (cols/rows), matching what
// the app's existing tursoRowsToObjects()/tursoRowToProduct() helpers expect,
// so the client only needs to change transport, not parsing logic.
const actions = {
  // `barcodes` (optional) lets the app ask for every spelling of one barcode
  // (UPC-A / EAN-13 / without leading zeros) in ONE request instead of several.
  async getProduct(env, { barcode, barcodes }) {
    const list = [...new Set([barcode, ...(Array.isArray(barcodes) ? barcodes : [])].filter(isBarcode))].slice(0, 4);
    if (!list.length) return { cols: [], rows: [] };
    // Popular products are scanned again and again: remember FOUND products for 5 minutes.
    // (Not-found results are never cached, so a product saved a moment ago is seen at once.)
    const key = 'p:' + list.join(',');
    const hit = memCache.get(key);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.v;
    const res = await tursoQuery(env, `SELECT * FROM products WHERE code IN (${list.map(() => '?').join(',')}) LIMIT 1`, list);
    if ((res.rows || []).length > 0) {
      memCache.set(key, { t: Date.now(), v: res });
      if (memCache.size > 400) memCache.delete(memCache.keys().next().value);
    }
    return res;
  },

  async searchProducts(env, { query }) {
    const q = clip(query, 80).trim();
    if (q.length < 2) return { cols: [], rows: [] };
    // Same search asked again within 10 minutes is answered from memory (no table scan).
    return cached('s:' + q.toLowerCase(), 10 * 60 * 1000, () =>
      tursoQuery(env, "SELECT * FROM products WHERE product_name LIKE ? ESCAPE '\\' LIMIT 20", [`%${escapeLike(q)}%`], 6000));
  },

  // Returns { withImage, fallback } — fallback is only populated when withImage
  // has fewer than 5 rows, matching the app's original merge-with-dedup behavior
  // (which now happens client-side in tursoDB.js, same as before this proxy existed).
  async fetchAlternatives(env, { categoryKeyword, excludeBarcode, limit }) {
    const lim = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const word = clip(categoryKeyword, 40).trim().toLowerCase();
    const kw = `%${escapeLike(word)}%`;
    // Cached per keyword (NOT per product) for 30 min — thousands of users looking at
    // "cereal" share one database query. The current product is removed afterwards.
    const shared = await cached(`alt:${word}:${lim}`, 30 * 60 * 1000, async () => {
      const withImage = await tursoQuery(env, `SELECT * FROM products
         WHERE product_name LIKE ? ESCAPE '\\' AND image_url IS NOT NULL AND image_url != ''
         LIMIT ?`, [kw, String(lim + 1)]);
      let fallback = null;
      if ((withImage.rows || []).length < 5) {
        fallback = await tursoQuery(env, `SELECT * FROM products WHERE product_name LIKE ? ESCAPE '\\' LIMIT ?`,
          [kw, String(lim + 1)]);
      }
      return { withImage, fallback };
    });
    const ex = clip(excludeBarcode, 20);
    return { withImage: dropCode(shared.withImage, ex), fallback: shared.fallback ? dropCode(shared.fallback, ex) : null };
  },

  async updateProductImage(env, { barcode, imageUrl }) {
    if (!isBarcode(barcode) || !isHttpUrl(imageUrl)) return { ok: true, skipped: true };
    // Only fix a MISSING or known-bad (constructed) image — never replace a good one.
    await tursoQuery(env, `UPDATE products SET image_url = ? WHERE code = ?
      AND (image_url IS NULL OR image_url = '' OR image_url LIKE '%/front_en.400.jpg')`, [imageUrl, barcode]);
    return { ok: true };
  },

  async updateIngredients(env, { barcode, ingredientsText }) {
    const text = clip(ingredientsText, 5000).trim();
    if (!isBarcode(barcode) || text.length < 15) return { ok: true, skipped: true };
    // Only fill an empty list or replace a shorter (incomplete) one — never shrink real data.
    await tursoQuery(env, `UPDATE products SET ingredients_text = ? WHERE code = ?
      AND (ingredients_text IS NULL OR ingredients_text = '' OR length(ingredients_text) < length(?))`, [text, barcode, text]);
    return { ok: true };
  },

  async updateNutrition(env, { barcode, nutriments, extra }) {
    if (!isBarcode(barcode) || !nutriments || typeof nutriments !== 'object') return { ok: true, skipped: true };
    const n = {};
    for (const k of Object.keys(nutriments)) n[k] = numOrNull(nutriments[k]);
    const updates = [];
    const params = [];
    const add = (col, val) => {
      if (val != null) { updates.push(`${col} = CASE WHEN ${col} IS NULL OR ${col} IN ('', 'null') THEN ? ELSE ${col} END`); params.push(String(val)); }
    };
    add('energy_100g', n['energy-kcal_100g']);
    add('fat_100g', n['fat_100g']);
    add('saturated_fat_100g', n['saturated-fat_100g']);
    add('sugars_100g', n['sugars_100g']);
    add('salt_100g', n['salt_100g']);
    add('proteins_100g', n['proteins_100g']);
    add('fiber_100g', n['fiber_100g']);
    // Nutri-Score letter (a–e) and NOVA group (1–4) — only fill an empty value.
    const grade = extra && /^[a-e]$/i.test(String(extra.nutriscore_grade || '')) ? String(extra.nutriscore_grade).toLowerCase() : null;
    if (grade) { updates.push(`nutriscore_grade = COALESCE(NULLIF(nutriscore_grade, ''), ?)`); params.push(grade); }
    const nova = Number(extra && extra.nova_group);
    if ([1, 2, 3, 4].includes(nova)) { updates.push(`nova_group = COALESCE(NULLIF(nova_group, ''), ?)`); params.push(String(nova)); }
    if (!updates.length) return { ok: true, skipped: true };
    params.push(barcode);
    await tursoQuery(env, `UPDATE products SET ${updates.join(', ')} WHERE code = ?`, params);
    return { ok: true };
  },

  async saveProduct(env, { barcode, product }) {
    if (!isBarcode(barcode) || !product || typeof product !== 'object' || !clip(product.product_name, 200).trim()) {
      return { ok: true, skipped: true };
    }
    // Sanitise: clip text, keep only sane numbers (INSERT OR IGNORE never overwrites an existing product).
    const rawN = product.nutriments || {};
    const n = {};
    for (const k of Object.keys(rawN)) n[k] = numOrNull(rawN[k]);
    product = {
      ...product,
      product_name: clip(product.product_name, 200),
      ingredients_text: clip(product.ingredients_text, 5000),
      image_url: isHttpUrl(product.image_url) ? product.image_url : '',
      categories: clip(product.categories, 300),
      labels: clip(product.labels, 300),
    };
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

  async saveCuratedProduct(env, { entry }, ctx = {}) {
    if (!entry || typeof entry !== 'object') return { ok: true, skipped: true };
    const barcode = String(entry.barcode || '');
    const score = Math.round(Number(entry.score));
    if (!isBarcode(barcode) || !Number.isFinite(score) || score < 0 || score > 100) {
      return { ok: false, error: 'invalid entry' };
    }
    // The public "Best" list is shown to every user — keep publishing rare.
    if (rateLimited(ctx.ip || 'unknown', 'curate', 10, 60 * 60 * 1000)) {
      return { ok: false, error: 'rate limited' };
    }
    await ensureCuratedTable(env);
    await tursoQuery(env, `INSERT OR REPLACE INTO curated_products
        (barcode, name, brand, score, image_url, product_type, ingredients, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode,
        clip(entry.name, 200),
        clip(entry.brand, 120),
        String(score),
        isHttpUrl(entry.image) ? entry.image : '',
        entry.productType === 'cosmetic' ? 'cosmetic' : 'food',
        clip(entry.ingredients, 5000),
        new Date().toISOString(),
      ], 8000);
    return { ok: true };
  },

  async getCosmetic(env, { barcode, barcodes }) {
    const list = [...new Set([barcode, ...(Array.isArray(barcodes) ? barcodes : [])].filter(isBarcode))].slice(0, 4);
    if (!list.length) return { cols: [], rows: [] };
    await ensureCosmeticTable(env);
    return tursoQuery(env, `SELECT * FROM cosmetic_products WHERE code IN (${list.map(() => '?').join(',')}) LIMIT 1`, list, 6000);
  },

  // INSERT OR IGNORE: an existing record is never overwritten. A cosmetic is only
  // saved when it has a real ingredient list (no empty shells).
  async saveCosmetic(env, { barcode, product }, ctx = {}) {
    if (!isBarcode(barcode) || !product || typeof product !== 'object') return { ok: true, skipped: true };
    const name = clip(product.product_name, 200).trim();
    const ingredients = clip(product.ingredients_text, 5000).trim();
    if (!name || ingredients.length < 10) return { ok: true, skipped: true };
    if (rateLimited(ctx.ip || 'unknown', 'savecosmetic', 120, 60 * 60 * 1000)) return { ok: false, error: 'rate limited' };
    await ensureCosmeticTable(env);
    await tursoQuery(env, `INSERT OR IGNORE INTO cosmetic_products
        (code, product_name, brands, ingredients_text, image_url, categories, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode,
        name,
        clip(product.brands, 120),
        ingredients,
        isHttpUrl(product.image_url) ? product.image_url : '',
        clip(product.categories, 300),
        clip(product.source, 80),
        String(Date.now()),
      ]);
    return { ok: true };
  },

  async fetchCuratedProducts(env) {
    await ensureCuratedTable(env);
    // The Top list is the same for everyone and changes rarely: cache it for 2 minutes.
    return cached('curated', 2 * 60 * 1000, () =>
      tursoQuery(env, 'SELECT * FROM curated_products ORDER BY added_at DESC LIMIT 300', [], 8000));
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
        clip(info.name, 120).toLowerCase().trim(),
        clip(info.whatItIs, 1000),
        clip(info.whatItDoes, 1000),
        ['good', 'moderate', 'avoid'].includes(info.healthVerdict) ? info.healthVerdict : 'moderate',
        clip(info.whoSays, 1000),
        clip(info.source, 120) || 'USDA FoodData Central',
        String(Date.now()),
      ]);
    return { ok: true };
  },

  // The whole scan flow in ONE request (see "PRODUCT LOOKUP FLOW" above).
  // Returns { status: 'ok', product } | { status: 'notfound' } | { status: 'busy' | 'invalid' }.
  async lookupProduct(env, { barcode }, meta = {}) {
    if (!isBarcode(barcode)) return { status: 'invalid' };
    if (rateLimited(meta.ip || 'unknown', 'lookup', 150, 60 * 1000)) return { status: 'busy' };
    const key = 'lk:' + barcode;
    const hit = memCache.get(key);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return { ...hit.v, trace: { path: 'memory', external: 0 } };
    const res = await singleFlight(key, () => lookupCore(env, barcode, meta));
    if (res.status === 'ok' && !String(res.trace.path).includes('background')) {
      memCache.set(key, { t: Date.now(), v: res });
      if (memCache.size > 400) memCache.delete(memCache.keys().next().value);
    }
    return res;
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
  async trackReferral(env, { installId, refCode }, ctx = {}) {
    if (!installId || !refCode) return { ok: false, reason: 'missing_params' };
    installId = clip(installId, 64);
    if (rateLimited(ctx.ip || 'unknown', 'track', 20, 60 * 60 * 1000)) return { ok: false, reason: 'network' };
    await ensureReferralTables(env);
    const code = clip(refCode, 20).trim().toUpperCase();

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

    await tursoQuery(env, `INSERT OR IGNORE INTO referrals (referred_id, referrer_id, qualified, created_at, ip)
      VALUES (?, ?, 0, ?, ?)`, [installId, referrerId, String(Date.now()), ctx.ip || null]);
    return { ok: true, reason: 'pending_first_scan' };
  },

  // Call after the referred device's first successful scan. Flips the pending
  // referral to qualified and refreshes the referrer's unlock status.
  async qualifyReferral(env, { installId }, ctx = {}) {
    if (!installId) return { ok: false, reason: 'missing_params' };
    installId = clip(installId, 64);
    if (rateLimited(ctx.ip || 'unknown', 'qualify', 30, 60 * 60 * 1000)) return { ok: true, matched: false };
    await ensureReferralTables(env);
    // A referral can only qualify 60+ seconds after it was applied (slows scripted fake signups).
    await tursoQuery(env,
      `UPDATE referrals SET qualified = 1 WHERE referred_id = ? AND qualified = 0 AND created_at <= ?`,
      [installId, String(Date.now() - 60 * 1000)]);

    const refRes = await tursoQuery(env,
      `SELECT referrer_id, qualified FROM referrals WHERE referred_id = ? LIMIT 1`, [installId]);
    const refRow = rowsOf(refRes)[0];
    const referrerId = refRow?.[0];
    // Not there yet (or still inside the 60s window) → report "not matched" so the app retries on the next scan.
    if (!referrerId || Number(refRow[1]) !== 1) return { ok: true, matched: false };

    const snap = await referralSnapshot(env, referrerId);
    return { ok: true, matched: true, referrerStatus: snap.status };
  },

  // Cleanup helper for automated tests: removes rows for install ids prefixed
  // "test-", plus any explicit ids passed. Safe to keep.
  // Only ever touches rows whose id starts with "test-" — it can no longer delete arbitrary users' rows.
  async purgeTestReferrals(env) {
    await ensureReferralTables(env);
    await tursoQuery(env, `DELETE FROM referrals WHERE referrer_id LIKE 'test-%' OR referred_id LIKE 'test-%'`);
    await tursoQuery(env, `DELETE FROM referral_users WHERE install_id LIKE 'test-%'`);
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
  async fetch(request, env, execCtx) {
    // Preflight: a browser sends this before any POST with a JSON body.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    // Reject oversized bodies before parsing (nothing the app sends is anywhere near this big).
    if (Number(request.headers.get('content-length') || 0) > 200000) {
      return json({ error: 'Payload too large' }, 413);
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
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
    // Generous global cap per address (a real user makes a handful of calls per scan).
    // (High enough for many phones behind one mobile-carrier/office address.)
    if (rateLimited(ip, 'all', 1200, 60 * 1000)) {
      return json({ error: 'Too many requests' }, 429);
    }
    // Name searches are the expensive ones (they can scan the whole table).
    if (action === 'searchProducts' && rateLimited(ip, 'search', 90, 60 * 1000)) {
      return json({ error: 'Too many searches — please slow down' }, 429);
    }
    try {
      const result = await handler(env, params, {
        ip,
        // lets a slow API job finish AFTER the phone already got its answer
        waitUntil: execCtx && execCtx.waitUntil ? (p) => execCtx.waitUntil(p) : null,
      });
      if (['updateNutrition', 'updateIngredients', 'updateProductImage', 'saveProduct'].includes(action)) {
        bustProduct(params.barcode);
      }
      return json({ result });
    } catch (err) {
      return json({ error: err.message || 'Query failed' }, 500);
    }
  },
};
