import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  PanResponder,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as StoreReview from 'expo-store-review';
import { submitReferralCode, referralReason } from '../services/referral';

const { width: SW } = Dimensions.get('window');
const CONTENT_W = Math.min(SW - 40, 408); // page padding is 20 each side; cap for tablets

// ── Brand ──────────────────────────────────────────────────────────────────
// One constant controls the wordmark across all onboarding screens.
// (app.json / rest of the app is "Vee"; an earlier spec draft said "ScanGreen".)
const BRAND = 'Vee';

// ── Palette (Skin Clarity spec §7) ─────────────────────────────────────────
const GREEN       = '#27a567';
const GREEN_50    = '#F0F9F4';
const GREEN_TINT  = '#F1FBF5'; // good product image area / good pane
const GREEN_PILL  = '#F0FDF4';
const RED_TINT    = '#FEF6F6'; // bad product image area
const RED_PILL    = '#FEF2F2';
const RED_500     = '#EF4444';
const PAGE_BG     = '#FFFFFF';
const SUB_BG      = '#F9F9F4'; // warm bg for the name / rate / referral screens
const WHITE       = '#FFFFFF';
const INK         = '#0A0A0A';
const N700        = '#404040';
const N500        = '#737373';
const N400        = '#A3A3A3';
const N200        = '#E5E5E5';
const N100        = '#F5F5F5';

const SCORE_GOOD  = '#27a567';
const SCORE_MID   = '#F5A623';
const SCORE_BAD   = '#E74C3C';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const scoreColor = (n) => (n >= 75 ? SCORE_GOOD : n >= 50 ? SCORE_MID : SCORE_BAD);

// Product photos — drop a file in assets/onboarding/ + add a line here.
const PRODUCT_IMAGES = {
  'skin-bad': require('../../assets/onboarding/skin-bad.png'),   // Silky Glow Moisturizer
  'skin-good': require('../../assets/onboarding/skin-good.png'), // Barrier Restore Cream
  'hair-bad': require('../../assets/onboarding/hair-bad.png'),   // Daily Lather Shampoo
  'hair-good': require('../../assets/onboarding/hair-good.png'), // Botanical Repair Wash
  'gut-bad': require('../../assets/onboarding/gut-bad.png'),     // Crunchy Snack Pack
  'gut-good': require('../../assets/onboarding/gut-good.png'),   // Whole-Seed Bites
};

// Before/after slider images — same idea. Missing keys → placeholder panels.
const COMPARE_IMAGES = {
  'skin-before': require('../../assets/onboarding/skin-before.png'), // Not healthy skin
  'skin-after': require('../../assets/onboarding/skin-after.png'),   // Healthy skin
  'hair-before': require('../../assets/onboarding/hair-before.png'), // Not healthy hair
  'hair-after': require('../../assets/onboarding/hair-after.png'),   // Healthy hair
  'gut-before': require('../../assets/onboarding/gut-before.png'),   // Not healthy digestion
  'gut-after': require('../../assets/onboarding/gut-after.png'),     // Healthy digestion
};

