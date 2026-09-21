# Vee — health product scanner

Scan a food or cosmetic barcode → get an honest **0–100 health score**, the real ingredient list, nutrition, additive
risks and healthier alternatives. React Native (Expo SDK 52) app + a small serverless backend.

> **House rule — no fake data.** A score is only shown when real ingredient or nutrition data exists.
> Missing data is never treated as "zero" or "perfect", no default scores (50/60/70), no invented
> ingredients, images or alternatives. No data → "Not enough data".

---

## 1. Architecture

```
 ┌────────────┐   1 request per scan    ┌───────────────────────┐   SQL    ┌──────────────┐
 │  Phone app │ ──────────────────────▶ │  Worker (vee-turso-   │ ───────▶ │  Turso (DB)  │
 │ Expo / RN  │ ◀────────────────────── │  proxy) cf-turso-proxy│ ◀─────── │  products…   │
 └─────┬──────┘   finished product      └──────────┬────────────┘          └──────────────┘
       │                                           │ only for NEW products / GAPS
       │ purchases                                 ▼
       ▼                                  Open Food Facts · Open Beauty Facts · USDA
  RevenueCat (iOS subscription)
  Sentry (crash reports only)
```

* **App** (`App.js`, `src/`) — never holds a database credential. Talks only to the Worker.
* **Worker** (`cf-turso-proxy/worker.js`, Cloudflare Workers) — holds the database token and the USDA key as
  *secrets*, exposes a fixed list of actions (no raw SQL from clients), validates input, rate-limits, caches.
* **Turso** (libSQL/SQLite) — our own product database (1M+ food products, growing with every scan).

## 2. The scan flow (the heart of the product)

The phone sends **one** request (`lookupProduct`); the Worker does everything:

1. **Our database first.** Found and complete → answer in ~20 ms, **no public API is called.**
2. **Found but with gaps** (missing ingredients / nutrition / image / brand / categories):
   fill the gaps from **Open Food Facts** (by exact barcode). Still missing ingredients or nutrition →
   ask **USDA** (accepted only on an *exact* barcode match). Save the result.
3. **Not in our database:** Open Food Facts → USDA for missing pieces → **save the new product**.
   Not food? → **Open Beauty Facts** → saved in `cosmetic_products` (only with a real ingredient list).
4. **Nobody knows the barcode:** remember that for 24 h so junk scans never hammer the APIs.
5. The phone formats the product, computes the score, shows it, and counts one free scan
   (only if the product was found **and** has data).

Safety rules inside the flow:

| Rule | Why |
|---|---|
| Only **empty** fields are ever filled — real data is never overwritten | protects good data |
| A product whose gaps the APIs cannot fill is **not retried for 14 days** (`enriched_at`) | no API hammering |
| Max **12** simultaneous public-API jobs per Worker instance; single-flight per barcode | protects the APIs and us |
| Impossible nutrition (any field > 100 g/100 g, kcal > 950, sat.fat > fat, sum > 110 g) is **discarded** | bad API data never enters the DB |
| kJ → kcal, sodium → salt (×2.5) conversion; everything stored **per 100 g/ml, kcal** | one unit system |
| A slow API never blocks the user: after 3.5 s the phone gets what we have, the rest finishes in the background | speed |
| If the Worker is unreachable, the phone falls back to calling the public APIs itself | resilience |

Debugging: every response contains `trace.path` — `db`, `db+filled-gaps`, `memory`, `new (saved to our database)`,
`new cosmetic (saved…)`, `remembered miss`, `not found anywhere` — and `trace.external` (public-API calls made).

## 3. Data model (Turso)

