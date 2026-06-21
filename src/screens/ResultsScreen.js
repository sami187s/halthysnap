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

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// â”€â”€ Dark Brutalism Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BG             = '#000000';
const SURFACE        = '#131313';
const SURFACE_LOW    = '#1b1b1b';
const SURFACE_HIGH   = '#2a2a2a';
const OUTLINE        = '#474747';
const ON_SURFACE     = '#e2e2e2';
const ON_SURFACE_VAR = '#c6c6c6';
const WHITE          = '#ffffff';

// â”€â”€ Gauge constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GAUGE_R    = 96;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R; // â‰ˆ 603

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getScoreColor = (sc) => {
  if (sc >= 70) return '#4ADE80';
  if (sc >= 40) return '#FACC15';
  return '#F87171';
};

const getVerdict = (sc) => {
  if (sc >= 85) return 'EXCELLENT';
  if (sc >= 70) return 'GREAT';
  if (sc >= 45) return 'MODERATE';
  if (sc >= 30) return 'POOR';
  return 'VERY POOR';
};

const getNutVal = (nutriments, primary, fallbacks) => {
  if (!nutriments) return null;
  if (nutriments[primary] != null) return nutriments[primary];
  for (const f of fallbacks) {
    if (nutriments[f] != null) return nutriments[f];
  }
  return null;
};

