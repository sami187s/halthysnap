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
  LayoutAnimation,
  UIManager,
  Dimensions,
  TextInput,
  Share,
  FlatList,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/shared/ScreenWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import LuxuryLoadingComponent from '../components/LuxuryLoadingComponent';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';
import { AIService } from '../services/aiService';
import ProductAIChat from '../components/ProductAIChat';
import IngredientDNAHelix from '../components/IngredientDNAHelix';
import { saveToHistory } from '../utils/historyManager';
import { getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width: W } = Dimensions.get('window');

// -- Dark Brutalism Palette --
const BG             = '#000000';
const SURFACE        = '#131313';
const SURFACE_LOW    = '#1b1b1b';
const SURFACE_HIGH   = '#2a2a2a';
const OUTLINE        = '#474747';
const ON_SURFACE     = '#e2e2e2';
const ON_SURFACE_VAR = '#c6c6c6';
const WHITE          = '#ffffff';

// -- Gauge constants --
const GAUGE_R    = 96;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

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

// -- VEE COLOR PALETTE --
const C = {
  greenDark: '#1E5C3A',
  green: '#2A7D4F',
  greenMid: '#4CAF7C',
  greenLight: '#E8F5EE',
  greenBg: 'rgba(42,125,79,0.10)',
  greenBr: 'rgba(42,125,79,0.22)',
  amber: '#E8820C',
  amberLight: '#FEF3E7',
  amberBg: 'rgba(232,130,12,0.10)',
  amberBr: 'rgba(232,130,12,0.22)',
  red: '#D94040',
  redLight: '#FDEAEA',
  redBg: 'rgba(217,64,64,0.10)',
  redBr: 'rgba(217,64,64,0.22)',
  purple: '#7C3AED',
  purpleBg: 'rgba(124,58,237,.09)',
  text: '#1A2318',
  text2: '#3A3F4A',
  muted: '#6B7C6A',
  muted2: '#A0A8B4',
  divider: '#EAEEEA',
  bg: '#F7F9F6',
  blue: '#3B6FE8',
  blueLight: '#E8F0FE',
  sep: '#EAEEEA',
  sep2: '#E4E6EA',
  page: '#FFFFFF',
};