// ── Slide content ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'intro',
    icon: 'sparkles',
    title: 'Why scores matter',
    subtitle: 'Same goal, different products. The score reveals what really makes the difference.',
    kind: 'intro',
    cta: 'See the difference',
  },
  {
    key: 'skin',
    icon: 'water-outline',
    title: 'Skin Clarity',
    subtitle: 'Different ingredients, different results.',
    kind: 'compare',
    bad:  { name: 'Silky Glow Moisturizer', brand: 'CheapCosmetics', score: 0,  chips: ['Dimethicone', 'Paraffin Oil'], img: 'skin-bad' },
    good: { name: 'Barrier Restore Cream',  brand: 'CleanLiving',    score: 92, chips: ['Ceramides', 'Squalane'],       img: 'skin-good' },
    compare: { badLabel: 'Not healthy skin', goodLabel: 'Healthy skin', beforeImg: 'skin-before', afterImg: 'skin-after' },
    cta: 'Next',
  },
  {
    key: 'hair',
    icon: 'flask-outline',
    title: 'Hair Health',
    subtitle: 'What you wash with shapes how it looks.',
    kind: 'compare',
    bad:  { name: 'Daily Lather Shampoo',  brand: 'BudgetBrand', score: 0,  chips: ['Sulfates', 'Silicones'],      img: 'hair-bad' },
    good: { name: 'Botanical Repair Wash', brand: 'PureRoots',   score: 88, chips: ['Plant extracts', 'Biotin'],   img: 'hair-good' },
    compare: { badLabel: 'Not healthy hair', goodLabel: 'Healthy hair', beforeImg: 'hair-before', afterImg: 'hair-after' },
    cta: 'Next',
  },
  {
    key: 'gut',
    icon: 'nutrition-outline',
    title: 'Digestive Health',
    subtitle: 'Snack choices add up throughout the day.',
    kind: 'compare',
    bad:  { name: 'Crunchy Snack Pack', brand: 'QuickSnack',  score: 0,  chips: ['Seed oils', 'Additives'],   img: 'gut-bad' },
    good: { name: 'Whole-Seed Bites',   brand: 'HonestFoods', score: 89, chips: ['Fiber', 'Probiotics'],      img: 'gut-good' },
    compare: { badLabel: 'Not healthy digestion', goodLabel: 'Healthy digestion', beforeImg: 'gut-before', afterImg: 'gut-after' },
    cta: 'Get started',
  },
];

const RATE_STEP = SLIDES.length;         // 4 — in-app rating moment (decorative)
const NAME_STEP = SLIDES.length + 1;     // 5
const REFERRAL_STEP = SLIDES.length + 2; // 6 — optional
const LAST_STEP = REFERRAL_STEP;

// ── Shared bits ────────────────────────────────────────────────────────────
const PressableScale = ({ children, style, onPress, disabled, scaleTo = 0.97, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 5 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.4 }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const PrimaryButton = ({ label, onPress, disabled, style }) => (
  <PressableScale style={[ui.primaryBtn, style]} onPress={onPress} disabled={disabled}>
    <Text style={ui.primaryBtnTxt}>{label}</Text>
    <Ionicons name="arrow-forward" size={18} color={WHITE} />
  </PressableScale>
);

const NavButton = ({ label, onPress, kind }) => {
  const next = kind === 'next';
  return (
    <PressableScale
      style={[ui.navBtn, next ? ui.navBtnNext : ui.navBtnBack]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {!next && <Ionicons name="arrow-back" size={16} color={N700} />}
      <Text style={next ? ui.navBtnNextTxt : ui.navBtnBackTxt}>{label}</Text>
      {next && <Ionicons name="arrow-forward" size={16} color={WHITE} />}
    </PressableScale>
  );
};

// ── Top bar ────────────────────────────────────────────────────────────────
const TopBar = ({ step, total }) => (
  <View style={ui.topBar}>
    <Text style={ui.brand}>{BRAND}</Text>
    <View style={ui.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[ui.dot, i === step && ui.dotActive]} />
      ))}
    </View>
  </View>
);

// ── Section header (icon badge + title/subtitle, in a row) ──────────────────
const SectionHeader = ({ icon, title, subtitle }) => (
  <View style={ui.secHead}>
    <View style={ui.secIcon}>
      <Ionicons name={icon} size={20} color={GREEN} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={ui.secTitle}>{title}</Text>
      <Text style={ui.secSub}>{subtitle}</Text>
    </View>
  </View>
);

