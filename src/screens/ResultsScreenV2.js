import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Animated, Easing, Dimensions, StatusBar,
  Image, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { fetchAlternativesByCategory, updateProductImageInTurso, saveCuratedProduct } from '../services/tursoDB';
import { analyzeIngredients, getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { saveToHistory as saveToHistoryUtil } from '../utils/historyManager';
import { checkAndConsume } from '../utils/scanQuota';
import { isProductSaved, toggleSavedProduct } from '../utils/curatedProducts';
import ProductAIChat from '../components/ProductAIChat';
import ShareScoreSheet from '../components/ShareScoreSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { getIngredientInfo, getAdditiveInfo } from '../services/usdaAPI';
import { AI_CHAT_ENABLED } from '../config/featureFlags';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// Wraps a touchable in a spring scale-down (0.98) for tap feedback.
const TapScale = ({ children, style, onPress, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <TouchableOpacity activeOpacity={0.85} onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

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

// ── ScanGreen Palette ────────────────────────────────────────────────
const BG             = '#FFFFFF';
const SURFACE_LOW    = '#FFFFFF';
const SURFACE_HIGH   = '#F5F5F1';
const OUTLINE        = '#D9D9D4';
const ON_SURFACE     = '#171717';
const ON_SURFACE_VAR = '#737373';
const WHITE          = '#FFFFFF';
const PRIMARY        = '#27a567';
const ERROR_C        = '#e74c3c';
const WARNING_C      = '#f5a623';
const NEUTRAL_100    = '#f5f5f5';
const NEUTRAL_300    = '#d4d4d4';
const NEUTRAL_400    = '#a3a3a3';
const NEUTRAL_600    = '#525252';
const NEUTRAL_800    = '#262626';
const TRACK_BG       = '#f1f1f1';
const AMBER_600      = '#d97706';
const PRIMARY_TINT   = 'rgba(39,165,103,0.08)';
const AMBER_TINT     = 'rgba(245,166,35,0.10)';
const RED_TINT       = 'rgba(231,76,60,0.10)';

// Ingredient "function" values that read as additives (preservatives, dyes,
// emulsifiers, etc.) rather than natural/beneficial food ingredients.
const ADDITIVE_FUNCTIONS = new Set([
  'preservative', 'surfactant', 'fragrance', 'colorant', 'emulsifier',
  'silicone', 'ph_adjuster', 'chelating', 'thickener', 'stabilizer',
]);

// ── Gauge constants ─────────────────────────────────────────────────
const GAUGE_R    = 52;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// ── Helpers ─────────────────────────────────────────────────────────
// ScanGreen 3-band score scale: Good / Fair / Poor.
const getScoreColor = (sc) => {
  if (sc >= 75) return PRIMARY;
  if (sc >= 50) return WARNING_C;
  return ERROR_C;
};

const getVerdict = (sc) => {
  if (sc >= 75) return 'Good';
  if (sc >= 50) return 'Fair';
  return 'Poor';
};

// Additive health verdict → low / moderate / high risk display.
const riskTier = (healthVerdict) => {
  if (healthVerdict === 'good')  return { label: 'Low risk',    color: PRIMARY,   bg: PRIMARY_TINT, icon: 'checkmark-circle' };
  if (healthVerdict === 'avoid') return { label: 'Poor',        color: ERROR_C,   bg: RED_TINT,     icon: 'alert-circle' };
  return                                { label: 'Moderate risk', color: WARNING_C, bg: AMBER_TINT,   icon: 'warning' };
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
const ScoreGauge = ({ score, scoreColor, verdict }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, [score]);
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [GAUGE_CIRC, GAUGE_CIRC - (GAUGE_CIRC * score) / 100],
  });
  const SIZE = 120;
  const CX   = SIZE / 2;
  return (
    <View style={g.container}>
      {/* White circle background so gauge is readable over any image */}
      <View style={g.gaugeBg} />
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle cx={CX} cy={CX} r={GAUGE_R} stroke={TRACK_BG} strokeWidth={10} fill="transparent" />
        <AnimatedSvgCircle
          cx={CX} cy={CX} r={GAUGE_R}
          stroke={scoreColor} strokeWidth={10}
          fill="transparent"
          strokeDasharray={GAUGE_CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={g.center}>
        <Text style={[g.scoreNum, { color: scoreColor }]}>{score}</Text>
        <Text style={[g.scoreVerdict, { color: scoreColor }]}>{verdict}</Text>
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
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('nutrients'); // 'nutrients' | 'ingredients' | 'additives'
  const [fetchingIngredients, setFetchingIngredients] = useState(false);
  const [expandedIngredient, setExpandedIngredient] = useState(null);
  const [usdaCache, setUsdaCache]                   = useState({});
  const [usdaLoading, setUsdaLoading]               = useState(null);
  const [selectedAdditive, setSelectedAdditive]     = useState(null);
  const [additiveInfo, setAdditiveInfo]             = useState(null);
  const [additiveLoading, setAdditiveLoading]       = useState(false);
  const [additivesMap, setAdditivesMap]             = useState({});
  const additivesRequested = useRef(new Set());
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
        savedAt: Date.now(),
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
  const ingSheetY  = useRef(new Animated.Value(420)).current;
  const whySheetY  = useRef(new Animated.Value(420)).current;
  const additiveSheetY = useRef(new Animated.Value(420)).current;

  // Staggered entrance for hero / score / why-card / tabs
  const stagger1 = useRef(new Animated.Value(0)).current;
  const stagger2 = useRef(new Animated.Value(0)).current;
  const stagger3 = useRef(new Animated.Value(0)).current;
  const stagger4 = useRef(new Animated.Value(0)).current;
  const staggerStyle = (v) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

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
      // Free-tier daily scan quota — a found product counts; block at the limit.
      const quota = await checkAndConsume('food', prod.code || prod._id || barcode);
      if (quota.blocked) {
        navigation.replace('Subscription', { reason: 'limit' });
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
        brand: prod.brands || '',
        productImage: prod.image_url || prod.image_front_url || null,
        productType: 'food',
        score: healthScore?.score || analysisResult?.score || 0,
        ingredients: prod.ingredients_text || '',
        source: prod.source || 'Open Food Facts',
      });
      isProductSaved(prod.code || prod._id || barcode).then(setIsSaved);
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
      const easing = Easing.bezier(0.22, 1, 0.36, 1);
      Animated.parallel([
        Animated.timing(stagger1, { toValue: 1, duration: 400, delay: 100, easing, useNativeDriver: true }),
        Animated.timing(stagger2, { toValue: 1, duration: 400, delay: 200, easing, useNativeDriver: true }),
        Animated.timing(stagger3, { toValue: 1, duration: 400, delay: 300, easing, useNativeDriver: true }),
        Animated.timing(stagger4, { toValue: 1, duration: 400, delay: 400, easing, useNativeDriver: true }),
      ]).start();
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

  useEffect(() => {
    if (expandedIngredient) {
      ingSheetY.setValue(420);
      Animated.spring(ingSheetY, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true }).start();
    }
  }, [expandedIngredient]);

  const closeIngredientSheet = () => {
    Animated.timing(ingSheetY, { toValue: 420, duration: 200, useNativeDriver: true }).start(() => {
      setExpandedIngredient(null);
    });
  };

  const openWhySheet = () => {
    setShowWhyScore(true);
    whySheetY.setValue(420);
    Animated.spring(whySheetY, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true }).start();
  };

  const closeWhySheet = () => {
    Animated.timing(whySheetY, { toValue: 420, duration: 200, useNativeDriver: true }).start(() => {
      setShowWhyScore(false);
    });
  };

  const handleAdditiveTap = async (code) => {
    setSelectedAdditive(code);
    additiveSheetY.setValue(420);
    Animated.spring(additiveSheetY, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true }).start();

    const cached = additivesMap[code];
    if (cached && !cached.loading && cached.info) {
      setAdditiveInfo(cached.info);
      setAdditiveLoading(false);
      return;
    }
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

  const closeAdditiveSheet = () => {
    Animated.timing(additiveSheetY, { toValue: 420, duration: 200, useNativeDriver: true }).start(() => {
      setSelectedAdditive(null);
    });
  };

  // Eagerly fetch every additive's info once the Additives tab is opened, so
  // each card can show its real risk level + description without a tap.
  useEffect(() => {
    if (activeTab !== 'additives' || additiveCodes.length === 0) return;
    additiveCodes.forEach((code) => {
      if (additivesRequested.current.has(code)) return;
      additivesRequested.current.add(code);
      setAdditivesMap(prev => ({ ...prev, [code]: { loading: true, info: null } }));
      getAdditiveInfo(code)
        .then(info => setAdditivesMap(prev => ({ ...prev, [code]: { loading: false, info } })))
        .catch(() => setAdditivesMap(prev => ({ ...prev, [code]: { loading: false, info: null } })));
    });
  }, [activeTab, product?.additives_tags]);

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

  const handleShare = () => setShowShareSheet(true);

  const handleToggleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = await toggleSavedProduct({
      barcode: product.code || product._id || barcode,
      name: productName,
      brand: brandName,
      image: product.image_url || product.image_front_url || null,
      productType: 'food',
      score,
      ingredients: product.ingredients_text || '',
    });
    if (newState !== null) setIsSaved(newState);
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

  // Dot color for the Nutrients list — only Sugar/Salt/Fat/Protein have defined
  // health thresholds; everything else (Energy, Fiber, Carbs, Sat. Fat) is gray.
  const nutrientDotColor = (label, value) => {
    if (value == null) return NEUTRAL_300;
    if (label === 'Sugar')   return value <= 3  ? PRIMARY : value >= 10 ? ERROR_C : WARNING_C;
    if (label === 'Salt')    return value <= 0.3 ? PRIMARY : value >= 1.5 ? ERROR_C : WARNING_C;
    if (label === 'Fat')     return value < 3   ? PRIMARY : value >= 17 ? ERROR_C : WARNING_C;
    if (label === 'Protein') return value >= 10 ? PRIMARY : value < 5  ? ERROR_C : WARNING_C;
    return NEUTRAL_300;
  };

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
  const activeIngredient = expandedIngredient
    ? displayed.find(i => (i.name || '').toLowerCase().trim() === expandedIngredient)
    : null;

  const additiveCodes = (product?.additives_tags || [])
    .map(t => {
      const m = t.match(/e(\d{3,4}[a-z]?)/i);
      return m ? `E${m[1].toUpperCase()}` : t.replace(/^en:/i, '').toUpperCase();
    })
    .filter(Boolean);

  const ingStyle = (_t) => {
    if (_t === 'good')     return { icon: 'leaf',    color: PRIMARY,   bg: 'rgba(6,122,79,0.08)',  tag: 'GOOD'     };
    if (_t === 'bad')      return { icon: 'close',   color: ERROR_C,   bg: 'rgba(186,26,26,0.08)',  tag: 'CONCERN'  };
    return                        { icon: 'ellipse', color: WARNING_C, bg: 'rgba(217,119,6,0.08)',  tag: 'MODERATE' };
  };

  // ── Alternatives ─────────────────────────────────────────────
  const altsData = realAlternatives;

  // ═════════════════════════════════════════════════════════════════
  // RENDER — Dark Brutalism
  // ═════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── HERO: Product Image with brand/name overlay ───────── */}
          <Animated.View style={staggerStyle(stagger1)}>
            <View style={st.heroContainer}>
              <HeroImage
                imageUrl={product.image_url}
                barcode={product.barcode || product.code || barcode}
                imgStyle={st.heroImage}
              />
              {/* Gradient: dark at bottom (text legibility) → clear → subtle dark at top (back-button contrast) */}
              <LinearGradient
                colors={['rgba(0,0,0,0.10)', 'transparent', 'rgba(0,0,0,0.35)']}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Brand + product name overlay */}
              <View style={st.heroTextWrap}>
                {!!brandName && <Text style={st.heroBrand} numberOfLines={1}>{brandName}</Text>}
                <Text style={st.heroName} numberOfLines={1}>{productName}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── FLOATING NAV BUTTONS (over hero) ──────────────────── */}
          <View style={[st.floatingNav, { top: safeAreaInsets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoBack(); }}
              style={st.floatingBtn}
            >
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
              <Ionicons name="arrow-back" size={20} color={NEUTRAL_800} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Animated.View style={{ transform: [{ scale: shareAnim }] }}>
                <TouchableOpacity onPress={handleShare} style={st.floatingBtn}>
                  <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
                  <Ionicons name="share-social-outline" size={19} color={NEUTRAL_800} />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity onPress={handleToggleSave} style={st.floatingBtn}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={NEUTRAL_800} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SCORE RING (overlaps hero / content boundary) ─────── */}
          <Animated.View style={staggerStyle(stagger2)}>
            <View style={st.gaugeOverlapWrap}>
              <ScoreGauge score={score} scoreColor={scoreColor} verdict={verdict} />
            </View>
            <Text style={st.scoreCaption}>Health score · /100</Text>
          </Animated.View>

          {/* ── WHY THIS SCORE card ───────────────────────────────── */}
          <Animated.View style={[{ paddingHorizontal: 20, marginBottom: 20 }, staggerStyle(stagger3)]}>
            <TapScale style={st.whyCard} onPress={openWhySheet}>
              <View style={st.whyCardIcon}>
                <Ionicons name="information-circle" size={16} color={PRIMARY} />
              </View>
              <Text style={st.whyCardText}>Why this score?</Text>
              <Ionicons name="chevron-forward" size={17} color={NEUTRAL_300} />
            </TapScale>
          </Animated.View>

          {/* ── SEGMENTED TABS: Nutrients / Ingredients / Additives ── */}
          <Animated.View style={[{ paddingHorizontal: 20, marginBottom: 20 }, staggerStyle(stagger4)]}>
            <View style={st.tabBar}>
              {[
                { key: 'nutrients',   label: 'Nutrients',   icon: 'bar-chart' },
                { key: 'ingredients', label: 'Ingredients', icon: 'leaf' },
                { key: 'additives',   label: 'Additives',   icon: 'flask' },
              ].map(tab => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[st.tabBtn, active && st.tabBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
                  >
                    <Ionicons name={tab.icon} size={14} color={active ? PRIMARY : ON_SURFACE_VAR} style={{ marginRight: 6 }} />
                    <Text style={[st.tabBtnText, active && st.tabBtnTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* ── NUTRIENTS TAB ─────────────────────────────────────── */}
          {activeTab === 'nutrients' && nutGrid.length === 0 && (
            <View style={st.noNutBox}>
              <Ionicons name="information-circle-outline" size={18} color={OUTLINE} />
              <Text style={st.noNutText}>No nutrition data available for this product</Text>
            </View>
          )}
          {activeTab === 'nutrients' && nutGrid.length > 0 && (
            <View style={st.nutSection}>
              <View style={{ gap: 8 }}>
                {nutGrid.map((item, idx) => (
                  <View key={idx} style={st.nutRow}>
                    <View style={st.nutRowLeft}>
                      <View style={[st.nutDot, { backgroundColor: nutrientDotColor(item.label, item.value) }]} />
                      <Text style={st.nutRowLabel}>{item.label}</Text>
                    </View>
                    <Text style={st.nutRowValue}>
                      {item.value % 1 === 0 ? item.value : item.value.toFixed(1)}
                      <Text style={st.nutRowUnit}> {item.unit}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* ── FETCHING INGREDIENTS HINT ────────────────────────── */}
          {activeTab === 'ingredients' && fetchingIngredients && displayed.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingBottom: 20 }}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={{ fontSize: 11, color: ON_SURFACE_VAR, letterSpacing: 1, fontWeight: '600' }}>Fetching ingredients...</Text>
            </View>
          )}

          {/* ── INGREDIENT BREAKDOWN ──────────────────────────────── */}
          {activeTab === 'ingredients' && displayed.length > 0 && (
            <View style={st.section}>
              <View style={st.ingListCard}>
                {displayed.map((ing, idx) => {
                  const isGood      = ing._t === 'good';
                  const statusIcon  = isGood ? 'checkmark' : 'warning';
                  const statusColor = isGood ? PRIMARY : WARNING_C;
                  const statusBg    = isGood ? PRIMARY_TINT : AMBER_TINT;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.75}
                      onPress={() => handleIngredientTap(ing)}
                    >
                      <View style={[st.ingRow, idx > 0 && st.ingRowDivider]}>
                        <View style={[st.ingStatusCircle, { backgroundColor: statusBg }]}>
                          <Ionicons name={statusIcon} size={13} color={statusColor} />
                        </View>
                        <View style={st.ingCardMeta}>
                          <Text style={st.ingCardName} numberOfLines={1}>{ing.name || 'Unknown'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {ADDITIVE_FUNCTIONS.has((ing.function || '').toLowerCase()) && <Text style={st.ingTagText}>additive</Text>}
                          <Ionicons name="chevron-forward" size={16} color={NEUTRAL_300} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── RAW INGREDIENTS FALLBACK (when analyzer has no data) ── */}
          {activeTab === 'ingredients' && displayed.length === 0 && product.ingredients_text && product.ingredients_text.length > 5 && (
            <View style={st.section}>
              <View style={[st.ingCard, { paddingVertical: 16 }]}>
                <Text style={{ fontSize: 12, color: ON_SURFACE_VAR, lineHeight: 20 }}>
                  {product.ingredients_text}
                </Text>
              </View>
            </View>
          )}

          {/* ── NO INGREDIENT DATA AT ALL ──────────────────────────── */}
          {activeTab === 'ingredients' && !fetchingIngredients && displayed.length === 0 &&
            (!product.ingredients_text || product.ingredients_text.length <= 5) && (
            <View style={st.emptyTabBox}>
              <Text style={st.emptyTabText}>No ingredient list available.</Text>
            </View>
          )}

          {/* ── ADDITIVES ─────────────────────────────────────────── */}
          {activeTab === 'additives' && additiveCodes.length === 0 && (
            <View style={st.section}>
              <View style={st.cleanBox}>
                <Ionicons name="leaf" size={18} color={PRIMARY} />
                <Text style={st.cleanBoxText}>No additives detected — clean product.</Text>
              </View>
            </View>
          )}
          {activeTab === 'additives' && additiveCodes.length > 0 && (
            <View style={[st.section, { gap: 8 }]}>
              {additiveCodes.map((code, idx) => {
                const entry = additivesMap[code];
                const isLoading = !entry || entry.loading;
                const info = entry?.info;
                const risk = riskTier(info?.healthVerdict);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.75}
                    onPress={() => handleAdditiveTap(code)}
                  >
                    <View style={st.additiveCard}>
                      <View style={[st.additiveCardCircle, { backgroundColor: risk.bg }]}>
                        {isLoading ? (
                          <ActivityIndicator size="small" color={risk.color} />
                        ) : (
                          <Ionicons name={risk.icon} size={16} color={risk.color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.additiveCardName} numberOfLines={1}>{isLoading ? code : (info?.name || code)}</Text>
                        <Text style={[st.additiveCardRisk, { color: risk.color }]}>
                          {isLoading ? 'Loading…' : risk.label}
                        </Text>
                        {!isLoading && !!info?.whatItIs && (
                          <Text style={st.additiveCardDesc} numberOfLines={2}>{info.whatItIs}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── BETTER CHOICES ────────────────────────────────────── */}
          <View style={st.altSection}>
            <Text style={st.altSectionLabel}>BETTER CHOICES</Text>
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
                contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                renderItem={({ item }) => {
                  const altScoreColor = getScoreColor(item.score);
                  return (
                    <TouchableOpacity
                      style={st.altCard}
                      activeOpacity={item.barcode ? 0.85 : 1}
                      onPress={() => {
                        if (item.barcode) {
                          navigation.push('ResultsV2', { barcode: item.barcode });
                        }
                      }}
                    >
                      <View style={st.altImgBox}>
                        <AltImg uri={item.image} barcode={item.barcode} imgStyle={st.altImg} placeholderStyle={st.altImgPlaceholder} />
                      </View>
                      <Text style={st.altName} numberOfLines={1}>{item.name || ''}</Text>
                      <Text style={st.altBrand} numberOfLines={1}>{item.brand || ''}</Text>
                      <Text style={[st.altScoreText, { color: altScoreColor }]}>{item.score}/100</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* ── PRODUCT CODE ──────────────────────────────────────── */}
          {!!(product.code || product.barcode || barcode) && (
            <Text style={st.barcodeFooter}>{product.code || product.barcode || barcode}</Text>
          )}

          {/* ── AURA AI CARD ──────────────────────────────────────── */}
          {AI_CHAT_ENABLED && (
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
          )}

        </Animated.View>
      </ScrollView>

      {/* ── AI Chat overlay ──────────────────────────────────────── */}
      {AI_CHAT_ENABLED && showAIChat && product && (
        <ProductAIChat
          product={product}
          analysis={analysis}
          ingredients={(product.ingredients_text || '').split(',').map(s => s.trim()).filter(Boolean)}
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}

      {/* ── WHY THIS SCORE — bottom sheet ─────────────────────────── */}
      <Modal
        visible={showWhyScore}
        transparent
        animationType="none"
        onRequestClose={closeWhySheet}
      >
        <TouchableOpacity style={st.ingSheetOverlay} activeOpacity={1} onPress={closeWhySheet}>
          <Animated.View style={[st.ingSheet, { transform: [{ translateY: whySheetY }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={st.ingSheetHandle} />
              <View style={st.ingSheetHeader}>
                <Text style={st.ingSheetTitle}>Why this score</Text>
                <TouchableOpacity style={st.ingSheetClose} onPress={closeWhySheet}>
                  <Ionicons name="close" size={18} color={ON_SURFACE} />
                </TouchableOpacity>
              </View>
              <ScrollView style={st.ingSheetBody} showsVerticalScrollIndicator={false}>
                {enhancedHealthScore?.breakdown && (
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
                {(enhancedHealthScore?.scoreReasons || []).length > 0 ? (
                  <View style={st.whyDotList}>
                    {enhancedHealthScore.scoreReasons.slice(0, 8).map((r, idx) => {
                      const isPenalty = r.type === 'penalty' || (r.impact && r.impact < 0);
                      const isBonus   = r.type === 'bonus'   || (r.impact && r.impact > 0);
                      const dotColor  = isPenalty ? ERROR_C : isBonus ? PRIMARY : WARNING_C;
                      return (
                        <View key={idx} style={st.whyDotRow}>
                          <View style={[st.whyDot, { backgroundColor: dotColor }]} />
                          <Text style={st.whyDotText}>{r.text}</Text>
                        </View>
                      );
                    })}
                    {enhancedHealthScore?.breakdown?.cappedByHarmfulIngredients && (
                      <View style={st.whyDotRow}>
                        <View style={[st.whyDot, { backgroundColor: ERROR_C }]} />
                        <Text style={st.whyDotText}>Score capped at 49 — harmful ingredient detected</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={st.ingSheetText}>No detailed breakdown available for this product.</Text>
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── INGREDIENT DETAIL — bottom sheet ──────────────────────── */}
      <Modal
        visible={!!expandedIngredient}
        transparent
        animationType="none"
        onRequestClose={closeIngredientSheet}
      >
        <TouchableOpacity style={st.ingSheetOverlay} activeOpacity={1} onPress={closeIngredientSheet}>
          <Animated.View style={[st.ingSheet, { transform: [{ translateY: ingSheetY }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={st.ingSheetHandle} />
              {activeIngredient && (() => {
                const isGood = activeIngredient._t === 'good';
                const pillBg = isGood ? PRIMARY_TINT : AMBER_TINT;
                const pillColor = isGood ? PRIMARY : AMBER_600;
                const pillLabel = isGood
                  ? (activeIngredient.function && activeIngredient.function !== 'unknown' ? activeIngredient.function : 'natural')
                  : 'additive';
                const usdaInfo = usdaCache[expandedIngredient];
                const isLoadingThis = usdaLoading === expandedIngredient;
                return (
                  <>
                    <View style={st.ingSheetHeader}>
                      <Text style={st.ingSheetTitle}>{activeIngredient.name || 'Unknown'}</Text>
                      <TouchableOpacity style={st.ingSheetClose} onPress={closeIngredientSheet}>
                        <Ionicons name="close" size={18} color={ON_SURFACE} />
                      </TouchableOpacity>
                    </View>
                    <View style={[st.ingSheetPill, { backgroundColor: pillBg }]}>
                      <Text style={[st.ingSheetPillText, { color: pillColor }]}>{pillLabel}</Text>
                    </View>
                    <ScrollView style={st.ingSheetBody} showsVerticalScrollIndicator={false}>
                      {isLoadingThis ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                          <ActivityIndicator size="small" color={PRIMARY} />
                          <Text style={st.ingDetailLabel}>Looking up database...</Text>
                        </View>
                      ) : usdaInfo ? (
                        <>
                          <Text style={st.ingSheetText}>{usdaInfo.whatItIs}</Text>
                          {usdaInfo.whatItDoes ? (
                            <>
                              <Text style={[st.ingDetailLabel, { marginTop: 16 }]}>What does it do?</Text>
                              <Text style={st.ingSheetText}>{usdaInfo.whatItDoes}</Text>
                            </>
                          ) : null}
                          {usdaInfo.whoSays ? (
                            <>
                              <Text style={[st.ingDetailLabel, { color: '#1565c0', marginTop: 16 }]}>WHO / JECFA</Text>
                              <Text style={st.ingSheetText}>{usdaInfo.whoSays}</Text>
                            </>
                          ) : null}
                          <Text style={st.ingDetailSource}>Source: {usdaInfo.source}</Text>
                        </>
                      ) : (
                        <View style={st.ingEmptyCard}>
                          <View style={st.ingEmptyIconWrap}>
                            <Ionicons name="information-outline" size={22} color={ON_SURFACE_VAR} />
                          </View>
                          <Text style={st.ingEmptyTitle}>No info available</Text>
                          <Text style={st.ingEmptyNote}>
                            We couldn't find detailed data for this ingredient yet. It's still listed on the product label.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </>
                );
              })()}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── ADDITIVE DETAIL — bottom sheet ────────────────────────── */}
      <Modal
        visible={!!selectedAdditive}
        transparent
        animationType="none"
        onRequestClose={closeAdditiveSheet}
      >
        <TouchableOpacity style={st.ingSheetOverlay} activeOpacity={1} onPress={closeAdditiveSheet}>
          <Animated.View style={[st.ingSheet, { transform: [{ translateY: additiveSheetY }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={st.ingSheetHandle} />
              <View style={st.ingSheetHeader}>
                <Text style={st.ingSheetTitle}>{additiveInfo?.name || selectedAdditive}</Text>
                <TouchableOpacity style={st.ingSheetClose} onPress={closeAdditiveSheet}>
                  <Ionicons name="close" size={18} color={ON_SURFACE} />
                </TouchableOpacity>
              </View>
              {!additiveLoading && (() => {
                const risk = riskTier(additiveInfo?.healthVerdict);
                return (
                  <View style={[st.ingSheetPill, { backgroundColor: risk.bg }]}>
                    <Text style={[st.ingSheetPillText, { color: risk.color }]}>{risk.label}</Text>
                  </View>
                );
              })()}
              <ScrollView style={st.ingSheetBody} showsVerticalScrollIndicator={false}>
                {additiveLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={st.ingDetailLabel}>Loading…</Text>
                  </View>
                ) : additiveInfo ? (
                  <>
                    <Text style={st.ingSheetText}>{additiveInfo.whatItIs}</Text>
                    {additiveInfo.whatItDoes ? (
                      <>
                        <Text style={[st.ingDetailLabel, { marginTop: 16 }]}>What does it do?</Text>
                        <Text style={st.ingSheetText}>{additiveInfo.whatItDoes}</Text>
                      </>
                    ) : null}
                    {additiveInfo.whoSays ? (
                      <>
                        <Text style={[st.ingDetailLabel, { color: '#1565c0', marginTop: 16 }]}>WHO / JECFA</Text>
                        <Text style={st.ingSheetText}>{additiveInfo.whoSays}</Text>
                      </>
                    ) : null}
                    <Text style={st.ingDetailSource}>Source: {additiveInfo.source}</Text>
                  </>
                ) : (
                  <View style={st.ingEmptyCard}>
                    <View style={st.ingEmptyIconWrap}>
                      <Ionicons name="information-outline" size={22} color={ON_SURFACE_VAR} />
                    </View>
                    <Text style={st.ingEmptyTitle}>No info available</Text>
                    <Text style={st.ingEmptyNote}>
                      We couldn't find detailed data for this additive yet. It's still listed on the product label.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <ShareScoreSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        score={score}
        productName={productName}
        brandName={brandName}
        verdict={verdict}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// GAUGE STYLES
// ═══════════════════════════════════════════════════════════════════
const g = StyleSheet.create({
  container: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  gaugeBg: {
    position: 'absolute',
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  center:        { position: 'absolute', alignItems: 'center' },
  scoreNum:      { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  scoreVerdict:  { fontSize: 12, fontWeight: '600', marginTop: 1 },
});

// ═══════════════════════════════════════════════════════════════════
// MAIN STYLES — Light Wellness
// ═══════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  // Loading / Error
  center:        { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  loadText:      { fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, fontWeight: '500' },
  goBackBtn:     { marginTop: 24, borderRadius: 24, borderWidth: 1, borderColor: OUTLINE, paddingVertical: 12, paddingHorizontal: 32 },
  goBackBtnText: { color: ON_SURFACE, fontSize: 14, fontWeight: '600' },

  // Hero
  heroContainer: { width: '100%', height: 288, position: 'relative', backgroundColor: SURFACE_HIGH, overflow: 'hidden' },
  heroImage:     { width: '100%', height: '100%' },
  heroTextWrap:  { position: 'absolute', left: 20, right: 20, bottom: 16 },
  heroBrand:     { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  heroName:      { fontSize: 20, fontWeight: '800', color: WHITE, lineHeight: 24 },

  // Floating nav buttons over the hero
  floatingNav: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 50 },
  floatingBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  // Score ring — overlaps hero/content boundary
  gaugeOverlapWrap: { alignItems: 'center', marginTop: -40 },
  scoreCaption:     { textAlign: 'center', fontSize: 12, color: NEUTRAL_400, marginTop: 10, marginBottom: 20 },

  // Why this score card
  whyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE_LOW, borderRadius: 16, borderWidth: 1, borderColor: NEUTRAL_100,
    padding: 16,
  },
  whyCardIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: PRIMARY_TINT,
    alignItems: 'center', justifyContent: 'center',
  },
  whyCardText: { flex: 1, fontSize: 14, fontWeight: '600', color: ON_SURFACE },

  // WHY THIS SCORE sheet content
  whyBarsWrap:    { marginBottom: 20 },
  whyBarRow:      { marginBottom: 12 },
  whyBarLabel:    { fontSize: 11, fontWeight: '600', color: ON_SURFACE_VAR, marginBottom: 4 },
  whyBarTrack:    { height: 6, backgroundColor: TRACK_BG, borderRadius: 3, overflow: 'hidden' },
  whyBarFill:     { height: 6, borderRadius: 3 },
  whyDotList:     { gap: 14 },
  whyDotRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  whyDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  whyDotText:     { flex: 1, fontSize: 14, lineHeight: 20, color: ON_SURFACE },

  // Segmented tab bar
  tabBar: {
    flexDirection: 'row', height: 44, backgroundColor: NEUTRAL_100, borderRadius: 16, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: WHITE,
  },
  tabBtnText:       { fontSize: 12, fontWeight: '500', color: ON_SURFACE_VAR },
  tabBtnTextActive: { color: PRIMARY, fontWeight: '600' },

  // Nutrition section (simple list rows)
  nutSection: { paddingHorizontal: 20, paddingBottom: 4, marginBottom: 8 },
  noNutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 20,
    marginHorizontal: 20, marginBottom: 24,
    borderWidth: 1, borderColor: NEUTRAL_100,
    borderRadius: 16, backgroundColor: SURFACE_LOW,
  },
  noNutText: { fontSize: 13, color: ON_SURFACE_VAR, flex: 1 },
  nutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: NEUTRAL_100, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: SURFACE_LOW,
  },
  nutRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nutDot:      { width: 10, height: 10, borderRadius: 5 },
  nutRowLabel: { fontSize: 14, color: NEUTRAL_600, fontWeight: '500' },
  nutRowValue: { fontSize: 14, color: ON_SURFACE, fontWeight: '600' },
  nutRowUnit:  { fontSize: 12, color: NEUTRAL_400, fontWeight: '500' },

  // Ingredients
  section: { paddingHorizontal: 20, paddingBottom: 12 },

  // Ingredients — one continuous card, rows separated by hairline dividers
  ingListCard: {
    backgroundColor: SURFACE_LOW, borderRadius: 16,
    borderWidth: 1, borderColor: NEUTRAL_100,
    overflow: 'hidden',
  },
  ingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  ingRowDivider: {
    borderTopWidth: 1, borderTopColor: NEUTRAL_100,
  },
  // Legacy single-card style — still used by the raw-ingredients-text fallback
  ingCard:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE_LOW, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14,
    borderWidth: 1, borderColor: NEUTRAL_100,
  },
  ingStatusCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingCardName:   { fontSize: 14, fontWeight: '600', color: NEUTRAL_800 },
  ingTagText:    { fontSize: 12, fontWeight: '600', color: AMBER_600 },

  // Empty-state text for a tab with nothing to show
  emptyTabBox:  { paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center' },
  emptyTabText: { fontSize: 14, color: NEUTRAL_400, textAlign: 'center' },

  ingDetailRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ingDetailLabel:  { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  ingDetailText:   { fontSize: 13, color: ON_SURFACE, lineHeight: 19 },
  ingDetailSource: { fontSize: 10, color: ON_SURFACE_VAR, marginTop: 10, textAlign: 'right', fontStyle: 'italic' },

  // Empty state — ingredient/additive sheet has no matched data
  ingEmptyCard: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
  ingEmptyIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: NEUTRAL_100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  ingEmptyTitle: { fontSize: 15, fontWeight: '700', color: ON_SURFACE, marginBottom: 6 },
  ingEmptyNote: { fontSize: 13, color: ON_SURFACE_VAR, lineHeight: 19, textAlign: 'center' },

  // Ingredient detail — bottom sheet
  ingSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  ingSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    maxHeight: '75%',
    backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 24,
    paddingBottom: 34,
  },
  ingSheetHandle: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)', marginBottom: 20,
  },
  ingSheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14,
  },
  ingSheetTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: ON_SURFACE, letterSpacing: -0.4, marginRight: 12 },
  ingSheetClose: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE_HIGH,
    alignItems: 'center', justifyContent: 'center',
  },
  ingSheetPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 18 },
  ingSheetPillText: { fontSize: 12, fontWeight: '700' },
  ingSheetBody: { marginBottom: 4 },
  ingSheetText: { fontSize: 15, color: ON_SURFACE, lineHeight: 23 },

  // No-additives clean state
  cleanBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 16, backgroundColor: PRIMARY_TINT,
  },
  cleanBoxText: { fontSize: 13, color: PRIMARY, fontWeight: '500', flex: 1 },

  // Additive cards
  additiveCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: SURFACE_LOW, borderRadius: 16, borderWidth: 1, borderColor: NEUTRAL_100,
    padding: 16,
  },
  additiveCardCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  additiveCardName:   { fontSize: 14, fontWeight: '600', color: ON_SURFACE, marginBottom: 2 },
  additiveCardRisk:   { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  additiveCardDesc:   { fontSize: 12, color: NEUTRAL_400, lineHeight: 17 },

  // AI card
  aiCardWrap: { paddingHorizontal: 20, marginBottom: 16 },
  aiCard: {
    backgroundColor: SURFACE_LOW, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  aiCardLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 4 },
  aiCardSub:     { fontSize: 15, fontWeight: '500', color: ON_SURFACE, lineHeight: 21 },
  aiCardIcon:    { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(6,122,79,0.1)', alignItems: 'center', justifyContent: 'center' },
  aiCardConnect: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: PRIMARY },

  // Better Choices
  altSection:      { marginBottom: 28 },
  altSectionLabel: { fontSize: 12, fontWeight: '600', color: NEUTRAL_400, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 14, marginTop: 8 },
  altCard:         { width: 112 },
  altImgBox:       { width: 112, height: 112, backgroundColor: SURFACE_HIGH, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  altImg:            { width: 112, height: 112 },
  altImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  altName:  { fontSize: 12, fontWeight: '600', color: ON_SURFACE, lineHeight: 16, marginBottom: 2 },
  altBrand: { fontSize: 12, fontWeight: '400', color: NEUTRAL_400, marginBottom: 4 },
  altScoreText: { fontSize: 12, fontWeight: '700' },

  barcodeFooter: { textAlign: 'center', fontSize: 12, color: ON_SURFACE_VAR, letterSpacing: 1, marginBottom: 24 },
});

export default ResultsScreenV2;