// â”€â”€ Score Gauge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ScoreGauge = ({ score, scoreColor }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
  }, [score]);
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [GAUGE_CIRC, GAUGE_CIRC - (GAUGE_CIRC * score) / 100],
  });
  return (
    <View style={g.container}>
      {/* Outer decorative ring */}
      <View style={g.outerRing} />
      {/* Dark inner ring (track background) */}
      <View style={g.innerRing} />
      {/* Animated SVG arc */}
      <Svg
        width={200} height={200}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <SvgCircle
          cx={100} cy={100} r={GAUGE_R}
          stroke={SURFACE_HIGH} strokeWidth={8} fill="transparent"
        />
        <AnimatedSvgCircle
          cx={100} cy={100} r={GAUGE_R}
          stroke={scoreColor} strokeWidth={8}
          fill="transparent"
          strokeDasharray={GAUGE_CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center text */}
      <View style={g.center}>
        <View style={g.scannedRow}>
          <Ionicons name="people-outline" size={11} color={OUTLINE} />
          <Text style={g.scannedText}>  SCANNED BY THOUSANDS</Text>
        </View>
        <Text style={g.scoreNum}>{score}</Text>
        <Text style={g.healthLabel}>HEALTH SCORE</Text>
      </View>
    </View>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const ResultsScreen = ({ route, navigation }) => {
  const barcode        = route?.params?.barcode || null;
  const devProduct     = route?.params?.devProduct || null;
  const devAnalysis    = route?.params?.devAnalysis || null;
  const devAiAnalysis  = route?.params?.devAiAnalysis || null;
  const devHasAIAccess = route?.params?.devHasAIAccess || false;
  const fromSearch     = route?.params?.fromSearch || false;
  const freeAIAccess   = route?.params?.freeAIAccess || false;

  const [product, setProduct]                 = useState(null);
  const [analysis, setAnalysis]               = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [enhancedHealthScore, setEnhancedHealthScore] = useState(null);
  const [showAIChat, setShowAIChat]           = useState(false);
  const [isPremium, setIsPremium]             = useState(true);
  const [hasAIAccess, setHasAIAccess]         = useState(true);
  const [freeRecUsage, setFreeRecUsage]       = useState({ used: 0, remaining: 2, total: 2 });
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [realAlternatives, setRealAlternatives]       = useState([]);
  const [altsLoading, setAltsLoading]                 = useState(false);

  const safeAreaInsets = useSafeAreaInsetsWithFallback();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // â”€â”€ Data fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchProductByBarcode(barcode);
      if (!result || result.status === 0) {
        setError('Product not found');
        navigation.replace('ProductNotFound', { barcode });
        return;
      }
      const prod = result.product || result;
      const productType = getProductTypeFromCategories(prod.categories || '');
      if (productType === 'cosmetic') {
        navigation.replace('CosmeticResults', { barcode, product: prod });
        return;
      }
      const analysisResult = analyzeIngredients(prod.ingredients_text || '', productType);
      setProduct(prod);
      setAnalysis(analysisResult);
      const healthScore = calculateHealthScore(prod, null, null);
      setEnhancedHealthScore(healthScore);
      saveToHistoryUtil(prod, analysisResult, healthScore?.score || analysisResult.score);
    } catch (err) {
      setError(err.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [barcode, navigation]);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      // Search users with freeAIAccess flag get AI for free (marketing strategy)
      if (fromSearch && freeAIAccess) {
        setHasAIAccess(true);
        return;
      }
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
        // Build the best available image URL for a product, falling back to the OFF CDN pattern
        const getAltImage = (p) => {
          const direct = p.image_url || p.image_front_url || p.image_front_small_url || p.image_front_thumb_url;
          if (direct) return direct;
          const b = String(p.code || '').replace(/\D/g, '');
          if (b.length === 13) {
            return `https://images.openfoodfacts.org/images/products/${b.slice(0,3)}/${b.slice(3,6)}/${b.slice(6,9)}/${b.slice(9)}/front_en.400.jpg`;
          }
          if (b.length >= 8) {
            return `https://images.openfoodfacts.org/images/products/${b}/front_en.400.jpg`;
          }
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
    } else {
      setError('No barcode provided');
      setLoading(false);
    }
  }, [barcode]);

  useEffect(() => {
    if (!loading && product && analysis) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  // â”€â”€ Loading / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <View style={[st.center, { paddingTop: safeAreaInsets.top }]}>
        <ActivityIndicator size="large" color="#4ADE80" />
        <Text style={st.loadText}>Analyzing product...</Text>
      </View>
    );
  }
  if (error || !product || !analysis) {
    return (
      <View style={[st.center, { paddingTop: safeAreaInsets.top + 50 }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
        <Text style={st.loadText}>{error || 'Missing data'}</Text>
        <TouchableOpacity style={st.goBackBtn} onPress={handleGoBack}>
          <Text style={st.goBackBtnText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const score      = enhancedHealthScore ? enhancedHealthScore.score : Math.round(analysis?.score ?? 0);
  const scoreColor = getScoreColor(score);
  const verdict    = getVerdict(score);
  const nutriments = product.nutriments || {};
  const productName = (product.product_name || product.name || 'Unknown Product').toUpperCase();
  const brandName   = product.brands ? product.brands.toUpperCase() : '';

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product.product_name || 'this product'} on HealthyScan! Score: ${score}/100` });
    } catch (e) { /* ignore */ }
  };

  // Nutrition grid (4 items for 2x2)
  const nutGrid = [
    { label: 'Sugar',   value: getNutVal(nutriments, 'sugars_100g', ['sugars']),                          unit: 'g',    dv: 50   },
    { label: 'Protein', value: getNutVal(nutriments, 'proteins_100g', ['proteins']),                      unit: 'g',    dv: 50   },
    { label: 'Fiber',   value: getNutVal(nutriments, 'fiber_100g', ['fiber', 'fibre']),                   unit: 'g',    dv: 28   },
    { label: 'Energy',  value: getNutVal(nutriments, 'energy-kcal_100g', ['energy-kcal', 'energy_kcal']), unit: 'kcal', dv: 2000 },
  ].filter(r => r.value != null);

  // Ingredients
  const analyzedList = analysis?.analyzedIngredients || [];
  const goodIngs     = analyzedList.filter(i => {
    const s = (i.status || '').toUpperCase();
    return s === 'GOOD' || s === 'EXCELLENT' || (i.category || '').toLowerCase() === 'good' || (i.category || '').toLowerCase() === 'excellent';
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
    if (_t === 'good')     return { icon: 'leaf',    color: '#4ADE80', bg: '#1a3326', tag: 'NATURAL'  };
    if (_t === 'bad')      return { icon: 'close',   color: '#F87171', bg: '#3b1a1a', tag: 'CONCERN'  };
    return                        { icon: 'ellipse', color: '#FACC15', bg: '#2e2a14', tag: 'MODERATE' };
  };

  const verdictDesc =
    score >= 70 ? 'This product has a healthy nutritional profile with beneficial ingredients.'
    : score >= 40 ? 'This product is moderately healthy. Some ingredients may need attention.'
    : 'This product contains ingredients that may negatively impact your health.';

  // â”€â”€ Alternatives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fallbackAlts = [
    { name: 'Pure Spinach Elixir', brand: 'PREMIUM COLD PRESS', image: null, barcode: null, score: Math.min(95, score + 20) },
    { name: 'Wild Celery Essence', brand: 'ZERO ADDITIVE Â· PURE', image: null, barcode: null, score: Math.min(93, score + 18) },
    { name: 'Organic Green Blend', brand: 'COLD PRESSED Â· RAW', image: null, barcode: null, score: Math.min(91, score + 15) },
    { name: 'Nature Harvest Mix', brand: 'WHOLE FOOD Â· CLEAN', image: null, barcode: null, score: Math.min(90, score + 12) },
  ];
  const altsData = realAlternatives.length > 0 ? realAlternatives : fallbackAlts;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER â€” Dark Brutalism
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* â”€â”€ FIXED HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={[st.header, { paddingTop: safeAreaInsets.top + 8 }]}>
        <View style={st.headerLeft}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoBack(); }}
            style={st.iconBtn}
          >
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>SCAN RESULTS</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={st.iconBtn}>
          <Ionicons name="share-social-outline" size={22} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: safeAreaInsets.top + 64, paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* â”€â”€ HERO: Product Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={st.heroContainer}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={st.heroImage} resizeMode="cover" />
            ) : (
              <View style={[st.heroImage, st.heroPlaceholder]}>
                <Ionicons name="cube-outline" size={80} color={OUTLINE} />
              </View>
            )}
            <LinearGradient
              colors={['#000000', 'rgba(0,0,0,0.4)', 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={st.heroGradient}
            />
            <View style={st.heroTextBox}>
              <Text style={st.heroLabel}>ANALYSIS COMPLETE</Text>
              <Text style={st.heroProductName} numberOfLines={2}>{productName}</Text>
            </View>
          </View>

          {/* â”€â”€ GAUGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={st.gaugeSection}>
            <ScoreGauge score={score} scoreColor={scoreColor} />
            <TouchableOpacity style={st.whyBtn}>
              <Text style={st.whyBtnText}>WHY THIS SCORE?</Text>
            </TouchableOpacity>
          </View>

          {/* â”€â”€ VERDICT BADGE + DESCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={st.verdictSection}>
            <View style={[st.verdictBadge, { backgroundColor: scoreColor }]}>
              <Text style={st.verdictBadgeText}>{verdict}</Text>
            </View>
            {brandName ? <Text style={st.brandLabel}>{brandName}</Text> : null}
            <Text style={st.verdictDesc}>{verdictDesc}</Text>
          </View>

          {/* â”€â”€ NUTRITION BENTO GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {nutGrid.length > 0 && (
            <View style={st.bentoGrid}>
              {nutGrid.map((item, idx) => {
                const frac = Math.min((item.value / item.dv), 1);
                return (
                  <View
                    key={idx}
                    style={[
                      st.bentoCell,
                      idx % 2 === 1 && st.bentoCellRight,
                      idx >= 2     && st.bentoCellTop,
                    ]}
                  >
                    <Text style={st.bentoCellLabel}>{item.label.toUpperCase()}</Text>
                    <Text style={st.bentoCellValue}>
                      {item.value % 1 === 0 ? item.value : item.value.toFixed(1)}
                      <Text style={st.bentoCellUnit}>{item.unit === 'kcal' ? ' kcal' : item.unit}</Text>
                    </Text>
                    <View style={st.bentoBar}>
                      <View style={[st.bentoBarFill, { width: `${Math.round(frac * 100)}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* â”€â”€ INGREDIENT BREAKDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {displayed.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>INGREDIENT BREAKDOWN</Text>
              {displayed.map((ing, idx) => {
                const s = ingStyle(ing._t);
                const isLast = idx === displayed.length - 1;
                return (
                  <View key={idx} style={[st.ingRow, !isLast && st.ingRowBorder]}>
                    <View style={st.ingLeft}>
                      <View style={[st.ingIconCircle, { backgroundColor: s.bg }]}>
                        <Ionicons name={s.icon} size={16} color={s.color} />
                      </View>
                      <Text style={st.ingName} numberOfLines={1}>{ing.name || 'Unknown'}</Text>
                    </View>
                    <Text style={[st.ingTag, { color: s.color }]}>{s.tag}</Text>
                  </View>
                );
              })}
              {allIngredients.length > 5 && (
                <TouchableOpacity
                  style={st.showMore}
                  onPress={() => setShowAllIngredients(!showAllIngredients)}
                >
                  <Text style={st.showMoreText}>
                    {showAllIngredients ? 'SHOW LESS' : `+ ${allIngredients.length - 5} MORE INGREDIENTS`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* â”€â”€ BETTER ALTERNATIVES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={st.altSection}>
            <View style={st.altHeader}>
              <Text style={st.sectionTitle}>BETTER ALTERNATIVES</Text>
              <TouchableOpacity>
                <Text style={st.altViewAll}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>
            {altsLoading && realAlternatives.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#4ADE80" />
                <Text style={{ color: ON_SURFACE_VAR, fontSize: 11, marginTop: 10, letterSpacing: 1 }}>FINDING ALTERNATIVES...</Text>
              </View>
            ) : (
              <FlatList
                data={altsData}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 28, gap: 14 }}
                renderItem={({ item }) => {
                  const altScoreColor = getScoreColor(item.score);
                  return (
                    <TouchableOpacity
                      style={st.altCard}
                      activeOpacity={0.82}
                      onPress={() => item.barcode && navigation.push('ResultsV2', { barcode: item.barcode })}
                    >
                      {/* Image box */}
                      <View style={st.altImgBox}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={st.altImg} resizeMode="cover" />
                        ) : (
                          <View style={[st.altImg, st.altImgPlaceholder]}>
                            <Ionicons name="leaf-outline" size={28} color={OUTLINE} />
                          </View>
                        )}
                        {/* Score badge */}
                        <View style={[st.altScoreBadge, { borderColor: altScoreColor }]}>
                          <Text style={[st.altScoreNum, { color: altScoreColor }]}>{item.score}</Text>
                        </View>
                      </View>
                      {/* Text below */}
                      <Text style={st.altName} numberOfLines={2}>
                        {(item.name || '').toUpperCase()}
                      </Text>
                      <Text style={st.altBrand} numberOfLines={1}>
                        {(item.brand || '').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* â”€â”€ AURA AI CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              {/* Green sparkle icon */}
              <View style={st.aiCardIcon}>
                <Ionicons name="sparkles" size={22} color={BG} />
              </View>
              {/* Text */}
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.aiCardLabel}>AURA ASSISTANT</Text>
                <Text style={st.aiCardSub}>Ask about these{`\n`}ingredients</Text>
              </View>
              {/* Connect */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={st.aiCardConnect}>CONNECT</Text>
                <Ionicons name="arrow-forward" size={14} color="#4ADE80" />
              </View>
            </TouchableOpacity>
          </View>

          {/* â”€â”€ SAVE TO LOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={st.saveWrap}>
            <TouchableOpacity
              style={st.saveBtn}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                saveToHistoryUtil(product, analysis, score);
              }}
            >
              <Text style={st.saveBtnText}>SAVE TO LOG</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

      {/* â”€â”€ AI Chat overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GAUGE STYLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const g = StyleSheet.create({
  container: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute', top: 0, left: 0,
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 1, borderColor: 'rgba(71,71,71,0.3)',
  },
  innerRing: {
    position: 'absolute', top: 20, left: 20,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 8, borderColor: SURFACE_HIGH,
  },
  center: { position: 'absolute', alignItems: 'center' },
  scannedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scannedText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: OUTLINE, textTransform: 'uppercase' },
  scoreNum: { fontSize: 80, fontWeight: '900', letterSpacing: -4, lineHeight: 84, color: WHITE },
  healthLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginTop: 2 },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN STYLES â€” Dark Brutalism
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const st = StyleSheet.create({
  // Loading / Error
  center:       { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  loadText:     { fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, letterSpacing: 1, fontWeight: '500' },
  goBackBtn:    { marginTop: 24, borderWidth: 1, borderColor: OUTLINE, paddingVertical: 12, paddingHorizontal: 32 },
  goBackBtnText:{ color: ON_SURFACE, fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: SURFACE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 12,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 3, color: WHITE, textTransform: 'uppercase' },
  iconBtn:     { padding: 8 },

  // Hero
  heroContainer:   { width: '100%', height: 320, position: 'relative' },
  heroImage:       { width: '100%', height: '100%', opacity: 0.75 },
  heroPlaceholder: { backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' },
  heroGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  heroTextBox:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, paddingBottom: 28 },
  heroLabel:       { fontSize: 9, fontWeight: '700', letterSpacing: 4, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 6 },
  heroProductName: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: WHITE, lineHeight: 32 },

  // Gauge section
  gaugeSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 12 },
  whyBtn:       { marginTop: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 2 },
  whyBtnText:   { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: WHITE },

  // Verdict
  verdictSection:    { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 36 },
  verdictBadge:      { paddingHorizontal: 16, paddingVertical: 5, marginBottom: 14 },
  verdictBadgeText:  { color: '#1a1c1c', fontSize: 9, fontWeight: '900', letterSpacing: 5, textTransform: 'uppercase' },
  brandLabel:        { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: ON_SURFACE_VAR, marginBottom: 10, textTransform: 'uppercase' },
  verdictDesc:       { fontSize: 13, color: ON_SURFACE_VAR, textAlign: 'center', lineHeight: 20 },

  // Bento grid
  bentoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(71,71,71,0.4)',
    marginBottom: 36,
  },
  bentoCell: {
    width: SCREEN_W / 2, backgroundColor: BG,
    paddingHorizontal: 28, paddingVertical: 28, gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(71,71,71,0.4)',
  },
  bentoCellRight: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(71,71,71,0.4)' },
  bentoCellTop:   { borderTopWidth: StyleSheet.hairlineWidth,  borderTopColor:  'rgba(71,71,71,0.4)' },
  bentoCellLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: OUTLINE, textTransform: 'uppercase' },
  bentoCellValue: { fontSize: 22, fontWeight: '300', color: WHITE },
  bentoCellUnit:  { fontSize: 13, fontWeight: '300', color: ON_SURFACE_VAR },
  bentoBar:       { height: 1, backgroundColor: SURFACE_HIGH, marginTop: 10 },
  bentoBarFill:   { height: 1, backgroundColor: WHITE },

  // Ingredients
  section:      { paddingHorizontal: 28, paddingBottom: 28 },
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 4, color: ON_SURFACE, textTransform: 'uppercase', marginBottom: 20 },
  ingRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  ingRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(71,71,71,0.2)' },
  ingLeft:        { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 12 },
  ingIconCircle:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ingName:        { fontSize: 14, fontWeight: '500', color: WHITE, flex: 1 },
  ingTag:       { fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  showMore:     { marginTop: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(71,71,71,0.2)', alignItems: 'center' },
  showMoreText: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: ON_SURFACE_VAR },

  // AI card
  aiCardWrap: { paddingHorizontal: 28, marginBottom: 16 },
  aiCard: {
    backgroundColor: SURFACE_LOW, borderWidth: 1, borderColor: OUTLINE,
    padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  aiCardLabel:   { fontSize: 9, fontWeight: '900', letterSpacing: 3, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 6 },
  aiCardSub:     { fontSize: 15, fontWeight: '300', color: WHITE, lineHeight: 21 },
  aiCardIcon:    { width: 52, height: 52, borderRadius: 26, backgroundColor: '#4ADE80', alignItems: 'center', justifyContent: 'center' },
  aiCardConnect: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: '#4ADE80' },

  // Alternatives
  altSection:        { marginBottom: 36 },
  altHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, marginBottom: 20 },
  altViewAll:        { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: '#4ADE80' },
  altCard:           { width: 140, backgroundColor: SURFACE_LOW },
  altImgBox:         { width: 140, height: 140, position: 'relative', backgroundColor: SURFACE_HIGH },
  altImg:            { width: 140, height: 140 },
  altImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  altScoreBadge:     {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: BG, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  altScoreNum:  { fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  altName:      { fontSize: 10, fontWeight: '700', color: WHITE, letterSpacing: 0.5, lineHeight: 14, marginTop: 10, paddingHorizontal: 10 },
  altBrand:     { fontSize: 9, fontWeight: '500', color: ON_SURFACE_VAR, letterSpacing: 1, marginTop: 4, marginBottom: 12, paddingHorizontal: 10 },

  // Save
  saveWrap:     { paddingHorizontal: 28, marginBottom: 8 },
  saveBtn:      { width: '100%', backgroundColor: WHITE, height: 60, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:  { color: '#1a1c1c', fontSize: 10, fontWeight: '900', letterSpacing: 5 },
});

export default ResultsScreen;