// ── Comparison product card ────────────────────────────────────────────────
const CompareCard = ({ data, tone }) => {
  const good = tone === 'good';
  const photo = data.img ? PRODUCT_IMAGES[data.img] : null;
  return (
    <View style={ui.card}>
      <View style={[ui.scoreBadge, { backgroundColor: scoreColor(data.score) }]}>
        <Text style={ui.scoreBadgeTxt}>{data.score}</Text>
      </View>

      <View style={[ui.prodImg, { backgroundColor: good ? GREEN_TINT : RED_TINT }]}>
        {photo ? (
          <Image source={photo} style={ui.prodImgInner} resizeMode="cover" />
        ) : (
          <Ionicons name="cube-outline" size={28} color={good ? '#9CCBB1' : '#E3A9A2'} />
        )}
      </View>

      <Text style={ui.prodName} numberOfLines={2}>{data.name}</Text>
      <Text style={ui.prodBrand} numberOfLines={1}>{data.brand}</Text>

      <View style={ui.pills}>
        {data.chips.map((c) => (
          <View key={c} style={[ui.pill, { backgroundColor: good ? GREEN_PILL : RED_PILL }]}>
            <Ionicons name={good ? 'checkmark' : 'close'} size={10} color={good ? GREEN : RED_500} />
            <Text style={[ui.pillTxt, { color: good ? GREEN : RED_500 }]} numberOfLines={1}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Before / after drag slider (fills remaining vertical space) ─────────────
const HANDLE = 40;

const BeforeAfterSlider = ({ badLabel, goodLabel, beforeSrc, afterSrc }) => {
  const pos = useRef(new Animated.Value(CONTENT_W / 2)).current;
  const posNum = useRef(CONTENT_W / 2);
  const startNum = useRef(CONTENT_W / 2);
  const hScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = pos.addListener(({ value }) => { posNum.current = value; });
    return () => pos.removeListener(id);
  }, [pos]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const x = Math.max(0, Math.min(CONTENT_W, e.nativeEvent.locationX));
        startNum.current = x;
        pos.setValue(x);
        Animated.spring(hScale, { toValue: 1.1, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
      },
      onPanResponderMove: (_e, g) => {
        const next = Math.max(0, Math.min(CONTENT_W, startNum.current + g.dx));
        pos.setValue(next);
      },
      onPanResponderRelease: () =>
        Animated.spring(hScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start(),
      onPanResponderTerminate: () =>
        Animated.spring(hScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start(),
    })
  ).current;

  const Pane = ({ src, placeholderBg, icon, iconColor, label }) => (
    src ? (
      <Image source={src} style={ui.slImg} resizeMode="cover" />
    ) : (
      <View style={[ui.slPane, { backgroundColor: placeholderBg }]}>
        <Ionicons name={icon} size={40} color={iconColor} />
        <Text style={[ui.slPaneTxt, { color: iconColor }]}>{label}</Text>
      </View>
    )
  );

  return (
    <View style={ui.slider} {...pan.panHandlers}>
      {/* AFTER — full, behind */}
      <View style={StyleSheet.absoluteFill}>
        <Pane src={afterSrc} placeholderBg="#E6F4EC" icon="happy-outline" iconColor={GREEN} label="Healthy" />
      </View>

      {/* BEFORE — clipped from the left */}
      <Animated.View style={[ui.slClip, { width: pos }]}>
        <View style={{ width: CONTENT_W, height: '100%' }}>
          <Pane src={beforeSrc} placeholderBg="#EEE7E2" icon="sad-outline" iconColor="#C0554E" label="Not healthy" />
        </View>
      </Animated.View>

      {/* Labels */}
      <View style={[ui.slLabel, { left: 10 }]}><Text style={ui.slLabelTxt}>{badLabel}</Text></View>
      <View style={[ui.slLabel, { right: 10 }]}><Text style={ui.slLabelTxt}>{goodLabel}</Text></View>

      {/* Divider */}
      <Animated.View
        style={[ui.slDivider, { transform: [{ translateX: Animated.subtract(pos, 1.5) }] }]}
        pointerEvents="none"
      />

      {/* Handle */}
      <Animated.View
        style={[ui.slHandle, { transform: [{ translateX: Animated.subtract(pos, HANDLE / 2) }, { scale: hScale }] }]}
        pointerEvents="none"
      >
        <Ionicons name="chevron-back" size={13} color={N700} />
        <Ionicons name="chevron-forward" size={13} color={N700} />
      </Animated.View>

      {/* Hint */}
      <View style={ui.slHintWrap} pointerEvents="none">
        <View style={ui.slHint}><Text style={ui.slHintTxt}>Drag to compare</Text></View>
      </View>
    </View>
  );
};

// ── Intro cards (slide 0) ──────────────────────────────────────────────────
const IntroCards = () => (
  <View style={ui.introRow}>
    <View style={ui.introCard}>
      <View style={[ui.introCircle, { backgroundColor: RED_PILL }]}>
        <Ionicons name="close" size={20} color={SCORE_BAD} />
      </View>
      <Text style={[ui.introNum, { color: SCORE_BAD }]}>0</Text>
      <Text style={ui.introCaption}>Low-score product</Text>
    </View>
    <View style={ui.introCard}>
      <View style={[ui.introCircle, { backgroundColor: GREEN_PILL }]}>
        <Ionicons name="checkmark" size={20} color={GREEN} />
      </View>
      <Text style={[ui.introNum, { color: GREEN }]}>92</Text>
      <Text style={ui.introCaption}>High-score product</Text>
    </View>
  </View>
);

const TOTAL_STEPS = LAST_STEP + 1; // one progress dot per onboarding step

// ── Shared scaffold — EVERY onboarding screen renders through this ─────────
// header (wordmark + dots) → icon-row title → centered content → Back/Next
const StepScaffold = ({
  step, icon, title, subtitle, children,
  primaryLabel, onPrimary, primaryDisabled, primaryFull,
  onBack, contentCenter = true, skipLabel, onSkip, keyboard,
}) => {
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 400, easing: EASE, useNativeDriver: true }).start();
  }, [t]);

  const rise = (d = 0) => ({
    opacity: t,
    transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10 + d, 0] }) }],
  });

  const Wrapper = keyboard ? KeyboardAvoidingView : View;
  const wrapperProps = keyboard ? { behavior: Platform.OS === 'ios' ? 'padding' : undefined } : {};

  return (
    <Wrapper
      style={[ui.page, { paddingTop: insets.top + 16, paddingBottom: (insets.bottom || 12) + 14 }]}
      {...wrapperProps}
    >
      <TopBar step={step} total={TOTAL_STEPS} />

      <Animated.View style={rise(0)}>
        <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      </Animated.View>

      <Animated.View style={[ui.stepBody, contentCenter && { justifyContent: 'center' }, rise(6)]}>
        {children}
      </Animated.View>

      {primaryFull ? (
        <Animated.View style={rise(10)}>
          <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />
        </Animated.View>
      ) : (
        <Animated.View style={[ui.navRow, rise(10)]}>
          {onBack ? <NavButton label="Back" onPress={onBack} kind="back" /> : <View style={{ width: 1 }} />}
          <NavButton label={primaryLabel} onPress={onPrimary} kind="next" disabled={primaryDisabled} />
        </Animated.View>
      )}

      {skipLabel ? (
        <PressableScale onPress={onSkip} activeOpacity={0.7} style={ui.skipRow}>
          <Text style={ui.skipRowTxt}>{skipLabel}</Text>
        </PressableScale>
      ) : null}
    </Wrapper>
  );
};