| Table | Purpose | Key columns |
|---|---|---|
| `products` | food (imported from Open Food Facts, then grown by scans) | `code`, `product_name`, `ingredients_text`, `energy_100g` (kcal), `fat_100g`, `saturated_fat_100g`, `sugars_100g`, `salt_100g`, `proteins_100g`, `fiber_100g`, `nutriscore_grade`, `nova_group`, `additives_tags`, `allergens`, `labels_tags`, `image_url`, **`brands`, `categories`, `enriched_at`, `sources`** |
| `cosmetic_products` | cosmetics found via Open Beauty Facts | `code`, `product_name`, `brands`, `ingredients_text`, `image_url`, `categories`, `source`, `created_at` |
| `barcode_misses` | barcodes nobody knows (24 h memory) | `code`, `last_try`, `tries` |
| `curated_products` | the "Top / Best" list shown to everyone | `barcode`, `name`, `brand`, `score`, `image_url`, `product_type` |
| `ingredient_info` | cached ingredient explanations | `name`, `what_it_is`, … |
| `referral_users`, `referrals` | referral programme (device based) | see §5 |

Notes: `products` originally had **no** brand/category columns; they are added automatically (instant `ALTER TABLE`).
Values are text in SQLite — always parse. A missing value is a real `NULL` (an old bug stored the *text* "null";
gap-filling treats `''`, `NULL` and `'null'` as empty).

## 4. Scoring (`src/utils/enhancedScoring.js`, `enhancedIngredientAnalyzer.js`, `additiveRisk.js`)

Bands everywhere in the app: **Good 70–100 · Fair 50–69 · Poor 0–49.**

**Food** = Nutrition **55 %** + Ingredients **30 %** + Processing **10 %** + up to 5 bonus points (fibre/protein/whole grain).
* Each part starts at 100 and loses points (sugar, salt, saturated fat, calories; risky ingredients; ultra-processed markers).
* **Only parts with real data count**; the remaining weights are re-normalised. The results screen says
  "Based on ingredients only" / "nutrition only" when partial.
* **Drinks** use stricter sugar limits per 100 ml (>8 g very high, >5 high, >2.5 moderate).
* **Additives:** E-numbers from Open Food Facts tags *and* the label text are checked against `additiveRisk.js`
  (high: azo dyes E102/E104/E110/E122/E124/E129, nitrites/nitrates E249–E252, BHA E320, titanium dioxide E171;
  moderate: benzoates, sulphites, phosphates, carrageenan, MSG, sweeteners, caramel E150c/d …). Harmless additives
  (citric acid, vitamin C, lecithin, pectin, xanthan…) are never penalised.
* **Nutri-Score** (when Open Food Facts has it): A +15, B +8, D −15, E −32 (applied before the caps).
* **Caps (applied last):** harmful chemical (carcinogen/endocrine disruptor) → max **49**; high-risk additive → max **59**.

**Cosmetics** = average safety of the *recognised* ingredients, then: −8 per concerning ingredient (max −32);
any *very* hazardous ingredient (safety < 35: parabens, oxybenzone…) caps at **49**, any concerning one caps at **69**
(an average must not hide a dangerous ingredient). Unrecognised ingredients are reported, never scored.
No ingredient list or nothing recognised → no score.

Product type (food vs cosmetic) is decided in `getProductTypeFromCategories` (strong cosmetic words in the *name*
— shampoo, moisturiser, sunscreen… — win over food words).

## 5. Free scans, paywall, referrals

* **Free tier (iOS):** 5 food + 5 cosmetic scans per rolling 24 h (`src/utils/scanQuota.js`, on-device).
  A scan counts only when the product is **found and has data**; re-opening one already counted is free;
  "not found" / "not enough data" never cost a scan. The quota is checked in the scan preview *and* on the results screen.
* At the limit the app opens the upgrade screen (with a "free scans come back in Xh Ym" hint).
  Subscribers (RevenueCat entitlement `vee Pro`) and referral-unlocked users are unlimited.
* **Android:** free and unlimited by design (`FREE_UNLIMITED_PLATFORM`).
* **Referral:** share code `SG-XXXXXXX`; 10 *qualified* referrals = lifetime unlimited. A referral qualifies on the
  friend's first real scan, ≥ 60 s after the code was applied; qualified referrals are counted per **distinct network
  address**, so one person cannot fake ten friends from one connection.
