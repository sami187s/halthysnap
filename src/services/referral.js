/**
 * Referral program (device-based)
 *
 * The app has no user accounts, so identity is a random "install id" generated
 * on first launch and stored in AsyncStorage, mirrored to Turso through the
 * Cloudflare Worker proxy (cf-turso-proxy/). Flow:
 *
 *   1. First launch  -> getInstallId() + syncReferralStatus() (creates the row,
 *      derives this device's share code SG-XXXXXX)
 *   2. Arrived via a friend's link / typed a code -> captureRefCode() then
 *      trackCapturedReferral() sends it once (referral is "pending")
 *   3. First real scan -> markScanQualified() flips the referral to "qualified"
 *   4. When a referrer reaches REFERRAL_GOAL qualified referrals the Worker
 *      flips their status to "unlocked" (lifetime free). syncReferralStatus()
 *      then mirrors that to the AsyncStorage keys the rest of the app reads.
 *
 * Every call is network-resilient: on failure we fall back to the cached
 * snapshot and retry on the next launch/scan. Nothing here throws to callers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROXY_URL = 'https://vee-turso-proxy.samis1979s4.workers.dev';
export const REFERRAL_GOAL = 10;

const K = {
  installId: 'vee_install_id',
  captured: 'vee_ref_captured',   // referral code this device arrived with (pending track)
  tracked: 'vee_ref_tracked',     // '1' once trackReferral got a definitive answer
  qualified: 'vee_ref_qualified', // '1' once this device's referral is qualified (or N/A)
  status: 'vee_referral_status',  // JSON { code, status, referral_count, goal, ts }
};

// ── helpers ────────────────────────────────────────────────────────────────
// Opaque 32-hex-char device id (not a validated UUID — just needs to be
// unique and stable per install).
function genId() {
  let s = '';
  for (let i = 0; i < 32; i++) s += ((Math.random() * 16) | 0).toString(16);
  return s;
}

async function proxy(action, params = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeCode(raw) {
  if (!raw) return '';
  let c = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!c) return '';
  // accept "sg-a4f9k", "SGA4F9K", "a4f9k" -> "SG-A4F9K"
  c = c.replace(/^SG-?/, '');
  c = c.replace(/[^A-Z0-9]/g, '');
  return c ? `SG-${c}` : '';
}

// ── install id ─────────────────────────────────────────────────────────────
export async function getInstallId() {
  let id = await AsyncStorage.getItem(K.installId);
  if (!id) {
    id = genId();
    await AsyncStorage.setItem(K.installId, id);
  }
  return id;
}

// ── capture an incoming code (deep link or manual) ─────────────────────────
export async function captureRefCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return;
  const [already, tracked] = await AsyncStorage.multiGet([K.captured, K.tracked]);
  if (already[1] || tracked[1]) return; // first code wins, never overwrite
  await AsyncStorage.setItem(K.captured, code);
}

// ── status snapshot ────────────────────────────────────────────────────────
export async function getCachedStatus() {
  try {
    const raw = await AsyncStorage.getItem(K.status);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCache(snap) {
  const value = { ...snap, ts: Date.now() };
  await AsyncStorage.setItem(K.status, JSON.stringify(value));
  if (snap.status === 'unlocked') {
    // Mirror to the keys the rest of the app already understands so an unlocked
    // user is treated as premium everywhere without further wiring.
    await AsyncStorage.multiSet([
      ['referralUnlocked', 'true'],
      ['subscriptionType', 'Premium'],
      ['subscriptionExpiresAt', String(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)],
      ['lastSubscriptionCheck', String(Date.now())],
    ]);
  }
  return value;
}

/** One network call. Safe on every launch and on paywall focus. */
export async function syncReferralStatus() {
  try {
    const installId = await getInstallId();
    const snap = await proxy('syncReferral', { installId });
    if (snap && !snap.error) return writeCache(snap);
  } catch (e) {
    console.log('referral sync failed (non-fatal):', e.message);
  }
  return (
    (await getCachedStatus()) || { code: null, status: 'free', referral_count: 0, goal: REFERRAL_GOAL }
  );
}

// ── send a captured/typed code to the backend ─────────────────────────────
async function sendTrack(code) {
  const installId = await getInstallId();
  const res = await proxy('trackReferral', { installId, refCode: code });
  const definitive =
    res && (res.ok || ['self', 'invalid_code', 'already_referred'].includes(res.reason));
  if (definitive) {
    // 'self' / 'invalid_code' shouldn't be retried, but also shouldn't lock the
    // user out of trying a different code — only a real match locks it.
    if (res.ok || res.reason === 'already_referred') {
      await AsyncStorage.setItem(K.tracked, '1');
    }
  }
  return res || { ok: false, reason: 'network' };
}

/** Fire on launch: if we arrived with a code and haven't sent it, send it. */
export async function trackCapturedReferral() {
  try {
    const [tracked, captured] = await AsyncStorage.multiGet([K.tracked, K.captured]);
    if (tracked[1] || !captured[1]) return;
    return await sendTrack(captured[1]);
  } catch (e) {
    console.log('trackReferral failed (retry next launch):', e.message);
  }
}

/** Manual entry from the paywall. Returns { ok, reason }. */
export async function submitReferralCode(raw) {
  const code = normalizeCode(raw);
  if (!code || code.length < 5) return { ok: false, reason: 'invalid_code' };
  const tracked = await AsyncStorage.getItem(K.tracked);
  if (tracked) return { ok: false, reason: 'already_referred' };
  try {
    await AsyncStorage.setItem(K.captured, code);
    return await sendTrack(code);
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}

/** Fire after the user's first successful scan (called from historyManager). */
export async function markScanQualified() {
  try {
    const [done, captured] = await AsyncStorage.multiGet([K.qualified, K.captured]);
    if (done[1]) return;
    if (!captured[1]) {
      await AsyncStorage.setItem(K.qualified, '1'); // never referred — nothing to qualify
      return;
    }
    await trackCapturedReferral(); // make sure the referral row exists first
    const installId = await getInstallId();
    const res = await proxy('qualifyReferral', { installId });
    if (res && res.matched) await AsyncStorage.setItem(K.qualified, '1');
  } catch (e) {
    console.log('qualifyReferral failed (retry next scan):', e.message);
  }
}

export function referralReason(reason) {
  switch (reason) {
    case 'pending_first_scan':
      return "Code applied! It counts for your friend once you complete your first scan.";
    case 'self':
      return "That's your own code — share it with friends instead.";
    case 'invalid_code':
      return "We couldn't find that code. Double-check it and try again.";
    case 'already_referred':
      return 'You already used a referral code on this device.';
    case 'network':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