// ── Education steps (intro + 3 compare) ───────────────────────────────────
const EducationStep = ({ slide, step, onNext, onBack }) => {
  if (slide.kind === 'intro') {
    return (
      <StepScaffold
        step={step}
        icon={slide.icon}
        title={slide.title}
        subtitle={slide.subtitle}
        primaryLabel={slide.cta}
        onPrimary={onNext}
        primaryFull
      >
        <IntroCards />
      </StepScaffold>
    );
  }
  return (
    <StepScaffold
      step={step}
      icon={slide.icon}
      title={slide.title}
      subtitle={slide.subtitle}
      primaryLabel={slide.cta}
      onPrimary={onNext}
      onBack={onBack}
      contentCenter={false}
    >
      <View style={ui.cardRow}>
        <CompareCard data={slide.bad} tone="bad" />
        <CompareCard data={slide.good} tone="good" />
      </View>
      <View style={{ flex: 1, marginTop: 16 }}>
        <BeforeAfterSlider
          badLabel={slide.compare.badLabel}
          goodLabel={slide.compare.goodLabel}
          beforeSrc={COMPARE_IMAGES[slide.compare.beforeImg] || null}
          afterSrc={COMPARE_IMAGES[slide.compare.afterImg] || null}
        />
      </View>
    </StepScaffold>
  );
};

