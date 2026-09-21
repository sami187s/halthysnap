/**
 * Turso proxy health check.
 * Run:  node cf-turso-proxy/healthcheck.mjs
 *
 * Exercises every action the app calls through the Cloudflare Worker proxy
 * and prints PASS/FAIL for each. Exit code is non-zero if anything failed.
 */

const PROXY_URL = 'https://vee-turso-proxy.samis1979s4.workers.dev';

async function call(action, params = {}) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.result;
}

const checks = [
  {
    name: 'getProduct (Nutella barcode 3017620422003)',
    run: async () => {
      const r = await call('getProduct', { barcode: '3017620422003' });
      if (!r.rows?.length) throw new Error('no row returned');
      return `found "${r.rows[0][1].value}"`;
    },
  },
  {
    name: 'getProduct (unknown barcode -> empty)',
    run: async () => {
      const r = await call('getProduct', { barcode: '000000000000' });
      if (r.rows?.length) throw new Error('expected 0 rows');
      return 'correctly empty';
    },
  },
  {
    name: 'searchProducts ("cola")',
    run: async () => {
      const r = await call('searchProducts', { query: 'cola' });
      if (!r.rows?.length) throw new Error('no matches');
      return `${r.rows.length} rows`;
    },
  },
  {
    // The website calls this Worker from a browser; without CORS the browser
    // blocks every request before it leaves the page.
    name: 'CORS preflight (needed by the website)',
    run: async () => {
      const res = await fetch(PROXY_URL, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://vee.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      const allow = res.headers.get('access-control-allow-origin');
      if (!res.ok && res.status !== 204) throw new Error(`preflight returned ${res.status}`);
      if (!allow) throw new Error('no Access-Control-Allow-Origin header — website will be blocked');
      return `allow-origin: ${allow}`;
    },
  },
  {
    name: 'fetchAlternatives ("chocolate")',
    run: async () => {
      const r = await call('fetchAlternatives', { categoryKeyword: 'chocolate', excludeBarcode: '0', limit: 5 });
      const n = r.withImage?.rows?.length ?? 0;
      if (!n) throw new Error('no alternatives');
      return `${n} rows`;
    },
  },
  {
    name: 'fetchCuratedProducts',
    run: async () => {
      const r = await call('fetchCuratedProducts');
      return `${r.rows?.length ?? 0} curated products`;
    },
  },
  {
    name: 'getIngredientInfo ("sugar")',
    run: async () => {
      await call('getIngredientInfo', { name: 'sugar' });
      return 'query ok';
    },
  },
];

let failed = 0;
for (const c of checks) {
  try {
    const detail = await c.run();
    console.log(`PASS  ${c.name}  ->  ${detail}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${c.name}  ->  ${e.message}`);
  }
}

console.log(failed === 0
  ? '\nAll checks passed — Turso DB + proxy are working.'
  : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
