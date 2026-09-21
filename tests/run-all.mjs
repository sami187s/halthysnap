/**
 * Vee — automated checks.   Run:  npm test
 *
 * 1. Scoring   — everyday foods/cosmetics must score sensibly (the "common-sense" table).
 * 2. Quota     — 5 free scans / 24 h per category, paywall, unlimited for subscribers/referrers.
 * 3. Worker    — the scan flow (our DB → Open Food Facts → USDA → save) against a FAKE database
 *                and FAKE public APIs, so it needs no network and touches no real data.
 *
 * Exit code is non-zero if anything fails (use it in CI).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const babel = require(path.join(root, 'node_modules', '@babel', 'core'));
const Module = require('node:module');

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++; else failed++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail !== '' ? '   → ' + detail : ''}`);
};
const section = (t) => console.log(`\n${t}\n${'─'.repeat(t.length)}`);

// ── load app modules (Babel) with React-Native stubs ────────────────────────────────
const store = {};
const AsyncStorage = {
  getItem: async (k) => (k in store ? store[k] : null),
  setItem: async (k, v) => { store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
  multiGet: async (ks) => ks.map((k) => [k, k in store ? store[k] : null]),
};
const origLoad = Module._load;
Module._load = function (req) {
  if (req === '@react-native-async-storage/async-storage') return { default: AsyncStorage, ...AsyncStorage };
  if (req === 'react-native') return { Platform: { OS: 'ios' } };
  return origLoad.apply(this, arguments);
};
require.extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return m._compile(fs.readFileSync(filename, 'utf8'), filename);
  const out = babel.transformFileSync(filename, {
    presets: [path.join(root, 'node_modules', 'babel-preset-expo')],
    babelrc: false, configFile: false, caller: { name: 'metro', platform: 'ios' },
  });
  m._compile(out.code, filename);
};
const quietLog = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = quietLog; } };

// ═════════════════════════════════════════════════════════════════════════════
section('1. Scoring (src/utils/enhancedScoring.js, enhancedIngredientAnalyzer.js)');
const S = quiet(() => require(path.join(root, 'src/utils/enhancedScoring.js')));
const A = quiet(() => require(path.join(root, 'src/utils/enhancedIngredientAnalyzer.js')));
const N = (kcal, fat, sat, sugars, salt, protein, fiber) => ({ 'energy-kcal_100g': kcal, fat_100g: fat, 'saturated-fat_100g': sat, sugars_100g: sugars, salt_100g: salt, proteins_100g: protein, fiber_100g: fiber });
const food = (name, nutr, ingr, grade = null, categories = '') =>
  quiet(() => S.calculateHealthScore({ product_name: name, categories, nutriments: nutr, ingredients_text: ingr, nutriscore_grade: grade }, null, null));

let r;
r = food('Water', N(0, 0, 0, 0, 0.01, 0, 0), 'water', 'a'); check('Water ≥ 95', r.score >= 95, r.score);
r = food('Fresh spinach', N(23, 0.4, 0.1, 0.4, 0.2, 2.9, 2.2), 'spinach', 'a'); check('Spinach ≥ 95', r.score >= 95, r.score);
r = food('Rolled oats', N(370, 7, 1.3, 1, 0.02, 13, 10), 'whole grain rolled oats', 'a'); check('Oats ≥ 85', r.score >= 85, r.score);
r = food('Olive oil', N(884, 100, 14, 0, 0, 0, 0), 'extra virgin olive oil', 'c'); check('Olive oil 60–85', r.score >= 60 && r.score <= 85, r.score);
r = food('Cola', N(42, 0, 0, 10.6, 0, 0, 0), 'carbonated water, sugar, colour: caramel e150d, phosphoric acid, natural flavourings', 'e', 'Beverages, Sodas'); check('Sugary cola ≤ 40', r.score <= 40, r.score);
r = food('Orange juice', N(45, 0.1, 0, 9, 0, 0.7, 0.2), 'orange juice', 'c', 'Beverages, Fruit juices'); check('Orange juice ≤ 80 (drink sugar rules)', r.score <= 80, r.score);
r = food('Gummy candy', N(340, 0.1, 0, 47, 0.03, 6, 0), 'glucose syrup, sugar, gelatin, citric acid, colours: e102 e110 e124, flavourings', 'e'); check('Gummy candy ≤ 20', r.score <= 20, r.score);
r = food('Instant noodles', N(450, 18, 8, 2, 4, 9, 2), 'wheat flour, palm oil, salt, flavour enhancers: e621 e627 e631, preservative: tbhq', 'e'); check('Instant noodles ≤ 25', r.score <= 25, r.score);
r = food('Milk chocolate', N(535, 30, 18, 56, 0.2, 7, 2), 'sugar, cocoa butter, skimmed milk powder, cocoa mass, lecithin', 'e'); check('Milk chocolate ≤ 25', r.score <= 25, r.score);
r = food('Perfect but azo dye', N(50, 0.5, 0.1, 1, 0.05, 5, 5), 'water, e110', 'a'); check('A high-risk additive (E110) caps the score at 59', r.score <= 59, r.score);
r = food('No data', {}, ''); check('No data → no score (never invented)', r.score === null && r.insufficientData === true);
r = food('kJ only', { energy_100g: 2200, fat_100g: 30, sugars_100g: 56 }, ''); check('Energy in kJ is converted (junk stays low)', r.score !== null && r.score <= 60, r.score);

const cosmetic = (l) => quiet(() => A.analyzeIngredients(l, 'beauty'));
r = cosmetic('aqua, glycerin, cetearyl alcohol, caprylic/capric triglyceride, shea butter, panthenol, tocopherol, sodium hyaluronate, xanthan gum, citric acid, phenoxyethanol'); check('Clean moisturiser ≥ 70', r.score >= 70, r.score);
r = cosmetic('aqua, sodium lauryl sulfate, cocamidopropyl betaine, glycerin, sodium chloride, methylparaben, propylparaben, parfum, citric acid'); check('Shampoo with SLS + parabens is Poor (≤ 49)', r.score <= 49, r.score);
r = cosmetic('aqua, homosalate, octocrylene, oxybenzone, avobenzone, glycerin, dimethicone, phenoxyethanol'); check('Sunscreen with oxybenzone is Poor (≤ 49)', r.score <= 49, r.score);
r = cosmetic(''); check('Cosmetic with no ingredient list → no score', r.score === null);
r = cosmetic('zzzqx, blorptax'); check('Unrecognised ingredients are not "recognised" → no score', r.score === null);
check('Product type: "Protein Shampoo" is a cosmetic, not food', A.getProductTypeFromCategories('', 'Protein Shampoo', '') === 'beauty');

// ═════════════════════════════════════════════════════════════════════════════
section('2. Free-scan quota (src/utils/scanQuota.js)');
let now = 1_800_000_000_000;
const realNow = Date.now; Date.now = () => now;
const Q = quiet(() => require(path.join(root, 'src/utils/scanQuota.js')));
for (let i = 0; i < 5; i++) { r = await Q.checkAndConsume('food', '1000000' + i); check(`Food scan ${i + 1}/5 allowed`, !r.blocked && r.remaining === 4 - i); }
r = await Q.checkAndConsume('food', '10000009'); check('6th different food scan is BLOCKED → paywall', r.blocked === true);
r = await Q.checkAndConsume('food', '10000002'); check('Re-opening an already-counted product is free', !r.blocked);
r = await Q.checkAndConsume('cosmetic', '20000001'); check('Cosmetics have their own 5 scans', !r.blocked);
now += 24 * 3600e3 - 1000; r = await Q.checkAndConsume('food', '10000009'); check('Still blocked 1 s before 24 h', r.blocked === true);
now += 2000; r = await Q.checkAndConsume('food', '10000009'); check('Allowed again after 24 h', !r.blocked);
for (const c of ['10000011', '10000012', '10000013', '10000014']) await Q.checkAndConsume('food', c);
store.premiumStatus = JSON.stringify({ isPremium: true }); r = await Q.checkAndConsume('food', '10000015'); check('Paying subscriber: unlimited', !r.blocked && r.unlimited);
delete store.premiumStatus; r = await Q.checkAndConsume('food', '10000016'); check('Subscription ended → limit applies again', r.blocked === true);
store.referralUnlocked = 'true'; now += 400 * 24 * 3600e3; r = await Q.checkAndConsume('food', '10000017'); check('Referral unlock: unlimited, still unlimited 400 days later', !r.blocked && r.unlimited);
Date.now = realNow;

// ═════════════════════════════════════════════════════════════════════════════
section('3. Worker scan flow (cf-turso-proxy/worker.js) with a fake database + fake public APIs');
const products = new Map(), cosmetics = new Map(), misses = new Map();
const calls = { off: 0, usda: 0, obf: 0 };
const OFF = {
  '3000000000001': { status: 1, product: { product_name: 'Fake Cereal', brands: 'Acme', categories: 'Cereals', ingredients_text: 'oats, sugar, salt, honey', image_front_url: 'https://img.example/a.jpg', nutriments: { 'energy-kcal_100g': 380, fat_100g: 5, 'saturated-fat_100g': 1, sugars_100g: 20, salt_100g: 0.5, proteins_100g: 8, fiber_100g: 6 }, nutriscore_grade: 'c', nova_group: 4, additives_tags: ['en:e330'], allergens_tags: ['en:gluten'] } },
  '3000000000002': { status: 1, product: { product_name: 'Bare Snack', brands: '', categories: '', ingredients_text: '', nutriments: {} } },
  '3000000000003': { status: 1, product: { product_name: 'Junk Data', ingredients_text: 'water, sugar', nutriments: { sugars_100g: 900, fat_100g: 500 } } },
  '3000000000004': { status: 1, product: { product_name: 'Old Row', brands: 'OldBrand', categories: 'Snacks', ingredients_text: 'peanuts, salt', image_front_url: 'https://img.example/old.jpg', nutriments: { 'energy-kcal_100g': 600, fat_100g: 50, 'saturated-fat_100g': 8, sugars_100g: 4, salt_100g: 1, proteins_100g: 25, fiber_100g: 8 } } },
};
const USDA = { '3000000000002': { foods: [{ gtinUpc: '3000000000002', description: 'BARE SNACK', brandOwner: 'Usda Co', foodCategory: 'Snacks', ingredients: 'corn, salt, vegetable oil', foodNutrients: [{ nutrientId: 1008, value: 500 }, { nutrientId: 1004, value: 25 }, { nutrientId: 1258, value: 3 }, { nutrientId: 2000, value: 2 }, { nutrientId: 1003, value: 6 }, { nutrientId: 1079, value: 4 }, { nutrientId: 1093, value: 600 }] }] } };
const OBF = { '3000000000009': { status: 1, product: { product_name: 'Fake Face Cream', brands: 'Beau', ingredients_text: 'aqua, glycerin, dimethicone, parfum', image_front_url: 'https://img.example/c.jpg' } } };
const PCOLS = ['code', 'product_name', 'ingredients_text', 'image_url', 'energy_100g', 'fat_100g', 'saturated_fat_100g', 'sugars_100g', 'salt_100g', 'proteins_100g', 'fiber_100g', 'nutriscore_grade', 'nova_group', 'labels_tags', 'allergens', 'additives_tags', 'brands', 'categories', 'enriched_at', 'sources'];
const COSCOLS = ['code', 'product_name', 'brands', 'ingredients_text', 'image_url', 'categories', 'source', 'created_at'];
products.set('3000000000004', { code: '3000000000004', product_name: 'Old Row', ingredients_text: '', energy_100g: '', fat_100g: '', sugars_100g: 'null', image_url: '', brands: null, categories: null, enriched_at: null });
products.set('3000000000005', { code: '3000000000005', product_name: 'Complete Row', ingredients_text: 'wheat flour, water, salt, yeast', energy_100g: '250', fat_100g: '1', saturated_fat_100g: '0.2', sugars_100g: '3', salt_100g: '1.1', proteins_100g: '9', fiber_100g: '3', image_url: 'https://x/y.jpg', brands: 'B', categories: 'Bread', enriched_at: 1 });
const cell = (v) => (v === null || v === undefined ? { type: 'null', value: null } : { type: 'text', value: String(v) });
const table = (rows, cs) => ({ cols: cs.map((name) => ({ name })), rows: rows.map((o) => cs.map((c) => cell(o[c]))) });
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (url.includes('turso.example')) {
    const st = JSON.parse(opts.body).requests[0].stmt;
    const sql = st.sql.replace(/\s+/g, ' ').trim();
    const a = st.args.map((x) => (x.type === 'null' ? null : x.value));
    let res = { cols: [], rows: [] };
    if (/^SELECT brands, categories/.test(sql)) res = table([], PCOLS);
    else if (/^SELECT \* FROM products WHERE code IN/.test(sql)) res = table([a.map((c) => products.get(c)).find(Boolean)].filter(Boolean), PCOLS);
    else if (/^SELECT \* FROM cosmetic_products/.test(sql)) res = table([a.map((c) => cosmetics.get(c)).find(Boolean)].filter(Boolean), COSCOLS);
    else if (/^SELECT last_try FROM barcode_misses/.test(sql)) res = table(misses.has(a[0]) ? [{ last_try: misses.get(a[0]) }] : [], ['last_try']);
    else if (/^INSERT INTO barcode_misses/.test(sql)) misses.set(a[0], Number(a[1]));
    else if (/^INSERT OR IGNORE INTO products/.test(sql)) { const o = {}; PCOLS.forEach((c, i) => (o[c] = a[i])); if (!products.has(o.code)) products.set(o.code, o); }
    else if (/^INSERT OR IGNORE INTO cosmetic_products/.test(sql)) { const o = {}; COSCOLS.forEach((c, i) => (o[c] = a[i])); cosmetics.set(o.code, o); }
    else if (/^UPDATE products SET/.test(sql)) {
      const row = products.get(a[a.length - 1]);
      const parts = sql.replace(/^UPDATE products SET /, '').replace(/ WHERE code = \?$/, '').split(/, (?=[a-z0-9_]+ = )/);
      let i = 0;
      for (const part of parts) {
        const col = part.split(' = ')[0]; const val = a[i++];
        if (part.includes('CASE WHEN')) { if (row[col] === null || row[col] === undefined || row[col] === '' || row[col] === 'null') row[col] = val; } else row[col] = val;
      }
    }
    return { ok: true, json: async () => ({ results: [{ type: 'ok', response: { result: res } }] }) };
  }
  const m = /api\/v2\/product\/(\d+)\.json/.exec(url);
  if (url.includes('openbeautyfacts')) { calls.obf++; const j = OBF[m[1]]; return j ? { ok: true, json: async () => j } : { ok: false, json: async () => ({}) }; }
  if (url.includes('openfoodfacts')) { calls.off++; const j = OFF[m[1]]; return j ? { ok: true, json: async () => j } : { ok: false, json: async () => ({ status: 0 }) }; }
  if (url.includes('nal.usda.gov')) { calls.usda++; return { ok: true, json: async () => USDA[new URL(url).searchParams.get('query')] || { foods: [] } }; }
  throw new Error('unexpected fetch ' + url);
};
const tmpWorker = path.join(os.tmpdir(), `vee-worker-${process.pid}.mjs`);
fs.copyFileSync(path.join(root, 'cf-turso-proxy', 'worker.js'), tmpWorker);
const worker = (await import(pathToFileURL(tmpWorker).href)).default;
fs.unlinkSync(tmpWorker);
const env = { TURSO_URL: 'https://turso.example/x', TURSO_TOKEN: 't', USDA_API_KEY: 'k' };
let ipn = 1;
const lookup = async (barcode) => {
  const before = { ...calls };
  const req = new Request('https://w/', { method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '10.0.0.' + (ipn++ % 200) }, body: JSON.stringify({ action: 'lookupProduct', barcode }) });
  const out = (await (await worker.fetch(req, env, { waitUntil() {} })).json()).result;
  out.ext = { off: calls.off - before.off, usda: calls.usda - before.usda, obf: calls.obf - before.obf };
  return out;
};
r = await lookup('3000000000005'); check('Complete product already in our DB → NO public API called', r.status === 'ok' && r.ext.off + r.ext.usda + r.ext.obf === 0);
r = await lookup('3000000000004'); check('Product with gaps → Open Food Facts fills them', r.status === 'ok' && r.trace.path === 'db+filled-gaps' && r.ext.off === 1);
check('  brand, categories, ingredients, image, nutrition filled; the text "null" replaced', r.product.brands === 'OldBrand' && r.product.categories === 'Snacks' && r.product.ingredients_text === 'peanuts, salt' && !!r.product.image_url && r.product.nutriments['energy-kcal_100g'] === 600 && r.product.nutriments.sugars_100g === 4);
check('  saved into our database (enriched_at + sources)', products.get('3000000000004').enriched_at > 1 && products.get('3000000000004').sources === 'off');
r = await lookup('3000000000004'); check('Second scan → no public API call', r.ext.off + r.ext.usda === 0);
r = await lookup('3000000000001'); check('New product → Open Food Facts → saved to our DB', r.status === 'ok' && /new/.test(r.trace.path) && products.get('3000000000001').brands === 'Acme');
r = await lookup('3000000000002'); check('OFF has no data → USDA (exact barcode) fills ingredients + nutrition (salt from sodium)', r.ext.usda === 1 && r.product.ingredients_text === 'corn, salt, vegetable oil' && Math.abs(r.product.nutriments.salt_100g - 1.5) < 0.01);
r = await lookup('3000000000003'); check('Impossible nutrition (900 g sugar) is rejected; ingredients kept', Object.keys(r.product.nutriments).length === 0 && r.product.ingredients_text === 'water, sugar');
r = await lookup('3000000000009'); check('Cosmetic → Open Beauty Facts → saved in the cosmetic table', r.product.product_type === 'beauty' && cosmetics.has('3000000000009'));
r = await lookup('3000000000009'); check('Cosmetic scanned again → no public API call', r.ext.obf === 0);
r = await lookup('4999999999998'); check('Unknown barcode → not found', r.status === 'notfound');
r = await lookup('4999999999998'); check('Same unknown barcode again → remembered, no public API calls', r.status === 'notfound' && r.ext.off + r.ext.usda + r.ext.obf === 0);
r = await lookup('12'); check('Invalid barcode is rejected', r.status === 'invalid');

// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ FAILURES'} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