// ── Personal-setup screen (name / rate / referral) ────────────────────────
// Back button + centered "Vee" chip · icon squircle · heading · content ·
// full-width Continue button · optional skip. Content vertically centered.
const SubScreen = ({
  onBack, icon, title, subtitle, children,
  primaryLabel, onPrimary, primaryDisabled, skipLabel, onSkip, keyboard,
}) => {
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 400, easing: EASE, useNativeDriver: true }).start();
  }, [t]);

  const rise = {
    opacity: t,
    transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  // ScrollView + automaticallyAdjustKeyboardInsets (iOS) keeps the input and the
  // Continue button reachable above the keyboard; on Android the OS pans the
  // window (softwareKeyboardLayoutMode "pan") — input + button move up together.
  const scroll = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[ui.subScroll, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      bounces={false}
    >
      <Animated.View style={rise}>
        <View style={ui.subIcon}>
          <Ionicons name={icon} size={26} color={GREEN} />
        </View>
        <Text style={ui.subH1}>{title}</Text>
        <Text style={ui.subP}>{subtitle}</Text>

        {children}

        <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} style={{ marginTop: 16 }} />

        {skipLabel ? (
          <PressableScale onPress={onSkip} activeOpacity={0.7} style={ui.subSkip}>
            <Text style={ui.subSkipTxt}>{skipLabel}</Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: SUB_BG }}>
      <View style={[ui.subNav, { paddingTop: insets.top + 8 }]}>
        <PressableScale style={ui.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color={INK} />
        </PressableScale>
        <View style={ui.brandChip}>
          <View style={ui.brandDot}><Text style={ui.brandDotTxt}>{BRAND[0]}</Text></View>
          <Text style={ui.brandName}>{BRAND}</Text>
        </View>
        <View style={ui.backBtn} />
      </View>

      {scroll}
    </View>
  );
};

// ── Rate step (decorative — no App Store, just a tap) ──────────────────────
const RateStep = ({ onBack, onNext }) => {
  const [rating, setRating] = useState(0);
  const starAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(1))).current;
  const reviewAsked = useRef(false);

  const pick = (n) => {
    setRating(n);
    try { AsyncStorage.setItem('onboardingRating', String(n)); } catch (e) {}
    Animated.stagger(
      45,
      starAnims.slice(0, n).map((a) =>
        Animated.sequence([
          Animated.spring(a, { toValue: 1.35, useNativeDriver: true, speed: 60, bounciness: 0 }),
          Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 9 }),
        ])
      )
    ).start();

    // Trigger the NATIVE review prompt — once per visit, for everyone regardless
    // of the rating tapped (no gating). May not appear in production (the OS
    // rate-limits it to ~3×/year); that's expected.
    if (!reviewAsked.current) {
      reviewAsked.current = true;
      setTimeout(async () => {
        try {
          if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
        } catch (e) {}
      }, 700);
    }
  };

  return (
    <SubScreen
      onBack={onBack}
      icon="heart"
      title={`Enjoying ${BRAND}?`}
      subtitle="Tap the stars to tell us how we're doing so far."
      primaryLabel="Continue"
      onPrimary={onNext}
      primaryDisabled={rating === 0}
      skipLabel="Maybe later"
      onSkip={onNext}
    >
      <View style={ui.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <PressableScale key={n} onPress={() => pick(n)} scaleTo={0.85} style={ui.starHit}>
            <Animated.View style={{ transform: [{ scale: starAnims[n - 1] }] }}>
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={40}
                color={n <= rating ? SCORE_MID : N200}
              />
            </Animated.View>
          </PressableScale>
        ))}
      </View>
      <Text style={ui.rateNote}>{rating > 0 ? 'Thanks — that means a lot 💚' : ' '}</Text>
    </SubScreen>
  );
};

