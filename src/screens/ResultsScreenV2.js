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
import { fetchAlternativesByCategory, updateProductImageInTurso } from '../services/tursoDB';
import { analyzeIngredients, getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { saveToHistory as saveToHistoryUtil } from '../utils/historyManager';
import ProductAIChat from '../components/ProductAIChat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// Smart hero image:
// 1. Shows stored URL immediately
// 2. If it fails → calls OFF API once to get real URL
// 3. Shows real image + saves URL to Turso for next scan
const HeroImage = React.memo(({ imageUrl, barcode, imgStyle }) => {
  const [uri, setUri] = React.useState(imageUrl || null);
  const [failed, setFailed] = React.useState(!imageUrl);
  const handleError = React.useCallback(async () => {
    if (!barcode) { setFailed(true); return; }
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
        // Save to Turso — next scan loads instantly, no API call needed
        updateProductImageInTurso(barcode, newUrl).catch(() => {});
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  }, [barcode]);
  if (failed) {
    return (
      <View style={[imgStyle, { backgroundColor: '#1b1b1b', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="cube-outline" size={80} color={OUTLINE} />
      </View>
    );
  }
  return <Image source={{ uri }} style={imgStyle} resizeMode="cover" onError={handleError} />;
});

// Handles broken image URLs gracefully — shows leaf placeholder on error
const AltImg = React.memo(({ uri, imgStyle, placeholderStyle }) => {
  const [err, setErr] = React.useState(false);
  if (!uri || err) {
    return (
      <View style={[imgStyle, placeholderStyle]}>
        <Ionicons name="leaf-outline" size={28} color={OUTLINE} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={imgStyle}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
  );
});

// ── Dark Brutalism Palette ──────────────────────────────────────────
const BG             = '#000000';
const SURFACE        = '#131313';
const SURFACE_LOW    = '#1b1b1b';
const SURFACE_HIGH   = '#2a2a2a';
const OUTLINE        = '#474747';
const ON_SURFACE     = '#e2e2e2';
const ON_SURFACE_VAR = '#c6c6c6';
const WHITE          = '#ffffff';

// ── Gauge constants ─────────────────────────────────────────────────
const GAUGE_R    = 96;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R; // ≈ 603

// ── Helpers ─────────────────────────────────────────────────────────
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

// ── Score Gauge ─────────────────────────────────────────────────────
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
  const [realAlternatives, setRealAlternatives]       = useState([]);
  const [altsLoading, setAltsLoading]                 = useState(false);

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
      // Map detected category to the keyword we search in Turso product_name
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
      // Use the first keyword as primary query — short word most likely to match DB names
      const primaryKeyword = keywords[0];
      let candidates = await fetchAlternativesByCategory(primaryKeyword, barcode, 40);
      // If too few, try next keyword
      if (candidates.length < 5 && keywords[1]) {
        const more = await fetchAlternativesByCategory(keywords[1], barcode, 30);
        for (const c of more) {
          if (!candidates.find((x) => x.barcode === c.barcode)) candidates.push(c);
        }
      }
      if (candidates.length === 0) return;

      // Score each candidate and sort by score descending — highest first
      const scored = candidates
        .filter((p) => p.product_name && p.barcode)
        .map((p) => {
          const ingResult = p.ingredients_text
            ? analyzeIngredients(p.ingredients_text, 'food')
            : null;
          return {
            name:   p.product_name,
            brand:  p.brands || '',
            image:  p.image_url || null,
            barcode: p.barcode,
            score:  ingResult?.score ?? 60,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (scored.length > 0) setRealAlternatives(scored);
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

  // ── Loading / Error ──────────────────────────────────────────────
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

  // ── Derived data ─────────────────────────────────────────────────
  const score      = enhancedHealthScore ? enhancedHealthScore.score : Math.round(analysis?.score ?? 0);
  const scoreColor = getScoreColor(score);
  const verdict    = getVerdict(score);
  const nutriments = product.nutriments || {};
  const productName = (product.product_name || product.name || 'Unknown Product').toUpperCase();
  const brandName   = product.brands ? product.brands.toUpperCase() : '';

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
    { label: 'Energy',   value: getNutVal(nutriments, 'energy-kcal_100g', ['energy-kcal', 'energy_kcal']), unit: 'kcal', dv: 2000 },
    { label: 'Protein',  value: getNutVal(nutriments, 'proteins_100g', ['proteins']),                      unit: 'g',    dv: 50   },
    { label: 'Fat',      value: getNutVal(nutriments, 'fat_100g', ['fat']),                                unit: 'g',    dv: 78   },
    { label: 'Sat. Fat', value: getNutVal(nutriments, 'saturated-fat_100g', ['saturated-fat', 'saturated_fat']), unit: 'g', dv: 20 },
    { label: 'Sugar',    value: getNutVal(nutriments, 'sugars_100g', ['sugars']),                          unit: 'g',    dv: 50   },
    { label: 'Salt',     value: getNutVal(nutriments, 'salt_100g', ['salt']),                              unit: 'g',    dv: 6    },
    { label: 'Fiber',    value: getNutVal(nutriments, 'fiber_100g', ['fiber', 'fibre']),                   unit: 'g',    dv: 28   },
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
    (i.category || '').toLowerCase() === 'moderate' ||
    (i.category || '').toLowerCase() === 'unknown'  // unknown = not in DB → show as neutral/OK
  );

  const allIngredients = [
    ...goodIngs.map(i => ({ ...i, _t: 'good' })),
    ...moderateIngs.map(i => ({ ...i, _t: 'moderate' })),
    ...badIngs.map(i => ({ ...i, _t: 'bad' })),
  ];
  const displayed = allIngredients;

  const ingStyle = (_t) => {
    if (_t === 'good')     return { icon: 'leaf',    color: '#4ADE80', bg: '#1a3326', tag: 'NATURAL'  };
    if (_t === 'bad')      return { icon: 'close',   color: '#F87171', bg: '#3b1a1a', tag: 'CONCERN'  };
    return                        { icon: 'ellipse', color: '#FACC15', bg: '#2e2a14', tag: 'MODERATE' };
  };

  // ── Ingredient icon from function keyword ─────────────────────
  const getIngIcon = (func, name) => {
    // Try to resolve by ingredient function first
    const f = (func || '').toLowerCase();
    if (f && !f.includes('unknown') && !f.includes('unclassif')) {
      if (f.includes('water') || f.includes('solvent') || f.includes('hydrat'))        return 'water-outline';
      if (f.includes('antioxid') || f.includes('preserv') || f.includes('antimicr'))   return 'shield-checkmark-outline';
      if (f.includes('sweet') || f.includes('sugar') || f.includes('glucose') || f.includes('syrup') || f.includes('fructose')) return 'cube-outline';
      if (f.includes('protein') || f.includes('amino') || f.includes('collagen'))      return 'fitness-outline';
      if (f.includes('fat') || f.includes('oil') || f.includes('lipid') || f.includes('fatty')) return 'drop-outline';
      if (f.includes('vitamin') || f.includes('mineral') || f.includes('nutrient') || f.includes('fiber') || f.includes('fibre')) return 'leaf-outline';
      if (f.includes('color') || f.includes('colour') || f.includes('dye') || f.includes('pigment')) return 'color-palette-outline';
      if (f.includes('flavor') || f.includes('flavour') || f.includes('aroma'))        return 'restaurant-outline';
      if (f.includes('thick') || f.includes('emulsif') || f.includes('stabiliz') || f.includes('gelling')) return 'layers-outline';
      if (f.includes('acid') || f.includes('acidity') || f.includes('regulator'))      return 'flask-outline';
      if (f.includes('salt') || f.includes('sodium'))                                  return 'analytics-outline';
    }
    // Fall back to matching by ingredient name
    const n = (name || '').toLowerCase();
    if (n.includes('water') || n.includes('aqua'))                                     return 'water-outline';
    if (n.includes('caffeine') || n.includes('taurine') || n.includes('guarana'))      return 'flash-outline';
    if (n.includes('sugar') || n.includes('glucose') || n.includes('fructose') ||
        n.includes('sucrose') || n.includes('dextrose') || n.includes('maltose') ||
        n.includes('syrup') || n.includes('sweetener') || n.includes('corn syrup'))    return 'cube-outline';
    if (n.includes('colour') || n.includes('color') || n.includes('caramel color') ||
        n.includes('dye') || n.includes('pigment'))                                    return 'color-palette-outline';
    if (n.includes('acid') || n.includes('acidity') || n.includes('citrate') ||
        n.includes('phosphat') || n.includes('carbonate') || n.includes('tartrate'))   return 'flask-outline';
    if (n.includes('flavour') || n.includes('flavor') || n.includes('aroma') ||
        n.includes('spice') || n.includes('extract') || n.includes('vanilla'))         return 'restaurant-outline';
    if (n.includes('preserv') || n.includes('sorbate') || n.includes('benzoate') ||
        n.includes('nitrate') || n.includes('nitrite') || n.includes('sulfite') ||
        n.includes('sulphite') || n.includes('antioxidant'))                           return 'shield-checkmark-outline';
    if (n.includes('emulsif') || n.includes('lecithin') || n.includes('stabiliz') ||
        n.includes('thicken') || n.includes('gum') || n.includes('pectin') ||
        n.includes('starch') || n.includes('cellulose'))                               return 'layers-outline';
    if (n.includes('vitamin') || n.includes('mineral') || n.includes('zinc') ||
        n.includes('calcium') || n.includes('magnesium') || n.includes('niacin') ||
        n.includes('riboflavin') || n.includes('thiamin'))                             return 'fitness-outline';
    if (n.includes('fat') || n.includes('oil') || n.includes('butter') ||
        n.includes('palm') || n.includes('coconut') || n.includes('canola') ||
        n.includes('sunflower') || n.includes('olive'))                                return 'drop-outline';
    if (n.includes('salt') || n.includes('sodium') || n.includes('potassium') ||
        n.includes('chloride'))                                                         return 'analytics-outline';
    if (n.includes('protein') || n.includes('whey') || n.includes('casein') ||
        n.includes('gluten') || n.includes('soy'))                                     return 'barbell-outline';
    if (n.includes('milk') || n.includes('cream') || n.includes('dairy') ||
        n.includes('cheese') || n.includes('yogurt'))                                  return 'egg-outline';
    if (n.includes('alcohol') || n.includes('ethanol'))                               return 'wine-outline';
    if (n.includes('coffee') || n.includes('cocoa') || n.includes('chocolate'))       return 'cafe-outline';
    if (n.includes('fruit') || n.includes('berry') || n.includes('herb') ||
        n.includes('natural') || n.includes('plant') || n.includes('organic'))        return 'leaf-outline';
    return 'ellipse-outline';
  };

  const ingCard = (ing) => {
    const t = ing._t;
    const color    = t === 'good' ? '#4ADE80' : t === 'bad' ? '#F87171' : '#FACC15';
    const bg       = t === 'good' ? '#1a3326' : t === 'bad' ? '#3b1a1a' : '#2e2a14';
    const tag      = t === 'good' ? 'GOOD'    : t === 'bad' ? 'RISKY'   : 'OK';
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
  const fallbackAlts = [
    { name: 'Pure Spinach Elixir', brand: 'PREMIUM COLD PRESS', image: null, barcode: null, score: Math.min(95, score + 20) },
    { name: 'Wild Celery Essence', brand: 'ZERO ADDITIVE · PURE', image: null, barcode: null, score: Math.min(93, score + 18) },
    { name: 'Organic Green Blend', brand: 'COLD PRESSED · RAW', image: null, barcode: null, score: Math.min(91, score + 15) },
    { name: 'Nature Harvest Mix', brand: 'WHOLE FOOD · CLEAN', image: null, barcode: null, score: Math.min(90, score + 12) },
  ];
  const altsData = realAlternatives.length > 0 ? realAlternatives : fallbackAlts;

  // ═════════════════════════════════════════════════════════════════
  // RENDER — Dark Brutalism
  // ═════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── FIXED HEADER ─────────────────────────────────────────── */}
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
        <Animated.View style={{ transform: [{ scale: shareAnim }] }}>
          <TouchableOpacity onPress={handleShare} style={st.iconBtn}>
            <Ionicons name="share-social-outline" size={22} color={WHITE} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: safeAreaInsets.top + 64, paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── HERO: Product Image ───────────────────────────────── */}
          <View style={st.heroContainer}>
            <HeroImage
              imageUrl={product.image_url}
              barcode={product.barcode || product.code || barcode}
              imgStyle={st.heroImage}
            />
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

          {/* ── GAUGE ─────────────────────────────────────────────── */}
          <View style={st.gaugeSection}>
            <ScoreGauge score={score} scoreColor={scoreColor} />
            <TouchableOpacity
              style={st.whyBtn}
              onPress={() => setShowWhyScore(prev => !prev)}
            >
              <Text style={st.whyBtnText}>
                {showWhyScore ? 'HIDE BREAKDOWN' : 'WHY THIS SCORE?'}
              </Text>
              <Ionicons
                name={showWhyScore ? 'chevron-up' : 'chevron-down'}
                size={12}
                color="#c6c6c6"
                style={{ marginLeft: 6 }}
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
                    const barColor = row.value >= 70 ? '#4ADE80' : row.value >= 40 ? '#FACC15' : '#F87171';
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
                    const pillColor = isPenalty ? '#F87171' : isBonus ? '#4ADE80' : '#FACC15';
                    const pillBg    = isPenalty ? '#3b1a1a' : isBonus ? '#1a3326' : '#2e2a14';
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
                <View style={[st.whyPill, { backgroundColor: '#3b1a1a', borderColor: '#F87171', marginTop: 4 }]}>
                  <Ionicons name="warning-outline" size={13} color="#F87171" style={{ marginRight: 6 }} />
                  <Text style={[st.whyPillText, { color: '#F87171' }]}>Score capped at 49 — harmful ingredient detected</Text>
                </View>
              )}
            </View>
          )}

          {/* ── VERDICT BADGE + DESCRIPTION ───────────────────────── */}
          <View style={st.verdictSection}>
            <View style={[st.verdictBadge, { backgroundColor: scoreColor }]}>
              <Text style={st.verdictBadgeText}>{verdict}</Text>
            </View>
            {brandName ? <Text style={st.brandLabel}>{brandName}</Text> : null}
            <Text style={st.verdictDesc}>{verdictDesc}</Text>
          </View>

          {/* ── NUTRITION BENTO GRID ──────────────────────────────── */}
          {nutGrid.length === 0 && (
            <View style={st.noNutBox}>
              <Ionicons name="information-circle-outline" size={18} color="#474747" />
              <Text style={st.noNutText}>No nutrition data available for this product</Text>
            </View>
          )}
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

          {/* ── FETCHING INGREDIENTS HINT ────────────────────────── */}
          {fetchingIngredients && displayed.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingBottom: 20 }}>
              <ActivityIndicator size="small" color="#FACC15" />
              <Text style={{ fontSize: 11, color: '#FACC15', letterSpacing: 1, fontWeight: '600' }}>FETCHING INGREDIENTS...</Text>
            </View>
          )}

          {/* ── INGREDIENT BREAKDOWN ──────────────────────────────── */}
          {displayed.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>INGREDIENT BREAKDOWN</Text>
              {displayed.map((ing, idx) => {
                const s = ingCard(ing);
                const isLast = idx === displayed.length - 1;
                return (
                  <View key={idx} style={[st.ingCard, !isLast && st.ingCardBorder]}>
                    {/* Top row: icon + name/desc + badge */}
                    <View style={st.ingCardTop}>
                      <View style={[st.ingCardIcon, { backgroundColor: s.bg }]}>
                        <Ionicons name={s.icon} size={17} color={s.color} />
                      </View>
                      <View style={st.ingCardMeta}>
                        <Text style={st.ingCardName} numberOfLines={2}>{ing.name || 'Unknown'}</Text>
                        {s.desc ? (
                          <Text style={st.ingCardDesc} numberOfLines={1}>{s.desc}</Text>
                        ) : null}
                      </View>
                      <View style={[st.ingBadge, { backgroundColor: s.bg, borderColor: s.color + '55' }]}>
                        <Text style={[st.ingBadgeText, { color: s.color }]}>{s.tag}</Text>
                      </View>
                    </View>
                    {/* What is this ingredient — shown for all */}
                    {(ing.reason || ing.notes) ? (
                      <View style={[st.ingRiskRow, { borderLeftColor: s.color + '55' }]}>
                        <Ionicons
                          name={ing._t === 'bad' ? 'warning-outline' : ing._t === 'good' ? 'information-circle-outline' : 'information-circle-outline'}
                          size={12}
                          color={s.color}
                          style={{ marginRight: 5, marginTop: 1 }}
                        />
                        <Text style={[st.ingRiskText, { color: ON_SURFACE_VAR, flexShrink: 1 }]}>
                          {ing.reason || ing.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
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
            // Format en:e330 → E330, or already-clean like "e330" → E330
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {formatted.map((code, idx) => (
                    <View key={idx} style={st.additivePill}>
                      <Text style={st.additivePillText}>{code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ── BETTER ALTERNATIVES ───────────────────────────────── */}
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
                        <AltImg uri={item.image} imgStyle={st.altImg} placeholderStyle={st.altImgPlaceholder} />
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

          {/* ── SAVE TO LOG ───────────────────────────────────────── */}
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
              <Text style={st.saveBtnText}>SAVE TO LOG</Text>
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

// ═══════════════════════════════════════════════════════════════════
// MAIN STYLES — Dark Brutalism
// ═══════════════════════════════════════════════════════════════════
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
  whyBtn: {
    marginTop: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 2, flexDirection: 'row', alignItems: 'center',
  },
  whyBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: WHITE },

  // WHY THIS SCORE expandable
  whySection: {
    marginHorizontal: 28, marginBottom: 28,
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: OUTLINE,
    padding: 20,
  },
  whyBarsWrap:  { marginBottom: 16 },
  whyBarRow:    { marginBottom: 12 },
  whyBarLabel:  { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: ON_SURFACE_VAR, textTransform: 'uppercase' },
  whyBarTrack:  { height: 4, backgroundColor: SURFACE_HIGH, borderRadius: 2, overflow: 'hidden' },
  whyBarFill:   { height: 4, borderRadius: 2 },
  whyReasonsList: { gap: 6 },
  whyPill: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1,
    marginBottom: 4,
  },
  whyPillText:   { flex: 1, fontSize: 12, lineHeight: 17 },
  whyPillImpact: { fontSize: 11, fontWeight: '700', marginLeft: 8 },

  // Verdict
  verdictSection:    { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 36 },
  verdictBadge:      { paddingHorizontal: 16, paddingVertical: 5, marginBottom: 14 },
  verdictBadgeText:  { color: '#1a1c1c', fontSize: 9, fontWeight: '900', letterSpacing: 5, textTransform: 'uppercase' },
  brandLabel:        { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: ON_SURFACE_VAR, marginBottom: 10, textTransform: 'uppercase' },
  verdictDesc:       { fontSize: 13, color: ON_SURFACE_VAR, textAlign: 'center', lineHeight: 20 },

  // Bento grid
  noNutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 24,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(71,71,71,0.4)',
    borderRadius: 12,
  },
  noNutText: { fontSize: 13, color: OUTLINE, flex: 1 },
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

  // Ingredient cards
  ingCard:       { paddingVertical: 14 },
  ingCardBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(71,71,71,0.25)' },
  ingCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ingCardIcon:   { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingCardName:   { fontSize: 14, fontWeight: '600', color: WHITE, marginBottom: 2 },
  ingCardDesc:   { fontSize: 11, color: ON_SURFACE_VAR, lineHeight: 15 },
  ingBadge:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  ingBadgeText:  { fontSize: 9, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  ingRiskRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, marginLeft: 56, paddingRight: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#474747' },
  ingRiskText:   { fontSize: 11, color: '#F87171', lineHeight: 16, flex: 1 },

  // Additives pills
  additivePill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2a1f10', borderWidth: 1, borderColor: '#FACC1540' },
  additivePillText: { fontSize: 11, fontWeight: '700', color: '#FACC15', letterSpacing: 1 },

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

export default ResultsScreenV2;
