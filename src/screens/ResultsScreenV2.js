import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Animated, Dimensions, StatusBar,
  Image, ActivityIndicator, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { fetchAlternativesByCategory, updateProductImageInTurso, saveCuratedProduct } from '../services/tursoDB';
import { analyzeIngredients, getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { saveToHistory as saveToHistoryUtil } from '../utils/historyManager';
import ProductAIChat from '../components/ProductAIChat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { getIngredientInfo, getAdditiveInfo } from '../services/usdaAPI';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// Smart hero image:
// 1. Shows stored URL immediately
// 2. If URL is missing OR fails → calls OFF API once to get real URL
// 3. Shows real image + saves URL to Turso for next scan
const HeroImage = React.memo(({ imageUrl, barcode, imgStyle }) => {
  const [uri, setUri] = React.useState(imageUrl || null);
  const [failed, setFailed] = React.useState(false);
  const fetchAttempted = React.useRef(false);

  const attemptApiFetch = React.useCallback(async () => {
    if (fetchAttempted.current || !barcode) { setFailed(true); return; }
    fetchAttempted.current = true;
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=image_front_url`,
        { headers: { 'User-Agent': 'HealthyScan/1.0' }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) { setFailed(true); return; }
      const json = await res.json();
      const newUrl = json?.product?.image_front_url;
      if (newUrl) {
        setUri(newUrl);
        updateProductImageInTurso(barcode, newUrl).catch(() => {});
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  }, [barcode]);

  // If no initial URL, start fetching immediately
  React.useEffect(() => {
    if (!imageUrl) {
      attemptApiFetch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleError = React.useCallback(() => {
    attemptApiFetch();
  }, [attemptApiFetch]);

  if (failed) {
    return (
      <View style={[imgStyle, { backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="cube-outline" size={80} color={OUTLINE} />
      </View>
    );
  }
  if (!uri) {
    // Still loading the image URL from API
    return (
      <View style={[imgStyle, { backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={PRIMARY} />
      </View>
    );
  }
  return <Image source={{ uri }} style={imgStyle} resizeMode="cover" onError={handleError} />;
});

// Constructs the OFF CDN split-path URL from a barcode — no API call needed.
function buildCdnUrl(barcode) {
  if (!barcode) return null;
  const b = String(barcode).replace(/\D/g, '');
  if (b.length === 13)
    return `https://images.openfoodfacts.org/images/products/${b.slice(0,3)}/${b.slice(3,6)}/${b.slice(6,9)}/${b.slice(9)}/front_en.400.jpg`;
  return `https://images.openfoodfacts.org/images/products/${b}/front_en.400.jpg`;
}

// Alt-card image with automatic CDN fallback from barcode.
const AltImg = React.memo(({ uri, barcode, imgStyle, placeholderStyle }) => {
  const cdnUrl = buildCdnUrl(barcode);
  const [src, setSrc] = React.useState(uri || cdnUrl);

  if (!src) {
    return (
      <View style={[imgStyle, placeholderStyle]}>
        <Ionicons name="leaf-outline" size={28} color={OUTLINE} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={imgStyle}
      resizeMode="cover"
      onError={() => {
        // If stored URL failed, try CDN; if CDN also fails, show placeholder
        if (cdnUrl && src !== cdnUrl) setSrc(cdnUrl);
        else setSrc(null);
      }}
    />
  );
});

// ── Light Wellness Palette ──────────────────────────────────────────
const BG             = '#fafaf5';
const SURFACE        = 'rgba(250,250,245,0.92)';
const SURFACE_LOW    = '#ffffff';
const SURFACE_HIGH   = '#eeeee9';
const OUTLINE        = '#bfcaba';
const ON_SURFACE     = '#1a1c19';
const ON_SURFACE_VAR = '#40493d';
const WHITE          = '#ffffff';
const PRIMARY        = '#067A4F';
const ERROR_C        = '#ba1a1a';
const WARNING_C      = '#d97706';

// ── Gauge constants ─────────────────────────────────────────────────
const GAUGE_R    = 72;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// ── Helpers ─────────────────────────────────────────────────────────
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

const getRatingLabel = (sc) => {
  if (sc >= 85) return 'EXCELLENT HEALTH RATING';
  if (sc >= 70) return 'GOOD HEALTH RATING';
  if (sc >= 45) return 'MODERATE HEALTH RATING';
  if (sc >= 30) return 'POOR HEALTH RATING';
  return 'VERY POOR HEALTH RATING';
};

const getNutVal = (nutriments, primary, fallbacks) => {
  if (!nutriments) return null;
  if (nutriments[primary] != null) return nutriments[primary];
  for (const f of fallbacks) {
    if (nutriments[f] != null) return nutriments[f];
  }
  return null;
};

// ── Score Gauge ─────────────────────────────────────────────────────
const ScoreGauge = ({ score, scoreColor }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1100, useNativeDriver: false }).start();
  }, [score]);
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [GAUGE_CIRC, GAUGE_CIRC - (GAUGE_CIRC * score) / 100],
  });
  const SIZE = 190;
  const CX   = SIZE / 2;
  return (
    <View style={g.container}>
      {/* White circle background so gauge is readable over any image */}
      <View style={g.gaugeBg} />
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle cx={CX} cy={CX} r={GAUGE_R} stroke={SURFACE_HIGH} strokeWidth={9} fill="transparent" />
        <AnimatedSvgCircle
          cx={CX} cy={CX} r={GAUGE_R}
          stroke={scoreColor} strokeWidth={9}
          fill="transparent"
          strokeDasharray={GAUGE_CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={g.center}>
        <Text style={[g.scoreNum, { color: scoreColor }]}>{score}</Text>
        <Text style={g.scoreDenom}>/100</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ResultsScreenV2 = ({ route, navigation }) => {
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
  const [showAIChat, setShowAIChat]           = useState(false);
  const [isPremium, setIsPremium]             = useState(false);
  const [hasAIAccess, setHasAIAccess]         = useState(false);
  const [freeRecUsage, setFreeRecUsage]       = useState({ used: 0, remaining: 2, total: 2 });
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [showWhyScore, setShowWhyScore] = useState(false);
  const [fetchingIngredients, setFetchingIngredients] = useState(false);
  const [expandedIngredient, setExpandedIngredient] = useState(null);
  const [usdaCache, setUsdaCache]                   = useState({});
  const [usdaLoading, setUsdaLoading]               = useState(null);
  const [selectedAdditive, setSelectedAdditive]     = useState(null);
  const [additiveInfo, setAdditiveInfo]             = useState(null);
  const [additiveLoading, setAdditiveLoading]       = useState(false);
  const [realAlternatives, setRealAlternatives]       = useState([]);
  const [altsLoading, setAltsLoading]                 = useState(false);
  const [isInBest, setIsInBest]                       = useState(false);

  const BEST_KEY = '@vee_curated_products';

  // Check + save to Best
  useEffect(() => {
    if (!barcode) return;
    AsyncStorage.getItem(BEST_KEY).then(raw => {
      const list = raw ? JSON.parse(raw) : [];
      setIsInBest(list.some(p => p.barcode === String(barcode)));
    }).catch(() => {});
  }, [barcode]);

  const handleAddToBest = async () => {
    if (!product) return;
    try {
      const entry = {
        barcode: String(barcode),
        name: product.product_name || product.name || 'Unknown Product',
        brand: product.brands || product.brand || 'Unknown Brand',
        score,
        image: product.image_url || product.image || null,
        productType: 'food',
        ingredients: product.ingredients_text || '',
      };
      // Save to Turso DB — visible to ALL users instantly
      await saveCuratedProduct(entry);
      // Also save locally so the button stays green on this device
      const raw = await AsyncStorage.getItem(BEST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.some(p => p.barcode === entry.barcode)) {
        await AsyncStorage.setItem(BEST_KEY, JSON.stringify([entry, ...list]));
      }
      setIsInBest(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Saved to History!',
        `"${product.product_name || 'This product'}" is now visible in the Best section for every user of the app.`
      );
    } catch (e) { console.log('AddToBest error', e.message); }
  };

  const safeAreaInsets = useSafeAreaInsetsWithFallback();
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const shareAnim  = useRef(new Animated.Value(1)).current;

  // Bounce share button 5 times total, every 5 seconds, then stop
  useEffect(() => {
    let count = 0;
    const bounce = () => {
      Animated.sequence([
        Animated.spring(shareAnim, { toValue: 1.35, useNativeDriver: true, speed: 20, bounciness: 18 }),
        Animated.spring(shareAnim, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 8  }),
      ]).start();
    };
    bounce();
    count = 1;
    const interval = setInterval(() => {
      if (count >= 5) { clearInterval(interval); return; }
      bounce();
      count++;
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Data fetch ───────────────────────────────────────────────────
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Live-update callback — called by background USDA/OFF fetches when they complete.
      // Updates the screen in real-time without requiring a second scan.
      const handleLiveUpdate = (updates) => {
        if (updates._fetchingIngredients !== undefined) {
          setFetchingIngredients(updates._fetchingIngredients);
        }
        const productUpdates = { ...updates };
        delete productUpdates._fetchingIngredients;
        if (Object.keys(productUpdates).length > 0) {
          setProduct(prev => {
            if (!prev) return prev;
            return { ...prev, ...productUpdates };
          });
        }
        if (updates.ingredients_text) {
          setAnalysis(analyzeIngredients(updates.ingredients_text, 'food'));
        }
      };

      const result = await fetchProductByBarcode(barcode, handleLiveUpdate);
      if (!result || result.status === 0) {
        setError('Product not found');
        navigation.replace('ProductNotFound', { barcode });
        return;
      }
      const prod = result.product || result;
      const productType = getProductTypeFromCategories(prod.categories || '', prod.product_name || '', prod.source || '');
      if (productType !== 'food') {
        navigation.replace('CosmeticResults', { barcode, product: prod });
        return;
      }
      const analysisResult = analyzeIngredients(prod.ingredients_text || '', productType);
      setProduct(prod);
      setAnalysis(analysisResult);
      const healthScore = calculateHealthScore(prod, null, null);
      setEnhancedHealthScore(healthScore);
      saveToHistoryUtil({
        barcode: prod.code || prod._id || barcode,
        productName: prod.product_name || prod.productName || 'Unknown Product',
        productImage: prod.image_url || prod.image_front_url || null,
        productType: 'food',
        score: healthScore?.score || analysisResult?.score || 0,
        ingredients: prod.ingredients_text || '',
        source: prod.source || 'Open Food Facts',
      });
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
      const categoryKeywords = {
        'Cereal':    ['cereal', 'granola', 'oat'],
        'Beverage':  ['juice', 'drink', 'soda', 'water', 'tea', 'coffee'],
        'Dairy':     ['milk', 'yogurt', 'cheese', 'dairy'],
        'Bread':     ['bread', 'toast', 'baguette'],
        'Snack':     ['chip', 'crisp', 'snack', 'cracker'],
        'Sweet':     ['chocolate', 'candy', 'cookie', 'biscuit'],
        'Sauce':     ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing'],
        'Grain':     ['pasta', 'noodle', 'rice'],
      };
      const keywords = categoryKeywords[category] || [
        (productData.product_name || '').split(' ')[0].toLowerCase() || 'food',
      ];
      const primaryKeyword = keywords[0];

      // Fetch both keyword queries in parallel instead of sequential
      const [primary, secondary] = await Promise.all([
        fetchAlternativesByCategory(primaryKeyword, barcode, 20),
        keywords[1] ? fetchAlternativesByCategory(keywords[1], barcode, 20) : Promise.resolve([]),
      ]);
      const seen = new Set();
      const candidates = [];
      for (const p of [...primary, ...secondary]) {
        if (p.barcode && !seen.has(p.barcode)) { seen.add(p.barcode); candidates.push(p); }
      }
      if (candidates.length === 0) return;

      // Score with calculateHealthScore (same method used in detail view) and take top 5 healthy only
      const top5 = candidates
        .filter((p) => p.product_name && p.barcode)
        .map((p) => {
          const score = calculateHealthScore(p, null, null)?.score ?? 60;
          return {
            name:    p.product_name,
            brand:   p.brands || '',
            image:   p.image_url || null,
            barcode: p.barcode,
            score,
          };
        })
        .filter((p) => p.score >= 80)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (top5.length === 0) return;

      // Show cards — AltImg builds CDN image URLs from barcodes instantly, no API calls needed
      setRealAlternatives(top5);
    } catch (e) {
      console.log('⚠️ fetchRealAlternatives failed:', e.message);
    } finally {
      setAltsLoading(false);
    }
  }, [barcode]);

  useEffect(() => {
    if (devProduct && devAnalysis) {
      setProduct(devProduct);
      setAnalysis(devAnalysis);
      if (devHasAIAccess) { setIsPremium(true); setHasAIAccess(true); }
      const healthScore = calculateHealthScore(devProduct, null, null);
      setEnhancedHealthScore(healthScore);
      setLoading(false);
    } else if (skipFetch && preloadedData) {
      const stub = {
        product_name: preloadedData.product_name,
        brands: preloadedData.brands,
        image_url: preloadedData.image_url,
        ingredients_text: preloadedData.ingredients_text || '',
        nutriments: preloadedData.nutriments || {},
      };
      const stubAnalysis = analyzeIngredients(stub.ingredients_text, 'food');
      setProduct(stub);
      setAnalysis(stubAnalysis);
      setEnhancedHealthScore({ score: preloadedData.curatedScore });
      setLoading(false);
      checkSubscriptionStatus();
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

  const handleIngredientTap = async (ing) => {
    const key = (ing.name || '').toLowerCase().trim();
    if (expandedIngredient === key) { setExpandedIngredient(null); return; }
    setExpandedIngredient(key);
    if (usdaCache[key]) return;
    setUsdaLoading(key);
    try {
      const info = await getIngredientInfo(ing.name || key);
      setUsdaCache(prev => ({ ...prev, [key]: info }));
    } catch {
      setUsdaCache(prev => ({ ...prev, [key]: null }));
    } finally {
      setUsdaLoading(null);
    }
  };

  const handleAdditiveTap = async (code) => {
    if (selectedAdditive === code) { setSelectedAdditive(null); setAdditiveInfo(null); return; }
    setSelectedAdditive(code);
    setAdditiveInfo(null);
    setAdditiveLoading(true);
    try {
      const info = await getAdditiveInfo(code);
      setAdditiveInfo(info);
    } catch {
      setAdditiveInfo(null);
    } finally {
      setAdditiveLoading(false);
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[st.center, { paddingTop: safeAreaInsets.top }]}>
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

  // ── Derived data ─────────────────────────────────────────────────
  const score      = enhancedHealthScore ? enhancedHealthScore.score : Math.round(analysis?.score ?? 0);
  const scoreColor = getScoreColor(score);
  const verdict    = getVerdict(score);
  const nutriments = product.nutriments || {};
  const productName = product.product_name || product.name || 'Unknown Product';
  const brandName   = product.brands || '';

  const handleShare = async () => {
    try {
      const appLink = 'https://apps.apple.com/app/healthyscan/id6743047098';
      const productName = product.product_name || 'this product';
      const message = `I just scanned ${productName} on HealthyScan and it scored ${score}/100! 🔍\n\nDownload HealthyScan to check what's really in your food and beauty products:\n${appLink}`;
      await Share.share({ message, url: appLink });
    } catch (e) { /* ignore */ }
  };

  // Nutrition grid (up to 3x2)
  const nutGrid = [
    { label: 'Energy',   value: getNutVal(nutriments, 'energy-kcal_100g', ['energy-kcal', 'energy_kcal']), unit: 'kcal', dv: 2000, icon: 'flash-outline',   type: 'neutral'  },
    { label: 'Protein',  value: getNutVal(nutriments, 'proteins_100g', ['proteins']),                      unit: 'g',    dv: 50,   icon: 'barbell-outline', type: 'maximize' },
    { label: 'Fat',      value: getNutVal(nutriments, 'fat_100g', ['fat']),                                unit: 'g',    dv: 78,   icon: 'water-outline',   type: 'minimize' },
    { label: 'Sat. Fat', value: getNutVal(nutriments, 'saturated-fat_100g', ['saturated-fat', 'saturated_fat']), unit: 'g', dv: 20, icon: 'warning-outline', type: 'minimize' },
    { label: 'Sugar',    value: getNutVal(nutriments, 'sugars_100g', ['sugars']),                          unit: 'g',    dv: 50,   icon: 'cafe-outline',    type: 'minimize' },
    { label: 'Salt',     value: getNutVal(nutriments, 'salt_100g', ['salt']),                              unit: 'g',    dv: 6,    icon: 'snow-outline',    type: 'minimize' },
    { label: 'Fiber',    value: getNutVal(nutriments, 'fiber_100g', ['fiber', 'fibre']),                   unit: 'g',    dv: 28,   icon: 'leaf-outline',    type: 'maximize' },
    { label: 'Carbs',    value: getNutVal(nutriments, 'carbohydrates_100g', ['carbohydrates']),             unit: 'g',    dv: 300,  icon: 'grid-outline',    type: 'neutral'  },
  ].filter(r => r.value != null && r.value > 0);

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
    (i.status || '').toUpperCase() === 'MODERATE' ||
    (i.category || '').toLowerCase() === 'moderate'
  );
  const unknownIngs = analyzedList.filter(i =>
    (i.status || '').toUpperCase() === 'UNKNOWN' ||
    (i.category || '').toLowerCase() === 'unknown' ||
    (!(i.status) && !goodIngs.includes(i) && !badIngs.includes(i) && !moderateIngs.includes(i))
  );

  const allIngredients = [
    ...goodIngs.map(i => ({ ...i, _t: 'good' })),
    ...badIngs.map(i => ({ ...i, _t: 'bad' })),
    ...moderateIngs.map(i => ({ ...i, _t: 'moderate' })),
    ...unknownIngs.map(i => ({ ...i, _t: 'unknown' })),
  ];
  const displayed = allIngredients;

  const ingStyle = (_t) => {
    if (_t === 'good')     return { icon: 'leaf',    color: PRIMARY,   bg: 'rgba(6,122,79,0.08)',  tag: 'GOOD'     };
    if (_t === 'bad')      return { icon: 'close',   color: ERROR_C,   bg: 'rgba(186,26,26,0.08)',  tag: 'CONCERN'  };
    return                        { icon: 'ellipse', color: WARNING_C, bg: 'rgba(217,119,6,0.08)',  tag: 'MODERATE' };
  };

  // ── Ingredient icon — filled icons, never plain circles ──────
  const getIngIcon = (func, name) => {
    const n = (((func || '') + ' ' + (name || '')).toLowerCase());
    // Water / hydration
    if (n.includes('water') || n.includes('aqua') || n.includes('eau'))               return 'water';
    // Sugars & sweeteners (honeycomb / sweet)
    if (n.includes('sugar') || n.includes('sucre') || n.includes('glucose') ||
        n.includes('fructose') || n.includes('sucrose') || n.includes('dextrose') ||
        n.includes('maltose') || n.includes('syrup') || n.includes('sirop') ||
        n.includes('sweetener') || n.includes('miel') || n.includes('honey'))         return 'cafe';
    // Colors & dyes
    if (n.includes('color') || n.includes('colour') || n.includes('dye') ||
        n.includes('colorant') || n.includes('pigment') || n.includes('caramel color')) return 'color-palette';
    // Preservatives & antioxidants
    if (n.includes('preserv') || n.includes('sorbate') || n.includes('benzoate') ||
        n.includes('nitrate') || n.includes('nitrite') || n.includes('sulfite') ||
        n.includes('bht') || n.includes('bha') || n.includes('tbhq') ||
        n.includes('antioxidant') || n.includes('conservateur'))                       return 'shield-checkmark';
    // Acids & regulators
    if (n.includes('acid') || n.includes('acidity') || n.includes('citrate') ||
        n.includes('phosphat') || n.includes('carbonate') || n.includes('tartrate'))   return 'flask';
    // Flavors & aromas
    if (n.includes('flavor') || n.includes('flavour') || n.includes('aroma') ||
        n.includes('arôme') || n.includes('arome') || n.includes('spice') ||
        n.includes('vanilla') || n.includes('vanille'))                                return 'sparkles';
    // Emulsifiers & thickeners
    if (n.includes('emulsif') || n.includes('lecithin') || n.includes('stabiliz') ||
        n.includes('thicken') || n.includes('gum') || n.includes('pectin') ||
        n.includes('starch') || n.includes('amidon') || n.includes('cellulose'))       return 'layers';
    // Vitamins & minerals
    if (n.includes('vitamin') || n.includes('mineral') || n.includes('zinc') ||
        n.includes('calcium') || n.includes('magnesium') || n.includes('niacin') ||
        n.includes('riboflavin') || n.includes('thiamin') || n.includes('iron'))       return 'medical';
    // Oils & fats
    if (n.includes('fat') || n.includes('oil') || n.includes('butter') ||
        n.includes('beurre') || n.includes('palm') || n.includes('coconut') ||
        n.includes('canola') || n.includes('sunflower') || n.includes('olive') ||
        n.includes('huile') || n.includes('graisse') || n.includes('lipid'))           return 'drop';
    // Salt & minerals
    if (n.includes('salt') || n.includes('sodium') || n.includes('potassium') ||
        n.includes('chloride') || n.includes('sel'))                                   return 'analytics';
    // Protein / fitness
    if (n.includes('protein') || n.includes('whey') || n.includes('casein') ||
        n.includes('gluten') || n.includes('soy') || n.includes('soja'))               return 'barbell';
    // Dairy & eggs
    if (n.includes('milk') || n.includes('cream') || n.includes('dairy') ||
        n.includes('cheese') || n.includes('yogurt') || n.includes('lait') ||
        n.includes('crème') || n.includes('fromage') || n.includes('yaourt') ||
        n.includes('oeuf') || n.includes('egg'))                                       return 'egg';
    // Alcohol
    if (n.includes('alcohol') || n.includes('ethanol'))                                return 'wine';
    // Coffee & cocoa
    if (n.includes('coffee') || n.includes('cocoa') || n.includes('chocolate') ||
        n.includes('cacao') || n.includes('chocolat'))                                 return 'cafe';
    // Grains & flour
    if (n.includes('grain') || n.includes('wheat') || n.includes('flour') ||
        n.includes('rice') || n.includes('corn') || n.includes('oat') ||
        n.includes('farine') || n.includes('blé') || n.includes('riz') ||
        n.includes('céréale') || n.includes('avoine'))                                 return 'grid';
    // Fruits & berries
    if (n.includes('fruit') || n.includes('berry') || n.includes('citrus') ||
        n.includes('lemon') || n.includes('orange') || n.includes('cherry') ||
        n.includes('citron') || n.includes('pomme') || n.includes('fraise'))           return 'nutrition';
    // Caffeine & stimulants
    if (n.includes('caffeine') || n.includes('taurine') || n.includes('guarana'))      return 'flash';
    // Herbs, botanicals, natural & organic
    if (n.includes('herb') || n.includes('plant') || n.includes('organic') ||
        n.includes('natural') || n.includes('botanical') || n.includes('extract') ||
        n.includes('fleur') || n.includes('flower'))                                   return 'leaf';
    // Default — nutrition apple, much better than a circle
    return 'nutrition';
  };

  const ingCard = (ing) => {
    const t = ing._t;
    const color = t === 'good' ? '#067A4F' : t === 'bad' ? '#ef4444' : t === 'moderate' ? '#eab308' : '#9ca3af';
    const bg    = t === 'good' ? '#dcfce7' : t === 'bad' ? '#fee2e2' : t === 'moderate' ? '#fef9c3' : '#f3f4f6';
    const tag   = t === 'good' ? 'GOOD'   : t === 'bad' ? 'AVOID'   : t === 'moderate' ? 'MODERATE' : '?';
    const icon     = getIngIcon(ing.function, ing.name);
    const func     = ing.function && ing.function !== 'unknown' ? ing.function : '';
    const desc     = func ? func.charAt(0).toUpperCase() + func.slice(1) : '';
    return { color, bg, tag, icon, desc };
  };

  const verdictDesc =
    score >= 70 ? 'This product has a healthy nutritional profile with beneficial ingredients.'
    : score >= 40 ? 'This product is moderately healthy. Some ingredients may need attention.'
    : 'This product contains ingredients that may negatively impact your health.';

  // ── Alternatives ─────────────────────────────────────────────
  const altsData = realAlternatives;

  // ═════════════════════════════════════════════════════════════════
  // RENDER — Dark Brutalism
  // ═════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── FIXED HEADER ─────────────────────────────────────────── */}
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
          <Animated.View style={{ transform: [{ scale: shareAnim }] }}>
            <TouchableOpacity onPress={handleShare} style={st.iconBtn}>
              <Ionicons name="share-outline" size={22} color={ON_SURFACE_VAR} />
            </TouchableOpacity>
          </Animated.View>
          <View style={st.avatarCircle}>
            <Ionicons name="person" size={14} color={PRIMARY} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: safeAreaInsets.top + 56, paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── HERO: Product Image with centered Gauge ───────────── */}
          <View style={st.heroContainer}>
            <HeroImage
              imageUrl={product.image_url}
              barcode={product.barcode || product.code || barcode}
              imgStyle={st.heroImage}
            />
            {/* Light scrim to make gauge readable */}
            <View style={st.heroScrim} />
            {/* Gauge centered in hero */}
            <View style={st.gaugeCenterWrap}>
              <ScoreGauge score={score} scoreColor={scoreColor} />
            </View>
          </View>

          {/* ── PRODUCT SUMMARY ──────────────────────────────────── */}
          <View style={st.summarySection}>
            <Text style={[st.ratingLabel, { color: scoreColor }]}>{getRatingLabel(score)}</Text>
            <Text style={st.productNameText} numberOfLines={2}>{productName}</Text>

            {/* Save to History button */}
            <TouchableOpacity
              style={[st.saveToBestBtn, isInBest && { backgroundColor: '#2d6a4f' }]}
              onPress={handleAddToBest}
              activeOpacity={0.8}
            >
              <Ionicons name={isInBest ? 'bookmark' : 'bookmark-outline'} size={18} color="#fff" />
              <Text style={st.saveToBestTxt}>
                {isInBest ? '✓ Saved to History' : 'Save to History'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── WHY THIS SCORE toggle ────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity
              style={st.whyBtn}
              onPress={() => setShowWhyScore(prev => !prev)}
            >
              <Text style={st.whyBtnText}>
                {showWhyScore ? 'Hide breakdown' : 'Why this score?'}
              </Text>
              <Ionicons
                name={showWhyScore ? 'chevron-up' : 'chevron-down'}
                size={14} color={PRIMARY} style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>

          {/* ── WHY THIS SCORE BREAKDOWN ──────────────────────────── */}
          {showWhyScore && enhancedHealthScore && (
            <View style={st.whySection}>
              {/* Score component bars */}
              {enhancedHealthScore.breakdown && (
                <View style={st.whyBarsWrap}>
                  {[
                    { label: 'NUTRITION',   value: enhancedHealthScore.breakdown.nutritionScore,   weight: '55%' },
                    { label: 'INGREDIENTS', value: enhancedHealthScore.breakdown.ingredientScore,  weight: '30%' },
                    { label: 'PROCESSING',  value: enhancedHealthScore.breakdown.processingScore,  weight: '10%' },
                    { label: 'BONUS',       value: enhancedHealthScore.breakdown.positiveBonus,    weight: '5%'  },
                  ].map((row) => {
                    const barColor = row.value >= 70 ? PRIMARY : row.value >= 40 ? WARNING_C : ERROR_C;
                    return (
                      <View key={row.label} style={st.whyBarRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={st.whyBarLabel}>{row.label}</Text>
                          <Text style={[st.whyBarLabel, { color: barColor }]}>{Math.round(row.value ?? 0)}/100 · {row.weight}</Text>
                        </View>
                        <View style={st.whyBarTrack}>
                          <View style={[st.whyBarFill, { width: `${Math.round(row.value ?? 0)}%`, backgroundColor: barColor }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {/* Reason pills */}
              {(enhancedHealthScore.scoreReasons || []).length > 0 && (
                <View style={st.whyReasonsList}>
                  {enhancedHealthScore.scoreReasons.slice(0, 8).map((r, idx) => {
                    const isPenalty = r.type === 'penalty' || (r.impact && r.impact < 0);
                    const isBonus   = r.type === 'bonus'   || (r.impact && r.impact > 0);
                    const pillColor = isPenalty ? ERROR_C : isBonus ? PRIMARY : WARNING_C;
                    const pillBg    = isPenalty ? 'rgba(186,26,26,0.08)' : isBonus ? 'rgba(6,122,79,0.08)' : 'rgba(217,119,6,0.08)';
                    const pillIcon  = isPenalty ? 'remove-circle-outline' : isBonus ? 'checkmark-circle-outline' : 'information-circle-outline';
                    const impactStr = r.impact != null
                      ? (r.impact > 0 ? `+${r.impact}` : String(r.impact === 'cap' ? '⚠ cap' : r.impact))
                      : '';
                    return (
                      <View key={idx} style={[st.whyPill, { backgroundColor: pillBg, borderColor: pillColor + '40' }]}>
                        <Ionicons name={pillIcon} size={13} color={pillColor} style={{ marginRight: 6 }} />
                        <Text style={[st.whyPillText, { color: ON_SURFACE_VAR }]}>{r.text}</Text>
                        {impactStr ? (
                          <Text style={[st.whyPillImpact, { color: pillColor }]}>{impactStr}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
              {enhancedHealthScore.breakdown?.cappedByHarmfulIngredients && (
                <View style={[st.whyPill, { backgroundColor: 'rgba(186,26,26,0.08)', borderColor: ERROR_C, marginTop: 4 }]}>
                  <Ionicons name="warning-outline" size={13} color={ERROR_C} style={{ marginRight: 6 }} />
                  <Text style={[st.whyPillText, { color: ERROR_C }]}>Score capped at 49 — harmful ingredient detected</Text>
                </View>
              )}
            </View>
          )}

          {/* ── VERDICT BADGE — hidden, merged into summarySection above ── */}

          {/* ── NUTRITION BENTO GRID ──────────────────────────────── */}
          {nutGrid.length === 0 && (
            <View style={st.noNutBox}>
              <Ionicons name="information-circle-outline" size={18} color={OUTLINE} />
              <Text style={st.noNutText}>No nutrition data available for this product</Text>
            </View>
          )}
          {nutGrid.length > 0 && (
            <View style={st.nutSection}>
              <View style={st.sectionHeader}>
                <Text style={st.sectionTitle}>Nutritional Profile</Text>
                <Text style={st.viewLabels}>VIEW LABELS</Text>
              </View>
              <View style={st.bentoGrid}>
                {(() => {
                  const rows = [];
                  for (let i = 0; i < nutGrid.length; i += 2) rows.push(nutGrid.slice(i, i + 2));
                  return rows.map((pair, rowIdx) => (
                    <View key={rowIdx} style={[st.bentoRow, rowIdx > 0 && { marginTop: 12 }]}>
                      {pair.map((item, colIdx) => {
                        const frac = Math.min(item.value / item.dv, 1);
                        const pct  = Math.round(frac * 100);
                        const isHighRisk = (item.label === 'Sugar' && item.value > 12) || (item.label === 'Sat. Fat' && item.value > 5) || (item.label === 'Salt' && item.value > 1.5);
                        let rating, ratingColor, ratingBg;
                        if (isHighRisk || (item.type === 'minimize' && pct > 30)) {
                          rating = 'HIGH';     ratingColor = '#ef4444'; ratingBg = '#fee2e2';
                        } else if (item.type === 'minimize') {
                          if (pct > 10) { rating = 'OK';   ratingColor = '#eab308'; ratingBg = '#fef9c3'; }
                          else          { rating = 'LOW';  ratingColor = '#067A4F'; ratingBg = '#dcfce7'; }
                        } else if (item.type === 'maximize') {
                          if (pct >= 30) { rating = 'GOOD';    ratingColor = '#067A4F'; ratingBg = '#dcfce7'; }
                          else if (pct >= 10) { rating = 'AVERAGE'; ratingColor = '#eab308'; ratingBg = '#fef9c3'; }
                          else           { rating = 'LOW';     ratingColor = '#eab308'; ratingBg = '#fef9c3'; }
                        } else {
                          rating = 'GOOD'; ratingColor = '#067A4F'; ratingBg = '#dcfce7';
                        }
                        return (
                          <View key={colIdx} style={[st.bentoCell, colIdx === 1 && { marginLeft: 12 }]}>
                            {/* Icon (top-left) + Badge (top-right) */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <Ionicons name={item.icon} size={22} color={ratingColor} />
                              <View style={[st.bentoCellBadge, { backgroundColor: ratingBg }]}>
                                <Text style={[st.bentoCellBadgeText, { color: ratingColor }]}>{rating}</Text>
                              </View>
                            </View>
                            {/* Nutrient name */}
                            <Text style={st.bentoCellLabel} numberOfLines={1}>{item.label}</Text>
                            {/* Progress bar + value in one row */}
                            <View style={st.bentoBarRow}>
                              <View style={st.bentoBar}>
                                <View style={[st.bentoBarFill, { width: `${pct}%`, backgroundColor: ratingColor }]} />
                              </View>
                              <Text style={[st.bentoCellValue, { color: rating === 'HIGH' ? ERROR_C : ON_SURFACE_VAR }]} numberOfLines={1}>
                                {item.value % 1 === 0 ? item.value : item.value.toFixed(1)}{item.unit === 'kcal' ? ' kcal' : item.unit}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                      {pair.length === 1 && <View style={{ flex: 1, marginLeft: 12 }} />}
                    </View>
                  ));
                })()}
              </View>
            </View>
          )}

          {/* ── FETCHING INGREDIENTS HINT ────────────────────────── */}
          {fetchingIngredients && displayed.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingBottom: 20 }}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={{ fontSize: 11, color: ON_SURFACE_VAR, letterSpacing: 1, fontWeight: '600' }}>Fetching ingredients...</Text>
            </View>
          )}

          {/* ── INGREDIENT BREAKDOWN ──────────────────────────────── */}
          {displayed.length > 0 && (
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Text style={st.sectionTitle}>Ingredient Breakdown</Text>
                <View style={st.ingCountBadge}>
                  <Text style={st.ingCountText}>{displayed.length} ITEMS</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {displayed.map((ing, idx) => {
                  const s = ingCard(ing);
                  const desc = ing.notes || ing.reason || s.desc || null;
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
                      <View style={[st.ingCard, { marginBottom: 0 }, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}>
                        <View style={[st.ingSquare, { backgroundColor: s.bg }]}>
                          <Ionicons name={s.icon} size={20} color={s.color} />
                        </View>
                        <View style={st.ingCardMeta}>
                          <Text style={st.ingCardName} numberOfLines={1}>{ing.name || 'Unknown'}</Text>
                          {desc ? <Text style={st.ingCardDesc} numberOfLines={1}>{desc}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[st.ingBadge, { backgroundColor: s.bg, borderColor: s.color + '44' }]}>
                            <Text style={[st.ingBadgeText, { color: s.color }]}>{s.tag}</Text>
                          </View>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="#8a9e87" />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={st.ingDetailPanel}>
                          {isLoadingThis ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <ActivityIndicator size="small" color="#067A4F" />
                              <Text style={st.ingDetailLabel}>Looking up database...</Text>
                            </View>
                          ) : usdaInfo ? (
                            <>
                              {/* Verdict badge */}
                              {usdaInfo.healthVerdict && (() => {
                                const vMap = {
                                  good:     { bg: 'rgba(6,122,79,0.12)',  text: '#067A4F', label: 'Generally Safe' },
                                  moderate: { bg: 'rgba(217,119,6,0.12)',  text: '#d97706', label: 'Moderate' },
                                  concern:  { bg: 'rgba(217,119,6,0.18)',  text: '#b45309', label: 'Use With Caution' },
                                  avoid:    { bg: 'rgba(186,26,26,0.12)',  text: '#ba1a1a', label: 'Avoid' },
                                };
                                const vc = vMap[usdaInfo.healthVerdict] || vMap.moderate;
                                return (
                                  <View style={[st.ingVerdictBadge, { backgroundColor: vc.bg }]}>
                                    <Text style={[st.ingVerdictText, { color: vc.text }]}>{vc.label}</Text>
                                  </View>
                                );
                              })()}

                              {/* What is it */}
                              <View style={st.ingDetailRow}>
                                <Ionicons name="information-circle-outline" size={16} color="#067A4F" />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.ingDetailLabel}>What is it?</Text>
                                  <Text style={st.ingDetailText}>{usdaInfo.whatItIs}</Text>
                                </View>
                              </View>

                              {/* What does it do */}
                              <View style={[st.ingDetailRow, { marginTop: 10 }]}>
                                <Ionicons name="flash-outline" size={16} color="#067A4F" />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.ingDetailLabel}>What does it do?</Text>
                                  <Text style={st.ingDetailText}>{usdaInfo.whatItDoes}</Text>
                                </View>
                              </View>

                              {/* WHO / JECFA */}
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
              </View>
            </View>
          )}

          {/* ── RAW INGREDIENTS FALLBACK (when analyzer has no data) ── */}
          {displayed.length === 0 && product.ingredients_text && product.ingredients_text.length > 5 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>INGREDIENTS</Text>
              <View style={[st.ingCard, { paddingVertical: 16 }]}>
                <Text style={{ fontSize: 12, color: ON_SURFACE_VAR, lineHeight: 20 }}>
                  {product.ingredients_text}
                </Text>
              </View>
            </View>
          )}

          {/* ── ADDITIVES ─────────────────────────────────────────── */}
          {(() => {
            const additiveTags = product.additives_tags || [];
            const formatted = additiveTags
              .map(t => {
                const m = t.match(/e(\d{3,4}[a-z]?)/i);
                return m ? `E${m[1].toUpperCase()}` : t.replace(/^en:/i, '').toUpperCase();
              })
              .filter(Boolean);
            if (formatted.length === 0) return null;
            return (
              <View style={[st.section, { paddingTop: 0 }]}>
                <Text style={st.sectionTitle}>ADDITIVES ({formatted.length})</Text>
                <Text style={{ fontSize: 11, color: ON_SURFACE_VAR, marginBottom: 10, marginTop: 2 }}>Tap any code to learn more</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {formatted.map((code, idx) => {
                    const isActive = selectedAdditive === code;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleAdditiveTap(code)}
                        activeOpacity={0.7}
                        style={[st.additivePill, isActive && st.additivePillActive]}
                      >
                        <Text style={[st.additivePillText, isActive && st.additivePillTextActive]}>{code}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Additive info panel */}
                {selectedAdditive && (
                  <View style={st.additivePanel}>
                    {additiveLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#067A4F" />
                        <Text style={st.ingDetailLabel}>Looking up {selectedAdditive}...</Text>
                      </View>
                    ) : additiveInfo ? (
                      <>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <View style={st.additivePanelCode}>
                            <Text style={st.additivePanelCodeText}>{additiveInfo.code}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1c19' }}>{additiveInfo.name}</Text>
                            <Text style={{ fontSize: 11, color: '#8a9e87', marginTop: 1 }}>{additiveInfo.category}</Text>
                          </View>
                          {/* Verdict badge */}
                          {(() => {
                            const vMap = {
                              good:     { bg: 'rgba(6,122,79,0.12)',  text: '#067A4F', label: 'Safe' },
                              moderate: { bg: 'rgba(217,119,6,0.12)',  text: '#d97706', label: 'Moderate' },
                              concern:  { bg: 'rgba(217,119,6,0.18)',  text: '#b45309', label: 'Caution' },
                              avoid:    { bg: 'rgba(186,26,26,0.12)',  text: '#ba1a1a', label: 'Avoid' },
                            };
                            const vc = vMap[additiveInfo.healthVerdict] || vMap.moderate;
                            return (
                              <View style={[st.ingVerdictBadge, { backgroundColor: vc.bg, marginBottom: 0 }]}>
                                <Text style={[st.ingVerdictText, { color: vc.text }]}>{vc.label}</Text>
                              </View>
                            );
                          })()}
                        </View>

                        <View style={st.ingDetailRow}>
                          <Ionicons name="information-circle-outline" size={16} color="#067A4F" />
                          <View style={{ flex: 1 }}>
                            <Text style={st.ingDetailLabel}>What is it?</Text>
                            <Text style={st.ingDetailText}>{additiveInfo.whatItIs}</Text>
                          </View>
                        </View>

                        <View style={[st.ingDetailRow, { marginTop: 10 }]}>
                          <Ionicons name="flash-outline" size={16} color="#067A4F" />
                          <View style={{ flex: 1 }}>
                            <Text style={st.ingDetailLabel}>What does it do?</Text>
                            <Text style={st.ingDetailText}>{additiveInfo.whatItDoes}</Text>
                          </View>
                        </View>

                        <View style={[st.ingDetailRow, { marginTop: 10 }]}>
                          <Ionicons name="globe-outline" size={16} color="#1565c0" />
                          <View style={{ flex: 1 }}>
                            <Text style={[st.ingDetailLabel, { color: '#1565c0' }]}>WHO / JECFA</Text>
                            <Text style={st.ingDetailText}>{additiveInfo.whoSays}</Text>
                          </View>
                        </View>

                        <Text style={st.ingDetailSource}>Source: {additiveInfo.source}</Text>
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })()}

          {/* ── BETTER ALTERNATIVES ───────────────────────────────── */}
          <View style={st.altSection}>
            <View style={st.altHeader}>
              <Text style={st.sectionTitle}>Better Alternatives</Text>
              <TouchableOpacity>
                <Text style={st.altViewAll}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>
            {altsLoading && realAlternatives.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ color: ON_SURFACE_VAR, fontSize: 11, marginTop: 10 }}>Finding alternatives...</Text>
              </View>
            ) : altsData.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <Text style={{ color: ON_SURFACE_VAR, fontSize: 13 }}>No healthy alternatives found (80+)</Text>
              </View>
            ) : (
              <FlatList
                data={altsData}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                renderItem={({ item }) => {
                  const altScoreColor = getScoreColor(item.score);
                  return (
                    <TouchableOpacity
                      style={st.altCard}
                      activeOpacity={item.barcode ? 0.88 : 1}
                      onPress={() => {
                        if (item.barcode) {
                          navigation.push('ResultsV2', { barcode: item.barcode });
                        }
                      }}
                    >
                      {/* Square image inside card with score badge */}
                      <View style={st.altImgBox}>
                        <AltImg uri={item.image} barcode={item.barcode} imgStyle={st.altImg} placeholderStyle={st.altImgPlaceholder} />
                        <View style={[st.altScorePill, { backgroundColor: altScoreColor }]}>
                          <Text style={st.altScorePillText}>{item.score}/100</Text>
                        </View>
                      </View>
                      {/* Info */}
                      <Text style={st.altName} numberOfLines={1}>{item.name || ''}</Text>
                      <Text style={st.altBrand} numberOfLines={1}>{item.brand || ''}</Text>
                      {item.barcode ? (
                        <View style={st.altViewBtn}>
                          <Text style={st.altViewBtnText}>VIEW ITEM</Text>
                        </View>
                      ) : (
                        <View style={[st.altViewBtn, { opacity: 0.4 }]}>
                          <Text style={st.altViewBtnText}>SUGGESTION</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* ── AURA AI CARD ──────────────────────────────────────── */}
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
                <Ionicons name="sparkles" size={22} color={PRIMARY} />
              </View>
              {/* Text */}
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.aiCardLabel}>AURA ASSISTANT</Text>
                <Text style={st.aiCardSub}>Ask about these{`\n`}ingredients</Text>
              </View>
              {/* Connect */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={st.aiCardConnect}>ASK</Text>
                <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── SAVE TO HISTORY ──────────────────────────────────── */}
          <View style={st.saveWrap}>
            <TouchableOpacity
              style={st.saveBtn}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                saveToHistoryUtil({
                  barcode: product.code || product._id || barcode,
                  productName: product.product_name || product.productName || 'Unknown Product',
                  productImage: product.image_url || product.image_front_url || null,
                  productType: 'food',
                  score,
                  ingredients: product.ingredients_text || '',
                  source: product.source || 'Open Food Facts',
                });
              }}
            >
              <Text style={st.saveBtnText}>Save to History</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── AI Chat overlay ──────────────────────────────────────── */}
      {showAIChat && product && (
        <ProductAIChat
          product={product}
          analysis={analysis}
          ingredients={(product.ingredients_text || '').split(',').map(s => s.trim()).filter(Boolean)}
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// GAUGE STYLES
// ═══════════════════════════════════════════════════════════════════
const g = StyleSheet.create({
  container: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  gaugeBg: {
    position: 'absolute',
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  center:      { position: 'absolute', alignItems: 'center' },
  scoreNum:    { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 56 },
  scoreDenom:  { fontSize: 16, fontWeight: '500', color: ON_SURFACE_VAR, marginTop: -2 },
});

// ═══════════════════════════════════════════════════════════════════
// MAIN STYLES — Light Wellness
// ═══════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  // Loading / Error
  center:        { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  loadText:      { fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, fontWeight: '500' },
  goBackBtn:     { marginTop: 24, borderRadius: 12, borderWidth: 1, borderColor: OUTLINE, paddingVertical: 12, paddingHorizontal: 32 },
  goBackBtnText: { color: ON_SURFACE, fontSize: 14, fontWeight: '600' },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: SURFACE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: ON_SURFACE },
  iconBtn:      { padding: 8 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(6,122,79,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero with centered gauge
  heroContainer:  { width: '100%', height: 280, position: 'relative', backgroundColor: SURFACE_HIGH },
  heroImage:      { width: '100%', height: '100%' },
  heroScrim:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(250,250,245,0.18)' },
  gaugeCenterWrap:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  // Product summary (below hero)
  summarySection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  saveToBestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#067A4F', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20, marginTop: 14,
  },
  saveToBestTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ratingLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  productNameText:{ fontSize: 20, fontWeight: '700', color: ON_SURFACE, lineHeight: 26, marginBottom: 4 },
  brandLabel:     { fontSize: 13, fontWeight: '400', color: ON_SURFACE_VAR, marginBottom: 8 },
  verdictDesc:    { fontSize: 13, color: ON_SURFACE_VAR, lineHeight: 20, marginBottom: 4 },

  // Why this score
  whyBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(6,122,79,0.25)',
    backgroundColor: 'rgba(6,122,79,0.06)',
    marginBottom: 4,
  },
  whyBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY, flex: 1 },
  verdictBadge:     { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  verdictBadgeText: { fontSize: 12, fontWeight: '600' },

  // WHY THIS SCORE expandable
  whySection: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: SURFACE_LOW, borderRadius: 16,
    borderWidth: 1, borderColor: OUTLINE,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  whyBarsWrap:    { marginBottom: 16 },
  whyBarRow:      { marginBottom: 12 },
  whyBarLabel:    { fontSize: 11, fontWeight: '600', color: ON_SURFACE_VAR, marginBottom: 4 },
  whyBarTrack:    { height: 6, backgroundColor: SURFACE_HIGH, borderRadius: 3, overflow: 'hidden' },
  whyBarFill:     { height: 6, borderRadius: 3 },
  whyReasonsList: { gap: 6 },
  whyPill: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  whyPillText:   { flex: 1, fontSize: 13, lineHeight: 18, color: ON_SURFACE_VAR },
  whyPillImpact: { fontSize: 12, fontWeight: '700', marginLeft: 8 },

  // Nutrition section
  nutSection:  { paddingHorizontal: 20, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  viewLabels:    { fontSize: 11, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5 },

  noNutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1, borderColor: OUTLINE,
    borderRadius: 12, backgroundColor: SURFACE_LOW,
  },
  noNutText: { fontSize: 13, color: ON_SURFACE_VAR, flex: 1 },
  bentoGrid:         { marginBottom: 20 },
  bentoRow:          { flexDirection: 'row' },
  bentoCell:         {
    flex: 1, backgroundColor: '#F2F2F2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(191,202,186,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  bentoCellBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  bentoCellBadgeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  bentoCellLabel:    { fontSize: 14, fontWeight: '600', color: ON_SURFACE, marginBottom: 8 },
  bentoBarRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bentoBar:          { flex: 1, height: 4, backgroundColor: SURFACE_HIGH, borderRadius: 2, overflow: 'hidden' },
  bentoBarFill:      { height: 4, borderRadius: 2 },
  bentoCellValue:    { fontSize: 14, fontWeight: '700', flexShrink: 0 },

  // Ingredients
  section:      { paddingHorizontal: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ON_SURFACE, marginBottom: 0 },

  ingCountBadge: { backgroundColor: 'rgba(6,122,79,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ingCountText:  { fontSize: 11, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5 },

  // Ingredient — each row is its own white card
  ingCard:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE_LOW, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(191,202,186,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 8,
  },
  ingSquare:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingCardName:   { fontSize: 14, fontWeight: '600', color: ON_SURFACE, marginBottom: 2 },
  ingCardDesc:   { fontSize: 12, color: ON_SURFACE_VAR, lineHeight: 16 },
  ingBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, flexShrink: 0 },
  ingBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  ingRiskRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, marginLeft: 54, paddingLeft: 10, borderLeftWidth: 2 },
  ingRiskText:   { fontSize: 11, lineHeight: 16, flex: 1 },

  // Ingredient detail panel (shown on tap)
  ingDetailPanel: {
    backgroundColor: '#f0f5f0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(6,122,79,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  ingVerdictBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginBottom: 12 },
  ingVerdictText:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  ingDetailRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ingDetailLabel:  { fontSize: 11, fontWeight: '700', color: '#067A4F', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  ingDetailText:   { fontSize: 13, color: '#1a1c19', lineHeight: 19 },
  ingDetailSource: { fontSize: 10, color: '#6b7c69', marginTop: 10, textAlign: 'right', fontStyle: 'italic' },

  // Additives pills
  additivePill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(217,119,6,0.08)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)' },
  additivePillText:     { fontSize: 11, fontWeight: '600', color: WARNING_C },
  additivePillActive:   { backgroundColor: WARNING_C, borderColor: WARNING_C },
  additivePillTextActive: { color: '#fff' },

  additivePanel: {
    marginTop: 14,
    backgroundColor: '#fff8f0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.2)',
    padding: 16,
  },
  additivePanelCode: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(217,119,6,0.12)', alignItems: 'center', justifyContent: 'center' },
  additivePanelCodeText: { fontSize: 11, fontWeight: '800', color: WARNING_C },

  showMore:     { marginTop: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', alignItems: 'center' },
  showMoreText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  // AI card
  aiCardWrap: { paddingHorizontal: 20, marginBottom: 16 },
  aiCard: {
    backgroundColor: SURFACE_LOW, borderWidth: 1, borderColor: OUTLINE,
    borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  aiCardLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 4 },
  aiCardSub:     { fontSize: 15, fontWeight: '500', color: ON_SURFACE, lineHeight: 21 },
  aiCardIcon:    { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(6,122,79,0.1)', alignItems: 'center', justifyContent: 'center' },
  aiCardConnect: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: PRIMARY },

  // Alternatives
  altSection:        { marginBottom: 32 },
  altHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14, marginTop: 8 },
  altViewAll:        { fontSize: 11, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5 },
  altCard:           {
    width: 170, backgroundColor: SURFACE_LOW, borderRadius: 20, padding: 8,
    borderWidth: 1, borderColor: 'rgba(191,202,186,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  altImgBox:         { width: 154, height: 154, position: 'relative', backgroundColor: SURFACE_HIGH, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  altImg:            { width: 154, height: 154 },
  altImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  altScorePill:      { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  altScorePillText:  { fontSize: 10, fontWeight: '800', color: WHITE },
  altInfo:           { paddingHorizontal: 4 },
  altName:           { fontSize: 13, fontWeight: '700', color: ON_SURFACE, lineHeight: 17, marginBottom: 2, paddingHorizontal: 4 },
  altBrand:          { fontSize: 11, fontWeight: '400', color: ON_SURFACE_VAR, marginBottom: 8, paddingHorizontal: 4 },
  altViewBtn:        { backgroundColor: SURFACE_HIGH, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  altViewBtnText:    { fontSize: 11, fontWeight: '700', color: ON_SURFACE, letterSpacing: 0.4 },

  // Save
  saveWrap:     { paddingHorizontal: 20, marginBottom: 8 },
  saveBtn:      { width: '100%', backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:  { color: WHITE, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});

export default ResultsScreenV2;