const scoreToColor = (s) => s >= 70 ? C.green : s >= 40 ? C.amber : C.red;
const scoreToLabel = (s) => s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 50 ? 'Use with Caution' : s >= 30 ? 'Poor' : 'Risky';
const scoreToVerdictBg = (s) => {
  if (s >= 70) return { bg: 'rgba(42,125,79,0.15)', border: 'rgba(42,125,79,0.3)' };
  if (s >= 40) return { bg: 'rgba(232,130,12,0.15)', border: 'rgba(232,130,12,0.3)' };
  return { bg: 'rgba(217,64,64,0.15)', border: 'rgba(217,64,64,0.3)' };
};
const scoreToDesc = (s, analysis) => {
  const bad = analysis?.badCount || analysis?.badIngredients?.length || 0;
  const good = (analysis?.excellentCount || 0) + (analysis?.goodCount || analysis?.goodIngredients?.length || 0);
  if (s >= 70) return `Generally safe product with ${good} beneficial ingredients. Suitable for most skin types.`;
  if (s >= 40) return `Contains ${bad} concern${bad !== 1 ? 's' : ''} alongside beneficial actives. Some ingredients may cause reactions in sensitive skin.`;
  return `Multiple concerning ingredients detected. Consider alternatives if you have sensitive skin.`;
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
const getIngIcon = (n) => {
  const l = n.toLowerCase();
  if (l.includes('water') || l.includes('aqua')) return 'water-outline';
  if (l.includes('glycerin') || l.includes('hyaluronic') || l.includes('sorbitol')) return 'rainy-outline';
  if (l.includes('oil') || l.includes('butter') || l.includes('squalane')) return 'flame-outline';
  if (l.includes('extract') || l.includes('aloe') || l.includes('botanical') || l.includes('chamomil')) return 'leaf-outline';
  if (l.includes('vitamin') || l.includes('tocopherol') || l.includes('retinol') || l.includes('niacinamide') || l.includes('panthenol')) return 'medkit-outline';
  if (l.includes('sunscreen') || l.includes('spf') || l.includes('avobenzone')) return 'sunny-outline';
  if (l.includes('zinc oxide') || l.includes('titanium') || l.includes('mica')) return 'diamond-outline';
  if (l.includes('fragrance') || l.includes('parfum') || l.includes('linalool') || l.includes('limonene')) return 'rose-outline';
  if (l.includes('dimethicone') || l.includes('siloxane') || l.includes('silicone')) return 'ellipse-outline';
  if (l.includes('cetearyl') || l.includes('stearate') || l.includes('laureth') || l.includes('polysorbate')) return 'git-merge-outline';
  if (l.includes('acid') || l.includes('glycolic') || l.includes('salicylic')) return 'flask-outline';
  if (l.includes('paraben') || l.includes('phenoxyethanol') || l.includes('preservative')) return 'shield-outline';
  if (l.includes('sulfate') || l.includes('sulphate')) return 'warning-outline';
  if (l.includes('alcohol') || l.includes('ethanol')) return 'wine-outline';
  return 'ellipsis-horizontal-circle-outline';
};

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

const getDetailedExplanation = (name) => {
  const l = name.toLowerCase().trim();
  const db = {
    'water': 'Water (Aqua) is the most common base ingredient in cosmetics. It dissolves other ingredients and helps deliver them to the skin.',
    'aqua': 'Aqua is the INCI name for water, used as a base in most cosmetic formulations.',
    'glycerin': 'Glycerin is a humectant that draws moisture from the air into your skin. It strengthens the skin barrier and is well-tolerated by all skin types.',
    'hyaluronic acid': 'Hyaluronic acid holds up to 1000x its weight in water. It deeply hydrates, plumps fine lines, and supports the skin barrier.',
    'niacinamide': 'Vitamin B3 that reduces pore size, regulates oil production, fades dark spots, and strengthens the skin barrier.',
    'dimethicone': 'A silicone that creates a protective barrier on skin, locking in moisture. Non-comedogenic and hypoallergenic.',
    'retinol': 'Vitamin A derivative that accelerates cell turnover, stimulates collagen, and targets wrinkles. Can cause initial irritation.',
    'fragrance': 'Synthetic fragrance can contain dozens of undisclosed chemicals. One of the most common causes of contact dermatitis.',
    'parfum': 'INCI term for fragrance. May contain allergens like linalool or limonene. Sensitive skin should avoid.',
    'phenoxyethanol': 'Widely used preservative considered safer than parabens. Generally well-tolerated at concentrations under 1%.',
    'methylparaben': 'A preservative that mimics estrogen. While studies are inconclusive, many brands prefer paraben-free options.',
    'sodium lauryl sulfate': 'A harsh surfactant that can strip natural oils and cause irritation. Better alternatives exist.',
    'salicylic acid': 'A BHA that penetrates pores to dissolve oil and dead skin. Excellent for acne-prone skin.',
    'glycolic acid': 'An AHA that exfoliates dead skin cells, improves texture, and boosts collagen.',
    'zinc oxide': 'A mineral UV filter providing broad-spectrum sun protection. Also anti-inflammatory.',
    'ceramides': 'Lipids naturally found in the skin barrier. They prevent moisture loss and protect against environmental damage.',
    'aloe vera': 'Rich in vitamins and minerals. Known for soothing, anti-inflammatory, and healing properties.',
    'shea butter': 'Rich emollient high in fatty acids and vitamins. Intensely moisturizes and protects dry skin.',
    'panthenol': 'Pro-vitamin B5 that deeply moisturizes, promotes wound healing, and reduces inflammation.',
    'tocopherol': 'Natural Vitamin E. Provides antioxidant protection and helps preserve formulations.',
    'alcohol denat': 'Denatured alcohol evaporates quickly but can dry out and irritate skin with prolonged use.',
    'propylparaben': 'Paraben preservative with higher estrogenic activity. Consider paraben-free alternatives.',
    'formaldehyde': 'Known carcinogen used as preservative. Can cause allergic reactions and respiratory issues. Banned in many countries.',
  };
  if (db[l]) return db[l];
  for (const [k, v] of Object.entries(db)) { if (l.includes(k) || k.includes(l)) return v; }
  return `${name} is a cosmetic ingredient. Check product packaging or consult a dermatologist for more information.`;
};

// -- SKIN TYPE DATA (generated from analysis) --
const getSkinTypes = (analysis) => {
  const score = analysis?.score || 50;
  const hasBadIng = (analysis?.badCount || 0) > 0;
  const hasFragrance = analysis?.analyzedIngredients?.some(i => 
    i.name?.toLowerCase().includes('fragrance') || i.name?.toLowerCase().includes('parfum')
  );
  return [
    { name: 'Normal', compat: score >= 60 ? 'Great fit' : 'Caution', level: score >= 60 ? 'ok' : 'warn', icon: 'checkmark' },
    { name: 'Dry', compat: score >= 50 ? 'Great fit' : 'Caution', level: score >= 50 ? 'ok' : 'warn', icon: 'checkmark' },
    { name: 'Oily', compat: score >= 65 ? 'Great fit' : 'Caution', level: score >= 65 ? 'ok' : 'warn', icon: 'alert' },
    { name: 'Combination', compat: score >= 60 ? 'OK' : 'Caution', level: score >= 60 ? 'ok' : 'warn', icon: 'alert' },
    { name: 'Sensitive', compat: hasBadIng || hasFragrance ? 'Avoid' : score >= 70 ? 'OK' : 'Caution', level: hasBadIng || hasFragrance ? 'bad' : score >= 70 ? 'ok' : 'warn', icon: hasBadIng ? 'shield' : 'alert' },
    { name: 'Acne-prone', compat: score >= 65 ? 'OK' : 'Caution', level: score >= 65 ? 'ok' : 'warn', icon: 'alert' },
  ];
};

// -- SAFETY RATINGS (generated from analysis) --
const getSafetyRatings = (analysis) => {
  const score = analysis?.score || 50;
  const bad = analysis?.badCount || 0;
  const excellent = analysis?.excellentCount || 0;
  return [
    { name: 'Ingredient Safety', value: Math.min(10, Math.round(score / 10)), icon: 'flask-outline', color: score >= 70 ? 'g' : score >= 40 ? 'a' : 'r' },
    { name: 'Allergen Risk', value: Math.min(10, bad >= 3 ? 7 : bad >= 1 ? 5 : 2), icon: 'alert-circle-outline', color: bad >= 3 ? 'r' : bad >= 1 ? 'a' : 'g', invert: true },
    { name: 'Skin Nourishment', value: Math.min(10, excellent >= 5 ? 9 : excellent >= 3 ? 7 : 5), icon: 'heart-outline', color: excellent >= 3 ? 'g' : 'a' },
    { name: 'Hydration Score', value: Math.min(10, score >= 70 ? 9 : score >= 50 ? 6 : 4), icon: 'water-outline', color: score >= 60 ? 'g' : 'a' },
    { name: 'Irritation Potential', value: Math.min(10, bad >= 3 ? 8 : bad >= 1 ? 5 : 2), icon: 'eye-outline', color: bad >= 3 ? 'r' : bad >= 1 ? 'a' : 'g', invert: true },
  ];
};

// -- Score Gauge ------------------------------------------------------
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
      <View style={g.outerRing} />
      <View style={g.innerRing} />
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

export default function CosmeticResultsScreen({ route, navigation }) {
  const { barcode } = route.params;
  const fromSearch = route?.params?.fromSearch || false;
  const freeAIAccess = route?.params?.freeAIAccess || false;
  const devProduct = route?.params?.devProduct || null;
  const devAnalysis = route?.params?.devAnalysis || null;
  const devZoomOut = route?.params?.devZoomOut || false;

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
  const [additiveAnalysis, setAdditiveAnalysis] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [expandedIngId, setExpandedIngId] = useState(null);
  const [aiDailyUsage, setAiDailyUsage] = useState({ used: 0, remaining: AI_DAILY_LIMIT });
  const [freeRecUsage, setFreeRecUsage] = useState({ remaining: 2, total: 2 });
  const [openAccordions, setOpenAccordions] = useState({});
  const [askText, setAskText] = useState('');
  const [realAlternatives, setRealAlternatives] = useState([]);
  const [altsLoading, setAltsLoading] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const containerFade = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // -- DATA FETCH --
  useEffect(() => {
    if (devProduct && devAnalysis) {
      setProduct(devProduct);
      setAnalysis(devAnalysis);
      setLoading(false);
      setPremiumLoading(false);
      Animated.timing(containerFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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
      setProduct(productData);
      const ingredients = productData.ingredients_text || '';
      let analysisResult = ingredients
        ? analyzeIngredients(ingredients, 'cosmetic', {}, productData)
        : { score: 60, totalIngredients: 0, goodIngredients: [], badIngredients: [], moderateIngredients: [],
            excellentIngredients: [], analyzedIngredients: [], productType: 'cosmetic',
            excellentCount: 0, goodCount: 0, moderateCount: 0, badCount: 0, additives: [] };
      setAnalysis(analysisResult);
      setLoading(false);

      const sub = await AsyncStorage.getItem('subscriptionType');
      const exp = await AsyncStorage.getItem('subscriptionExpiresAt');
      const hasActivePremium = sub === 'Premium' && (!exp || new Date(parseInt(exp, 10)) > new Date());
      if (hasActivePremium) {
        await saveToHistory({
          barcode, productName: productData.product_name, productImage: productData.image_url,
          productType: 'cosmetic', score: analysisResult.score,
          ingredients: productData.ingredients_text || '', source: productData.source || 'Unknown'
        });
      }
      await incrementTrialCounter();
      Animated.timing(containerFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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
          .slice(0, 8)
          .map(p => {
            const ingText = p.ingredients_text || '';
            let altScore = 65;
            if (ingText) {
              const ingResult = analyzeIngredients(ingText, 'cosmetic', {}, p);
              altScore = ingResult?.score || 65;
            }
            return {
              name: p.product_name,
              brand: p.brands || '',
              image: p.image_url || p.image_front_url || null,
              barcode: p.code,
              score: altScore,
            };
          })
          .sort((a, b) => b.score - a.score);
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
        if (product && analysis && !aiAnalysis && !aiLoading) setTimeout(() => generateAIAnalysis(), 500);
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
      if (hasAccess && product && analysis && !aiAnalysis && !aiLoading) setTimeout(() => generateAIAnalysis(), 500);
      return hasAccess;
    } catch (e) {
      setPremiumLoading(false);
      setIsPremium(false);
      setHasAIAccess(false);
      return false;
    }
  };

  // -- AI ANALYSIS --
  const generateAIAnalysis = async () => {
    if (!product || !analysis || aiLoading) return;

    // For non-premium, non-trial, non-search users: the UI button already
    // decremented freeRecUsage before calling this, so skip the old daily
    // limit check here. Only block if we are absolutely sure the user has
    // no access AND the call came from an automatic path (e.g. checkSubscriptionStatus).
    if (!isPremium && !hasAIAccess && !(fromSearch && freeAIAccess)) {
      // The button onPress sets hasAIAccess=true before calling us, but React
      // state is async, so also check freeRecUsage.remaining (already decremented).
      const usage = await getFreeRecommendationUsage();
      // If the user just tapped the button, useFreeRecommendation() already decremented,
      // so usage.remaining may be 0 or 1 � that's fine, we allow the call.
      // Only block if they truly had 0 remaining BEFORE the tap (i.e. used >= 2).
      if (usage.used > 2) {
        return;
      }
    }

    // Check premium/trial/search access for paid features
    // (Free user quota is already handled by the button's onPress via useFreeRecommendation)

    setAiLoading(true);
    try {
      const ingredients = analysis.parsedIngredients || analysis.ingredients ||
        (product.ingredients_text ? product.ingredients_text.split(',').map(i => i.trim()) : []);
      const aiResult = await AIService.analyzeProduct(product, ingredients);
      setAiAnalysis(aiResult);
      setTimeout(async () => {
        try {
          const missingResult = await AIService.detectMissingIngredients(product, ingredients);
          if (missingResult.missingIngredients?.length > 0) {
            const updated = [...ingredients];
            const newIng = [];
            missingResult.missingIngredients.forEach(m => {
              if (!ingredients.some(i => i.toLowerCase().includes(m.name.toLowerCase()))) {
                updated.push(`${m.name} (AI detected)`);
                newIng.push(m);
              }
            });
            if (newIng.length > 0) {
              const enh = analyzeIngredients(updated.join(', '), 'cosmetic');
              setAnalysis(prev => ({ ...enh, missingIngredientsDetected: newIng, originalIngredientCount: ingredients.length, totalIngredients: updated.length, aiEnhanced: true }));
            }
          }
          const additiveResult = await AIService.analyzeAdditives(product, ingredients);
          setAdditiveAnalysis(additiveResult);
        } catch (e) {}
      }, 100);
    } catch (e) {
      Alert.alert('AI Analysis Failed', 'Unable to generate AI analysis. Please try again later.');
    } finally { setAiLoading(false); }
  };

  useEffect(() => {
    if (product && analysis && !loading) { checkSubscriptionStatus(); }
  }, [product, analysis, loading]);

  // Animate score ring + bars
  useEffect(() => {
    if (analysis) {
      Animated.timing(ringAnim, { toValue: analysis.score || 50, duration: 1400, delay: 300, useNativeDriver: false }).start();
    }
    if (!loading && product && analysis) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.stagger(120, [
        Animated.timing(bar1Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(bar2Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(bar3Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [analysis, loading, product]);

  // -- INGREDIENT ANALYSIS --
  const analyzeIng = useCallback((ingredient, analysis) => {
    const l = ingredient.toLowerCase().trim();
    // Normalize: strip parenthetical content, numbers, extra whitespace
    const norm = l.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\d+%?/g, '').trim();

    // Try matching by exact name OR normalized name
    const existing = analysis.analyzedIngredients?.find(i => {
      const n = (i.name || '').toLowerCase().trim();
      return n === l || n === norm || l.includes(n) || n.includes(norm);
    });
    if (existing && !existing.isUnknown) {
      if (existing.score >= 90) return { status: 'EXCELLENT', color: '#1B5E20' };
      if (existing.score >= 75) return { status: 'GOOD', color: C.green };
      if (existing.score >= 45) return { status: 'MODERATE', color: C.amber };
      return { status: 'POOR', color: C.red };
    }

    // Check categorized lists with fuzzy matching
    const fuzzyFind = (list) => list?.find(i => {
      const n = (i.name || '').toLowerCase().trim();
      return n === l || n === norm || l.includes(n) || n.includes(norm);
    });
    if (fuzzyFind(analysis.goodIngredients)) return { status: 'GOOD', color: C.green };
    if (fuzzyFind(analysis.moderateIngredients)) return { status: 'MODERATE', color: C.amber };
    if (fuzzyFind(analysis.badIngredients)) return { status: 'POOR', color: C.red };

    // Pattern-based fallback for common cosmetic ingredients
    const excellentPatterns = ['water', 'aqua', 'glycerin', 'hyaluronic acid', 'aloe', 'shea butter', 'vitamin c', 'vitamin e', 'niacinamide', 'ceramide', 'panthenol', 'jojoba', 'argan', 'tocopherol', 'squalane', 'allantoin', 'centella'];
    const badPatterns = ['paraben', 'formaldehyde', 'triclosan', 'phthalate', 'sodium lauryl sulfate', 'sls', 'bha', 'bht', 'dea', 'mea', 'toluene', 'coal tar', 'hydroquinone'];
    const moderatePatterns = ['fragrance', 'parfum', 'phenoxyethanol', 'alcohol denat', 'silicone', 'dimethicone', 'peg-', 'sodium laureth', 'ceteareth', 'edta', 'propylene glycol'];

    if (badPatterns.some(p => norm.includes(p))) return { status: 'POOR', color: C.red };
    if (excellentPatterns.some(p => norm.includes(p))) return { status: 'GOOD', color: C.green };
    if (moderatePatterns.some(p => norm.includes(p))) return { status: 'MODERATE', color: C.amber };

    // Default to MODERATE instead of UNKNOWN for better UX
    return { status: 'MODERATE', color: C.amber };
  }, []);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIngId(prev => prev === id ? null : id);
  };

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleScanAnother = useCallback(() => navigation.navigate('Home', { startScanning: true }), [navigation]);

  const score = useMemo(() => analysis?.score || 50, [analysis?.score]);
  const scoreColor = useMemo(() => getScoreColor(score), [score]);
  const sLabel = useMemo(() => scoreToLabel(score), [score]);

  // Ingredient lists from analyzer
  const analyzedList = useMemo(() => analysis?.analyzedIngredients || [], [analysis]);
  const badIngs = useMemo(() => analyzedList.filter(i => (i.status || '').toUpperCase() === 'POOR' || (i.category || '').toLowerCase() === 'bad' || (i.score != null && i.score < 45)), [analyzedList]);
  const moderateIngs = useMemo(() => analyzedList.filter(i => (i.status || '').toUpperCase() === 'MODERATE' || (i.category || '').toLowerCase() === 'moderate' || (i.category || '').toLowerCase() === 'unknown' || (i.score != null && i.score >= 45 && i.score < 70)), [analyzedList]);
  const goodIngs = useMemo(() => analyzedList.filter(i => { const s = (i.status || '').toUpperCase(); const c = (i.category || '').toLowerCase(); return s === 'GOOD' || s === 'EXCELLENT' || c === 'good' || c === 'excellent' || (i.score != null && i.score >= 70 && s !== 'POOR' && s !== 'MODERATE' && c !== 'bad' && c !== 'moderate'); }), [analyzedList]);

  // DNA helix ingredient data � always show, fallback to raw ingredient names
  const dnaIngredients = useMemo(() => {
    if (analyzedList.length > 0) {
      return analyzedList.slice(0, 12).map(ing => {
        const s = (ing.status || '').toUpperCase();
        const c = (ing.category || '').toLowerCase();
        const sc = ing.score ?? 100;
        const isBad = s === 'POOR' || c === 'bad' || sc < 45;
        const isModerate = s === 'MODERATE' || c === 'moderate' || c === 'unknown' || (sc >= 45 && sc < 70);
        return {
          name: ing.name || '',
          type: isBad ? 'bad' : isModerate ? 'warn' : 'good',
        };
      });
    }
    // Fallback: use raw ingredient names when analyzedList is empty
    const raw = (product?.ingredients_text || '').split(/,|;/).map(s => s.trim()).filter(Boolean);
    return raw.slice(0, 12).map(name => ({ name, type: 'warn' }));
  }, [analyzedList, product]);

  const safetyRatings = useMemo(() => getSafetyRatings(analysis), [analysis]);
  const skinTypes = useMemo(() => getSkinTypes(analysis), [analysis]);

  // Allergens & warnings � scan raw ingredient names + analyzer results
  const warnings = useMemo(() => {
    if (!analysis) return [];
    const w = [];
    const seen = new Set();

    // 1. Flagged bad ingredients from analyzer
    const bad = analysis.badIngredients || [];
    bad.forEach(i => {
      const key = (i.name || '').toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        w.push({ name: i.name, sub: i.concerns || i.notes || 'Potential concern detected', badge: 'FLAGGED', color: C.red });
      }
    });

    // 2. Scan ALL analyzed ingredients for known allergen/irritant keywords
    const allergenKeywords = ['fragrance', 'parfum', 'paraben', 'methylparaben', 'propylparaben', 'butylparaben', 'formaldehyde', 'phthalate', 'triclosan', 'sodium lauryl sulfate', 'coal tar', 'hydroquinone', 'toluene', 'oxybenzone'];
    const allIngs = analysis.analyzedIngredients || [];
    allIngs.forEach(i => {
      const l = (i.name || '').toLowerCase();
      if (seen.has(l)) return;
      const matchedKeyword = allergenKeywords.find(kw => l.includes(kw));
      if (matchedKeyword) {
        seen.add(l);
        w.push({ name: i.name, sub: `Contains ${matchedKeyword} � common allergen/irritant`, badge: 'ALLERGEN', color: C.red });
      }
    });

    // 3. Also scan raw ingredient text for keywords the analyzer might have missed
    const rawIngs = (product?.ingredients_text || '').toLowerCase();
    allergenKeywords.forEach(kw => {
      if (!seen.has(kw) && rawIngs.includes(kw)) {
        seen.add(kw);
        w.push({ name: kw.charAt(0).toUpperCase() + kw.slice(1), sub: `Detected in ingredients list � potential irritant`, badge: 'ALLERGEN', color: C.red });
      }
    });

    // 4. Add moderate concern items
    const mod = analysis.moderateIngredients || [];
    mod.forEach(i => {
      const l = (i.name || '').toLowerCase();
      if (!seen.has(l) && (l.includes('alcohol') || l.includes('sulfate') || l.includes('peg-'))) {
        seen.add(l);
        w.push({ name: i.name, sub: i.concerns || 'May cause mild irritation', badge: 'CAUTION', color: C.amber });
      }
    });

    if (w.length === 0) w.push({ name: 'No Major Concerns', sub: 'This product appears generally safe for most skin types', badge: 'OK', color: C.green });
    return w;
  }, [analysis, product]);

  const ingredientsList = useMemo(() => {
    if (!product?.ingredients_text) return [];
    return product.ingredients_text.toLowerCase().split(/[,;.]/).map(i => i.trim()).filter(i => i.length > 2);
  }, [product]);

  // "What Should I Do?" action cards
  const wsdActions = useMemo(() => {
    if (hasAIAccess && aiAnalysis?.recommendations?.length > 0) {
      const iconSets = [
        { icon: 'refresh-outline', iconBg: C.greenLight, iconColor: C.green },
        { icon: 'cart-outline', iconBg: C.amberLight, iconColor: C.amber },
        { icon: 'pricetag-outline', iconBg: C.redLight, iconColor: C.red },
      ];
      return aiAnalysis.recommendations.slice(0, 3).map((rec, i) => ({
        ...iconSets[i % iconSets.length],
        title: rec.length > 45 ? rec.slice(0, 43) + '\u2026' : rec,
        desc: '',
      }));
    }
    // Infer cosmetic category for personalised recommendations
    const _pName = (product?.product_name || '').toLowerCase();
    const _cats = (Array.isArray(product?.categories_tags)
      ? product.categories_tags.join(' ')
      : String(product?.categories || ''))
      .toLowerCase();
    const _all = _pName + ' ' + _cats;
    const _cat = _all.match(/moisturiz|cream|lotion|hydrat/) ? 'moisturizer'
      : _all.match(/shampoo/) ? 'shampoo'
      : _all.match(/conditioner/) ? 'conditioner'
      : _all.match(/serum|essence|ampoule/) ? 'serum'
      : _all.match(/sunscreen|spf|sun\s?block/) ? 'sunscreen'
      : _all.match(/cleanse|wash|foam|micellar/) ? 'cleanser'
      : _all.match(/mask|masque|peel/) ? 'face mask'
      : _all.match(/toner|astringent/) ? 'toner'
      : _all.match(/deodorant|antiperspirant/) ? 'deodorant'
      : _all.match(/body\s?wash|shower\s?gel|soap/) ? 'body wash'
      : _all.match(/lipstick|lip\s?balm|lip\s?gloss/) ? 'lip product'
      : _all.match(/foundation|concealer/) ? 'foundation'
      : 'skincare product';
    const _displayName = product?.product_name
      ? product.product_name.length > 28
        ? product.product_name.slice(0, 26) + '�'
        : product.product_name
      : 'This product';
    const actions = [];
    if (score < 70 || badIngs.length > 0) {
      actions.push({
        icon: 'refresh-outline', iconBg: C.greenLight, iconColor: C.green,
        title: `Find a Cleaner ${_cat.charAt(0).toUpperCase() + _cat.slice(1)}`,
        desc: badIngs.length > 0
          ? `Try a ${_cat} without ${badIngs[0]?.name || 'harsh ingredients'} for safer use.`
          : `Look for a ${_cat} with a higher safety score and gentler formula.`,
      });
    }
    actions.push({
      icon: 'flask-outline', iconBg: C.amberLight, iconColor: C.amber,
      title: score >= 70
        ? `${_displayName} is a Safe Choice`
        : score >= 50
        ? `Use ${_displayName} Occasionally`
        : `Limit ${_displayName}`,
      desc: score >= 70
        ? `Safety score ${score}/100 � this ${_cat} is appropriate for regular use.`
        : score >= 50
        ? `Moderate score (${score}/100) � use this ${_cat} cautiously, especially on sensitive skin.`
        : `Low score (${score}/100) � consider switching to a cleaner ${_cat}.`,
    });
    if (badIngs.length > 0 || score < 60) {
      actions.push({
        icon: 'pricetag-outline', iconBg: C.redLight, iconColor: C.red,
        title: 'Ingredients to Avoid Next Time',
        desc: badIngs.length > 0
          ? `When buying a ${_cat}, avoid ${badIngs.slice(0, 2).map(i => i.name).join(' and ')}.`
          : `Look for a ${_cat} free from parabens, sulfates, and synthetic fragrances.`,
      });
    }
    return actions.slice(0, 3);
  }, [hasAIAccess, aiAnalysis, score, badIngs, product]);

  const altProducts = useMemo(() => {
    // Category-specific real product alternatives as fallback when API returns nothing
    if (badIngs.length > 0 || moderateIngs.length > 0 || score < 80) {
      const categoryAlternatives = {
        'Moisturizer': [
          { name: 'CeraVe Moisturizing Cream', icon: 'water-outline', chips: [{ label: 'Dermatologist Pick', type: 'good' }], brand: 'CeraVe', score: Math.min(95, score + 28) },
          { name: 'Vanicream Moisturizing Cream', icon: 'flower-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 30) },
          { name: 'La Roche-Posay Toleriane', icon: 'heart-outline', chips: [{ label: 'Sensitive Skin', type: 'good' }], brand: 'La Roche-Posay', score: Math.min(95, score + 25) },
          { name: 'Weleda Skin Food', icon: 'leaf-outline', chips: [{ label: 'Natural', type: 'good' }], brand: 'Weleda', score: Math.min(95, score + 22) },
          { name: 'First Aid Beauty Ultra Repair', icon: 'sunny-outline', chips: [{ label: 'Clean Beauty', type: 'good' }], brand: 'First Aid Beauty', score: Math.min(95, score + 26) },
        ],
        'Cleanser': [
          { name: 'CeraVe Hydrating Cleanser', icon: 'water-outline', chips: [{ label: 'Gentle', type: 'good' }], brand: 'CeraVe', score: Math.min(95, score + 28) },
          { name: 'Vanicream Gentle Facial Cleanser', icon: 'flower-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 30) },
          { name: 'La Roche-Posay Toleriane Cleanser', icon: 'heart-outline', chips: [{ label: 'Sensitive Skin', type: 'good' }], brand: 'La Roche-Posay', score: Math.min(95, score + 25) },
          { name: 'Bioderma Sensibio Micellar Water', icon: 'sunny-outline', chips: [{ label: 'Micellar', type: 'good' }], brand: 'Bioderma', score: Math.min(95, score + 22) },
          { name: 'Krave Beauty Matcha Cleanser', icon: 'leaf-outline', chips: [{ label: 'Clean Beauty', type: 'good' }], brand: 'Krave Beauty', score: Math.min(95, score + 26) },
        ],
        'Serum': [
          { name: 'The Ordinary Niacinamide 10%', icon: 'leaf-outline', chips: [{ label: 'Clean Formula', type: 'good' }], brand: 'The Ordinary', score: Math.min(95, score + 28) },
          { name: 'Paula\'s Choice BHA Exfoliant', icon: 'flower-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Paula\'s Choice', score: Math.min(95, score + 25) },
          { name: 'CeraVe Vitamin C Serum', icon: 'sunny-outline', chips: [{ label: 'Dermatologist Pick', type: 'good' }], brand: 'CeraVe', score: Math.min(95, score + 22) },
          { name: 'Cos De BAHA Azelaic Acid', icon: 'heart-outline', chips: [{ label: 'Gentle', type: 'good' }], brand: 'Cos De BAHA', score: Math.min(95, score + 30) },
          { name: 'Naturium Vitamin C Serum', icon: 'water-outline', chips: [{ label: 'Clean Beauty', type: 'good' }], brand: 'Naturium', score: Math.min(95, score + 26) },
        ],
        'Sunscreen': [
          { name: 'EltaMD UV Clear SPF 46', icon: 'sunny-outline', chips: [{ label: 'Derm Recommended', type: 'good' }], brand: 'EltaMD', score: Math.min(95, score + 30) },
          { name: 'La Roche-Posay Anthelios', icon: 'heart-outline', chips: [{ label: 'Sensitive Skin', type: 'good' }], brand: 'La Roche-Posay', score: Math.min(95, score + 28) },
          { name: 'Supergoop Unseen Sunscreen', icon: 'leaf-outline', chips: [{ label: 'Clean Formula', type: 'good' }], brand: 'Supergoop', score: Math.min(95, score + 25) },
          { name: 'Blue Lizard Mineral Sunscreen', icon: 'water-outline', chips: [{ label: 'Mineral Only', type: 'good' }], brand: 'Blue Lizard', score: Math.min(95, score + 26) },
          { name: 'CeraVe Hydrating Sunscreen SPF 30', icon: 'flower-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'CeraVe', score: Math.min(95, score + 22) },
        ],
        'Shampoo': [
          { name: 'Vanicream Free & Clear Shampoo', icon: 'water-outline', chips: [{ label: 'Sulfate-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 30) },
          { name: 'Neutrogena T/Sal Shampoo', icon: 'flower-outline', chips: [{ label: 'Derm Tested', type: 'good' }], brand: 'Neutrogena', score: Math.min(95, score + 22) },
          { name: 'Briogeo Don\'t Despair Repair', icon: 'leaf-outline', chips: [{ label: 'Clean Beauty', type: 'good' }], brand: 'Briogeo', score: Math.min(95, score + 25) },
          { name: 'Pureology Hydrate Shampoo', icon: 'heart-outline', chips: [{ label: 'Vegan', type: 'good' }], brand: 'Pureology', score: Math.min(95, score + 28) },
          { name: 'Native Hair Shampoo', icon: 'sunny-outline', chips: [{ label: 'No Sulfates', type: 'good' }], brand: 'Native', score: Math.min(95, score + 20) },
        ],
        'Conditioner': [
          { name: 'Vanicream Free & Clear Conditioner', icon: 'water-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 30) },
          { name: 'Briogeo Don\'t Despair Conditioner', icon: 'leaf-outline', chips: [{ label: 'Clean Beauty', type: 'good' }], brand: 'Briogeo', score: Math.min(95, score + 25) },
          { name: 'SheaMoisture Coconut Conditioner', icon: 'flower-outline', chips: [{ label: 'Natural', type: 'good' }], brand: 'SheaMoisture', score: Math.min(95, score + 22) },
          { name: 'Pureology Hydrate Conditioner', icon: 'heart-outline', chips: [{ label: 'Vegan', type: 'good' }], brand: 'Pureology', score: Math.min(95, score + 28) },
          { name: 'Native Hair Conditioner', icon: 'sunny-outline', chips: [{ label: 'No Sulfates', type: 'good' }], brand: 'Native', score: Math.min(95, score + 20) },
        ],
        'Deodorant': [
          { name: 'Native Deodorant', icon: 'leaf-outline', chips: [{ label: 'Aluminum-Free', type: 'good' }], brand: 'Native', score: Math.min(95, score + 28) },
          { name: 'Schmidt\'s Natural Deodorant', icon: 'flower-outline', chips: [{ label: 'Plant-Based', type: 'good' }], brand: 'Schmidt\'s', score: Math.min(95, score + 25) },
          { name: 'Lume Whole Body Deodorant', icon: 'heart-outline', chips: [{ label: 'Clean Formula', type: 'good' }], brand: 'Lume', score: Math.min(95, score + 30) },
          { name: 'Each & Every Natural Deodorant', icon: 'sunny-outline', chips: [{ label: 'EWG Verified', type: 'good' }], brand: 'Each & Every', score: Math.min(95, score + 26) },
          { name: 'Ursa Major Hoppin\' Fresh Deo', icon: 'water-outline', chips: [{ label: 'No Aluminium', type: 'good' }], brand: 'Ursa Major', score: Math.min(95, score + 22) },
        ],
        'Body Wash': [
          { name: 'Vanicream Gentle Body Wash', icon: 'water-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 30) },
          { name: 'Dr. Bronner\'s Castile Soap', icon: 'leaf-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Dr. Bronner\'s', score: Math.min(95, score + 28) },
          { name: 'Dove Sensitive Skin Body Wash', icon: 'flower-outline', chips: [{ label: 'Hypoallergenic', type: 'good' }], brand: 'Dove', score: Math.min(95, score + 22) },
          { name: 'Everyone 3-in-1 Soap', icon: 'heart-outline', chips: [{ label: 'EWG Verified', type: 'good' }], brand: 'Everyone', score: Math.min(95, score + 26) },
          { name: 'Alaffia Everyday Shea Body Wash', icon: 'sunny-outline', chips: [{ label: 'Fair Trade', type: 'good' }], brand: 'Alaffia', score: Math.min(95, score + 25) },
        ],
      };
      const defaultAlts = [
        { name: 'CeraVe Daily Moisturizer', icon: 'water-outline', chips: [{ label: 'Dermatologist Pick', type: 'good' }], brand: 'CeraVe', score: Math.min(95, score + 25) },
        { name: 'Vanicream Gentle Cleanser', icon: 'flower-outline', chips: [{ label: 'Fragrance-Free', type: 'good' }], brand: 'Vanicream', score: Math.min(95, score + 28) },
        { name: 'The Ordinary Hyaluronic Acid', icon: 'leaf-outline', chips: [{ label: 'Clean Formula', type: 'good' }], brand: 'The Ordinary', score: Math.min(95, score + 22) },
        { name: 'La Roche-Posay Toleriane', icon: 'heart-outline', chips: [{ label: 'Sensitive Skin', type: 'good' }], brand: 'La Roche-Posay', score: Math.min(95, score + 26) },
        { name: 'Weleda Skin Food', icon: 'sunny-outline', chips: [{ label: 'Natural', type: 'good' }], brand: 'Weleda', score: Math.min(95, score + 20) },
      ];
      return categoryAlternatives[productCategory] || defaultAlts;
    }
    return [];
  }, [score, badIngs, moderateIngs, productCategory]);

  const toggleAcc = (key) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));

  // Score ring constants � match food screen (90px ring)
  const RING_R = 37;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC - (RING_CIRC * score) / 100;
  const animatedRingOffset = ringAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [RING_CIRC, RING_CIRC - (RING_CIRC * score) / 100],
  });

  const verdictLabel = score >= 85 ? 'Very Safe' : score >= 70 ? 'Safe' : score >= 45 ? 'Fairly Safe' : score >= 30 ? 'Moderate' : score >= 15 ? 'Concerning' : 'Risky';

  // All ingredients from raw text
  const allIngredients = (product?.ingredients_text || '').split(',').map(i => i.trim()).filter(Boolean);

  // Safety bar data
  const safetyBars = [
    { label: 'Ingredient Safety', value: Math.min(100, Math.round(score * 1.05)) },
    { label: 'Clean Label Index', value: Math.min(100, goodIngs.length > 0 ? Math.round((goodIngs.length / Math.max(1, analyzedList.length)) * 100) : score) },
    { label: 'Skin Compatibility', value: score },
  ];

  // \u2500\u2500 Derived render data \u2500\u2500
  const productName = (product?.product_name || product?.name || 'Unknown Product').toUpperCase();
  const brandName   = product?.brands ? product.brands.toUpperCase() : '';
  const verdict     = getVerdict(score);
  const verdictDesc =
    score >= 70 ? 'This product has a safe ingredient profile suitable for most skin types.'
    : score >= 40 ? 'This product contains some concerning ingredients. Use with caution on sensitive skin.'
    : 'Multiple concerning ingredients detected. Consider safer alternatives.';

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product?.product_name || 'this product'} on HealthyScan! Score: ${score}/100` });
    } catch (e) { /* ignore */ }
  };

  const allIngredientsForDisplay = [
    ...goodIngs.map(i => ({ ...i, _t: 'good' })),
    ...moderateIngs.map(i => ({ ...i, _t: 'moderate' })),
    ...badIngs.map(i => ({ ...i, _t: 'bad' })),
  ];
  const displayed = showAllIngredients ? allIngredientsForDisplay : allIngredientsForDisplay.slice(0, 5);

  const ingStyle = (_t, name) => {
    // Map by ingredient name first (same logic as food screen)
    const n = (name || '').toLowerCase();
    let icon = 'ellipse-outline';
    if (n.includes('water') || n.includes('aqua'))                                  icon = 'water-outline';
    else if (n.includes('caffeine') || n.includes('retinol') || n.includes('niacinamide') || n.includes('vitamin c') || n.includes('ascorbic')) icon = 'flash-outline';
    else if (n.includes('fragrance') || n.includes('parfum') || n.includes('aroma') || n.includes('scent')) icon = 'restaurant-outline';
    else if (n.includes('preserv') || n.includes('phenoxyethanol') || n.includes('sorbate') || n.includes('benzoate') || n.includes('methylparaben') || n.includes('propylparaben')) icon = 'shield-checkmark-outline';
    else if (n.includes('colour') || n.includes('color') || n.includes('dye') || n.includes('pigment') || n.includes('ci ')) icon = 'color-palette-outline';
    else if (n.includes('acid') || n.includes('citrate') || n.includes('phosphat') || n.includes('lactic') || n.includes('glycolic') || n.includes('salicylic')) icon = 'flask-outline';
    else if (n.includes('oil') || n.includes('butter') || n.includes('fat') || n.includes('lipid') || n.includes('seed') || n.includes('jojoba') || n.includes('argan') || n.includes('coconut')) icon = 'drop-outline';
    else if (n.includes('silicone') || n.includes('dimethicone') || n.includes('cyclopentasiloxane')) icon = 'layers-outline';
    else if (n.includes('alcohol') || n.includes('ethanol') || n.includes('denat')) icon = 'wine-outline';
    else if (n.includes('extract') || n.includes('herb') || n.includes('plant') || n.includes('aloe') || n.includes('green tea') || n.includes('chamomile') || n.includes('calendula')) icon = 'leaf-outline';
    else if (n.includes('vitamin') || n.includes('mineral') || n.includes('peptide') || n.includes('collagen') || n.includes('hyaluron') || n.includes('nourish')) icon = 'fitness-outline';
    else if (n.includes('emulsif') || n.includes('steareth') || n.includes('ceteareth') || n.includes('peg-') || n.includes('polysorbate') || n.includes('lecithin')) icon = 'layers-outline';
    else if (n.includes('thicken') || n.includes('gum') || n.includes('carbomer') || n.includes('xanthan') || n.includes('cellulose')) icon = 'layers-outline';
    else if (n.includes('sodium') || n.includes('chloride') || n.includes('salt')) icon = 'analytics-outline';
    else if (_t === 'good')  icon = 'leaf-outline';
    else if (_t === 'bad')   icon = 'warning-outline';
    else                     icon = 'information-circle-outline';

    if (_t === 'good')     return { icon, color: '#4ADE80', bg: '#1a3326', tag: 'GOOD'     };
    if (_t === 'bad')      return { icon, color: '#F87171', bg: '#3b1a1a', tag: 'RISKY'    };
    return                        { icon, color: '#FACC15', bg: '#2e2a14', tag: 'OK'       };
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
      <ActivityIndicator size="large" color="#4ADE80" />
      <Text style={{ fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, letterSpacing: 1, fontWeight: '500' }}>Analyzing product...</Text>
    </View>
  );
  if (error || !product || !analysis) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: safeAreaInsets.top + 50 }}>
      <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
      <Text style={{ fontSize: 13, color: ON_SURFACE_VAR, marginTop: 14, letterSpacing: 1, fontWeight: '500' }}>{error || 'Missing data'}</Text>
      <TouchableOpacity style={{ marginTop: 24, borderWidth: 1, borderColor: OUTLINE, paddingVertical: 12, paddingHorizontal: 32 }} onPress={handleGoBack}>
        <Text style={{ color: ON_SURFACE, fontSize: 10, fontWeight: '900', letterSpacing: 3 }}>GO BACK</Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // RENDER \u2014 Dark Brutalism (matching food screen, no nutrition grid)
  // ============================================================
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* FIXED HEADER */}
      <View style={[st.header, { paddingTop: safeAreaInsets.top + 8 }]}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={handleGoBack} style={st.iconBtn}>
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

          {/* HERO: Product Image */}
          <View style={st.heroContainer}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={st.heroImage} resizeMode="cover" />
            ) : (
              <View style={[st.heroImage, st.heroPlaceholder]}>
                <Ionicons name="flask-outline" size={80} color={OUTLINE} />
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

          {/* GAUGE */}
          <View style={st.gaugeSection}>
            <ScoreGauge score={score} scoreColor={scoreColor} />
            <TouchableOpacity style={st.whyBtn}>
              <Text style={st.whyBtnText}>WHY THIS SCORE?</Text>
            </TouchableOpacity>
          </View>

          {/* VERDICT BADGE + DESCRIPTION */}
          <View style={st.verdictSection}>
            <View style={[st.verdictBadge, { backgroundColor: scoreColor }]}>
              <Text style={st.verdictBadgeText}>{verdict}</Text>
            </View>
            {brandName ? <Text style={st.brandLabel}>{brandName}</Text> : null}
            <Text style={st.verdictDesc}>{verdictDesc}</Text>
          </View>

          {/* INGREDIENT BREAKDOWN */}
          {displayed.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>INGREDIENT BREAKDOWN</Text>
              {displayed.map((ing, idx) => {
                const s = ingStyle(ing._t, ing.name);
                const isLast = idx === displayed.length - 1;
                const description = ing.notes || ing.concerns || null;
                return (
                  <View key={idx} style={[st.ingCard, !isLast && st.ingCardBorder]}>
                    {/* Top row: icon + name + badge */}
                    <View style={st.ingCardTop}>
                      <View style={[st.ingCardIcon, { backgroundColor: s.bg }]}>
                        <Ionicons name={s.icon} size={17} color={s.color} />
                      </View>
                      <View style={st.ingCardMeta}>
                        <Text style={st.ingCardName} numberOfLines={2}>{ing.name || 'Unknown'}</Text>
                      </View>
                      <View style={[st.ingBadge, { backgroundColor: s.bg, borderColor: s.color + '55' }]}>
                        <Text style={[st.ingBadgeText, { color: s.color }]}>{s.tag}</Text>
                      </View>
                    </View>
                    {/* Description row */}
                    {description ? (
                      <View style={[st.ingDescRow, { borderLeftColor: s.color + '55' }]}>
                        <Ionicons
                          name={ing._t === 'bad' ? 'warning-outline' : 'information-circle-outline'}
                          size={12}
                          color={s.color}
                          style={{ marginRight: 5, marginTop: 1 }}
                        />
                        <Text style={st.ingDescText}>{description}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {allIngredientsForDisplay.length > 5 && (
                <TouchableOpacity
                  style={st.showMore}
                  onPress={() => setShowAllIngredients(!showAllIngredients)}
                >
                  <Text style={st.showMoreText}>
                    {showAllIngredients ? 'SHOW LESS' : `+ ${allIngredientsForDisplay.length - 5} MORE INGREDIENTS`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* BETTER ALTERNATIVES */}
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
                      onPress={() => item.barcode && navigation.push('CosmeticResults', { barcode: item.barcode })}
                    >
                      <View style={st.altImgBox}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={st.altImg} resizeMode="cover" />
                        ) : (
                          <View style={[st.altImg, st.altImgPlaceholder]}>
                            <Ionicons name="flask-outline" size={28} color={OUTLINE} />
                          </View>
                        )}
                        <View style={[st.altScoreBadge, { borderColor: altScoreColor }]}>
                          <Text style={[st.altScoreNum, { color: altScoreColor }]}>{item.score}</Text>
                        </View>
                      </View>
                      <Text style={st.altName} numberOfLines={2}>{(item.name || '').toUpperCase()}</Text>
                      <Text style={st.altBrand} numberOfLines={1}>{(item.brand || '').toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* AURA AI CARD */}
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
                <Ionicons name="sparkles" size={22} color={BG} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.aiCardLabel}>AURA ASSISTANT</Text>
                <Text style={st.aiCardSub}>Ask about these{`\n`}ingredients</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={st.aiCardConnect}>CONNECT</Text>
                <Ionicons name="arrow-forward" size={14} color="#4ADE80" />
              </View>
            </TouchableOpacity>
          </View>

          {/* SAVE TO LOG */}
          <View style={st.saveWrap}>
            <TouchableOpacity
              style={st.saveBtn}
              activeOpacity={0.9}
              onPress={() => saveToHistory({
                barcode,
                productName: product.product_name,
                productImage: product.image_url,
                productType: 'cosmetic',
                score,
                ingredients: product.ingredients_text || '',
                source: product.source || 'Unknown',
              })}
            >
              <Text style={st.saveBtnText}>SAVE TO LOG</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

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
}

// =============================================================
// GAUGE STYLES
// =============================================================
const g = StyleSheet.create({
  container:   { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  outerRing:   { position: 'absolute', top: 0, left: 0, width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(71,71,71,0.3)' },
  innerRing:   { position: 'absolute', top: 20, left: 20, width: 200, height: 200, borderRadius: 100, borderWidth: 8, borderColor: SURFACE_HIGH },
  center:      { position: 'absolute', alignItems: 'center' },
  scannedRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scannedText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: OUTLINE, textTransform: 'uppercase' },
  scoreNum:    { fontSize: 80, fontWeight: '900', letterSpacing: -4, lineHeight: 84, color: WHITE },
  healthLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginTop: 2 },
});

// =============================================================
// MAIN STYLES \u2014 Dark Brutalism
// =============================================================
const st = StyleSheet.create({
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: SURFACE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 12,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 3, color: WHITE, textTransform: 'uppercase' },
  iconBtn:     { padding: 8 },

  heroContainer:   { width: '100%', height: 320, position: 'relative' },
  heroImage:       { width: '100%', height: '100%', opacity: 0.75 },
  heroPlaceholder: { backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' },
  heroGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  heroTextBox:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, paddingBottom: 28 },
  heroLabel:       { fontSize: 9, fontWeight: '700', letterSpacing: 4, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 6 },
  heroProductName: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: WHITE, lineHeight: 32 },

  gaugeSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 12 },
  whyBtn:       { marginTop: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 2 },
  whyBtnText:   { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: WHITE },

  verdictSection:   { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 36 },
  verdictBadge:     { paddingHorizontal: 16, paddingVertical: 5, marginBottom: 14 },
  verdictBadgeText: { color: '#1a1c1c', fontSize: 9, fontWeight: '900', letterSpacing: 5, textTransform: 'uppercase' },
  brandLabel:       { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: ON_SURFACE_VAR, marginBottom: 10, textTransform: 'uppercase' },
  verdictDesc:      { fontSize: 13, color: ON_SURFACE_VAR, textAlign: 'center', lineHeight: 20 },

  section:      { paddingHorizontal: 28, paddingBottom: 28 },
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 4, color: ON_SURFACE, textTransform: 'uppercase', marginBottom: 20 },
  ingCard:       { paddingVertical: 14 },
  ingCardBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(71,71,71,0.2)' },
  ingCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ingCardIcon:   { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ingCardMeta:   { flex: 1, marginRight: 10 },
  ingCardName:   { fontSize: 14, fontWeight: '600', color: WHITE },
  ingBadge:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  ingBadgeText:  { fontSize: 9, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  ingDescRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, marginLeft: 56, paddingRight: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#474747' },
  ingDescText:   { fontSize: 11, color: ON_SURFACE_VAR, lineHeight: 16, flexShrink: 1 },
  showMore:     { marginTop: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(71,71,71,0.2)', alignItems: 'center' },
  showMoreText: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: ON_SURFACE_VAR },

  aiCardWrap: { paddingHorizontal: 28, marginBottom: 16 },
  aiCard: {
    backgroundColor: SURFACE_LOW, borderWidth: 1, borderColor: OUTLINE,
    padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  aiCardLabel:   { fontSize: 9, fontWeight: '900', letterSpacing: 3, color: ON_SURFACE_VAR, textTransform: 'uppercase', marginBottom: 6 },
  aiCardSub:     { fontSize: 15, fontWeight: '300', color: WHITE, lineHeight: 21 },
  aiCardIcon:    { width: 52, height: 52, borderRadius: 26, backgroundColor: '#4ADE80', alignItems: 'center', justifyContent: 'center' },
  aiCardConnect: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: '#4ADE80' },

  altSection:        { marginBottom: 36 },
  altHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, marginBottom: 20 },
  altViewAll:        { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: '#4ADE80' },
  altCard:           { width: 140, backgroundColor: SURFACE_LOW },
  altImgBox:         { width: 140, height: 140, position: 'relative', backgroundColor: SURFACE_HIGH },
  altImg:            { width: 140, height: 140 },
  altImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  altScoreBadge:     { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: BG, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  altScoreNum:  { fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  altName:      { fontSize: 10, fontWeight: '700', color: WHITE, letterSpacing: 0.5, lineHeight: 14, marginTop: 10, paddingHorizontal: 10 },
  altBrand:     { fontSize: 9, fontWeight: '500', color: ON_SURFACE_VAR, letterSpacing: 1, marginTop: 4, marginBottom: 12, paddingHorizontal: 10 },

  saveWrap:    { paddingHorizontal: 28, marginBottom: 8 },
  saveBtn:     { width: '100%', backgroundColor: WHITE, height: 60, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#1a1c1c', fontSize: 10, fontWeight: '900', letterSpacing: 5 },
});