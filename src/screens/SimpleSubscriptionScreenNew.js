import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import iapManager from '../services/iapManager';
import {
  syncReferralStatus,
  submitReferralCode,
  referralReason,
  REFERRAL_GOAL,
} from '../services/referral';

// ── Palette (Vee design spec) ──────────────────────────────────────────────
const GREEN      = '#27a567';
const GREEN_DARK = '#1e7a4a';
const AMBER      = '#f59e0b';
const AMBER_SOFT = '#FEF3E2';
const PAGE_BG    = '#FFFFFF';
const INK        = '#111111';
const N600       = '#525252';
const N500       = '#737373';
const N400       = '#A3A3A3';
const N200       = '#E5E5E5';
const N100       = '#F5F5F5';
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

// ── Config — keep in sync with App Store Connect / Google Play ──────────────
const PRICE_LABEL = '$2.99';
const PERIOD_LABEL = 'week';
// Free-trial length in days. MUST match the introductory offer configured on
// your auto-renewable subscription in App Store Connect / Google Play, or the
// app is rejected for misleading marketing. 0 = no trial wording anywhere.
const TRIAL_DAYS = 0;

const PRIVACY_URL = 'https://sites.google.com/view/vee-privacy-policy';
const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const REFERRAL_LINK =
  Platform.OS === 'android'
    ? 'https://play.google.com/store/apps/details?id=com.healthyscan.app'
    : 'https://apps.apple.com/app/healthyscan/id123456789';

const PRO_FEATURES = [
  'Unlimited scans & full history',
  'Detailed additive risk reports',
  'Cosmetic ingredient deep-dives',
];

