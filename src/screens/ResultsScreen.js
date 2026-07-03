import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Animated, Dimensions, StatusBar,
  Image, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { analyzeIngredients, getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { saveToHistory as saveToHistoryUtil } from '../utils/historyManager';
import ProductAIChat from '../components/ProductAIChat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { getIngredientInfo } from '../services/usdaAPI';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// ── Light Wellness Palette ─────────────────────────────────────────────
const BG           = '#fafaf5';
const CARD_BG      = '#ffffff';
const CONTAINER    = '#eeeee9';
const OUTLINE      = '#bfcaba';
const ON_SURFACE   = '#1a1c19';
const ON_VAR       = '#40493d';
const PRIMARY      = '#067A4F';
const ERROR_C      = '#ba1a1a';
const WARNING_C    = '#d97706';

// ── Gauge constants ─────────────────────────────────────────────────────
const GAUGE_R    = 60;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// ── Helpers ──────────────────────────────────────────────────────────────
const getScoreColor = (sc) => {
  if (sc >= 70) return PRIMARY;
  if (sc >= 40) return WARNING_C;
  return ERROR_C;
};

const getVerdict = (sc) => {
  if (sc >= 85) return 'Excellent';
  if (sc >= 70) return 'Good';
  if (sc >= 45) return 'Moderate';
  if (sc >= 30) return 'Poor';
  return 'Very Poor';
};

const getVerdictLabel = (sc) => {
  if (sc >= 85) return 'Excellent Health Rating';
  if (sc >= 70) return 'Good Health Rating';
  if (sc >= 45) return 'Moderate Health Rating';
  if (sc >= 30) return 'Poor Health Rating';
  return 'Very Poor Health Rating';
};

const getBadgeColors = (sc) => {
  if (sc >= 70) return { bg: 'rgba(6,122,79,0.12)', text: PRIMARY, border: 'rgba(6,122,79,0.25)' };
  if (sc >= 40) return { bg: 'rgba(217,119,6,0.12)',  text: WARNING_C, border: 'rgba(217,119,6,0.25)' };
  return               { bg: 'rgba(186,26,26,0.10)',  text: ERROR_C,   border: 'rgba(186,26,26,0.2)' };
};

const getNutVal = (nutriments, primary, fallbacks) => {
  if (!nutriments) return null;
  if (nutriments[primary] != null) return nutriments[primary];
  for (const f of fallbacks) {
    if (nutriments[f] != null) return nutriments[f];
  }
  return null;
};

// ── Score Gauge ──────────────────────────────────────────────────────────
const ScoreGauge = ({ score, scoreColor }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, [score]);
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [GAUGE_CIRC, GAUGE_CIRC - (GAUGE_CIRC * score) / 100],
  });
  return (
    <View style={g.container}>
      <Svg width={160} height={160} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle cx={80} cy={80} r={GAUGE_R} stroke={CONTAINER} strokeWidth={8} fill="transparent" />
        <AnimatedSvgCircle
          cx={80} cy={80} r={GAUGE_R}
          stroke={scoreColor} strokeWidth={8}
          fill="transparent"
          strokeDasharray={GAUGE_CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={g.center}>
        <Text style={[g.scoreNum, { color: ON_SURFACE }]}>{score}</Text>
        <Text style={g.scoreLabel}>Score</Text>
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
const ResultsScreen = ({ route, navigation }) => {
  const barcode        = route?.params?.barcode || null;
  const devProduct     = route?.params?.devProduct || null;
  const devAnalysis    = route?.params?.devAnalysis || null;
  const devAiAnalysis  = route?.params?.devAiAnalysis || null;
  const devHasAIAccess = route?.params?.devHasAIAccess || false;
  const fromSearch     = route?.params?.fromSearch || false;
  const freeAIAccess   = route?.params?.freeAIAccess || false;
  const preloadedData  = route?.params?.preloadedData || null;
  const skipFetch      = route?.params?.skipFetch || false;

  const [product, setProduct]                 = useState(null);
  const [analysis, setAnalysis]               = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [enhancedHealthScore, setEnhancedHealthScore] = useState(null);
  const [lockedScore, setLockedScore]               = useState(null); // from VeeList — never overridden
  const [showAIChat, setShowAIChat]           = useState(false);
  const [isPremium, setIsPremium]             = useState(true);
  const [hasAIAccess, setHasAIAccess]         = useState(true);
  const [freeRecUsage, setFreeRecUsage]       = useState({ used: 0, remaining: 2, total: 2 });
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [expandedIngredient, setExpandedIngredient] = useState(null);
  const [usdaCache, setUsdaCache]                   = useState({});
  const [usdaLoading, setUsdaLoading]               = useState(null);
  const [realAlternatives, setRealAlternatives]       = useState([]);
  const [altsLoading, setAltsLoading]                 = useState(false);
  const [isInBest, setIsInBest]                       = useState(false);
  const [isDevMode, setIsDevMode]                     = useState(false);

  const BEST_PRODUCTS_KEY = '@vee_curated_products';

  const checkIfInBest = async (bc) => {
    try {
      const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setIsInBest(list.some(p => p.barcode === String(bc)));
    } catch { setIsInBest(false); }
  };

  const handleAddToBest = async () => {
    if (!product || !barcode) return;
    try {
      const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const bc = String(barcode);
      if (list.some(p => p.barcode === bc)) {
        setIsInBest(true);
        return;
      }
      const entry = {
        id: bc,
        barcode: bc,
        name: product.product_name || product.name || 'Unknown Product',
        brand: product.brands || product.brand || 'Unknown Brand',
        category: 'FOOD',
        filterCat: 'Food',
        tag: 'TOP PICK',
        defaultScore: score,
        image: product.image_url || product.image || null,
        productType: 'food',
        ingredients: product.ingredients_text || '',
        nutriments: product.nutriments || {},
      };
      await AsyncStorage.setItem(BEST_PRODUCTS_KEY, JSON.stringify([entry, ...list]));
      setIsInBest(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.log('Add to Best error:', e.message); }
  };
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnim  = useRef(new Animated.Value(0)).current;

  // ── Data fetch ──────────────────────────────────────────────────────────
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If preloaded data from VeeList, show it immediately and lock the score
      if (preloadedData) {
        const stub = {
          product_name: preloadedData.product_name,
          brands: preloadedData.brands,
          image_url: preloadedData.image_url,
          ingredients_text: preloadedData.ingredients_text,
          nutriments: preloadedData.nutriments || {},
        };
        const stubAnalysis = analyzeIngredients(stub.ingredients_text, 'food');
        setProduct(stub);
        setAnalysis(stubAnalysis);
        setEnhancedHealthScore({ score: preloadedData.curatedScore });
        if (preloadedData.curatedScore) setLockedScore(preloadedData.curatedScore);
        setLoading(false);
        // Elite products: all data is self-contained, no API fetch needed
        if (skipFetch) return;
      }

      const result = await fetchProductByBarcode(barcode);
      if (!result || result.status === 0) {
        if (!preloadedData) {
          setError('Product not found');
          navigation.replace('ProductNotFound', { barcode });
        }
        return;
      }
      const prod = result.product || result;

      // Merge: prefer API data but fill gaps from preloaded
      const merged = {
        ...prod,
        product_name: prod.product_name || preloadedData?.product_name || '',
        brands: prod.brands || preloadedData?.brands || '',
        image_url: prod.image_url || prod.image_front_url || preloadedData?.image_url || '',
        ingredients_text: prod.ingredients_text || preloadedData?.ingredients_text || '',
        nutriments: (prod.nutriments && Object.keys(prod.nutriments).length > 0)
          ? prod.nutriments
          : (preloadedData?.nutriments || {}),
      };

      const productType = getProductTypeFromCategories(merged.categories || '', merged.product_name || '', merged.source || '');
      if (productType !== 'food') {
        navigation.replace('CosmeticResults', { barcode, product: merged });
        return;
      }

      const analysisResult = analyzeIngredients(merged.ingredients_text, productType);
      const healthScore = calculateHealthScore(merged, null, null);
      const calculatedScore = healthScore?.score || analysisResult.score;

      // If a locked curated score exists, always use it — never let API override
      const finalScore = preloadedData?.curatedScore
        ? Math.max(calculatedScore, preloadedData.curatedScore)
        : calculatedScore;

      setProduct(merged);
      setAnalysis(analysisResult);
      setEnhancedHealthScore({ score: finalScore });
      saveToHistoryUtil(merged, analysisResult, finalScore);
    } catch (err) {
      if (!preloadedData) setError(err.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [barcode, navigation, preloadedData]);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      if (fromSearch && freeAIAccess) { setHasAIAccess(true); return; }
      const subType = await AsyncStorage.getItem('subscriptionType');
      if (subType === 'Premium' || subType === 'Trial') { setIsPremium(true); setHasAIAccess(true); }
      const usage = await getFreeRecommendationUsage();
      setFreeRecUsage(usage);
    } catch (e) { /* ignore */ }
  }, [fromSearch, freeAIAccess]);

  const fetchRealAlternatives = useCallback(async (productData, category) => {
    if (!productData) return;
    setAltsLoading(true);
    try {
      const productName = productData?.product_name || '';
      const cats = productData?.categories_tags || productData?.categories || [];
      const catString = Array.isArray(cats) ? cats.slice(0, 2).map(c => c.replace(/^en:/, '')).join(' ') : '';
      const searchTerm = catString || category || productName.split(' ').slice(0, 2).join(' ') || 'food';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=60&sort_by=unique_scans_n`,
        { headers: { 'User-Agent': 'HealthyScan/1.0', 'Accept': 'application/json' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data?.products) {
        const getAltImage = (p) => {
          const direct = p.image_url || p.image_front_url || p.image_front_small_url || p.image_front_thumb_url;
          if (direct) return direct;
          const b = String(p.code || '').replace(/\D/g, '');
          if (b.length === 13) return `https://images.openfoodfacts.org/images/products/${b.slice(0,3)}/${b.slice(3,6)}/${b.slice(6,9)}/${b.slice(9)}/front_en.400.jpg`;
          if (b.length >= 8) return `https://images.openfoodfacts.org/images/products/${b}/front_en.400.jpg`;
          return null;
        };
        const alts = data.products
          .filter(p => p.product_name && p.product_name.trim() && p.code && p.code !== barcode)
          .map(p => {
            const ingResult = p.ingredients_text ? analyzeIngredients(p.ingredients_text, 'food') : null;
            return {
              name: p.product_name,
              brand: p.brands || '',
              image: getAltImage(p),
              barcode: p.code,
              score: ingResult?.score ?? 50,
            };
          })
          .filter(alt => alt.score >= 65)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        if (alts.length > 0) setRealAlternatives(alts);
      }
    } catch (e) { /* silent */ } finally { setAltsLoading(false); }
  }, [barcode]);

  useEffect(() => {
    if (devProduct && devAnalysis) {
      setProduct(devProduct);
      setAnalysis(devAnalysis);
      if (devHasAIAccess) { setIsPremium(true); setHasAIAccess(true); }
      const healthScore = calculateHealthScore(devProduct, null, null);
      setEnhancedHealthScore(healthScore);
      setLoading(false);
    } else if (barcode) {
      fetchProductData();
      checkSubscriptionStatus();
      checkIfInBest(barcode);
      AsyncStorage.getItem('@vee_dev_mode').then(v => setIsDevMode(v === 'true'));
    } else {
      setError('No barcode provided');
      setLoading(false);
    }
  }, [barcode]);

  useEffect(() => {
    if (!loading && product && analysis) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.timing(barAnim, { toValue: 1, duration: 900, delay: 300, useNativeDriver: false }).start();
    }
  }, [loading, product, analysis]);

  useEffect(() => {
    if (product && !loading) {
      const cats = product?.categories_tags || product?.categories || [];
      const catStr = (Array.isArray(cats) ? cats.join(' ') : String(cats)).toLowerCase();
      const name = (product?.product_name || '').toLowerCase();
      const all = name + ' ' + catStr;
      let cat = 'Food';
      if (all.match(/cereal|granola|oat|muesli/)) cat = 'Cereal';
      else if (all.match(/juice|drink|beverage|soda/)) cat = 'Beverage';
      else if (all.match(/yogurt|yoghurt|dairy|milk|cheese/)) cat = 'Dairy';
      else if (all.match(/bread|baguette|toast|bakery/)) cat = 'Bread';
      else if (all.match(/chip|crisp|snack|cracker/)) cat = 'Snack';
      else if (all.match(/chocolate|candy|sweet|cookie|biscuit/)) cat = 'Sweet';
      else if (all.match(/sauce|ketchup|mustard|mayo|dressing/)) cat = 'Sauce';
      else if (all.match(/pasta|noodle|rice|grain/)) cat = 'Grain';
      fetchRealAlternatives(product, cat);
    }
  }, [product, loading]);

  const handleGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  const handleIngredientTap = async (ing) => {
    const key = (ing.name || '').toLowerCase().trim();
    if (expandedIngredient === key) {
      setExpandedIngredient(null);
      return;
    }
    setExpandedIngredient(key);
    if (usdaCache[key]) return;
    setUsdaLoading(key);
    try {
      const info = await getIngredientInfo(ing.name || key);
      setUsdaCache(prev => ({ ...prev, [key]: info }));
    } catch (_) {
      setUsdaCache(prev => ({ ...prev, [key]: null }));
    } finally {
      setUsdaLoading(null);
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={st.loadText}>Analyzing product...</Text>
      </View>
    );
  }
  if (error || !product || !analysis) {
    return (
      <View style={[st.center, { paddingTop: safeAreaInsets.top + 50 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={ERROR_C} />
        <Text style={st.loadText}>{error || 'Missing data'}</Text>
        <TouchableOpacity style={st.goBackBtn} onPress={handleGoBack}>
          <Text style={st.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const score       = lockedScore ?? (enhancedHealthScore ? enhancedHealthScore.score : Math.round(analysis?.score ?? 0));
  const scoreColor  = getScoreColor(score);
  const verdict     = getVerdict(score);
  const badgeColors = getBadgeColors(score);
  const nutriments  = product.nutriments || {};
  const productName = product.product_name || product.name || 'Unknown Product';
  const brandName   = product.brands || '';

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product.product_name || 'this product'} on HealthyScan! Score: ${score}/100` });
    } catch (e) { /* ignore */ }
  };

  // Nutrition grid
  const nutGrid = [
    { label: 'Energy',  icon: 'flash-outline',   value: getNutVal(nutriments, 'energy-kcal_100g', ['energy-kcal', 'energy_kcal']), unit: 'kcal', dv: 2000, type: 'neutral'  },
    { label: 'Sugar',   icon: 'cube-outline',    value: getNutVal(nutriments, 'sugars_100g', ['sugars']),                          unit: 'g',    dv: 50,   type: 'minimize' },
    { label: 'Protein', icon: 'barbell-outline', value: getNutVal(nutriments, 'proteins_100g', ['proteins']),                      unit: 'g',    dv: 50,   type: 'maximize' },
    { label: 'Salt',    icon: 'water-outline',   value: getNutVal(nutriments, 'salt_100g', ['salt', 'sodium']),                    unit: 'g',    dv: 6,    type: 'minimize' },
  ].filter(r => r.value != null);

  const getNutBadge = (item) => {
    const pct = item.value / item.dv;
    if (item.type === 'minimize') {
      if (pct > 0.3) return { label: 'HIGH',     color: '#ef4444', bg: '#fee2e2' };
      if (pct > 0.1) return { label: 'MODERATE', color: '#eab308', bg: '#fef9c3' };
      return               { label: 'LOW',      color: '#067A4F', bg: '#dcfce7' };
    }
    if (item.type === 'maximize') {
      if (pct > 0.25) return { label: 'GOOD',    color: '#067A4F', bg: '#dcfce7' };
      if (pct > 0.1)  return { label: 'AVERAGE', color: '#eab308', bg: '#fef9c3' };
      return                { label: 'LOW',     color: '#ef4444', bg: '#fee2e2' };
    }
    return { label: 'GOOD', color: '#067A4F', bg: '#dcfce7' };
  };

  // Ingredients
  const analyzedList = analysis?.analyzedIngredients || [];
  const goodIngs = analyzedList.filter(i => {
    const s = (i.status || '').toUpperCase();
    return s === 'GOOD' || s === 'EXCELLENT' || (i.category || '').toLowerCase() === 'good';
  });
  const badIngs = analyzedList.filter(i =>
    (i.status || '').toUpperCase() === 'POOR' || (i.category || '').toLowerCase() === 'bad' || (i.score != null && i.score < 45)
  );
  const moderateIngs = analyzedList.filter(i =>
    (i.status || '').toUpperCase() === 'MODERATE' || (i.category || '').toLowerCase() === 'moderate'
  );
  const allIngredients = [
    ...goodIngs.map(i => ({ ...i, _t: 'good' })),
    ...moderateIngs.map(i => ({ ...i, _t: 'moderate' })),
    ...badIngs.map(i => ({ ...i, _t: 'bad' })),
  ];
  const displayed = showAllIngredients ? allIngredients : allIngredients.slice(0, 5);

  const ingStyle = (_t) => {
    if (_t === 'good')     return { icon: 'leaf',                       color: '#067A4F', bg: '#dcfce7', tag: 'GOOD'     };
    if (_t === 'bad')      return { icon: 'warning-outline',            color: '#ef4444', bg: '#fee2e2', tag: 'AVOID'    };
    return                        { icon: 'information-circle-outline', color: '#eab308', bg: '#fef9c3', tag: 'MODERATE' };
  };

  const verdictDesc =
    score >= 70 ? 'This product has a healthy nutritional profile with beneficial ingredients.'
    : score >= 40 ? 'This product is moderately healthy. Some ingredients may need attention.'
    : 'This product contains ingredients that may negatively impact your health.';

  // Alternatives
  const fallbackAlts = [
    { name: 'Pure Spinach Elixir',  brand: 'Premium Cold Press', image: null, barcode: null, score: Math.min(95, score + 20) },
    { name: 'Wild Celery Essence',  brand: 'Zero Additive · Pure', image: null, barcode: null, score: Math.min(93, score + 18) },
    { name: 'Organic Green Blend',  brand: 'Cold Pressed · Raw',  image: null, barcode: null, score: Math.min(91, score + 15) },
  ];
  const altsData = realAlternatives.length > 0 ? realAlternatives : fallbackAlts;

  const getAltVerdict = (sc) => {
    if (sc >= 85) return 'Excellent';
    if (sc >= 70) return 'Good';
    return 'Great';
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Light Wellness
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: safeAreaInsets.top + 8 }]}>
        <View style={st.headerLeft}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoBack(); }}
            style={st.iconBtn}
          >
            <Ionicons name="arrow-back" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Scan Results</Text>
        </View>
        <View style={st.headerRight}>
          {/* Trophy — save to Best */}
          <TouchableOpacity
            onPress={handleAddToBest}
            style={st.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isInBest ? 'trophy' : 'trophy-outline'}
              size={22}
              color={isInBest ? PRIMARY : ON_VAR}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={st.iconBtn}>
            <Ionicons name="share-outline" size={22} color={ON_VAR} />
          </TouchableOpacity>
          <View style={st.avatarCircle}>
            <Ionicons name="person" size={14} color={PRIMARY} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: safeAreaInsets.top + 56, paddingBottom: safeAreaInsets.bottom + 160 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── HERO: Image + Gauge overlay ───────────────────────────── */}
          <View style={st.heroContainer}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={st.heroImage} resizeMode="cover" />
            ) : (
              <View style={[st.heroImage, st.heroPlaceholder]}>
                <Ionicons name="cube-outline" size={64} color={OUTLINE} />
              </View>
            )}
            {/* Sage gradient fade to background */}
            <LinearGradient
              colors={['transparent', BG]}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Score gauge at bottom center */}
            <View style={st.gaugeOverlay}>
              <ScoreGauge score={score} scoreColor={scoreColor} />
            </View>
          </View>

          {/* ── PRODUCT SUMMARY ──────────────────────────────────────── */}
          <View style={st.summarySection}>
            <View style={[st.verdictBadge, { backgroundColor: badgeColors.bg, borderColor: badgeColors.border }]}>
              <Text style={[st.verdictBadgeText, { color: badgeColors.text }]}>{getVerdictLabel(score)}</Text>
            </View>
            <Text style={st.productName} numberOfLines={2}>{productName}</Text>

            {/* ── SAVE TO BEST BUTTON ── */}
            <TouchableOpacity
              style={[st.saveToBestBtn, isInBest && { backgroundColor: '#2d6a4f' }]}
              onPress={handleAddToBest}
              activeOpacity={0.8}
            >
              <Ionicons name={isInBest ? 'trophy' : 'trophy-outline'} size={18} color="#fff" />
              <Text style={st.saveToBestTxt}>
                {isInBest ? '✓ Saved to Best Section' : '🏆  Save to Best Section'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── NUTRITION GRID ───────────────────────────────────────── */}
          {nutGrid.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionTitle, { marginBottom: 12 }]}>Nutritional Profile</Text>
              <View style={st.nutGrid}>
                {nutGrid.map((item, idx) => {
                  const badge = getNutBadge(item);
                  const pct = Math.min(100, (item.value / item.dv) * 100);
                  return (
                    <View key={idx} style={st.nutCell}>
                      <View style={st.nutCellTop}>
                        <Ionicons name={item.icon} size={20} color={badge.color} />
                        <View style={[st.nutBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[st.nutBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={st.nutLabel}>{item.label}</Text>
                      <View style={st.nutBarRow}>
                        <View style={st.nutBarBg}>
                          <Animated.View style={[
                            st.nutBarFill,
                            {
                              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }),
                              backgroundColor: badge.color,
                            },
                          ]} />
                        </View>
                        <Text style={[st.nutValueSmall, { color: badge.color }]}>
                          {item.value % 1 === 0 ? item.value : item.value.toFixed(1)}{item.unit}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── INGREDIENT BREAKDOWN ─────────────────────────────────── */}
          {displayed.length > 0 && (
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Text style={st.sectionTitle}>Ingredient Breakdown</Text>
                <Text style={st.viewLabels}>{allIngredients.length} ITEMS</Text>
              </View>
              <View style={st.ingList}>
                {displayed.map((ing, idx) => {
                  const s = ingStyle(ing._t);
                  const description = ing.notes || ing.concerns || ing.reason || null;
                  const key = (ing.name || '').toLowerCase().trim();
                  const isExpanded = expandedIngredient === key;
                  const isLoadingThis = usdaLoading === key;
                  const usdaInfo = usdaCache[key];
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.75}
                      onPress={() => handleIngredientTap(ing)}
                    >
                      <View style={[st.ingRow, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}>
                        <View style={[st.ingIconBox, { backgroundColor: s.bg }]}>
                          <Ionicons name={s.icon} size={18} color={s.color} />
                        </View>
                        <View style={st.ingCardMeta}>
                          <Text style={st.ingName} numberOfLines={1}>{ing.name || 'Unknown'}</Text>
                          {description ? <Text style={st.ingDesc} numberOfLines={1}>{description}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[st.ingBadge, { backgroundColor: s.bg, borderColor: s.color + '33' }]}>
                            <Text style={[st.ingBadgeText, { color: s.color }]}>{s.tag}</Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={ON_VAR}
                          />
                        </View>
                      </View>
                      {isExpanded && (
                        <View style={st.ingDetail}>
                          {isLoadingThis ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <ActivityIndicator size="small" color={PRIMARY} />
                              <Text style={st.ingDetailLabel}>Looking up database...</Text>
                            </View>
                          ) : usdaInfo ? (
                            <>
                              {/* Health verdict badge */}
                              {usdaInfo.healthVerdict && (() => {
                                const vColors = {
                                  good:     { bg: 'rgba(45,106,79,0.12)',  text: '#067A4F', label: 'Generally Safe' },
                                  moderate: { bg: 'rgba(217,119,6,0.12)',  text: '#d97706', label: 'Moderate' },
                                  concern:  { bg: 'rgba(217,119,6,0.18)',  text: '#b45309', label: 'Use With Caution' },
                                  avoid:    { bg: 'rgba(186,26,26,0.12)',  text: '#ba1a1a', label: 'Avoid' },
                                };
                                const vc = vColors[usdaInfo.healthVerdict] || vColors.moderate;
                                return (
                                  <View style={[st.ingVerdictBadge, { backgroundColor: vc.bg }]}>
                                    <Text style={[st.ingVerdictText, { color: vc.text }]}>
                                      {vc.label}
                                    </Text>
                                  </View>
                                );
                              })()}

                              {/* What is it */}
                              <View style={st.ingDetailRow}>
                                <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.ingDetailLabel}>What is it?</Text>
                                  <Text style={st.ingDetailText}>{usdaInfo.whatItIs}</Text>
                                </View>
                              </View>

                              {/* What does it do */}
                              <View style={[st.ingDetailRow, { marginTop: 10 }]}>
                                <Ionicons name="flash-outline" size={16} color={PRIMARY} />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.ingDetailLabel}>What does it do?</Text>
                                  <Text style={st.ingDetailText}>{usdaInfo.whatItDoes}</Text>
                                </View>
                              </View>

                              {/* WHO says */}
                              {usdaInfo.whoSays ? (
                                <View style={[st.ingDetailRow, { marginTop: 10 }]}>
                                  <Ionicons name="globe-outline" size={16} color="#1565c0" />
                                  <View style={{ flex: 1 }}>
                                    <Text style={[st.ingDetailLabel, { color: '#1565c0' }]}>WHO / JECFA</Text>
                                    <Text style={st.ingDetailText}>{usdaInfo.whoSays}</Text>
                                  </View>
                                </View>
                              ) : null}

                              <Text style={st.ingDetailSource}>Source: {usdaInfo.source}</Text>
                            </>
                          ) : (
                            <Text style={st.ingDetailText}>No information available for this ingredient.</Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {allIngredients.length > 5 && (
                  <TouchableOpacity
                    style={st.showMore}
                    onPress={() => setShowAllIngredients(!showAllIngredients)}
                  >
                    <Text style={st.showMoreText}>
                      {showAllIngredients ? 'Show Less' : `+ ${allIngredients.length - 5} more ingredients`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ── BETTER ALTERNATIVES ──────────────────────────────────── */}
          <View style={st.section}>
            <Text style={[st.sectionTitle, { marginBottom: 12 }]}>Better Alternatives</Text>
            {altsLoading && realAlternatives.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ color: ON_VAR, fontSize: 12, marginTop: 10 }}>Finding alternatives...</Text>
              </View>
            ) : (
              <FlatList
                data={altsData}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                renderItem={({ item }) => {
                  const altColor = getScoreColor(item.score);
                  return (
                    <TouchableOpacity
                      style={st.altCard}
                      activeOpacity={0.82}
                      onPress={() => item.barcode && navigation.push('ResultsV2', { barcode: item.barcode })}
                    >
                      {/* Image with score badge overlay */}
                      <View style={st.altImgBox}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={st.altImg} resizeMode="cover" />
                        ) : (
                          <View style={[st.altImg, st.altImgPlaceholder]}>
                            <Ionicons name="leaf-outline" size={28} color={OUTLINE} />
                          </View>
                        )}
                        <View style={[st.altScoreBadge, { backgroundColor: altColor }]}>
                          <Text style={st.altScoreBadgeText}>{item.score}/100</Text>
                        </View>
                      </View>
                      {/* Name + subtitle */}
                      <Text style={st.altName} numberOfLines={1}>{item.name}</Text>
                      <Text style={st.altSubtitle} numberOfLines={1}>{item.brand || getAltVerdict(item.score)}</Text>
                      {/* VIEW ITEM button */}
                      <View style={st.altViewBtn}>
                        <Text style={st.altViewBtnText}>VIEW ITEM</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* ── DNA HELIX DECORATION ─────────────────────────────────── */}
          <View style={st.dnaWrap}>
            <Svg width="100%" height={80} viewBox="0 0 400 80">
              <SvgCircle cx={0} cy={0} r={0} fill="none" />
            </Svg>
          </View>

          {/* ── AI ASSISTANT CARD ────────────────────────────────────── */}
          <View style={st.aiCardWrap}>
            <TouchableOpacity
              style={st.aiCard}
              activeOpacity={0.82}
              onPress={async () => {
                if (isPremium || hasAIAccess) {
                  setShowAIChat(true);
                } else if (freeRecUsage.remaining > 0) {
                  const result = await useFreeRecommendation();
                  if (result.success) { setFreeRecUsage(result.usage); setHasAIAccess(true); setShowAIChat(true); }
                } else {
                  navigation.navigate('Subscription', { returnTo: 'results', productName: product?.product_name });
                }
              }}
            >
              <View style={st.aiCardIcon}>
                <Ionicons name="sparkles" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.aiCardLabel}>Aura Assistant</Text>
                <Text style={st.aiCardSub}>Ask about these ingredients</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={st.aiCardConnect}>Chat</Text>
                <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── SAVE TO HISTORY ──────────────────────────────────────── */}
          <View style={st.saveWrap}>
            <TouchableOpacity
              style={st.saveBtn}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                saveToHistoryUtil(product, analysis, score);
              }}
            >
              <Text style={st.saveBtnText}>Save to History</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── AI Chat overlay ───────────────────────────────────────────── */}
      {showAIChat && product && (
        <ProductAIChat
          product={product}
          analysis={analysis}
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}

    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// GAUGE STYLES
// ══════════════════════════════════════════════════════════════════════════
const g = StyleSheet.create({
  container: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  center:    { position: 'absolute', alignItems: 'center' },
  scoreNum:  { fontSize: 44, fontWeight: '700', color: ON_SURFACE, lineHeight: 50 },
  scoreLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: ON_VAR, textTransform: 'uppercase', marginTop: 2 },
});

// ══════════════════════════════════════════════════════════════════════════
// MAIN STYLES — Light Wellness
// ══════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  // Loading / Error
  center:        { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  loadText:      { fontSize: 13, color: ON_VAR, marginTop: 14, fontWeight: '500' },
  goBackBtn:     { marginTop: 24, backgroundColor: PRIMARY, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24 },
  goBackBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: 'rgba(250,250,245,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:  { fontSize: 20, fontWeight: '700', color: PRIMARY, letterSpacing: -0.3 },
  iconBtn:      { padding: 4 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#e8ede8',
    borderWidth: 1, borderColor: 'rgba(45,106,79,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  saveToBestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  saveToBestTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Save to Best FAB
  saveFab: {
    position: 'absolute',
    left: 20, right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  saveFabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  saveFabBtnDone: {
    backgroundColor: '#2d6a4f',
  },
  saveFabTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Hero
  heroContainer:   { width: '100%', height: 280, position: 'relative' },
  heroImage:       { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: CONTAINER, alignItems: 'center', justifyContent: 'center' },
  gaugeOverlay:    {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 16,
  },

  // Product Summary
  summarySection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  verdictBadge:     {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 99, borderWidth: 1,
    marginBottom: 12,
  },
  verdictBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  productName:      { fontSize: 22, fontWeight: '700', color: ON_SURFACE, textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  brandName:        { fontSize: 13, color: ON_VAR, marginBottom: 10 },
  verdictDesc:      { fontSize: 14, color: ON_VAR, textAlign: 'center', lineHeight: 21 },

  // Section
  section:      { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: ON_SURFACE },
  viewLabels:   { fontSize: 11, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Nutrition grid
  nutGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutCell: {
    width: (SCREEN_W - 50) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  nutCellTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nutBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  nutBadgeText:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  nutLabel:      { fontSize: 15, fontWeight: '600', color: ON_SURFACE, marginBottom: 8 },
  nutBarRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nutBarBg:      { flex: 1, height: 4, backgroundColor: CONTAINER, borderRadius: 2, overflow: 'hidden' },
  nutBarFill:    { height: 4, borderRadius: 2 },
  nutValueSmall: { fontSize: 10, fontWeight: '700' },

  // Ingredient list
  ingList:       { gap: 8 },
  ingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ingIconBox:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingName:       { fontSize: 14, fontWeight: '600', color: ON_SURFACE, marginBottom: 2 },
  ingDesc:       { fontSize: 12, color: ON_VAR, lineHeight: 16 },
  ingBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, flexShrink: 0 },
  ingBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  showMore:      { paddingTop: 12, alignItems: 'center' },
  showMoreText:  { fontSize: 13, fontWeight: '600', color: PRIMARY },

  // USDA ingredient detail panel
  ingDetail: {
    backgroundColor: '#f0f5f0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(45,106,79,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ingVerdictBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginBottom: 12 },
  ingVerdictText:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  ingDetailRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ingDetailLabel: { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  ingDetailText:  { fontSize: 13, color: ON_SURFACE, lineHeight: 19 },
  ingDetailSource:{ fontSize: 10, color: ON_VAR, marginTop: 10, textAlign: 'right', fontStyle: 'italic' },

  // Alternatives — portrait cards matching HTML design
  altCard: {
    width: 180,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  altImgBox:         { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: CONTAINER, overflow: 'hidden', marginBottom: 8 },
  altImg:            { width: '100%', height: '100%' },
  altImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  altScoreBadge:     { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  altScoreBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  altName:           { fontSize: 14, fontWeight: '700', color: ON_SURFACE, paddingHorizontal: 4, marginBottom: 2 },
  altSubtitle:       { fontSize: 12, color: ON_VAR, paddingHorizontal: 4, marginBottom: 8 },
  altViewBtn:        { backgroundColor: CONTAINER, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  altViewBtnText:    { fontSize: 11, fontWeight: '700', color: ON_SURFACE, textTransform: 'uppercase', letterSpacing: 0.5 },

  // DNA decoration
  dnaWrap:      { height: 80, opacity: 0.15, marginBottom: 8 },

  // AI card
  aiCardWrap:   { paddingHorizontal: 20, marginBottom: 16 },
  aiCard: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CONTAINER,
    borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  aiCardIcon:    { width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  aiCardLabel:   { fontSize: 15, fontWeight: '700', color: ON_SURFACE, marginBottom: 2 },
  aiCardSub:     { fontSize: 13, color: ON_VAR },
  aiCardConnect: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  // Save
  saveWrap:     { paddingHorizontal: 20, marginBottom: 8 },
  saveBtn:      {
    width: '100%', backgroundColor: PRIMARY,
    height: 56, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16,
  },
  saveBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});

export default ResultsScreen;