// ── Name step ──────────────────────────────────────────────────────────────
const NameStep = ({ onBack, onNext }) => {
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;

  const finish = async () => {
    const clean = name.trim();
    if (!clean) return;
    try {
      await AsyncStorage.multiSet([
        ['userName', clean],
        ['hasSeenOnboarding', 'true'],
        ['hasCompletedPaywall', 'true'],
      ]);
    } catch (e) {
      // non-fatal
    }
    onNext();
  };

  return (
    <SubScreen
      onBack={onBack}
      icon="sparkles"
      title="What's your name?"
      subtitle="We'll personalize your scans and greet you every time you come back."
      primaryLabel="Continue"
      onPrimary={finish}
      primaryDisabled={!valid}
      keyboard
    >
      <Text style={ui.subInputLabel}>YOUR NAME</Text>
      <TextInput
        style={ui.subInput}
        placeholder="e.g. Alex"
        placeholderTextColor={N400}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={30}
        onSubmitEditing={finish}
        selectionColor={GREEN}
        autoFocus={Platform.OS !== 'web'}
      />
    </SubScreen>
  );
};

// ── Referral-code step (optional) ─────────────────────────────────────────
const ReferralStep = ({ onBack, onComplete }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    try {
      const res = await submitReferralCode(code);
      if (res && res.ok) {
        Alert.alert('Code applied 🎉', referralReason(res.reason || 'pending_first_scan'), [
          { text: 'Continue', onPress: onComplete },
        ]);
      } else {
        Alert.alert('Referral code', referralReason(res && res.reason));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      onBack={onBack}
      icon="gift-outline"
      title="Got a referral code?"
      subtitle="Enter a friend's code so it counts toward their free Pro. Optional — you can skip this."
      primaryLabel={busy ? 'Applying…' : 'Apply code'}
      onPrimary={apply}
      primaryDisabled={busy || !code.trim()}
      skipLabel="Skip for now"
      onSkip={onComplete}
      keyboard
    >
      <Text style={ui.subInputLabel}>FRIEND'S CODE</Text>
      <TextInput
        style={ui.subInput}
        placeholder="e.g. SG-XXXXXXX"
        placeholderTextColor={N400}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={16}
        onSubmitEditing={apply}
        selectionColor={GREEN}
      />
    </SubScreen>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────
const OnboardingScreen = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('fwd');

  const goNext = () => { setDir('fwd'); setStep((s) => Math.min(LAST_STEP, s + 1)); };
  const goBack = () => { setDir('back'); setStep((s) => Math.max(0, s - 1)); };

  const complete = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 280, easing: EASE, useNativeDriver: true }).start();
  }, [step, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [dir === 'back' ? -24 : 24, 0],
  });

  let screen;
  if (step === REFERRAL_STEP) screen = <ReferralStep step={step} onBack={goBack} onComplete={complete} />;
  else if (step === NAME_STEP) screen = <NameStep step={step} onBack={goBack} onNext={goNext} />;
  else if (step === RATE_STEP) screen = <RateStep step={step} onBack={goBack} onNext={goNext} />;
  else screen = <EducationStep slide={SLIDES[step]} step={step} onNext={goNext} onBack={goBack} />;

  return (
    <View style={[ui.root, { backgroundColor: PAGE_BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Animated.View key={step} style={{ flex: 1, opacity: t, transform: [{ translateX }] }}>
        {screen}
      </Animated.View>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const ui = StyleSheet.create({
  root: { flex: 1 },
  page: {
    flex: 1, backgroundColor: PAGE_BG, paddingHorizontal: 20,
    width: '100%', maxWidth: 448, alignSelf: 'center',
  },

  // top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 14, fontWeight: '700', color: INK, letterSpacing: -0.2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: N200 },
  dotActive: { width: 24, backgroundColor: GREEN },

  // section header
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  secIcon: {
    width: 44, height: 44, borderRadius: 16, backgroundColor: GREEN_50,
    alignItems: 'center', justifyContent: 'center',
  },
  secTitle: { fontSize: 20, fontWeight: '700', color: INK, letterSpacing: -0.4, lineHeight: 22 },
  secSub: { fontSize: 12, color: N500, marginTop: 2, lineHeight: 16 },

  // compare cards
  cardRow: { flexDirection: 'row', gap: 12, marginTop: 20, alignItems: 'stretch' },
  card: {
    flex: 1, backgroundColor: WHITE, borderWidth: 1, borderColor: N100,
    borderRadius: 24, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  scoreBadge: {
    position: 'absolute', top: -10, right: -10, zIndex: 5,
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 3, borderColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  scoreBadgeTxt: { color: WHITE, fontSize: 13, fontWeight: '700' },
  prodImg: {
    width: '100%', height: 104, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  prodImgInner: { width: '100%', height: '100%' },
  prodName: { fontSize: 12.5, fontWeight: '600', color: INK, textAlign: 'center', lineHeight: 15.5, minHeight: 31 },
  prodBrand: { fontSize: 10.5, fontWeight: '500', color: N400, marginTop: 2, marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
  },
  pillTxt: { fontSize: 10, fontWeight: '500' },

  // slider
  slider: {
    flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: N100,
  },
  slImg: { width: '100%', height: '100%' },
  slClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  slPane: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  slPaneTxt: { fontSize: 12, fontWeight: '700' },
  slLabel: {
    position: 'absolute', top: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  slLabelTxt: { color: WHITE, fontSize: 11, fontWeight: '600' },
  slDivider: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: WHITE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  slHandle: {
    position: 'absolute', top: '50%', left: 0, marginTop: -HANDLE / 2,
    width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: WHITE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  slHintWrap: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  slHint: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  slHintTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600' },

  // bottom nav
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  navBtn: { height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtnBack: { paddingHorizontal: 16, backgroundColor: WHITE, borderWidth: 1, borderColor: N200 },
  navBtnBackTxt: { fontSize: 14, fontWeight: '500', color: N700 },
  navBtnNext: {
    paddingHorizontal: 20, backgroundColor: GREEN,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  navBtnNextTxt: { fontSize: 14, fontWeight: '600', color: WHITE },

  // primary button (full-width — intro + inside the scaffold footer)
  primaryBtn: {
    height: 52, borderRadius: 16, backgroundColor: GREEN, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 5,
  },
  primaryBtnTxt: { color: WHITE, fontSize: 15, fontWeight: '600' },

  // shared content area — centered between header and footer
  stepBody: { flex: 1 },

  // intro cards
  introRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  introCard: {
    flex: 1, backgroundColor: WHITE, borderWidth: 1, borderColor: N100,
    borderRadius: 24, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  introCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  introNum: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  introCaption: { fontSize: 11.5, fontWeight: '600', color: N500, marginTop: 6, textAlign: 'center' },

  // rate stars
  starRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 6 },
  starHit: { padding: 4 },
  rateNote: { fontSize: 13, fontWeight: '600', color: GREEN, textAlign: 'center', marginTop: 16, minHeight: 18 },

  // skip link inside StepScaffold (dead path — kept for the prop contract)
  skipRow: { alignSelf: 'center', paddingVertical: 12, marginTop: 2 },
  skipRowTxt: { fontSize: 14, fontWeight: '600', color: N500 },

  // ── Personal-setup screen (name / rate / referral) ──────────────────────
  subNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E1EDE6', alignItems: 'center', justifyContent: 'center' },
  brandDotTxt: { fontSize: 12, fontWeight: '800', color: GREEN },
  brandName: { fontSize: 15, fontWeight: '800', color: INK, letterSpacing: -0.3 },

  subScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, justifyContent: 'center' },
  subIcon: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  subH1: { fontSize: 30, fontWeight: '800', color: INK, letterSpacing: -0.6, lineHeight: 34, marginTop: 32 },
  subP: { fontSize: 15, fontWeight: '400', color: N500, lineHeight: 22, marginTop: 10 },
  subInputLabel: {
    fontSize: 11, fontWeight: '700', color: N500, letterSpacing: 1.4,
    textTransform: 'uppercase', marginTop: 28, marginBottom: 8,
  },
  subInput: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: GREEN, backgroundColor: WHITE,
    paddingHorizontal: 18, fontSize: 16, fontWeight: '600', color: INK,
  },
  subSkip: { alignSelf: 'center', paddingVertical: 12, marginTop: 10 },
  subSkipTxt: { fontSize: 14, fontWeight: '600', color: N500 },
});

export default OnboardingScreen;
