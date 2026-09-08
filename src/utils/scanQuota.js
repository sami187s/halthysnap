/**
 * Free-tier scan quota — 5 food + 5 cosmetic scans per rolling 24 hours.
 *
 * Self-contained on purpose: it does NOT read the useSubscription hook (which
 * currently grants everyone premium for other features like history + AI).
 * "Unlimited" here means one of:
 *   - a real paid IAP subscription  -> iapManager writes 'premiumStatus'
 *   - a referral unlock             -> referral.js writes 'referralUnlocked'
 * Everyone else gets the quota.
 *
 * A scan is only counted when a product is actually FOUND: the result screens
 * call checkAndConsume() after a successful lookup and before rendering.
 * Products that aren't in any database never reach that call, so "not found"
 * never costs the user a scan. Re-opening a product already scanned inside the
 * current 24h window is free (deduped by barcode). Each category has its own
 * independent rolling window that starts on that category's first scan.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/asyncStorageConfig';

// Master switch. false = legacy behaviour (unlimited for everyone).
export const ENFORCE_SCAN_LIMIT = true;

// Android has no paywall — everything is free + unlimited there.
export const FREE_UNLIMITED_PLATFORM = Platform.OS === 'android';

export const SCAN_LIMITS = { food: 5, cosmetic: 5 };
const WINDOW_MS = 24 * 60 * 60 * 1000;
const KEY = 'vee_scan_quota_v1';

export function scanCategory(x) {
  return String(x || '').toLowerCase().includes('cosmet') ? 'cosmetic' : 'food';
}

async function loadRaw() {
  try {
    const j = JSON.parse(await AsyncStorage.getItem(KEY));
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

async function saveRaw(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

// Returns the live bucket for a category, rolling it over if the 24h window
// has elapsed.
function currentBucket(state, cat) {
  const b = state[cat];
  if (!b || !b.start || Date.now() - b.start >= WINDOW_MS) {
    return { start: Date.now(), codes: [] };
  }
  return { start: b.start, codes: Array.isArray(b.codes) ? b.codes : [] };
}

export async function isScanUnlimited() {
  if (!ENFORCE_SCAN_LIMIT) return true;
  if (FREE_UNLIMITED_PLATFORM) return true; // Android — no limit
  try {
    const pairs = await AsyncStorage.multiGet(['referralUnlocked', STORAGE_KEYS.PREMIUM_STATUS]);
    const map = Object.fromEntries(pairs);
    if (map.referralUnlocked === 'true') return true;
    try {
      if (JSON.parse(map[STORAGE_KEYS.PREMIUM_STATUS] || 'null')?.isPremium) return true;
    } catch {}
    return false;
  } catch {
    return false;
  }
}

/** Read-only view of a category's quota (for the Home cards / paywall copy). */
export async function getQuota(category) {
  const cat = scanCategory(category);
  const limit = SCAN_LIMITS[cat];
  if (await isScanUnlimited()) {
    return { cat, unlimited: true, used: 0, remaining: Infinity, limit, resetsAt: null };
  }
  const bucket = currentBucket(await loadRaw(), cat);
  const used = bucket.codes.length;
  return {
    cat,
    unlimited: false,
    used,
    remaining: Math.max(0, limit - used),
    limit,
    resetsAt: bucket.start + WINDOW_MS,
  };
}

/**
 * Call after a product is FOUND, before rendering the result screen.
 * Returns { blocked, remaining }. When `blocked` is true, redirect the user to
 * the paywall instead of showing the product.
 */
export async function checkAndConsume(category, barcode) {
  const cat = scanCategory(category);
  if (await isScanUnlimited()) return { blocked: false, unlimited: true, remaining: Infinity };

  const code = String(barcode || '').trim();
  const limit = SCAN_LIMITS[cat];
  const state = await loadRaw();
  const bucket = currentBucket(state, cat);

  // Already counted in this window → free re-view.
  if (code && bucket.codes.includes(code)) {
    return { blocked: false, remaining: Math.max(0, limit - bucket.codes.length) };
  }
  // Over quota → block, but persist the (possibly rolled-over) bucket.
  if (bucket.codes.length >= limit) {
    state[cat] = bucket;
    await saveRaw(state);
    return { blocked: true, remaining: 0, resetsAt: bucket.start + WINDOW_MS };
  }
  // Consume one.
  bucket.codes.push(code || `_${Date.now()}`);
  state[cat] = bucket;
  await saveRaw(state);
  return { blocked: false, remaining: Math.max(0, limit - bucket.codes.length) };
}

/** Testing / dev helper. */
export async function resetScanQuota() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
