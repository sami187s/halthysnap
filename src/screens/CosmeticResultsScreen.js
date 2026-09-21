import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Image,
  Alert,
  Platform,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';
import ShareScoreSheet from '../components/ShareScoreSheet';
import { saveToHistory } from '../utils/historyManager';
import { checkAndConsume } from '../utils/scanQuota';
import { isProductSaved, toggleSavedProduct } from '../utils/curatedProducts';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { getIngredientInfo } from '../services/usdaAPI';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const { width: W } = Dimensions.get('window');

const CosmeticAltImg = React.memo(({ uri, imgStyle }) => {
  const [err, setErr] = React.useState(false);
  if (!uri || err) {
    return (
      <View style={[imgStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="flask-outline" size={28} color="#D9D9D4" />
      </View>
    );
  }
  return <Image source={{ uri }} style={imgStyle} resizeMode="cover" onError={() => setErr(true)} />;
});

// -- Light Wellness Palette (Purely-aligned) --
const BG             = '#FFFFFF';
const SURFACE_LOW    = '#FFFFFF';
const SURFACE_HIGH   = '#F5F5F1';
const OUTLINE        = '#D9D9D4';
const ON_SURFACE     = '#171717';
const ON_SURFACE_VAR = '#737373';
const WHITE          = '#FFFFFF';
const PRIMARY        = '#27a567';
const GOOD_C         = '#84CC16';
const ERROR_C        = '#e74c3c';
const WARNING_C      = '#f5a623';
const AMBER_600      = '#d97706';
// Matches ResultsScreenV2 (food) exactly — keeps card borders/dividers/captions identical across both screens.
const NEUTRAL_100    = '#f5f5f5';
const NEUTRAL_300    = '#d4d4d4';
const NEUTRAL_400    = '#a3a3a3';
const NEUTRAL_800    = '#262626';
const TRACK_BG       = '#f1f1f1';

// Ingredient "function" values that read as additives (preservatives, dyes,
// surfactants, etc.) rather than active/beneficial skincare ingredients.
const ADDITIVE_FUNCTIONS = new Set([
  'preservative', 'surfactant', 'fragrance', 'colorant', 'emulsifier',
  'silicone', 'ph_adjuster', 'chelating', 'thickener', 'stabilizer',
]);

// -- Gauge constants (matches food ResultsScreenV2 exactly) --
const GAUGE_R    = 52;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// Purely-style 4-band score scale — aligned with ScoreRing.getScoreBand
// so score colors agree across every screen.
const getScoreColor = (sc) => {
  if (sc >= 70) return PRIMARY;
  if (sc >= 50) return WARNING_C;
  return ERROR_C;
};

const getVerdict = (sc) => {
  if (sc >= 85) return 'Excellent';
  if (sc >= 70) return 'Good';
  if (sc >= 50) return 'Fair';
  return 'Poor';
};

// -- VEE COLOR PALETTE (Purely-aligned) --
const C = {
  greenDark: '#27a567',
  green: '#27a567',
  greenMid: '#27a567',
  greenLight: 'rgba(39,165,103,0.08)',
  greenBg: 'rgba(39,165,103,0.08)',
  greenBr: 'rgba(39,165,103,0.22)',
  amber: '#f5a623',
  amberLight: 'rgba(245,166,35,0.10)',
  amberBg: 'rgba(245,166,35,0.10)',
  amberBr: 'rgba(245,166,35,0.22)',
  red: '#e74c3c',
  redLight: 'rgba(231,76,60,0.10)',
  redBg: 'rgba(231,76,60,0.10)',
  redBr: 'rgba(231,76,60,0.22)',
  purple: '#7B61FF',
  purpleBg: 'rgba(123,97,255,.09)',
  text: '#171717',
  text2: '#404040',
  muted: '#737373',
  muted2: '#A3A3A3',
  divider: 'rgba(0,0,0,0.06)',
  bg: '#FBFBF9',
  blue: '#3B6FE8',
  blueLight: '#E8F0FE',
  sep: 'rgba(0,0,0,0.06)',
  sep2: 'rgba(0,0,0,0.08)',
  page: '#FFFFFF',
};

// -- AI DAILY LIMIT --
const AI_DAILY_LIMIT = 2;
const AI_DAILY_KEY = 'cosmeticAIDailyCount';
const AI_DAILY_DATE_KEY = 'cosmeticAIDailyDate';

const getAIDailyUsage = async () => {
  const today = new Date().toDateString();
  const savedDate = await AsyncStorage.getItem(AI_DAILY_DATE_KEY);
  if (savedDate !== today) {
    await AsyncStorage.setItem(AI_DAILY_DATE_KEY, today);
    await AsyncStorage.setItem(AI_DAILY_KEY, '0');
    return { used: 0, remaining: AI_DAILY_LIMIT };
  }
  const used = parseInt(await AsyncStorage.getItem(AI_DAILY_KEY) || '0');
  return { used, remaining: Math.max(0, AI_DAILY_LIMIT - used) };
};

const incrementAIDailyUsage = async () => {
  const today = new Date().toDateString();
  await AsyncStorage.setItem(AI_DAILY_DATE_KEY, today);
  const used = parseInt(await AsyncStorage.getItem(AI_DAILY_KEY) || '0');
  await AsyncStorage.setItem(AI_DAILY_KEY, (used + 1).toString());
};

// -- INGREDIENT HELPERS --
const getShortDesc = (n) => {
  const l = n.toLowerCase();
  const db = {
    'water': 'Essential base solvent', 'aqua': 'Essential base solvent', 'glycerin': 'Natural moisturizer & humectant',
    'hyaluronic acid': 'Powerful deep hydrator', 'sodium hyaluronate': 'Deep hydration booster',
    'niacinamide': 'Reduces pores & brightens', 'vitamin c': 'Brightens & protects skin',
    'vitamin e': 'Antioxidant protection', 'tocopherol': 'Natural antioxidant (Vit E)',
    'tocopheryl acetate': 'Stable vitamin E form', 'ceramide': 'Repairs skin barrier',
    'aloe': 'Soothing & healing plant', 'shea butter': 'Rich natural moisturizer',
    'panthenol': 'Calming vitamin B5', 'dimethicone': 'Protective silicone layer',
    'cyclomethicone': 'Lightweight silicone', 'cyclopentasiloxane': 'Silicone slip agent',
    'cetyl alcohol': 'Softening fatty alcohol', 'cetearyl alcohol': 'Emollient thickener',
    'stearyl alcohol': 'Conditioning fatty alcohol', 'retinol': 'Anti-aging vitamin A',
    'retinal': 'Potent vitamin A derivative', 'glycolic acid': 'AHA gentle exfoliant',
    'salicylic acid': 'BHA that unclogs pores', 'lactic acid': 'Mild AHA exfoliant',
    'mandelic acid': 'Gentle AHA for sensitive skin', 'azelaic acid': 'Brightens & fights acne',
    'zinc oxide': 'Mineral UV sunscreen', 'titanium dioxide': 'Physical sun blocker',
    'fragrance': 'Synthetic scent � may irritate', 'parfum': 'Fragrance � potential irritant',
    'phenoxyethanol': 'Common preservative', 'alcohol denat': 'Drying solvent � can irritate',
    'ethanol': 'Drying alcohol solvent', 'isopropyl alcohol': 'Drying cleaning agent',
    'sodium lauryl sulfate': 'Harsh foaming cleanser', 'sodium laureth sulfate': 'Foaming surfactant',
    'methylparaben': 'Preservative � hormone concern', 'propylparaben': 'Preservative � avoid if sensitive',
    'butylparaben': 'Preservative � endocrine concern', 'formaldehyde': 'Toxic preservative � avoid',
    'triclosan': 'Antibacterial � endocrine disruptor', 'oxybenzone': 'Chemical UV filter � concern',
    'octinoxate': 'Chemical sunscreen � reef harm', 'avobenzone': 'UVA chemical filter',
    'propylene glycol': 'Humectant & penetration aid', 'butylene glycol': 'Lightweight moisturizer',
    'squalane': 'Plant-derived skin oil', 'squalene': 'Natural skin lipid',
    'jojoba': 'Balancing plant oil', 'argan': 'Nourishing hair & skin oil',
    'rosehip': 'Regenerating seed oil', 'tea tree': 'Antibacterial essential oil',
    'coconut oil': 'Rich emollient oil', 'olive oil': 'Nourishing plant oil',
    'sunflower': 'Lightweight plant oil', 'castor oil': 'Thick emollient oil',
    'allantoin': 'Soothes & heals skin', 'centella': 'Calms redness & repairs',
    'madecassoside': 'Centella healing compound', 'caffeine': 'Reduces puffiness',
    'peptide': 'Collagen-boosting protein', 'collagen': 'Skin firming protein',
    'elastin': 'Skin elasticity protein', 'keratin': 'Hair strengthening protein',
    'biotin': 'Hair & nail vitamin', 'urea': 'Intense hydration for dry skin',
    'benzoyl peroxide': 'Strong acne treatment', 'sulfur': 'Acne & oil control',
    'kaolin': 'Oil-absorbing clay', 'charcoal': 'Draws out impurities',
    'witch hazel': 'Natural astringent', 'chamomile': 'Anti-inflammatory botanical',
    'lavender': 'Calming botanical extract', 'green tea': 'Antioxidant-rich extract',
    'resveratrol': 'Powerful antioxidant', 'ferulic acid': 'Boosts vitamin C & E',
    'bakuchiol': 'Natural retinol alternative', 'tranexamic acid': 'Fades dark spots',
    'kojic acid': 'Skin brightening agent', 'arbutin': 'Gentle skin lightener',
    'licorice': 'Brightens & soothes', 'turmeric': 'Anti-inflammatory botanical',
    'snail mucin': 'Hydrating & repairing', 'bee venom': 'Firming & anti-wrinkle',
    'honey': 'Natural humectant & healer', 'propolis': 'Antibacterial bee product',
    'xanthan gum': 'Natural gel thickener', 'carbomer': 'Synthetic gel thickener',
    'polysorbate': 'Emulsifier & solubilizer', 'sodium benzoate': 'Mild preservative',
    'potassium sorbate': 'Food-grade preservative', 'citric acid': 'pH balancer',
    'sodium hydroxide': 'pH adjuster', 'triethanolamine': 'pH balancer � mild concern',
    'edta': 'Chelating stabilizer', 'bht': 'Synthetic antioxidant � some concern',
    'peg-': 'Penetration enhancer � concern', 'ceteareth': 'Emulsifier (PEG-based)',
    'stearic acid': 'Natural thickening fatty acid', 'palmitic acid': 'Common fatty acid',
    'myristic acid': 'Cleansing fatty acid', 'lauric acid': 'Antimicrobial fatty acid',
    'mineral oil': 'Occlusive petroleum derivative', 'petrolatum': 'Moisture-sealing barrier',
    'lanolin': 'Wool-derived emollient', 'beeswax': 'Natural protective wax',
    'silica': 'Mattifying mineral powder', 'talc': 'Absorbent mineral powder',
    'mica': 'Shimmer mineral pigment', 'iron oxide': 'Mineral color pigment',
    'ci 77891': 'Titanium dioxide pigment', 'ci 77491': 'Iron oxide colorant',
  };
  if (db[l]) return db[l];
  for (const [k, v] of Object.entries(db)) { if (l.includes(k)) return v; }
  return null;
};

// -- Score Gauge ------------------------------------------------------
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

export default function CosmeticResultsScreen({ route, navigation }) {
  const { barcode } = route.params;
  const fromSearch = route?.params?.fromSearch || false;
  const freeAIAccess = route?.params?.freeAIAccess || false;
  const devProduct = route?.params?.devProduct || null;
  const devAnalysis = route?.params?.devAnalysis || null;
  const devZoomOut = route?.params?.devZoomOut || false;
  const preloadedData = route?.params?.preloadedData || null;
  const skipFetch = route?.params?.skipFetch || false;

  const safeAreaInsets = useSafeAreaInsetsWithFallback();
  const [product, setProduct] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPremium, setIsPremium] = useState(true);
  const [hasAIAccess, setHasAIAccess] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiDailyUsage, setAiDailyUsage] = useState({ used: 0, remaining: AI_DAILY_LIMIT });
  const [freeRecUsage, setFreeRecUsage] = useState({ remaining: 2, total: 2 });
  const [realAlternatives, setRealAlternatives] = useState([]);
  const [altsLoading, setAltsLoading] = useState(false);
  const [expandedIngredient, setExpandedIngredient] = useState(null);
  const [usdaCache, setUsdaCache]                   = useState({});
  const [usdaLoading, setUsdaLoading]               = useState(null);
  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' | 'additives'
  const [showWhyRating, setShowWhyRating] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const whySheetY = useRef(new Animated.Value(420)).current;
  const ingSheetY = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // -- DATA FETCH --
  useEffect(() => {
    if (devProduct && devAnalysis) {
      setProduct(devProduct);
      setAnalysis(devAnalysis);
      setLoading(false);
      setPremiumLoading(false);
      checkSubscriptionStatus();
    } else if (skipFetch && preloadedData) {
      // Elite product: use hardcoded data, skip all API calls
      const stub = {
        product_name: preloadedData.product_name,
        brands: preloadedData.brands,
        image_url: preloadedData.image_url,
        ingredients_text: preloadedData.ingredients_text || '',
        nutriments: preloadedData.nutriments || {},
      };
      const stubAnalysis = analyzeIngredients(stub.ingredients_text, 'cosmetic', {}, stub);
      stubAnalysis.score = preloadedData.curatedScore;
      setProduct(stub);
      setAnalysis(stubAnalysis);
      setLoading(false);
      setPremiumLoading(false);
      checkSubscriptionStatus();
    } else {
      fetchProductData();
    }
  }, [barcode]);

  useFocusEffect(useCallback(() => {
    checkSubscriptionStatus();
    refreshAIDailyUsage();
    refreshFreeRecUsage();
  }, [product, analysis, aiAnalysis, aiLoading]));

  const refreshAIDailyUsage = async () => {
    const usage = await getAIDailyUsage();
    setAiDailyUsage(usage);
  };

  const refreshFreeRecUsage = async () => {
    try {
      const usage = await getFreeRecommendationUsage();
      setFreeRecUsage(usage);
    } catch (e) {}
  };

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      const productData = await fetchProductByBarcode(barcode);
      if (!productData || !productData.product_name) {
        navigation.replace('ProductNotFound', { barcode, productType: 'cosmetic' });
        return;
      }
      // Real ingredient list required. No list (or nothing recognised) = no honest
      // score, so we don't show a made-up number and it doesn't cost a free scan.
      const ingredients = productData.ingredients_text || '';
      const analysisResult = ingredients.trim().length >= 10
        ? analyzeIngredients(ingredients, 'cosmetic', {}, productData)
        : null;
      if (!analysisResult || analysisResult.score === null || analysisResult.score === undefined) {
        navigation.replace('ProductNotFound', { barcode, productType: 'cosmetic', reason: 'nodata' });
        return;
      }
      // Free-tier daily scan quota — a found product counts; block at the limit.
      const quota = await checkAndConsume('cosmetic', barcode);
      if (quota.blocked) {
        navigation.replace('Subscription', { reason: 'limit' });
        return;
      }
      setProduct(productData);
      setAnalysis(analysisResult);
      setLoading(false);

      await saveToHistory({
        barcode, productName: productData.product_name, brand: productData.brands || '',
        productImage: productData.image_url,
        productType: 'cosmetic', score: analysisResult.score,
        ingredients: productData.ingredients_text || '', source: productData.source || 'Unknown'
      });
      isProductSaved(barcode).then(setIsSaved);
      await incrementTrialCounter();
    } catch (err) {
      setError('Failed to analyze product. Please try again.');
      setLoading(false);
    }
  };

  const incrementTrialCounter = async () => {
    try {
      const sub = await AsyncStorage.getItem('subscriptionType');
      if (sub !== 'Premium') {
        const used = parseInt(await AsyncStorage.getItem('premiumTrialUsedToday') || '0');
        if (used < 2) await AsyncStorage.setItem('premiumTrialUsedToday', (used + 1).toString());
      }
    } catch (e) {}
  };

  // -- FETCH REAL ALTERNATIVES FROM OPEN BEAUTY FACTS --
  const fetchRealAlternatives = useCallback(async (productData, category) => {
    if (!productData) return;
    setAltsLoading(true);
    try {
      // Use product categories or name for better search results
      const productName = productData?.product_name || '';
      const cats = productData?.categories_tags || productData?.categories || [];
      const catString = Array.isArray(cats) ? cats.slice(0, 2).map(c => c.replace(/^en:/, '')).join(' ') : '';
      const searchTerm = catString || category || productName.split(' ').slice(0, 2).join(' ') || 'skincare';
      
      const response = await axios.get('https://world.openbeautyfacts.org/cgi/search.pl', {
        params: {
          search_terms: searchTerm,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 30,
          sort_by: 'unique_scans_n',
        },
        headers: { 'User-Agent': 'HealthyScan/1.0', 'Accept': 'application/json' },
        timeout: 10000,
      });
      if (response.data?.products) {
        const alts = response.data.products
          .filter(p =>
            p.product_name && p.product_name.trim() !== '' &&
            p.code && p.code !== barcode &&
            (p.image_url || p.image_front_url) &&
            p.ingredients_text && p.ingredients_text.trim().length > 10
          )
          .map(p => {
            const ingText = p.ingredients_text || '';
            // No default score: only real analysis results count
            let altScore = null;
            if (ingText) {
              const ingResult = analyzeIngredients(ingText, 'cosmetic', {}, p);
              altScore = ingResult?.score ?? null;
            }
            return {
              name: p.product_name,
              brand: p.brands || '',
              image: p.image_url || p.image_front_url || null,
              barcode: p.code,
              score: altScore,
            };
          })
          .filter(p => p.score != null && p.score >= 80)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        if (alts.length > 0) {
          setRealAlternatives(alts);
        }
      }
    } catch (e) {
      console.log('?? Failed to fetch alternatives:', e.message);
    } finally {
      setAltsLoading(false);
    }
  }, [barcode]);

  // Better Alternatives data - category-matched, 5+ items
  const productCategory = useMemo(() => {
    const name = (product?.product_name || '').toLowerCase();
    const cats = product?.categories_tags || product?.categories || [];
    const catStr = (Array.isArray(cats) ? cats.join(' ') : String(cats)).toLowerCase();
    const all = name + ' ' + catStr;
    if (all.match(/moisturiz|cream|lotion|hydrat/)) return 'Moisturizer';
    if (all.match(/cleanse|wash|foam|micellar/)) return 'Cleanser';
    if (all.match(/serum|essence|ampoule/)) return 'Serum';
    if (all.match(/sunscreen|spf|sun\s?block|uv/)) return 'Sunscreen';
    if (all.match(/shampoo/)) return 'Shampoo';
    if (all.match(/conditioner/)) return 'Conditioner';
    if (all.match(/mask|masque|peel/)) return 'Face Mask';
    if (all.match(/toner|astringent/)) return 'Toner';
    if (all.match(/lipstick|lip\s?balm|lip\s?gloss/)) return 'Lip Product';
    if (all.match(/foundation|concealer|bb\s?cream|cc\s?cream/)) return 'Foundation';
    if (all.match(/mascara|eyeliner|eye\s?shadow/)) return 'Eye Makeup';
    if (all.match(/deodorant|antiperspirant/)) return 'Deodorant';
    if (all.match(/body\s?wash|shower\s?gel|soap/)) return 'Body Wash';
    if (all.match(/perfume|fragrance|cologne|eau\s?de/)) return 'Fragrance';
    return 'Skincare';
  }, [product]);

  // Trigger alternatives fetch when product + category are ready
  useEffect(() => {
    if (product && productCategory && !loading) {
      fetchRealAlternatives(product, productCategory);
    }
  }, [product, productCategory, loading]);

  // -- SUBSCRIPTION CHECK --
  const checkSubscriptionStatus = async () => {
    try {
      setPremiumLoading(true);
      if (fromSearch && freeAIAccess) {
        setIsPremium(false);
        setHasAIAccess(true);
        setPremiumLoading(false);
        // (No automatic AI analysis here: its result was never shown, so it only cost money.)
        return true;
      }
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const expiresAt = await AsyncStorage.getItem('subscriptionExpiresAt');
      const trialActivated = await AsyncStorage.getItem('premiumTrialActivated');
      const trialUsed = await AsyncStorage.getItem('premiumTrialUsedToday');

      let premium = false;
      if (subscriptionType === 'Premium') {
        // Keep premium unlocked even if legacy/test data has no expiry timestamp.
        if (!expiresAt) {
          premium = true;
        } else {
          const exp = new Date(parseInt(expiresAt, 10));
          if (exp > new Date()) { premium = true; }
          else {
            await AsyncStorage.multiRemove(['subscriptionType','subscriptionExpiresAt','originalTransactionId','premiumTrialActivated','premiumTrialUsedToday']);
          }
        }
      }
      const hasTrialAccess = trialActivated === 'true' && parseInt(trialUsed || '0') < 2;
      const hasAccess = premium || hasTrialAccess;
      setIsPremium(premium);
      setHasAIAccess(hasAccess);
      setPremiumLoading(false);
      return hasAccess;
    } catch (e) {
      setPremiumLoading(false);
      setIsPremium(false);
      setHasAIAccess(false);
      return false;
    }
  };


  useEffect(() => {
    if (product && analysis && !loading) { checkSubscriptionStatus(); }
  }, [product, analysis, loading]);

  // Fade in once the product + analysis are ready (matches food ResultsScreenV2)
  useEffect(() => {
    if (!loading && product && analysis) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [analysis, loading, product]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleScanAnother = useCallback(() => navigation.navigate('Home', { startScanning: true }), [navigation]);

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
    setShowWhyRating(true);
    whySheetY.setValue(420);
    Animated.spring(whySheetY, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true }).start();
  };
  const closeWhySheet = () => {
    Animated.timing(whySheetY, { toValue: 420, duration: 200, useNativeDriver: true }).start(() => {
      setShowWhyRating(false);
    });
  };

  const score = useMemo(() => analysis?.score ?? 0, [analysis?.score]);
  const scoreColor = useMemo(() => getScoreColor(score), [score]);

  // Ingredient lists from analyzer
  const analyzedList = useMemo(() => analysis?.analyzedIngredients || [], [analysis]);
  const badIngs = useMemo(() => analyzedList.filter(i => (i.status || '').toUpperCase() === 'POOR' || (i.category || '').toLowerCase() === 'bad' || (i.score != null && i.score < 45)), [analyzedList]);
  const moderateIngs = useMemo(() => analyzedList.filter(i => (i.status || '').toUpperCase() === 'MODERATE' || (i.category || '').toLowerCase() === 'moderate' || (i.category || '').toLowerCase() === 'unknown' || (i.score != null && i.score >= 45 && i.score < 70)), [analyzedList]);
  const goodIngs = useMemo(() => analyzedList.filter(i => { const s = (i.status || '').toUpperCase(); const c = (i.category || '').toLowerCase(); return s === 'GOOD' || s === 'EXCELLENT' || c === 'good' || c === 'excellent' || (i.score != null && i.score >= 70 && s !== 'POOR' && s !== 'MODERATE' && c !== 'bad' && c !== 'moderate'); }), [analyzedList]);
  const additivesList = useMemo(() => analyzedList.filter(i => ADDITIVE_FUNCTIONS.has((i.function || '').toLowerCase())), [analyzedList]);

  // \u2500\u2500 Derived render data \u2500\u2500
  const productName = product?.product_name || product?.name || 'Unknown Product';
  const brandName   = product?.brands || '';
  const verdict     = getVerdict(score);

  // Names the actual ingredients driving the score, instead of a generic
  // canned sentence — so this reads as product-specific, not boilerplate.
  const verdictDesc = useMemo(() => {
    const namesOf = (list) => list.map(i => i.name).filter(Boolean).slice(0, 2);
    const totalAnalyzed = analyzedList.length;

    if (badIngs.length > 0) {
      const names = namesOf(badIngs);
      const rest = badIngs.length - names.length;
      const list = names.join(' and ') + (rest > 0 ? `, and ${rest} more` : '');
      return `Contains ${badIngs.length} ingredient${badIngs.length === 1 ? '' : 's'} flagged as a safety concern, including ${list}.`;
    }
    if (moderateIngs.length > 0) {
      const names = namesOf(moderateIngs);
      const rest = moderateIngs.length - names.length;
      const list = names.join(' and ') + (rest > 0 ? `, and ${rest} more` : '');
      return `No high-risk ingredients found, but ${moderateIngs.length} — including ${list} — may cause irritation for sensitive skin.`;
    }
    if (totalAnalyzed > 0) {
      return `All ${totalAnalyzed} analyzed ingredients rated safe or beneficial — no concerning ingredients found.`;
    }
    return 'Ingredient list unavailable for this product.';
  }, [badIngs, moderateIngs, analyzedList]);

  const handleShare = () => setShowShareSheet(true);

  const handleToggleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = await toggleSavedProduct({
      barcode,
      name: productName,
      brand: brandName,
      image: product.image_url || null,
      productType: 'cosmetic',
      score,
      ingredients: product.ingredients_text || '',
    });
    if (newState !== null) setIsSaved(newState);
  };

  const allIngredientsForDisplay = [
    ...goodIngs.map(i => ({ ...i, _t: 'good' })),
    ...moderateIngs.map(i => ({ ...i, _t: 'moderate' })),
    ...badIngs.map(i => ({ ...i, _t: 'bad' })),
  ];
  const displayed = allIngredientsForDisplay;
  const activeIngredient = expandedIngredient
    ? allIngredientsForDisplay.find(i => (i.name || '').toLowerCase().trim() === expandedIngredient)
    : null;

  const ingStyle = (_t) => {
    if (_t === 'good')     return { color: PRIMARY,   bg: C.greenBg, tag: 'GOOD'     };
    if (_t === 'bad')      return { color: ERROR_C,   bg: C.redBg,   tag: 'AVOID'    };
    return                        { color: WARNING_C, bg: C.amberBg, tag: 'MODERATE' };
  };

  const additiveRiskTier = (item) => {
    const sc = item?.score;
    if (sc != null && sc >= 70) return { label: 'Low risk',      color: PRIMARY,   bg: C.greenBg, icon: 'checkmark-circle' };
    if (sc != null && sc < 45)  return { label: 'Poor',          color: ERROR_C,   bg: C.redBg,   icon: 'alert-circle'     };
    return                             { label: 'Moderate risk', color: WARNING_C, bg: C.amberBg, icon: 'warning'          };
  };

  const fallbackAlts = [
    { name: 'CeraVe Moisturizing Cream',      brand: 'CERAVE',          image: null, barcode: null, score: Math.min(95, score + 20) },
    { name: 'The Ordinary Niacinamide 10%',   brand: 'THE ORDINARY',    image: null, barcode: null, score: Math.min(93, score + 18) },
    { name: 'Vanicream Gentle Cleanser',       brand: 'VANICREAM',       image: null, barcode: null, score: Math.min(91, score + 15) },
    { name: 'La Roche-Posay Toleriane',        brand: 'LA ROCHE-POSAY',  image: null, barcode: null, score: Math.min(90, score + 12) },
  ];
  const altsData = realAlternatives.length > 0 ? realAlternatives : fallbackAlts;

  // \u2500\u2500 LOADING / ERROR \u2500\u2500
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={{ fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, fontWeight: '500' }}>Analyzing product...</Text>
    </View>
  );
  if (error || !product || !analysis) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: safeAreaInsets.top + 50 }}>
      <Ionicons name="alert-circle-outline" size={48} color={ERROR_C} />
      <Text style={{ fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, fontWeight: '500' }}>{error || 'Missing data'}</Text>
      <TouchableOpacity style={{ marginTop: 24, borderRadius: 24, borderWidth: 1, borderColor: OUTLINE, paddingVertical: 12, paddingHorizontal: 32 }} onPress={handleGoBack}>
        <Text style={{ color: ON_SURFACE, fontSize: 14, fontWeight: '600' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // RENDER \u2014 Dark Brutalism (matching food screen, no nutrition grid)
  // ============================================================
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* HERO: Product Image with brand/name overlay */}
          <View style={st.heroContainer}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={st.heroImage} resizeMode="cover" />
            ) : (
              <View style={[st.heroImage, st.heroPlaceholder]}>
                <Ionicons name="flask-outline" size={80} color={OUTLINE} />
              </View>
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.10)', 'transparent', 'rgba(0,0,0,0.35)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={st.heroTextWrap}>
              {!!brandName && <Text style={st.heroBrand} numberOfLines={1}>{brandName}</Text>}
              <Text style={st.heroName} numberOfLines={1}>{productName}</Text>
            </View>
          </View>

          {/* FLOATING NAV BUTTONS (over hero) */}
          <View style={[st.floatingNav, { top: safeAreaInsets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoBack(); }}
              style={st.floatingBtn}
            >
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
              <Ionicons name="arrow-back" size={20} color={ON_SURFACE} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={handleShare} style={st.floatingBtn}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
                <Ionicons name="share-social-outline" size={19} color={ON_SURFACE} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleSave} style={st.floatingBtn}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={ON_SURFACE} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SCORE GAUGE (overlaps hero / content boundary) */}
          <View style={st.gaugeOverlapWrap}>
            <ScoreGauge score={score} scoreColor={scoreColor} verdict={verdict} />
          </View>
          <Text style={st.scoreCaption}>Safety score · /100</Text>

          {/* WHY THIS RATING card */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity style={st.whyCard} activeOpacity={0.85} onPress={openWhySheet}>
              <View style={st.whyCardIcon}>
                <Ionicons name="information-circle" size={16} color={PRIMARY} />
              </View>
              <Text style={st.whyCardText}>Why this rating?</Text>
              <Ionicons name="chevron-forward" size={17} color={NEUTRAL_300} />
            </TouchableOpacity>
          </View>

          {/* SEGMENTED TABS: Ingredients / Additives */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={st.tabBar}>
              {[
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
          </View>

          {/* INGREDIENT BREAKDOWN */}
          {activeTab === 'ingredients' && displayed.length === 0 && (
            <View style={st.emptyTabBox}>
              <Text style={st.emptyTabText}>No ingredient list available.</Text>
            </View>
          )}
          {activeTab === 'ingredients' && displayed.length > 0 && (
            <View style={st.section}>
              <View style={st.ingListCard}>
                {displayed.map((ing, idx) => {
                  const isGood      = ing._t === 'good';
                  const statusIcon  = isGood ? 'checkmark' : 'warning';
                  const statusColor = isGood ? PRIMARY : WARNING_C;
                  const statusBg    = isGood ? C.greenBg : C.amberBg;
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

          {/* ADDITIVES */}
          {activeTab === 'additives' && additivesList.length === 0 && (
            <View style={st.section}>
              <View style={st.cleanBox}>
                <Ionicons name="leaf" size={18} color={PRIMARY} />
                <Text style={st.cleanBoxText}>No additives detected — clean product.</Text>
              </View>
            </View>
          )}
          {activeTab === 'additives' && additivesList.length > 0 && (
            <View style={[st.section, { gap: 8 }]}>
              {additivesList.map((item, idx) => {
                const risk = additiveRiskTier(item);
                const desc = item.notes || item.concerns || getShortDesc(item.name || '');
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.75}
                    onPress={() => handleIngredientTap(item)}
                  >
                    <View style={st.additiveCard}>
                      <View style={[st.additiveCardCircle, { backgroundColor: risk.bg }]}>
                        <Ionicons name={risk.icon} size={16} color={risk.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.additiveCardName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
                        <Text style={[st.additiveCardRisk, { color: risk.color }]}>{risk.label}</Text>
                        {desc ? <Text style={st.additiveCardDesc} numberOfLines={2}>{desc}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={NEUTRAL_300} style={{ marginTop: 8 }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* BETTER ALTERNATIVES */}
          <View style={st.altSection}>
            <Text style={st.altSectionLabel}>BETTER CHOICES</Text>
            {altsLoading && realAlternatives.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ color: ON_SURFACE_VAR, fontSize: 11, marginTop: 10 }}>Finding alternatives...</Text>
              </View>
            ) : altsData.length === 0 ? (
              <View style={{ paddingVertical: 20, paddingHorizontal: 20 }}>
                <Text style={{ color: ON_SURFACE_VAR, fontSize: 12 }}>No alternatives found yet.</Text>
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
                      onPress={() => item.barcode && navigation.push('CosmeticResults', { barcode: item.barcode })}
                    >
                      <View style={st.altImgBox}>
                        <CosmeticAltImg uri={item.image} imgStyle={st.altImg} />
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

          {/* PRODUCT CODE */}
          {!!(product.code || product.barcode || barcode) && (
            <Text style={st.barcodeFooter}>{product.code || product.barcode || barcode}</Text>
          )}
          <Text style={st.dataCredit}>Product data: Open Beauty Facts contributors (ODbL)</Text>

        </Animated.View>
      </ScrollView>

      {/* ── WHY THIS RATING — bottom sheet ────────────────────────── */}
      <Modal
        visible={showWhyRating}
        transparent
        animationType="none"
        onRequestClose={closeWhySheet}
      >
        <TouchableOpacity style={st.ingSheetOverlay} activeOpacity={1} onPress={closeWhySheet}>
          <Animated.View style={[st.ingSheet, { transform: [{ translateY: whySheetY }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={st.ingSheetHandle} />
              <View style={st.ingSheetHeader}>
                <Text style={st.ingSheetTitle}>Why this rating</Text>
                <TouchableOpacity style={st.ingSheetClose} onPress={closeWhySheet}>
                  <Ionicons name="close" size={18} color={ON_SURFACE} />
                </TouchableOpacity>
              </View>
              <ScrollView style={st.ingSheetBody} showsVerticalScrollIndicator={false}>
                <Text style={st.ingSheetText}>{verdictDesc}</Text>
                <View style={[st.whyDotList, { marginTop: 16 }]}>
                  {goodIngs.length > 0 && (
                    <View style={st.whyDotRow}>
                      <View style={[st.whyDot, { backgroundColor: PRIMARY }]} />
                      <Text style={st.whyDotText}>{goodIngs.length} ingredient{goodIngs.length === 1 ? '' : 's'} rated safe / beneficial</Text>
                    </View>
                  )}
                  {moderateIngs.length > 0 && (
                    <View style={st.whyDotRow}>
                      <View style={[st.whyDot, { backgroundColor: WARNING_C }]} />
                      <Text style={st.whyDotText}>{moderateIngs.length} ingredient{moderateIngs.length === 1 ? '' : 's'} with moderate concern</Text>
                    </View>
                  )}
                  {badIngs.length > 0 && (
                    <View style={st.whyDotRow}>
                      <View style={[st.whyDot, { backgroundColor: ERROR_C }]} />
                      <Text style={st.whyDotText}>{badIngs.length} ingredient{badIngs.length === 1 ? '' : 's'} flagged as a safety concern</Text>
                    </View>
                  )}
                </View>
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
                const s = ingStyle(activeIngredient._t);
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
                    <View style={[st.ingSheetPill, { backgroundColor: s.bg }]}>
                      <Text style={[st.ingSheetPillText, { color: s.color }]}>{s.tag.toLowerCase()}</Text>
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
}

// =============================================================
// GAUGE STYLES
// =============================================================
const g = StyleSheet.create({
  container:    { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  gaugeBg:      {
    position: 'absolute', width: 128, height: 128, borderRadius: 64,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  center:       { position: 'absolute', alignItems: 'center' },
  scoreNum:     { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  scoreVerdict: { fontSize: 12, fontWeight: '600', marginTop: 1 },
});

// =============================================================
// MAIN STYLES \u2014 Light Wellness
// =============================================================
const st = StyleSheet.create({
  // Hero — full-bleed image with gradient scrim + brand/name overlay (matches food)
  heroContainer:   { width: '100%', height: 288, position: 'relative', backgroundColor: SURFACE_HIGH, overflow: 'hidden' },
  heroImage:       { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' },
  heroTextWrap:    { position: 'absolute', left: 20, right: 20, bottom: 16 },
  heroBrand:       { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  heroName:        { fontSize: 20, fontWeight: '800', color: WHITE, lineHeight: 24 },

  // Floating nav buttons over the hero
  floatingNav: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 50 },
  floatingBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  // Score gauge — overlaps hero/content boundary
  gaugeOverlapWrap: { alignItems: 'center', marginTop: -40 },
  scoreCaption:     { textAlign: 'center', fontSize: 12, color: NEUTRAL_400, marginTop: 10, marginBottom: 20 },

  // "Why this rating" card
  whyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE_LOW, borderRadius: 16, borderWidth: 1, borderColor: NEUTRAL_100,
    padding: 16,
  },
  whyCardIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
  },
  whyCardText: { flex: 1, fontSize: 14, fontWeight: '600', color: ON_SURFACE },
  whyDotList:  { gap: 14 },
  whyDotRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  whyDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  whyDotText:  { flex: 1, fontSize: 14, lineHeight: 20, color: ON_SURFACE },

  // Segmented tab bar
  tabBar: { flexDirection: 'row', height: 44, backgroundColor: NEUTRAL_100, borderRadius: 16, padding: 4 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  tabBtnActive:     { backgroundColor: SURFACE_LOW },
  tabBtnText:       { fontSize: 12, fontWeight: '500', color: ON_SURFACE_VAR },
  tabBtnTextActive: { color: PRIMARY, fontWeight: '600' },
  emptyTabBox:  { paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center' },
  emptyTabText: { fontSize: 14, color: NEUTRAL_400, textAlign: 'center' },

  section:       { paddingHorizontal: 20, paddingBottom: 12 },

  cleanBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 16, backgroundColor: C.greenBg,
  },
  cleanBoxText: { fontSize: 13, color: PRIMARY, fontWeight: '500', flex: 1 },

  additiveCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: SURFACE_LOW, borderRadius: 16, borderWidth: 1, borderColor: NEUTRAL_100,
    padding: 16,
  },
  additiveCardCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  additiveCardName:   { fontSize: 14, fontWeight: '600', color: ON_SURFACE, marginBottom: 2 },
  additiveCardRisk:   { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  additiveCardDesc:   { fontSize: 12, color: NEUTRAL_400, lineHeight: 17 },

  // Ingredients — one continuous card, rows separated by hairline dividers (matches food)
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
  ingStatusCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingCardName:   { fontSize: 14, fontWeight: '600', color: NEUTRAL_800 },
  ingTagText:    { fontSize: 12, fontWeight: '600', color: AMBER_600 },

  ingDetailRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ingDetailLabel:  { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  ingDetailText:   { fontSize: 13, color: '#1a1c19', lineHeight: 19 },
  ingDetailSource: { fontSize: 10, color: '#6b7c69', marginTop: 10, textAlign: 'right', fontStyle: 'italic' },

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

  altSection:        { marginBottom: 28 },
  altSectionLabel:   { fontSize: 12, fontWeight: '600', color: NEUTRAL_400, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 14, marginTop: 8 },
  altCard:           { width: 112 },
  altImgBox:         { width: 112, height: 112, backgroundColor: SURFACE_HIGH, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  altImg:            { width: '100%', height: '100%' },
  altName:      { fontSize: 12, fontWeight: '600', color: ON_SURFACE, lineHeight: 16, marginBottom: 2 },
  altBrand:     { fontSize: 12, fontWeight: '400', color: NEUTRAL_400, marginBottom: 4 },
  altScoreText: { fontSize: 12, fontWeight: '700' },

  barcodeFooter: { textAlign: 'center', fontSize: 12, color: ON_SURFACE_VAR, letterSpacing: 1, marginBottom: 8 },
  dataCredit: { textAlign: 'center', fontSize: 11, color: ON_SURFACE_VAR, marginBottom: 24, paddingHorizontal: 24 },
});