* ⚠️ `src/hooks/useSubscription.js` currently grants "Premium" to everyone for *history/UI* features (looks deliberate);
  only the scan quota uses real purchase state. Decide before launch whether that is intended.

## 6. Worker API (`POST /` with `{ "action": …, …params }`)

`lookupProduct` (whole scan flow) · `getProduct` / `getCosmetic` (accept `barcodes: [...]` = every spelling in one query) ·
`searchProducts` · `fetchAlternatives` · `fetchCuratedProducts` / `saveCuratedProduct` · `updateNutrition` /
`updateIngredients` / `updateProductImage` (fill-only-empty) · `saveProduct` / `saveCosmetic` (insert-or-ignore) ·
`getIngredientInfo` / `saveIngredientInfo` · `syncReferral` / `trackReferral` / `qualifyReferral` / `purgeTestReferrals`.

Protection: input validation and length caps; LIKE-wildcard escaping; per-address limits (1200 req/min overall,
90 searches/min, 150 lookups/min, 10 "curate" writes/hour); retry on database 429/503; in-memory caches
(found products 5 min, searches 10 min, alternatives 30 min, Top list 2 min). The app has **no user accounts**, so these
limits slow abuse but are not real authentication (see §9).

## 7. Setup, secrets, deploy

```bash
npm install
npm test                                  # 44 automated checks (no network)
npx expo start --dev-client               # run the app
eas build --platform ios --profile production

cd cf-turso-proxy
npx wrangler deploy                       # deploy the Worker
node healthcheck.mjs                      # live check of the deployed Worker
```

Worker secrets (never in git or in the app): `TURSO_TOKEN`, `USDA_API_KEY` (`npx wrangler secret put NAME`).
Worker var: `TURSO_URL` (in `wrangler.toml`). App config: `app.json` (URL scheme `vee://` for referral links).

## 8. Capacity and cost (measured, not guessed)

* Load test against the live Worker: 60 different products at once = **1.7 s, 0 failures**; a 520-request burst = 0
  failures (slower under queueing; the database handles ≈ 50–65 requests/s).
* A repeat scan is ≈ **15–25 ms**; a brand-new product ≈ **250 ms–2 s** (public API), then it is ours forever.
* Request budget ≈ **15–20 Worker requests per active user per day** → Cloudflare's free tier (100 k/day) covers roughly
  5 k active users a day; **10 k+ users/day needs the paid Workers plan (~US$5/month)**. Check the Turso plan's
  row-read and concurrency limits (a 429 = "too busy"; the Worker retries).

## 9. Known limitations / roadmap

1. **Not yet tested on real devices** — run a TestFlight beta before launch.
2. Name search (`LIKE '%word%'`) scans the table for rare words (2–5 s worst case). Add an FTS5 index.
3. Some legacy rows have per-serving numbers or empty nutrition; gaps fill on first scan, wrong values are not
   auto-detected. A one-off backfill from the Open Food Facts dump would clean the database.
4. Free-scan limit is on-device (clearing app data resets it) and referrals/curation have no real authentication —
   add Sign in with Apple + server-side checks if abuse appears.
5. English only; add French (Canada). No offline mode. No analytics (only crash reports).
6. Scoring: diet drinks and salty snacks still score higher than Yuka-style expectations (additives weigh 30 %,
   Nutri-Score is an adjustment, not the base). Tuning is a product decision.
7. Android release settings still to do (AAB build, target API 35).

## 10. Data sources and licences

Open Food Facts / Open Beauty Facts (ODbL — **attribution required, share-alike applies to derived databases**;
credited in *About → Sources*), USDA FoodData Central (public domain). Health disclaimer lives in *About*.

## 11. Repo map

`App.js` navigation · `src/screens` UI · `src/services` (`reliableAPI.js` scan client, `tursoDB.js`, `iapManager.js`, `referral.js`) ·
`src/utils` (scoring, quota, history) · `cf-turso-proxy` backend · `tests/run-all.mjs` checks ·
`_unused_code/` retired files (safe to delete; kept for reference) · `website/` marketing site (separate, not part of the app).