const SimpleSubscriptionScreenNew = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const fromOnboarding = route?.params?.fromOnboarding === true;
  const limitReached = route?.params?.reason === 'limit';

  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [initializingIAP, setInitializingIAP] = useState(true);
  const [referrals, setReferrals] = useState(0);
  const [referralUnlocked, setReferralUnlocked] = useState(false);
  const [myCode, setMyCode] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeApplied, setCodeApplied] = useState(false);

  // ── Motion ───────────────────────────────────────────────────────────────
  const intro = useRef(new Animated.Value(0)).current;
  const slotAnims = useRef(Array.from({ length: REFERRAL_GOAL }, () => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 440, easing: EASE, useNativeDriver: true }).start();
    Animated.stagger(
      40,
      slotAnims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }))
    ).start();
  }, [intro, slotAnims]);

  const fade = (dy) => ({
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await checkExistingSubscription();
    await loadReferralStatus();
    if (Platform.OS === 'ios') {
      await initializeIAP();
    } else {
      setInitializingIAP(false);
    }
  };

  const loadReferralStatus = async () => {
    try {
      const snap = await syncReferralStatus();
      setReferrals(Math.max(0, Math.min(REFERRAL_GOAL, Number(snap.referral_count) || 0)));
      setMyCode(snap.code || null);
      if (snap.status === 'unlocked') {
        setReferralUnlocked(true);
        setCurrentTier('premium');
      }
    } catch (e) {
      console.log('referral status load failed:', e.message);
    }
  };

  const handleApplyCode = async () => {
    if (applyingCode) return;
    setApplyingCode(true);
    try {
      const res = await submitReferralCode(codeInput);
      if (res && res.ok) {
        setCodeApplied(true);
        setCodeInput('');
        Alert.alert('Referral applied', referralReason(res.reason || 'pending_first_scan'));
      } else {
        Alert.alert('Referral code', referralReason(res && res.reason));
      }
      await loadReferralStatus();
    } finally {
      setApplyingCode(false);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      const status = await iapManager.checkSubscriptionStatus();
      if (status && (status === true || status.isPremium)) {
        setCurrentTier('premium');
        return;
      }
      await AsyncStorage.multiRemove(['freePremiumGranted', 'subscriptionType', 'subscriptionExpiresAt']);
      setCurrentTier('free');
    } catch (error) {
      console.error('Error checking subscription:', error);
      try {
        // RevenueCat unreachable — only trust *real* premium signals here, not
        // the app-wide auto-granted 'subscriptionType' flag.
        const pairs = await AsyncStorage.multiGet(['referralUnlocked', 'premiumStatus']);
        const map = Object.fromEntries(pairs);
        let premium = map.referralUnlocked === 'true';
        try {
          if (JSON.parse(map.premiumStatus || 'null')?.isPremium) premium = true;
        } catch {}
        setCurrentTier(premium ? 'premium' : 'free');
      } catch {
        setCurrentTier('free');
      }
    }
  };

  const initializeIAP = async () => {
    try {
      const success = await iapManager.initialize();
      console.log(success ? '✅ IAP ready' : '⚠️ IAP initialization failed');
    } catch (error) {
      console.error('❌ IAP init error:', error);
    } finally {
      setInitializingIAP(false);
    }
  };

  const checkNetworkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        Alert.alert('No Internet Connection', 'Please check your internet connection and try again.', [{ text: 'OK' }]);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Network check error:', error);
      return true;
    }
  };

  // ── Navigation helpers ───────────────────────────────────────────────────
  const exitScreen = async () => {
    if (fromOnboarding) {
      await AsyncStorage.multiSet([['hasCompletedPaywall', 'true'], ['chatbotAccess', 'enabled']]);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  // ── Purchase (real IAP — unchanged logic) ────────────────────────────────
  const handlePurchase = async () => {
    if (loading || initializingIAP) return;

    if (Platform.OS === 'android') {
      Alert.alert(
        '🍎 iOS Only Feature',
        'Premium subscriptions are currently only available on iOS devices through the Apple App Store.\n\nAndroid support coming soon!',
        [{ text: 'OK' }]
      );
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Subscriptions are only available on iOS devices.', [{ text: 'OK' }]);
      return;
    }

    const hasNetwork = await checkNetworkConnection();
    if (!hasNetwork) return;

    setLoading(true);
    try {
      const result = await iapManager.purchaseSubscription({
        onLoading: (isLoading) => setLoading(isLoading),
        onPurchaseSuccess: async () => {
          await checkExistingSubscription();
          setLoading(false);
          setCurrentTier('premium');

          const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
          await AsyncStorage.multiSet([
            ['subscriptionType', 'Premium'],
            ['subscriptionExpiresAt', expiresAt.toString()],
            ['lastSubscriptionCheck', Date.now().toString()],
            // Signal the scan quota reads — guarantees unlimited scans immediately.
            ['premiumStatus', JSON.stringify({ isPremium: true, purchasedAt: new Date().toISOString() })],
          ]);

          if (fromOnboarding) {
            await AsyncStorage.multiSet([['hasCompletedPaywall', 'true'], ['chatbotAccess', 'enabled']]);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          } else {
            Alert.alert('Premium Active! 🎉', 'All features unlocked! Unlimited AI analysis available.', [
              {
                text: 'Start Scanning!',
                onPress: () =>
                  navigation.reset({ index: 0, routes: [{ name: 'Home', params: { premiumActivated: true } }] }),
              },
            ]);
          }
        },
        onPurchaseFailure: (error) => {
          setLoading(false);
          console.error('❌ Purchase failed:', error);
          let errorTitle = 'Purchase Failed';
          let errorMessage = 'Please try again.';
          if (error.includes('Cannot connect to iTunes')) {
            errorTitle = 'iTunes Store Unavailable';
            errorMessage = 'Please check your internet connection and try again.';
          } else if (error.includes('Product not found')) {
            errorTitle = 'Product Unavailable';
            errorMessage = 'The subscription is currently unavailable. Please try again later.';
          } else if (error.includes('IAP not available')) {
            return;
          } else if (error.includes('User cancelled')) {
            return;
          } else {
            errorMessage = error || 'An error occurred. Please try again.';
          }
          Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
        },
      });

      if (result && result.silent) {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error('Purchase error:', error);
      if (error.message !== 'E_USER_CANCELLED' && !error.message.includes('cancelled')) {
        Alert.alert('Error', 'Unable to process purchase. Please try again.');
      }
    }
  };

  const handleRestorePurchases = async () => {
    if (loading || initializingIAP) return;

    if (Platform.OS === 'web') {
      Alert.alert('Web Preview', 'Restore purchases only works on iOS devices');
      return;
    }
    if (Platform.OS === 'android') {
      Alert.alert('🍎 iOS Only Feature', 'Premium subscriptions are only available on iOS through the Apple App Store.', [
        { text: 'OK' },
      ]);
      return;
    }

    const hasNetwork = await checkNetworkConnection();
    if (!hasNetwork) return;

    setLoading(true);
    try {
      await iapManager.restorePurchases({
        onRestoreSuccess: async () => {
          await checkExistingSubscription();
          setCurrentTier('premium');
          setLoading(false);
          const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
          await AsyncStorage.multiSet([
            ['subscriptionType', 'Premium'],
            ['subscriptionExpiresAt', expiresAt.toString()],
            ['lastSubscriptionCheck', Date.now().toString()],
            ['premiumStatus', JSON.stringify({ isPremium: true, restoredAt: new Date().toISOString() })],
          ]);
        },
        onRestoreFailed: () => setLoading(false),
        onLoading: (isLoading) => setLoading(isLoading),
      });
      setLoading(false);
      await checkExistingSubscription();
    } catch (error) {
      setLoading(false);
      console.error('Restore error:', error);
    }
  };

  // ── Referral ─────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    const codeLine = myCode ? `Use my code ${myCode} when you open it. ` : '';
    try {
      await Share.share({
        message:
          `I've been using Vee to scan food & cosmetics for a health score and see what's really inside. ` +
          `${codeLine}Get it: ${REFERRAL_LINK}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const isPremium = currentTier === 'premium' || referralUnlocked;
  const remaining = Math.max(0, REFERRAL_GOAL - referrals);

  const ctaLabel = isPremium
    ? 'Start scanning'
    : TRIAL_DAYS > 0
    ? `Start ${TRIAL_DAYS}-day free trial`
    : `Subscribe · ${PRICE_LABEL}/${PERIOD_LABEL}`;

  const onCtaPress = isPremium ? exitScreen : handlePurchase;

  const heroSubtitle = limitReached
    ? "You've used today's free scans. Go unlimited to keep checking what's really inside."
    : "Go unlimited and see what's really inside every product you scan.";

  // ── Android: no paywall. Everything is free + unlimited. ─────────────────
  if (Platform.OS === 'android') {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Ionicons name="sparkles" size={12} color={GREEN} />
            <Text style={[s.headerLabel, { color: GREEN }]}>Vee</Text>
          </View>
          <View style={s.iconBtn} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[GREEN, GREEN_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroBlob} />
            <View style={s.heroTitleRow}>
              <View style={s.heroCrown}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
              </View>
              <Text style={s.heroBrand}>Everything unlocked</Text>
            </View>
            <Text style={[s.heroSub, { marginTop: 6 }]}>
              Vee is completely free on Android — unlimited scans, full history and the AI assistant, all included.
            </Text>
          </LinearGradient>

          <View style={s.featureList}>
            {PRO_FEATURES.map((f) => (
              <View key={f} style={s.featureRow}>
                <View style={s.checkCircle}>
                  <Ionicons name="checkmark" size={13} color={GREEN} />
                </View>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.cta}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
            activeOpacity={0.9}
          >
            <Ionicons name="sparkles" size={17} color="#fff" />
            <Text style={s.ctaText}>Start scanning</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        {fromOnboarding ? (
          <View style={s.iconBtn} />
        ) : (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
        )}
        <View style={s.headerCenter}>
          <Ionicons
            name={limitReached ? 'lock-closed' : 'sparkles'}
            size={12}
            color={limitReached ? AMBER : GREEN}
          />
          <Text style={[s.headerLabel, { color: limitReached ? AMBER : GREEN }]}>
            {limitReached ? 'Limit reached' : 'Vee Pro'}
          </Text>
        </View>
        <View style={s.iconBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pricing hero */}
        <Animated.View style={fade(16)}>
          <LinearGradient
            colors={[GREEN, GREEN_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroBlob} />
            <View style={s.heroTitleRow}>
              <View style={s.heroCrown}>
                <Ionicons name="ribbon" size={16} color="#fff" />
              </View>
              <Text style={s.heroBrand}>Vee Pro</Text>
            </View>

            <View style={s.priceRow}>
              <Text style={s.priceAmount}>{PRICE_LABEL}</Text>
              <Text style={s.pricePer}>/{PERIOD_LABEL}</Text>
            </View>

            <Text style={s.heroSub}>{heroSubtitle}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[s.featureList, fade(22)]}>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <View style={s.checkCircle}>
                <Ionicons name="checkmark" size={13} color={GREEN} />
              </View>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Referral card */}
        <Animated.View style={[s.referCard, fade(28)]}>
          <View style={s.referHead}>
            <View style={s.giftCircle}>
              <Ionicons name={referralUnlocked ? 'checkmark-circle' : 'gift'} size={16} color={referralUnlocked ? GREEN : AMBER} />
            </View>
            <Text style={s.referTitle}>
              {referralUnlocked ? 'Lifetime Pro unlocked' : `Refer ${REFERRAL_GOAL} friends · Lifetime free`}
            </Text>
          </View>
          <Text style={s.referDesc}>
            {referralUnlocked
              ? 'Thanks for spreading the word — Vee Pro is yours, forever.'
              : `Invite ${REFERRAL_GOAL} people to install Vee and your Pro subscription becomes free — forever. A friend counts once they complete their first scan.`}
          </Text>

          <View style={s.slotGrid}>
            {slotAnims.map((a, i) => {
              const filled = i < referrals;
              return (
                <Animated.View
                  key={i}
                  style={[
                    s.slot,
                    filled ? s.slotFilled : s.slotEmpty,
                    { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] },
                  ]}
                >
                  <Ionicons
                    name={filled ? 'checkmark' : 'people-outline'}
                    size={filled ? 16 : 15}
                    color={filled ? '#fff' : N400}
                  />
                </Animated.View>
              );
            })}
          </View>

          <Text style={s.referProgress}>
            {referrals}/{REFERRAL_GOAL} friends joined · {remaining} to go
          </Text>

          {myCode ? (
            <View style={s.codePill}>
              <Text style={s.codePillLabel}>YOUR CODE</Text>
              <Text style={s.codePillValue}>{myCode}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={s.inviteBtn} onPress={handleInvite} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={16} color={GREEN} />
            <Text style={s.inviteBtnText}>Invite friends</Text>
          </TouchableOpacity>

          {!referralUnlocked && !codeApplied && (
            <View style={s.codeEntry}>
              <TextInput
                style={s.codeInput}
                placeholder="Have a referral code?"
                placeholderTextColor={N400}
                value={codeInput}
                onChangeText={setCodeInput}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={16}
                onSubmitEditing={handleApplyCode}
              />
              <TouchableOpacity
                style={[s.codeApplyBtn, (!codeInput.trim() || applyingCode) && { opacity: 0.4 }]}
                onPress={handleApplyCode}
                disabled={!codeInput.trim() || applyingCode}
                activeOpacity={0.8}
              >
                {applyingCode ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <Text style={s.codeApplyText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {codeApplied && (
            <Text style={s.codeAppliedNote}>✓ Referral code applied — counts after your first scan.</Text>
          )}
        </Animated.View>

        {/* Primary CTA */}
        <Animated.View style={fade(34)}>
          <TouchableOpacity
            style={[s.cta, loading && { opacity: 0.6 }]}
            onPress={onCtaPress}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={17} color="#fff" />
                <Text style={s.ctaText}>{ctaLabel}</Text>
              </>
            )}
          </TouchableOpacity>

          {!isPremium && (
            <Text style={s.ctaFootnote}>
              {TRIAL_DAYS > 0 ? `Then ${PRICE_LABEL}/${PERIOD_LABEL}` : `${PRICE_LABEL}/${PERIOD_LABEL}`} · cancel anytime
              {' '}· refer {REFERRAL_GOAL} for lifetime free
            </Text>
          )}

          {!isPremium && (
            <Text style={s.disclosure}>
              Payment is charged to your {Platform.OS === 'ios' ? 'Apple' : 'Google'} account at confirmation.
              The subscription auto-renews at {PRICE_LABEL}/{PERIOD_LABEL} unless cancelled at least 24 hours before the
              end of the current period. Manage or cancel anytime in your account settings.
            </Text>
          )}

          <View style={s.legalRow}>
            <TouchableOpacity onPress={handleRestorePurchases} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={s.legalLink}>Restore</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(EULA_URL)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={s.legalLink}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {isPremium && !fromOnboarding && (
            <TouchableOpacity
              style={s.manageBtn}
              activeOpacity={0.7}
              onPress={() =>
                Linking.openURL(
                  Platform.OS === 'android'
                    ? 'https://play.google.com/store/account/subscriptions'
                    : 'https://apps.apple.com/account/subscriptions'
                )
              }
            >
              <Ionicons name="settings-outline" size={15} color={N500} />
              <Text style={s.manageBtnText}>Manage subscription</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: PAGE_BG,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: N100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // hero
  hero: { borderRadius: 26, padding: 22, overflow: 'hidden' },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  heroCrown: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBrand: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  priceAmount: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1.5, lineHeight: 46 },
  pricePer: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 7 },
  heroSub: { fontSize: 13.5, fontWeight: '500', color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginTop: 10 },

  // features
  featureList: { marginTop: 20, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E4F3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14.5, fontWeight: '500', color: INK, letterSpacing: -0.2 },

  // referral
  referCard: {
    marginTop: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: N200,
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  referHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  giftCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AMBER_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referTitle: { flex: 1, fontSize: 14.5, fontWeight: '700', color: INK, letterSpacing: -0.2 },
  referDesc: { fontSize: 12.5, fontWeight: '500', color: N500, lineHeight: 18 },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  slot: {
    width: '18.5%',
    height: 44,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { backgroundColor: GREEN },
  slotEmpty: { backgroundColor: N100 },
  referProgress: { fontSize: 12, fontWeight: '600', color: N500, marginTop: 14 },

  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E4F3EA',
  },
  codePillLabel: { fontSize: 9, fontWeight: '700', color: '#1F7A50', letterSpacing: 1 },
  codePillValue: { fontSize: 14, fontWeight: '800', color: '#1F7A50', letterSpacing: 0.5 },

  codeEntry: { flexDirection: 'row', gap: 8, marginTop: 10 },
  codeInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: N200,
    paddingHorizontal: 12,
    fontSize: 13.5,
    fontWeight: '600',
    color: INK,
  },
  codeApplyBtn: {
    width: 74,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeApplyText: { fontSize: 13, fontWeight: '700', color: GREEN },
  codeAppliedNote: { fontSize: 12, fontWeight: '600', color: '#1F7A50', marginTop: 10 },

  inviteBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: GREEN },

  // CTA
  cta: {
    marginTop: 22,
    height: 54,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },
  ctaText: { fontSize: 15.5, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  ctaFootnote: { fontSize: 12, fontWeight: '500', color: N500, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  disclosure: { fontSize: 10.5, fontWeight: '400', color: N400, textAlign: 'center', marginTop: 10, lineHeight: 15 },

  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  legalLink: { fontSize: 12, fontWeight: '600', color: N600, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: N400, marginHorizontal: 8 },

  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginTop: 6,
  },
  manageBtnText: { fontSize: 13.5, fontWeight: '500', color: N500 },
});

export default SimpleSubscriptionScreenNew;
