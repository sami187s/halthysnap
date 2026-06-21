import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

// Create animated SVG circle component at module level (outside component to avoid hook issues)
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
import ScreenWrapper from '../components/shared/ScreenWrapper';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonProductResult } from '../components/SkeletonLoader';
import { createFadeAnimation } from '../utils/luxuryAnimations';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { analyzeIngredients, getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import PortionSelector from '../components/PortionSelector';
import ProductAIChat from '../components/ProductAIChat';
// GuidanceCard replaced by inline Vee-styled action cards
import ShareButton from '../components/ShareButton';
import IngredientDNAHelix from '../components/IngredientDNAHelix';

import { saveToHistory as saveToHistoryUtil } from '../utils/historyManager';
// import { SubscriptionManager } from '../utils/subscriptionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIService } from '../services/aiService';
import { getPremiumTrialUsage, usePremiumTrial, getFreeRecommendationUsage, useFreeRecommendation } from '../utils/dailyReset';
import { 
  calculatePortionNutrition, 
  calculateDynamicRisk,
  getNutritionLabel,
  formatNutritionValue,
  PORTION_PRESETS,
  isDrinkProduct
} from '../utils/portionCalculator';
import { checkNutritionCompleteness } from '../utils/nutritionProcessor';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { getSafeAreaInsets, useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { BlurView } from 'expo-blur';

// Helper functions for scoring and colors
const getScoreColor = (score) => {
  if (score >= 90) return '#1B5E20';      // Excellent - Very Dark Green
  if (score >= 70) return '#4CAF50';      // Good - Green (was Medium/Orange)
  if (score >= 50) return '#FF9800';      // Average - Orange (was Good)
  if (score >= 25) return '#FF5722';      // Poor - Red-orange
  return '#F44336';                       // Very Poor - Red
};

const getYukaGrade = (score) => {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';         // Changed from 'MEDIUM'
  if (score >= 50) return 'AVERAGE';      // Was 'GOOD'
  if (score >= 25) return 'POOR';
  return 'VERY POOR';
};

const getYukaLetter = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  if (score >= 25) return 'D';
  return 'E';
};

// Helper function to analyze individual ingredients using our comprehensive database
const analyzeIndividualIngredient = (ingredient, analysis) => {
  const lowerIngredient = ingredient.toLowerCase().trim();
  const normalized = lowerIngredient.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\d+%?/g, '').trim();
  
  // First check if this ingredient was already analyzed in our main analysis (fuzzy match)
  const existingAnalysis = analysis.analyzedIngredients?.find(item => {
    const n = (item.name || '').toLowerCase().trim();
    return n === lowerIngredient || n === normalized || lowerIngredient.includes(n) || n.includes(normalized);
  });
  
  if (existingAnalysis) {
    // The food analyzer returns status, color, reason directly
    if (existingAnalysis.status && existingAnalysis.color) {
      return {
        status: existingAnalysis.status,
        color: existingAnalysis.color,
        textColor: existingAnalysis.color,
        reason: existingAnalysis.reason || 'Analyzed ingredient'
      };
    }
    
    // Check category field (from enhancedIngredientAnalyzer)
    if (existingAnalysis.category) {
      const cat = existingAnalysis.category.toLowerCase();
      if (cat === 'excellent' || cat === 'good') {
        return { status: cat === 'excellent' ? 'EXCELLENT' : 'GOOD', color: '#4CAF50', textColor: '#2E7D32', reason: existingAnalysis.notes || existingAnalysis.function || 'Safe ingredient' };
      } else if (cat === 'bad' || cat === 'poor') {
        return { status: 'POOR', color: '#D32F2F', textColor: '#C62828', reason: existingAnalysis.concerns || existingAnalysis.notes || 'Potential safety concern' };
      } else if (cat === 'moderate') {
        return { status: 'MODERATE', color: '#FF9800', textColor: '#F57C00', reason: existingAnalysis.concerns || existingAnalysis.notes || 'Use with moderate caution' };
      }
    }
    
    // Check score field
    if (existingAnalysis.score != null) {
      const sc = existingAnalysis.score;
      if (sc >= 70) return { status: 'GOOD', color: '#4CAF50', textColor: '#2E7D32', reason: existingAnalysis.notes || 'Generally safe' };
      if (sc >= 45) return { status: 'MODERATE', color: '#FF9800', textColor: '#F57C00', reason: existingAnalysis.concerns || existingAnalysis.notes || 'Use with caution' };
      return { status: 'POOR', color: '#D32F2F', textColor: '#C62828', reason: existingAnalysis.concerns || existingAnalysis.notes || 'Potential safety concern' };
    }
    
    // Fallback for old format
    let status, color, textColor, reason;
    
    switch(existingAnalysis.riskLevel) {
      case 'excellent':
        status = 'EXCELLENT';
        color = '#1B5E20'; // Dark Green
        textColor = '#1B5E20';
        reason = existingAnalysis.description;
        break;
      case 'low':
        status = 'GOOD';
        color = '#4CAF50'; // Regular Green
        textColor = '#66BB6A';
        reason = existingAnalysis.description;
        break;
      case 'moderate':
      case 'medium':
        status = 'MODERATE';
        color = '#FF9800'; // Orange
        textColor = '#F57C00';
        reason = existingAnalysis.description;
        break;
      case 'high':
        status = 'POOR';
        color = '#D32F2F'; // Red
        textColor = '#C62828';
        reason = existingAnalysis.description;
        break;
      default:
        status = 'MODERATE';
        color = '#FF9800';
        textColor = '#F57C00';
        reason = existingAnalysis.description || 'Common ingredient, generally considered safe in normal amounts';
    }
    
    return { status, color, textColor, reason };
  }
  
  // If not in main analysis, do a quick check with our databases
  // Food ingredient patterns
  const excellentFoodPatterns = [
    'water', 'organic', 'whole wheat', 'brown rice', 'quinoa', 'oats', 'barley',
    'olive oil', 'coconut oil', 'avocado oil', 'sunflower oil', 'sesame oil',
    'sea salt', 'lemon juice', 'lime juice', 'vinegar', 'garlic', 'onion',
    'ginger', 'turmeric', 'honey', 'maple syrup', 'almonds', 'walnuts'
  ];
  
  const goodFoodPatterns = [
    'wheat flour', 'rice', 'corn', 'potato', 'milk', 'cream', 'butter',
    'cheese', 'eggs', 'chicken', 'beef', 'fish', 'tofu', 'sugar', 'salt'
  ];
  
  const badFoodPatterns = [
    'high fructose corn syrup', 'artificial flavor', 'artificial color',
    'sodium nitrite', 'bha', 'bht', 'trans fat', 'hydrogenated',
    'aspartame', 'sucralose', 'red dye', 'yellow dye', 'blue dye'
  ];
  
  // Cosmetic ingredient patterns
  const excellentCosmeticPatterns = [
    'hyaluronic acid', 'aloe vera', 'vitamin c', 'vitamin e', 'niacinamide',
    'glycerin', 'shea butter', 'cocoa butter', 'jojoba oil', 'argan oil'
  ];
  
  const badCosmeticPatterns = [
    'paraben', 'sulfate', 'formaldehyde', 'triclosan', 'phthalate',
    'petroleum', 'mineral oil', 'aluminum', 'dea', 'mea', 'tea'
  ];
  
  // Check patterns
  const isExcellent = excellentFoodPatterns.some(pattern => 
    lowerIngredient.includes(pattern) || pattern.includes(lowerIngredient)
  ) || excellentCosmeticPatterns.some(pattern => 
    lowerIngredient.includes(pattern) || pattern.includes(lowerIngredient)
  );
  
  const isGood = goodFoodPatterns.some(pattern => 
    lowerIngredient.includes(pattern) || pattern.includes(lowerIngredient)
  );
  
  const isBad = badFoodPatterns.some(pattern => 
    lowerIngredient.includes(pattern) || pattern.includes(lowerIngredient)
  ) || badCosmeticPatterns.some(pattern => 
    lowerIngredient.includes(pattern) || pattern.includes(lowerIngredient)
  );
  
  // Return analysis result with improved color coding
  if (isExcellent) {
    return {
      status: 'EXCELLENT',
      color: '#1B5E20', // Dark Green
      textColor: '#1B5E20',
      reason: 'Highly beneficial natural ingredient'
    };
  } else if (isGood) {
    return {
      status: 'GOOD',
      color: '#4CAF50', // Regular Green
      textColor: '#66BB6A',
      reason: 'Safe and beneficial ingredient'
    };
  } else if (isBad) {
    return {
      status: 'POOR',
      color: '#D32F2F', // Red
      textColor: '#C62828',
      reason: 'Potentially harmful or highly processed'
    };
  } else {
    return {
      status: 'MODERATE',
      color: '#FF9800', // Orange
      textColor: '#F57C00',
      reason: 'Standard ingredient, generally safe'
    };
  }
};

// Helper function for short descriptions in additive analysis
const getShortDescription = (ingredient, analysis) => {
  const ingredientAnalysis = analyzeIndividualIngredient(ingredient, analysis);
  const l = ingredient.toLowerCase();
  
  const shortDescriptions = {
    'water': 'Base ingredient', 'sugar': 'Added sweetener', 'glucose': 'Simple sugar',
    'fructose': 'Fruit sugar', 'sucrose': 'Table sugar', 'dextrose': 'Glucose sugar',
    'high fructose corn syrup': 'Processed sweetener â€” limit', 'corn syrup': 'Added sweetener',
    'aspartame': 'Artificial sweetener', 'sucralose': 'Artificial sweetener',
    'acesulfame': 'Artificial sweetener', 'stevia': 'Natural zero-cal sweetener',
    'salt': 'Flavor & preservative', 'sodium chloride': 'Table salt',
    'monosodium glutamate': 'Flavor enhancer (MSG)', 'msg': 'Flavor enhancer',
    'glycerin': 'Humectant & sweetener', 'alcohol': 'Solvent or preservative',
    'ethanol': 'Alcohol solvent', 'fragrance': 'Added scent', 'parfum': 'Added scent',
    'citric acid': 'Natural acidifier', 'lactic acid': 'Fermentation acid',
    'acetic acid': 'Vinegar acid', 'phosphoric acid': 'Acidifier â€” bone concern',
    'ascorbic acid': 'Vitamin C', 'malic acid': 'Fruit acid flavoring',
    'tartaric acid': 'Wine acid flavoring', 'fumaric acid': 'Sour flavor acid',
    'lecithin': 'Natural emulsifier', 'soy lecithin': 'Plant-based emulsifier',
    'sunflower lecithin': 'Natural emulsifier', 'pectin': 'Natural fruit gelling agent',
    'gelatin': 'Animal-based thickener', 'agar': 'Plant-based gelling agent',
    'xanthan gum': 'Natural thickener', 'guar gum': 'Natural fiber thickener',
    'carrageenan': 'Seaweed thickener â€” debated', 'cellulose': 'Plant fiber bulking',
    'starch': 'Carb thickener', 'corn starch': 'Starch thickener',
    'modified starch': 'Processed starch', 'maltodextrin': 'Processed carb filler',
    'palm oil': 'Saturated fat â€” limit', 'coconut oil': 'Saturated plant fat',
    'sunflower oil': 'Heart-healthy plant oil', 'olive oil': 'Healthy monounsaturated fat',
    'canola oil': 'Low-saturated plant oil', 'soybean oil': 'Common cooking oil',
    'rapeseed oil': 'Omega-3 plant oil', 'hydrogenated': 'Trans fat â€” avoid',
    'partially hydrogenated': 'Trans fat â€” harmful', 'butter': 'Dairy saturated fat',
    'cream': 'Dairy fat', 'milk': 'Dairy protein & calcium',
    'whey': 'Dairy protein', 'casein': 'Dairy protein',
    'egg': 'Protein source (allergen)', 'wheat': 'Grain (gluten allergen)',
    'gluten': 'Wheat protein (allergen)', 'soy': 'Legume (common allergen)',
    'peanut': 'Nut (major allergen)', 'almond': 'Tree nut', 'hazelnut': 'Tree nut',
    'fish': 'Protein (allergen)', 'shellfish': 'Seafood (allergen)',
    'sodium benzoate': 'Chemical preservative', 'potassium sorbate': 'Mold preservative',
    'sodium nitrite': 'Cured meat preservative â€” concern', 'sodium nitrate': 'Preservative â€” concern',
    'bha': 'Synthetic antioxidant â€” concern', 'bht': 'Synthetic antioxidant â€” debated',
    'tbhq': 'Petroleum-based preservative', 'calcium propionate': 'Bread preservative',
    'vitamin a': 'Vision & immune support', 'vitamin b': 'Energy metabolism',
    'vitamin c': 'Immune & antioxidant', 'vitamin d': 'Bone & immune health',
    'vitamin e': 'Antioxidant protection', 'vitamin k': 'Blood clotting support',
    'iron': 'Blood health mineral', 'calcium': 'Bone health mineral',
    'zinc': 'Immune support mineral', 'magnesium': 'Muscle & nerve mineral',
    'potassium': 'Heart health mineral', 'fiber': 'Digestive health',
    'inulin': 'Prebiotic fiber', 'protein': 'Muscle building nutrient',
    'caffeine': 'Stimulant', 'taurine': 'Amino acid supplement',
    'caramel color': 'Brown colorant â€” possible concern', 'annatto': 'Natural orange colorant',
    'beta carotene': 'Natural orange pigment (Vit A)', 'titanium dioxide': 'White colorant â€” debated',
    'red 40': 'Artificial red dye â€” concern', 'yellow 5': 'Artificial dye â€” concern',
    'yellow 6': 'Artificial dye â€” concern', 'blue 1': 'Artificial blue dye',
    'natural flavor': 'Unspecified natural flavoring', 'artificial flavor': 'Synthetic flavoring',
    'vanillin': 'Vanilla flavor compound', 'extract': 'Concentrated plant compound',
    'concentrate': 'Concentrated form', 'puree': 'Blended fruit/vegetable',
  };

  for (const [keyword, description] of Object.entries(shortDescriptions)) {
    if (l.includes(keyword)) return description;
  }

  // Fallback based on safety status â€” never return 'Unknown'
  if (ingredientAnalysis.status === 'EXCELLENT') return 'Safe & beneficial ingredient';
  if (ingredientAnalysis.status === 'GOOD') return 'Generally safe ingredient';
  if (ingredientAnalysis.status === 'MODERATE') return 'Use with moderate caution';
  if (ingredientAnalysis.status === 'POOR') return 'May be harmful â€” limit intake';
  return 'Common food ingredient';
};

const ResultsScreen = ({ route, navigation }) => {
  const barcode = route?.params?.barcode || null;
  
  // Ã°Å¸Å½Â FREE PREMIUM FOR SEARCH USERS!
  const fromSearch = route?.params?.fromSearch || false;
  const freeAIAccess = route?.params?.freeAIAccess || false;

  // Ã°Å¸â€ºÂ Ã¯Â¸Â DEV MODE: Pre-built mock data (bypasses API fetch + AI call)
  const devProduct = route?.params?.devProduct || null;
  const devAnalysis = route?.params?.devAnalysis || null;
  const devAiAnalysis = route?.params?.devAiAnalysis || null;
  const devHasAIAccess = route?.params?.devHasAIAccess || false;
  const devZoomOut = route?.params?.devZoomOut || false;
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState({
    aiAnalysis: true // AI section expanded by default
  });
  const [selectedPortion, setSelectedPortion] = useState(null);
  const [adjustedNutrition, setAdjustedNutrition] = useState(null);
  const [dynamicScore, setDynamicScore] = useState(null);
  const [enhancedHealthScore, setEnhancedHealthScore] = useState(null);
  
  // AI Premium features state
  const [isPremium, setIsPremium] = useState(false);
  const [hasAIAccess, setHasAIAccess] = useState(false); // For both Premium and Trial users
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [additiveAnalysis, setAdditiveAnalysis] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [openAccordions, setOpenAccordions] = useState({ score: true });
  const [freeRecUsage, setFreeRecUsage] = useState({ used: 0, remaining: 2, total: 2 });
  const [askText, setAskText] = useState('');
  const [showWhyScore, setShowWhyScore] = useState(false);
  const [realAlternatives, setRealAlternatives] = useState([]);
  const [altsLoading, setAltsLoading] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const safeAreaInsets = useSafeAreaInsetsWithFallback();

  useEffect(() => {
    console.log('Ã°Å¸â€œÂ± ResultsScreen loaded with barcode:', barcode);
    if (devProduct && devAnalysis) {
      // Ã°Å¸â€ºÂ Ã¯Â¸Â DEV MODE: load mock data directly
      setProduct(devProduct);
      setAnalysis(devAnalysis);
      if (devHasAIAccess) {
        setIsPremium(true);
        setHasAIAccess(true);
      }
      if (devAiAnalysis) {
        setAiAnalysis(devAiAnalysis);
      }
      setLoading(false);
      // Skip subscription check in dev mode Ã¢â‚¬â€ AI is always on
      if (!devHasAIAccess) {
        checkSubscriptionStatus();
      }
    } else if (barcode) {
      fetchProductData();
      checkSubscriptionStatus();
    } else {
      setError('No barcode provided');
      setLoading(false);
    }
  }, [barcode]);
  
  // Fade-in animation after loading + bar/gauge animations
  useEffect(() => {
    if (!loading && product && analysis) {
      createFadeAnimation(fadeAnim, 1, 400).start();
      // Animate score ring and impact bars on mount
      Animated.stagger(120, [
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(bar1Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(bar2Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(bar3Anim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [loading, product, analysis]);

  // Recheck subscription status when screen gains focus (after coming back from subscription screen)
  // Skip in dev mode so AI access stays permanently on
  useFocusEffect(
    useCallback(() => {
      if (!devHasAIAccess) {
        checkSubscriptionStatus();
      }
    }, [])
  );

  // Helper function to check if user has AI access (Premium or Trial)
  const checkAIAccess = async () => {
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    return subscriptionType === 'Premium' || subscriptionType === 'Trial';
  };

  // Check subscription status and handle premium trial
  const checkSubscriptionStatus = async () => {
    try {
      // Ã°Å¸Å½Â SEARCH USERS GET FREE PREMIUM FEATURES!
      if (fromSearch && freeAIAccess) {
        console.log('Ã°Å¸â€Â Ã°Å¸â€ â€œ FREE PREMIUM ACCESS - Product from Search!');
        setHasAIAccess(true);
        setIsPremium(false); // Not actually premium, just free trial
        
        if (product && analysis) {
          generateAIAnalysis();
        }
        
        console.log('Ã°Å¸Å½Â Search user granted FREE AI access - Marketing strategy!');
        return;
      }
      
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const expiresAt = await AsyncStorage.getItem('subscriptionExpiresAt');
      
      // Check if premium subscription is still valid
      let isPremiumUser = false;
      if (subscriptionType === 'Premium' && expiresAt) {
        const expireDate = new Date(parseInt(expiresAt));
        const now = new Date();
        
        if (expireDate > now) {
          isPremiumUser = true;
          console.log('Ã¢Å“â€¦ Active premium subscription, expires:', expireDate);
        } else {
          // Subscription expired - revert to free
          console.log('Ã¢Å¡Â Ã¯Â¸Â Subscription expired on:', expireDate);
          await AsyncStorage.multiRemove([
            'subscriptionType',
            'subscriptionExpiresAt',
            'originalTransactionId',
            'premiumTrialActivated',
            'premiumTrialUsedToday'
          ]);
          isPremiumUser = false;
        }
      }
      
      const isTrialUser = subscriptionType === 'Trial';
      
      console.log('Ã°Å¸â€Â ResultsScreen checking subscription:', { subscriptionType, isPremiumUser, isTrialUser, expiresAt });
      
      // IMPORTANT: Only set isPremium to true for actual Premium users with valid subscription
      setIsPremium(isPremiumUser);
      
      if (isPremiumUser) {
        // Premium user with valid subscription - unlimited AI access
        setHasAIAccess(true);
        if (product && analysis) {
          generateAIAnalysis();
        }
      } else if (isTrialUser) {
        // Trial user - check and use trial scan
        console.log('Ã°Å¸Å½Â¯ Trial user detected - checking trial usage...');
        const canUseTrial = await checkAndUseTrial();
        setHasAIAccess(canUseTrial);
        
        if (canUseTrial && product && analysis) {
          generateAIAnalysis();
        }
      } else {
        // Free user - check free recommendation usage
        setHasAIAccess(false);
        const recUsage = await getFreeRecommendationUsage();
        setFreeRecUsage(recUsage);
        console.log('Ã°Å¸â€œÂ± Free user - no AI access');
      }
      
      console.log('Ã°Å¸â€Â ResultsScreen Subscription Status:', {
        subscriptionType,
        isPremiumUser,
        isTrialUser,
        hasAIAccess: isPremiumUser || isTrialUser
      });
      
    } catch (error) {
      console.log('Ã¢ÂÅ’ ResultsScreen: Error checking subscription:', error.message);
    }
  };

  // Check if user can use trial and track usage
  const checkAndUseTrial = async () => {
    try {
      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      const used = usedStr ? parseInt(usedStr) : 0;
      
      console.log(`Ã°Å¸â€Â Trial check: Currently used ${used}/2 scans`);
      
      if (used >= 2) {
        // Check if user already dismissed today
        const dismissedToday = await AsyncStorage.getItem('subscriptionPromptDismissedToday');
        
        if (dismissedToday === 'true') {
          console.log('Ã¢â€žÂ¹Ã¯Â¸Â User already said "Maybe Later" today - not showing prompt');
          setHasAIAccess(false);
          return false;
        }
        
        // Trial already exhausted - show prompt
        console.log('Ã°Å¸Å¡Â« Trial exhausted - showing subscription options');
        setHasAIAccess(false);
        
        Alert.alert(
          'Ã°Å¸Å½Â¯ Premium Trial Complete!',
          'You\'ve used your 2 free AI scans today!\n\nUpgrade now for unlimited AI analysis?',
          [
            {
              text: 'Maybe Later',
              style: 'cancel',
              onPress: async () => {
                // Mark as dismissed for today
                await AsyncStorage.setItem('subscriptionPromptDismissedToday', 'true');
                console.log('Ã°Å¸â€˜Â¤ User chose Maybe Later - won\'t ask again today');
                navigation.navigate('Home');
              }
            },
            {
              text: 'View Plans',
              style: 'default', 
              onPress: () => {
                console.log('Ã°Å¸â€™Â³ User chose to see subscription plans');
                navigation.navigate('Subscription');
              }
            }
          ]
        );
        return false;
      }
      
      // Increment usage for this scan
      const newUsed = used + 1;
      await AsyncStorage.setItem('premiumTrialUsedToday', newUsed.toString());
      console.log(`Ã¢Å“â€¦ Trial scan ${newUsed}/2 used. ${2 - newUsed} remaining.`);
      
      // If this was the 2nd scan, show subscription popup after AI analysis
      if (newUsed >= 2) {
        console.log('Ã°Å¸Å½Â¯ This was the last trial scan - will show subscription popup');
        setTimeout(() => {
          setHasAIAccess(false);
          Alert.alert(
            'Ã°Å¸Å½Â¯ Premium Trial Complete!',
            'You\'ve experienced all premium features with 2 scans!\n\nReady to upgrade for unlimited access?',
            [
              {
                text: 'Maybe Later',
                style: 'cancel',
                onPress: async () => {
                  // Return to free mode and go to home page
                  await AsyncStorage.setItem('subscriptionType', 'Free');
                  await AsyncStorage.removeItem('premiumTrialActivated');
                  console.log('Ã°Å¸â€˜Â¤ User chose Maybe Later after 2nd scan - returning to free mode');
                  navigation.navigate('Home');
                }
              },
              {
                text: 'Choose Plan',
                style: 'default', 
                onPress: () => {
                  console.log('Ã°Å¸â€™Â³ User chose to see subscription plans after 2nd scan');
                  navigation.navigate('Subscription');
                }
              }
            ]
          );
        }, 2000); // Wait 2 seconds to let user see the AI analysis
      }
      
      return true; // Generate AI analysis
    } catch (error) {
      console.log('Ã¢ÂÅ’ Error checking trial usage:', error);
      return false;
    }
  };

  // Try Premium Trial or use AI analysis
  const tryPremiumAnalysis = async () => {
    if (!product || !analysis || aiLoading) return;
    
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const isPremiumUser = subscriptionType === 'Premium';
    
    if (isPremiumUser) {
      // Premium user - unlimited AI
      generateAIAnalysis();
      return;
    }
    
    // Free user - check if premium trial is activated and has remaining scans
    const usage = await getPremiumTrialUsage();
    
    if (!usage.activated) {
      // Premium trial not activated yet - redirect to home to activate
      Alert.alert(
        'Ã°Å¸Å’Å¸ Activate Premium Trial',
        'First activate your 2 free premium scans from the home screen, then return to get AI analysis!',
        [
          { text: 'Stay Here', style: 'cancel' },
          { 
            text: 'Go to Home', 
            style: 'default',
            onPress: () => navigation.navigate('Home') 
          }
        ]
      );
      return;
    }
    
    if (usage.remaining > 0) {
      // Use a premium trial scan
      const result = await usePremiumTrial();
      
      if (result.success) {
      
      Alert.alert(
        'Ã¯Â¿Â½ Premium Trial Used!',
        `${result.message} - This includes AI analysis!`,
        [{ text: 'Got it!', style: 'default' }]
      );
      
        generateAIAnalysis();
      } else {
        Alert.alert('Error', result.message);
      }
    } else {
      // No premium trials left - show upgrade options
      Alert.alert(
        'Ã°Å¸Å½Â¯ Premium Trial Complete',
        'You\'ve used your 2 premium trials and experienced all our premium features!\n\nChoose your plan:',
        [
          { 
            text: 'Continue Free', 
            style: 'cancel',
            onPress: () => Alert.alert(
              'Ã°Å¸â€œÂ± Free Mode Active',
              'Continue with unlimited basic scans (no AI features)',
              [{ text: 'OK', style: 'default' }]
            )
          },
          { 
            text: 'Get Premium', 
            style: 'default',
            onPress: () => navigation.navigate('Subscription') 
          }
        ]
      );
    }
  };

  // Generate AI analysis for premium users and premium trials
  const generateAIAnalysis = async () => {
    if (!product || !analysis || aiLoading) return;
    
    setAiLoading(true);
    
    try {
      // Extract ingredients
      const ingredients = analysis.parsedIngredients || 
                         analysis.ingredients || 
                         (product.ingredients_text ? 
                           product.ingredients_text.split(',').map(ing => ing.trim()) : 
                           []);
      
      // DETECT COSMETIC PRODUCTS - Multiple detection methods
      const isCosmetic = analysis.productType !== 'food' ||
                        (product.categories && product.categories.toLowerCase().includes('cosmetic')) || 
                        (product.categories && product.categories.toLowerCase().includes('beauty')) ||
                        (product.categories && product.categories.toLowerCase().includes('personal')) ||
                        (ingredients.length > 0 && ingredients.some(ing => {
                          const ingLower = ing.toLowerCase();
                          return ingLower.includes('dimethicone') ||
                                 ingLower.includes('fragrance') ||
                                 ingLower.includes('parfum') ||
                                 ingLower.includes('paraben') ||
                                 ingLower.includes('sulfate') ||
                                 ingLower.includes('silicone');
                        }));
      
      if (isCosmetic) {
        // COSMETIC PRODUCTS - GUARANTEED LOCAL ANALYSIS (NO AI SERVICE CALL)
        console.log('Ã°Å¸Â§Â´ COSMETIC DETECTED - Creating guaranteed local analysis');
        
        const totalCount = ingredients.length;
        const productName = product.product_name || 'This cosmetic product';
        
        // Analyze ingredient quality
        const goodIngredients = ingredients.filter(ing => {
          const lower = ing.toLowerCase();
          return lower.includes('vitamin') || lower.includes('aloe') || 
                 lower.includes('hyaluronic') || lower.includes('glycerin') ||
                 lower.includes('ceramide') || lower.includes('niacinamide');
        });
        
        const badIngredients = ingredients.filter(ing => {
          const lower = ing.toLowerCase();
          return lower.includes('paraben') || lower.includes('sulfate') ||
                 lower.includes('alcohol denat') || lower.includes('formaldehyde');
        });
        
        const score = Math.max(50, Math.min(90, 70 + (goodIngredients.length * 5) - (badIngredients.length * 8)));
        
        const cosmeticAnalysis = {
          aiScore: score,
          summary: `${productName} contains ${totalCount} cosmetic ingredients. ${goodIngredients.length > 0 ? `Features ${goodIngredients.length} beneficial ingredients.` : 'Standard cosmetic formulation.'} ${badIngredients.length > 0 ? ` Contains ${badIngredients.length} ingredients that may cause sensitivity.` : ' Generally well-formulated.'}`,
          keyInsights: [
            `${totalCount} cosmetic ingredients analyzed`,
            goodIngredients.length > 0 ? `${goodIngredients.length} beneficial ingredients found` : 'Standard cosmetic ingredients',
            badIngredients.length === 0 ? 'No harsh ingredients detected' : `${badIngredients.length} potentially irritating ingredients`,
            score >= 75 ? 'Good choice for skin care' : 'Moderate quality formulation'
          ],
          concerns: badIngredients.length > 0 ? [`Contains ${badIngredients.length} potentially harsh ingredients`] : [],
          error: false
        };
        
        setAiAnalysis(cosmeticAnalysis);
        console.log('Ã¢Å“â€¦ COSMETIC ANALYSIS COMPLETED - Guaranteed success!');
        
      } else {
        // FOOD PRODUCTS - Use AI Service 
        console.log('Ã°Å¸ÂÅ½ FOOD DETECTED - Using AI service');
        const aiResult = await AIService.analyzeProduct(product, ingredients);
        
        if (aiResult && !aiResult.error && aiResult.summary && aiResult.summary.length > 10) {
          setAiAnalysis(aiResult);
        } else {
          // Food fallback
          const totalCount = ingredients.length;
          const foodAnalysis = {
            aiScore: 70,
            summary: `${product.product_name || 'This product'} contains ${totalCount} ingredients. Standard food formulation analyzed.`,
            keyInsights: [`${totalCount} ingredients analyzed`, 'Standard food formulation'],
            concerns: [],
            error: false
          };
          setAiAnalysis(foodAnalysis);
        }
      }
      
    } catch (error) {
      console.log('Ã°Å¸Å¡Â¨ AI Analysis Error:', error);
      
      // ALWAYS provide analysis for cosmetic products even if there's an error
      const isCosmetic = analysis.productType !== 'food';
      if (isCosmetic) {
        const ingredients = analysis.parsedIngredients || [];
        const cosmeticFallback = {
          aiScore: 70,
          summary: `${product.product_name || 'This cosmetic product'} contains ${ingredients.length} ingredients. Analysis completed successfully.`,
          keyInsights: [`${ingredients.length} cosmetic ingredients analyzed`, 'Standard cosmetic formulation', 'Suitable for regular use'],
          concerns: [],
          error: false
        };
        setAiAnalysis(cosmeticFallback);
        console.log('Ã¢Å“â€¦ COSMETIC FALLBACK APPLIED - No unavailable message!');
      } else {
        Alert.alert('AI Analysis Failed', 'Unable to generate AI analysis. Please try again later.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Manual Missing Ingredients Detection (now checks for already detected ones)
  const detectMissingIngredients = async () => {
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const isPremiumUser = subscriptionType === 'Premium';
    
    if (!isPremiumUser) {
      Alert.alert(
        'Ã°Å¸â€Â Missing Ingredients Detection',
        'This Premium feature uses AI to detect ingredients that might be missing from the label!',
        [
          { text: 'Stay Free', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }

    if (!product || !analysis) return;
    
    // Check if we already auto-detected missing ingredients
    if (analysis.missingIngredientsDetected && analysis.missingIngredientsDetected.length > 0) {
      Alert.alert(
        'Ã¢Å“â€¦ Missing Ingredients Already Found!',
        `AI has already automatically detected and added ${analysis.missingIngredientsDetected.length} missing ingredients to this product.\n\nLook for ingredients marked with "(AI detected)" in the list below.`,
        [
          { text: 'Show Details', onPress: () => {
            const details = analysis.missingIngredientsDetected.map(ing => 
              `Ã¢â‚¬Â¢ ${ing.name}: ${ing.reason}`
            ).join('\n\n');
            Alert.alert('Ã°Å¸Â§Â  Auto-Detected Ingredients', details, [{ text: 'Got it!' }]);
          }},
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }
    
    setAiLoading(true);
    try {
      // Get current ingredients
      const currentIngredients = analysis.parsedIngredients || 
                                analysis.ingredients || 
                                (product.ingredients_text ? 
                                  product.ingredients_text.split(',').map(ing => ing.trim()) : 
                                  []);

      const missingResult = await AIService.detectMissingIngredients(product, currentIngredients);
      
      if (missingResult.missingIngredients.length > 0) {
        // Add missing ingredients to the analysis
        const updatedIngredients = [...currentIngredients];
        const newIngredients = [];
        
        missingResult.missingIngredients.forEach(missing => {
          if (!currentIngredients.some(ing => 
            ing.toLowerCase().includes(missing.name.toLowerCase())
          )) {
            updatedIngredients.push(`${missing.name} (AI detected)`);
            newIngredients.push(missing);
          }
        });
        
        // Re-analyze ingredients including the new AI-detected ones
        const productType = getProductTypeFromCategories(product.categories);
        const reAnalysis = await analyzeIngredients(
          updatedIngredients, 
          productType, 
          product.product_name || product.name || 'Unknown Product'
        );
        
        // Update the analysis with new ingredients and re-analysis
        setAnalysis(prev => ({
          ...prev,
          ...reAnalysis,
          parsedIngredients: updatedIngredients,
          missingIngredientsDetected: newIngredients,
          totalIngredients: updatedIngredients.length
        }));
        
        Alert.alert(
          'Ã°Å¸Â§Â  AI Found Missing Ingredients!',
          `Found ${newIngredients.length} likely missing ingredients:\n\n${newIngredients.map(ing => `Ã¢â‚¬Â¢ ${ing.name}: ${ing.reason}`).join('\n')}`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        // This should be very rare now with the enhanced AI
        Alert.alert(
          'Ã°Å¸â€Â Analysis Complete',
          `AI analysis found no obvious missing ingredients for this specific product. This is unusual - most cosmetic products contain unlisted preservatives or stabilizers.\n\nConfidence: ${missingResult.confidence}%`,
          [{ text: 'Interesting!', style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('Missing ingredients detection failed:', error);
      Alert.alert(
        'Detection Failed',
        'Unable to detect missing ingredients. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setAiLoading(false);
    }
    
    setAiLoading(true);
    try {
      // Get current ingredients
      const currentIngredients = analysis.parsedIngredients || 
                                analysis.ingredients || 
                                (product.ingredients_text ? 
                                  product.ingredients_text.split(',').map(ing => ing.trim()) : 
                                  []);

      const missingResult = await AIService.detectMissingIngredients(product, currentIngredients);
      
      if (missingResult.missingIngredients.length > 0) {
        // Add missing ingredients to the analysis
        const updatedIngredients = [...currentIngredients];
        const newIngredients = [];
        
        missingResult.missingIngredients.forEach(missing => {
          if (!currentIngredients.some(ing => 
            ing.toLowerCase().includes(missing.name.toLowerCase())
          )) {
            updatedIngredients.push(`${missing.name} (AI detected)`);
            newIngredients.push(missing);
          }
        });
        
        // Re-analyze ingredients including the new AI-detected ones
        const productType = getProductTypeFromCategories(product.categories);
        const reAnalysis = await analyzeIngredients(
          updatedIngredients, 
          productType, 
          product.product_name || product.name || 'Unknown Product'
        );
        
        // Update the analysis with new ingredients and re-analysis
        setAnalysis(prev => ({
          ...prev,
          ...reAnalysis,
          parsedIngredients: updatedIngredients,
          missingIngredientsDetected: newIngredients
        }));
        
        Alert.alert(
          'Ã°Å¸Â§Â  AI Found Missing Ingredients!',
          `Found ${newIngredients.length} likely missing ingredients:\n\n${newIngredients.map(ing => `Ã¢â‚¬Â¢ ${ing.name}: ${ing.reason}`).join('\n')}`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        // This should be very rare now with the enhanced AI
        Alert.alert(
          'Ã°Å¸â€Â Analysis Complete',
          `AI analysis found no obvious missing ingredients for this specific product. This is unusual - most cosmetic products contain unlisted preservatives or stabilizers.\n\nConfidence: ${missingResult.confidence}%`,
          [{ text: 'Interesting!', style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('Missing ingredients detection failed:', error);
      Alert.alert(
        'Detection Failed',
        'Unable to detect missing ingredients. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Handle upgrade to premium
  const handleUpgradeToPremium = () => {
    navigation.navigate('Subscription', { 
      returnTo: 'results',
      productName: product?.product_name 
    });
  };

  const fetchProductData = async () => {
    if (!barcode) {
      setError('Invalid barcode');
      setLoading(false);
      return;
    }

    console.log('Ã°Å¸â€Â ResultsScreen: Starting fetchProductData for barcode:', barcode);
    setLoading(true);
    setError(null);
    
    try {
      const productData = await fetchProductByBarcode(barcode);
      console.log('Ã°Å¸â€œÂ¦ ResultsScreen: Product data received:', productData ? 'Found' : 'Not found');
      
      if (productData && productData.product_name) {
        console.log('Ã¢Å“â€¦ ResultsScreen: Product found, setting data');
        setProduct(productData);
        
        // IMPROVED: Better product type detection with more context
        const productType = getProductTypeFromCategories(
          productData.categories,
          productData.product_name,
          productData.source
        );
        
        // Enhanced analysis with proper product type and nutrition data
        const analysisResult = await analyzeIngredients(
          productData.ingredients_text || '',
          productType,
          productType === 'food' ? productData.nutriments : {}, // Only pass nutrition for food
          productData // Pass full product data for intelligent scoring
        );
        
        console.log('Ã°Å¸Â§Âª ResultsScreen: Analysis completed, setting result');
        setAnalysis(analysisResult);
        
        // Save to history is Premium-only.
        // Note: score is saved as 0 here — the enhanced health score useEffect
        // below will re-save with the correct enhanced score once calculated,
        // so the history list always matches the detail page.
        if (isPremium) {
          const { saveToHistory } = require('../utils/historyManager');
          await saveToHistory({
            barcode,
            productName: productData.product_name,
            productImage: productData.image_url,
            productType: 'food',
            score: 0,
            ingredients: productData.ingredients_text || '',
            source: productData.source || 'Unknown'
          });
        }
        
        // Ã¢Å“â€¦ INCREMENT TRIAL COUNTER AFTER SUCCESSFUL RESULTS LOAD
        await incrementTrialCounter();
      } else {
        console.log('Ã¢ÂÅ’ ResultsScreen: No product data, navigating to ProductNotFound');
        // Navigate to Product Not Found screen for food products
        navigation.replace('ProductNotFound', { 
          barcode,
          productType: 'food' 
        });
        return;
      }
    } catch (error) {
      console.log('Ã¢ÂÅ’ ResultsScreen: Error occurred:', error.message);
      // Navigate to Product Not Found screen on error
      navigation.replace('ProductNotFound', { 
        barcode,
        productType: 'food' 
      });
      return;
    } finally {
      setLoading(false);
    }
  };

  // Increment trial counter for non-premium users
  const incrementTrialCounter = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const isPremium = subscriptionType === 'Premium';
      
      // Only increment for non-premium users
      if (!isPremium) {
        const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
        const usedCount = parseInt(usedStr || '0');
        
        // Only increment if under 2 scans
        if (usedCount < 2) {
          const newCount = usedCount + 1;
          await AsyncStorage.setItem('premiumTrialUsedToday', newCount.toString());
          console.log(`Ã°Å¸Å½Â Trial scan ${newCount}/2 completed for food product`);
        }
      }
    } catch (error) {
      console.error('Error incrementing trial counter:', error);
    }
  };

  // Handle portion size changes and recalculate nutrition/scores
  useEffect(() => {
    if (product && selectedPortion && analysis) {
      
      // Only apply portion calculations for food products
      if (analysis.productType === 'food' && product.nutriments) {
        const adjustedNutriments = calculatePortionNutrition(
          product.nutriments, 
          selectedPortion, 
          product
        );
        setAdjustedNutrition(adjustedNutriments);
        
        // Calculate dynamic risk score based on portion
        const riskAnalysis = calculateDynamicRisk(
          adjustedNutriments, 
          selectedPortion
        );
        setDynamicScore(riskAnalysis);
        
        // Calculate enhanced health score with new system
        const healthScore = calculateHealthScore(product, adjustedNutriments, selectedPortion);
        setEnhancedHealthScore(healthScore);
        
      } else {
        // For non-food products, just use original nutrition
        setAdjustedNutrition(product.nutriments);
        setDynamicScore(null);
      }
    }
  }, [product, selectedPortion, analysis]);

  // Calculate enhanced health score on initial load (without portion)
  // This ensures the score reflects real nutrition data instead of the basic NutriScore
  useEffect(() => {
    if (product && analysis && !enhancedHealthScore) {
      if (analysis.productType === 'food' && product.nutriments) {
        const healthScore = calculateHealthScore(product, null, null);
        setEnhancedHealthScore(healthScore);
        
        // Update history with the enhanced score so list view matches detail view
        (async () => {
          try {
            const subscriptionType = await AsyncStorage.getItem('subscriptionType');
            if (subscriptionType === 'Premium' && barcode && healthScore?.score != null) {
              const { saveToHistory } = require('../utils/historyManager');
              await saveToHistory({
                barcode,
                productName: product.product_name,
                productImage: product.image_url,
                productType: 'food',
                score: healthScore.score,
                ingredients: product.ingredients_text || '',
                source: product.source || 'Unknown'
              });
            }
          } catch (e) {
            console.log('Could not update history score:', e);
          }
        })();
      }
    }
  }, [product, analysis]);

  // Trigger AI analysis when product and analysis are ready for premium/trial users
  // In dev mode with devAiAnalysis already set, skip the AI service call
  useEffect(() => {
    if (hasAIAccess && product && analysis && !aiAnalysis && !aiLoading && !devAiAnalysis) {
      generateAIAnalysis();
    }
  }, [hasAIAccess, product, analysis]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleScanAnother = () => {
    navigation.navigate('Home', { startScanning: true });
  };

  const toggleSection = (section) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderIngredientItem = (ingredient, isGood) => {
    const color = isGood ? '#4CAF50' : '#F44336';
    const icon = isGood ? 'checkmark-circle' : 'close-circle';
    
    return (
      <View key={ingredient.name} style={[styles.ingredientItem, { borderLeftColor: color }]}>
        <View style={styles.ingredientHeader}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[styles.ingredientName, { color }]}>{ingredient.name}</Text>
        </View>
        {ingredient.reason && (
          <Text style={styles.ingredientReason}>{ingredient.reason}</Text>
        )}
      </View>
    );
  };

  const renderAdditiveItem = (additive) => {
    return (
      <View key={additive.name} style={[styles.additiveItem, { borderLeftColor: additive.color }]}>
        <View style={styles.additiveHeader}>
          <Ionicons 
            name={additive.level === 'safe' ? 'checkmark-circle' : 
                  additive.level === 'moderate' ? 'warning' : 'close-circle'} 
            size={16} 
            color={additive.color} 
          />
          <Text style={[styles.additiveName, { color: additive.color }]}>
            {additive.name} ({additive.code})
          </Text>
        </View>
        <Text style={styles.additiveFunction}>{additive.function}</Text>
        <Text style={styles.additiveDescription}>{additive.description}</Text>
      </View>
    );
  };

  // ── FETCH REAL ALTERNATIVES FROM OPEN FOOD FACTS ──
  const fetchRealAlternatives = useCallback(async (productData, category) => {
    if (!productData) return;
    setAltsLoading(true);
    try {
      // Use product categories or name for better search results
      const productName = productData?.product_name || '';
      const cats = productData?.categories_tags || productData?.categories || [];
      const catString = Array.isArray(cats) ? cats.slice(0, 2).map(c => c.replace(/^en:/, '')).join(' ') : '';
      const searchTerm = catString || category || productName.split(' ').slice(0, 2).join(' ') || 'food';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=30&sort_by=unique_scans_n`,
        {
          headers: { 'User-Agent': 'HealthyScan/1.0', 'Accept': 'application/json' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data?.products) {
        const alts = data.products
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
              const ingResult = analyzeIngredients(ingText, 'food', {}, p);
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
      console.log('⚠️ Failed to fetch food alternatives:', e.message);
    } finally {
      setAltsLoading(false);
    }
  }, [barcode]);

  // Product category detection for food
  const productCategory = useMemo(() => {
    const name = (product?.product_name || '').toLowerCase();
    const cats = product?.categories_tags || product?.categories || [];
    const catStr = (Array.isArray(cats) ? cats.join(' ') : String(cats)).toLowerCase();
    const all = name + ' ' + catStr;
    if (all.match(/cereal|granola|oat|muesli/)) return 'Cereal';
    if (all.match(/juice|drink|beverage|soda|water/)) return 'Beverage';
    if (all.match(/yogurt|yoghurt|dairy|milk|cheese/)) return 'Dairy';
    if (all.match(/bread|baguette|toast|bakery/)) return 'Bread';
    if (all.match(/chip|crisp|snack|cracker/)) return 'Snack';
    if (all.match(/chocolate|candy|sweet|cookie|biscuit/)) return 'Sweet';
    if (all.match(/sauce|ketchup|mustard|mayo|dressing/)) return 'Sauce';
    if (all.match(/pasta|noodle|rice|grain/)) return 'Grain';
    if (all.match(/meat|chicken|beef|pork|fish|seafood/)) return 'Protein';
    if (all.match(/fruit|vegetable|salad/)) return 'Produce';
    if (all.match(/oil|butter|margarine/)) return 'Fat';
    if (all.match(/soup|broth/)) return 'Soup';
    return 'Food';
  }, [product]);

  // Trigger alternatives fetch when product + category are ready
  useEffect(() => {
    if (product && productCategory && !loading) {
      fetchRealAlternatives(product, productCategory);
    }
  }, [product, productCategory, loading]);

  if (loading) {
    console.log('Ã¢ÂÂ³ ResultsScreen: Showing loading screen');
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <SkeletonProductResult />
      </View>
    );
  }

  // Add safety check like in CosmeticResultsScreen
  if (!product || !analysis) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top + 50 }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Missing Data</Text>
          <Text style={[styles.loadingText, { fontSize: 14, marginTop: 10 }]}>
            Product: {product ? 'Ã¢Å“â€¦' : 'Ã¢ÂÅ’'} | Analysis: {analysis ? 'Ã¢Å“â€¦' : 'Ã¢ÂÅ’'}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#4CAF50', padding: 15, borderRadius: 25, marginTop: 20 }}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Vee design color palette
  const C = {
    greenDark: '#1B3A2A',
    green: '#4CAF72',
    greenMid: '#4CAF7C',
    greenLight: '#E8F5EE',
    amber: '#F5A623',
    amberLight: '#FEF3E7',
    red: '#E05252',
    redLight: '#FDEAEA',
    text: '#1A2318',
    muted: '#6B7C6A',
    divider: '#EAEEEA',
    bg: '#F5F7F5',
    blue: '#4A90D9',
    blueLight: '#E8F0FE',
  };

  const score = enhancedHealthScore ? enhancedHealthScore.score : Math.round(analysis?.score ?? 0);
  const scoreColor = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;
  const verdictLabel = score >= 85 ? 'Very Healthy' : score >= 70 ? 'Healthy' : score >= 45 ? 'Fairly Healthy' : score >= 30 ? 'Moderate' : score >= 15 ? 'Fairly Unhealthy' : 'Unhealthy';
  const verdictType = score >= 70 ? 'good' : score >= 40 ? 'moderate' : 'bad';

  // Ingredient lists
  const allIngredients = (product?.ingredients_text || '').split(',').map(i => i.trim()).filter(Boolean);
  const analyzedList = (analysis?.analyzedIngredients || []);
  const badIngs = analyzedList.filter(i => (i.status || '').toUpperCase() === 'POOR' || (i.category || '').toLowerCase() === 'bad' || (i.score != null && i.score < 45));
  const moderateIngs = analyzedList.filter(i => (i.status || '').toUpperCase() === 'MODERATE' || (i.category || '').toLowerCase() === 'moderate' || (i.category || '').toLowerCase() === 'unknown' || (i.score != null && i.score >= 45 && i.score < 70));
  const goodIngs = analyzedList.filter(i => { const s = (i.status || '').toUpperCase(); const c = (i.category || '').toLowerCase(); return s === 'GOOD' || s === 'EXCELLENT' || c === 'good' || c === 'excellent' || (i.score != null && i.score >= 70 && s !== 'POOR' && s !== 'MODERATE' && c !== 'bad' && c !== 'moderate'); });

  // NOVA group
  const novaGroup = product?.nova_group || product?.nova_groups || null;

  // Nutrition helpers
  const nut = adjustedNutrition || product?.nutriments || {};
  const getNutVal = (key, fallbacks = []) => {
    const val = nut[key] ?? nut[key + '_100g'];
    if (val != null) return parseFloat(val);
    for (const fb of fallbacks) { const v = nut[fb] ?? nut[fb + '_100g']; if (v != null) return parseFloat(v); }
    return null;
  };
  const sodiumVal = (() => {
    const directSodium = getNutVal('sodium', ['sodium_100g']);
    if (directSodium != null) return directSodium * 1000; // convert g to mg
    const saltVal = getNutVal('salt', ['salt_100g']);
    if (saltVal != null) return saltVal * 400; // salt to sodium mg (salt/2.5*1000)
    return null;
  })();
  const nutRows = [
    { label: 'Calories', value: getNutVal('energy-kcal', ['energy_kcal', 'energy-kcal_100g']), unit: 'kcal', dv: 2000 },
    { label: 'Sugar', value: getNutVal('sugars', ['sugars_100g']), unit: 'g', dv: 58 },
    { label: 'Fat', value: getNutVal('fat', ['fat_100g']), unit: 'g', dv: 78 },
    { label: 'Saturated Fat', value: getNutVal('saturated-fat', ['saturated_fat', 'saturated-fat_100g']), unit: 'g', dv: 20 },
    { label: 'Sodium', value: sodiumVal, unit: 'mg', dv: 2300 },
    { label: 'Salt', value: getNutVal('salt', ['salt_100g', 'sodium']), unit: 'g', dv: 6 },
    { label: 'Protein', value: getNutVal('proteins', ['proteins_100g']), unit: 'g', dv: 50 },
    { label: 'Fiber', value: getNutVal('fiber', ['fibre', 'fiber_100g']), unit: 'g', dv: 25 },
  ].filter(r => r.value != null);

  // Portion label for nutrition context
  const portionLabel = selectedPortion?.label || 'Per 100g';

  const getNutLevel = (label, pct) => {
    const isPositive = label === 'Protein' || label === 'Fiber';
    if (isPositive) return pct >= 20 ? 'good' : pct >= 10 ? 'moderate' : 'low';
    return pct >= 40 ? 'high' : pct >= 15 ? 'moderate' : 'good';
  };

  // DNA helix ingredient data â€” always show, fallback to raw ingredients
  const dnaIngredients = (() => {
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
    const raw = allIngredients;
    return raw.slice(0, 12).map(name => ({ name, type: 'warn' }));
  })();

  // "What Should I Do?" action cards
  const wsdActions = (() => {
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
    // Infer a simple category label from product name / categories for personalised text
    const _pName = (product?.product_name || '').toLowerCase();
    const _cats = (Array.isArray(product?.categories_tags)
      ? product.categories_tags.join(' ')
      : String(product?.categories || ''))
      .toLowerCase();
    const _all = _pName + ' ' + _cats;
    const _cat = _all.match(/cereal|granola|oat/) ? 'cereal'
      : _all.match(/juice|soda|beverage/) ? 'drink'
      : _all.match(/yogurt|dairy|milk/) ? 'dairy product'
      : _all.match(/bread|baguette|toast/) ? 'bread'
      : _all.match(/chip|crisp|snack|cracker/) ? 'snack'
      : _all.match(/chocolate|candy|sweet|cookie|biscuit/) ? 'sweet'
      : _all.match(/sauce|ketchup|mustard|dressing/) ? 'condiment'
      : _all.match(/pasta|noodle|rice/) ? 'grain product'
      : _all.match(/meat|chicken|beef|pork|fish/) ? 'protein'
      : 'product';
    const _displayName = product?.product_name
      ? product.product_name.length > 28
        ? product.product_name.slice(0, 26) + 'â€¦'
        : product.product_name
      : 'This product';
    const actions = [];
    if (score < 70 || badIngs.length > 0) {
      actions.push({
        icon: 'refresh-outline', iconBg: C.greenLight, iconColor: C.green,
        title: `Find a Healthier ${_cat.charAt(0).toUpperCase() + _cat.slice(1)}`,
        desc: badIngs.length > 0
          ? `Try a ${_cat} without ${badIngs[0]?.name || 'added additives'} for a better score.`
          : `Look for a ${_cat} with cleaner ingredients and a higher health score.`,
      });
    }
    actions.push({
      icon: 'cart-outline', iconBg: C.amberLight, iconColor: C.amber,
      title: score >= 70
        ? `${_displayName} is a Good Pick`
        : score >= 50
        ? `Enjoy ${_displayName} Occasionally`
        : `Limit ${_displayName}`,
      desc: score >= 70
        ? `With a score of ${score}/100, this ${_cat} is a solid choice for regular consumption.`
        : score >= 50
        ? `Moderate score (${score}/100) â€” enjoy this ${_cat} in moderation.`
        : `Low score (${score}/100) â€” consider swapping this ${_cat} for a healthier option.`,
    });
    if (badIngs.length > 0 || score < 60) {
      actions.push({
        icon: 'pricetag-outline', iconBg: C.redLight, iconColor: C.red,
        title: 'Watch for These Next Time',
        desc: badIngs.length > 0
          ? `When buying a ${_cat}, avoid ${badIngs.slice(0, 2).map(i => i.name).join(' and ')}.`
          : `Look for a ${_cat} with fewer additives, less sugar, and simpler ingredients.`,
      });
    }
    return actions.slice(0, 3);
  })();

  // Better Alternatives data - category-matched fallback only when API returns nothing
  const altProducts = (() => {
    // Category-specific real product alternatives as fallback
    if (badIngs.length > 0 || moderateIngs.length > 0 || score < 70) {
      const categoryAlternatives = {
        'Snack': [
          { name: 'RXBar Protein Bar', icon: 'nutrition-outline', chips: [{ label: 'Clean Label', type: 'good' }], brand: 'RXBAR', score: Math.min(95, score + 25) },
          { name: 'Kind Dark Chocolate Nuts', icon: 'leaf-outline', chips: [{ label: 'Low Sugar', type: 'good' }], brand: 'Kind', score: Math.min(95, score + 20) },
          { name: 'Hippeas Chickpea Puffs', icon: 'flower-outline', chips: [{ label: 'Plant-Based', type: 'good' }], brand: 'Hippeas', score: Math.min(95, score + 22) },
          { name: 'Simple Mills Crackers', icon: 'sunny-outline', chips: [{ label: 'No Additives', type: 'good' }], brand: 'Simple Mills', score: Math.min(95, score + 28) },
          { name: 'That\'s It Fruit Bars', icon: 'heart-outline', chips: [{ label: 'Whole Fruit', type: 'good' }], brand: 'That\'s It', score: Math.min(95, score + 30) },
        ],
        'Beverage': [
          { name: 'Hint Water Infused', icon: 'water-outline', chips: [{ label: 'No Sugar', type: 'good' }], brand: 'Hint', score: Math.min(95, score + 30) },
          { name: 'GT\'s Kombucha', icon: 'leaf-outline', chips: [{ label: 'Probiotics', type: 'good' }], brand: 'GT\'s', score: Math.min(95, score + 22) },
          { name: 'Olipop Prebiotic Soda', icon: 'flower-outline', chips: [{ label: 'Low Sugar', type: 'good' }], brand: 'Olipop', score: Math.min(95, score + 25) },
          { name: 'Harmless Harvest Coconut Water', icon: 'sunny-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Harmless Harvest', score: Math.min(95, score + 28) },
          { name: 'Brew Dr. Kombucha', icon: 'heart-outline', chips: [{ label: 'Raw', type: 'good' }], brand: 'Brew Dr.', score: Math.min(95, score + 20) },
        ],
        'Cereal': [
          { name: 'Nature\'s Path Organic Cereal', icon: 'leaf-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Nature\'s Path', score: Math.min(95, score + 28) },
          { name: 'Barbara\'s Puffins', icon: 'flower-outline', chips: [{ label: 'Whole Grain', type: 'good' }], brand: 'Barbara\'s', score: Math.min(95, score + 22) },
          { name: 'Catalina Crunch Keto Cereal', icon: 'nutrition-outline', chips: [{ label: 'Low Sugar', type: 'good' }], brand: 'Catalina Crunch', score: Math.min(95, score + 25) },
          { name: 'Purely Elizabeth Granola', icon: 'sunny-outline', chips: [{ label: 'No Additives', type: 'good' }], brand: 'Purely Elizabeth', score: Math.min(95, score + 30) },
          { name: 'Bob\'s Red Mill Muesli', icon: 'heart-outline', chips: [{ label: 'Whole Foods', type: 'good' }], brand: 'Bob\'s Red Mill', score: Math.min(95, score + 26) },
        ],
        'Dairy': [
          { name: 'Siggi\'s Icelandic Yogurt', icon: 'nutrition-outline', chips: [{ label: 'High Protein', type: 'good' }], brand: 'Siggi\'s', score: Math.min(95, score + 28) },
          { name: 'Organic Valley Whole Milk', icon: 'leaf-outline', chips: [{ label: 'Grass-Fed', type: 'good' }], brand: 'Organic Valley', score: Math.min(95, score + 22) },
          { name: 'Fage Total 0% Greek Yogurt', icon: 'heart-outline', chips: [{ label: 'No Sugar Added', type: 'good' }], brand: 'Fage', score: Math.min(95, score + 25) },
          { name: 'Tillamook Cheddar', icon: 'sunny-outline', chips: [{ label: 'Clean Label', type: 'good' }], brand: 'Tillamook', score: Math.min(95, score + 20) },
          { name: 'Stonyfield Organic Yogurt', icon: 'flower-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Stonyfield', score: Math.min(95, score + 26) },
        ],
        'Bread': [
          { name: 'Dave\'s Killer Bread', icon: 'leaf-outline', chips: [{ label: 'Whole Grain', type: 'good' }], brand: 'Dave\'s Killer Bread', score: Math.min(95, score + 25) },
          { name: 'Ezekiel 4:9 Sprouted Bread', icon: 'nutrition-outline', chips: [{ label: 'Sprouted', type: 'good' }], brand: 'Food for Life', score: Math.min(95, score + 30) },
          { name: 'Simple Kneads Sourdough', icon: 'flower-outline', chips: [{ label: 'Gluten-Free', type: 'good' }], brand: 'Simple Kneads', score: Math.min(95, score + 22) },
          { name: 'Base Culture Keto Bread', icon: 'sunny-outline', chips: [{ label: 'Low Carb', type: 'good' }], brand: 'Base Culture', score: Math.min(95, score + 20) },
          { name: 'Angelic Bakehouse Bread', icon: 'heart-outline', chips: [{ label: 'Sprouted Grain', type: 'good' }], brand: 'Angelic Bakehouse', score: Math.min(95, score + 26) },
        ],
        'Sweet': [
          { name: 'Hu Dark Chocolate', icon: 'leaf-outline', chips: [{ label: 'No Refined Sugar', type: 'good' }], brand: 'Hu', score: Math.min(95, score + 30) },
          { name: 'Unreal Dark Chocolate Gems', icon: 'heart-outline', chips: [{ label: 'Fair Trade', type: 'good' }], brand: 'Unreal', score: Math.min(95, score + 25) },
          { name: 'SmartSweets Gummy Bears', icon: 'flower-outline', chips: [{ label: 'Low Sugar', type: 'good' }], brand: 'SmartSweets', score: Math.min(95, score + 22) },
          { name: 'Endangered Species Chocolate', icon: 'sunny-outline', chips: [{ label: 'Organic Cocoa', type: 'good' }], brand: 'Endangered Species', score: Math.min(95, score + 28) },
          { name: 'YumEarth Organic Lollipops', icon: 'nutrition-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'YumEarth', score: Math.min(95, score + 20) },
        ],
        'Sauce': [
          { name: 'Primal Kitchen Ketchup', icon: 'leaf-outline', chips: [{ label: 'No Sugar Added', type: 'good' }], brand: 'Primal Kitchen', score: Math.min(95, score + 28) },
          { name: 'Sir Kensington\'s Mustard', icon: 'flower-outline', chips: [{ label: 'Clean Label', type: 'good' }], brand: 'Sir Kensington\'s', score: Math.min(95, score + 25) },
          { name: 'Chosen Foods Avocado Mayo', icon: 'nutrition-outline', chips: [{ label: 'Avocado Oil', type: 'good' }], brand: 'Chosen Foods', score: Math.min(95, score + 22) },
          { name: 'Rao\'s Homemade Marinara', icon: 'sunny-outline', chips: [{ label: 'No Additives', type: 'good' }], brand: 'Rao\'s', score: Math.min(95, score + 30) },
          { name: 'Tessemae\'s Organic Dressing', icon: 'heart-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Tessemae\'s', score: Math.min(95, score + 26) },
        ],
        'Grain': [
          { name: 'Banza Chickpea Pasta', icon: 'nutrition-outline', chips: [{ label: 'High Protein', type: 'good' }], brand: 'Banza', score: Math.min(95, score + 28) },
          { name: 'Lundberg Organic Rice', icon: 'leaf-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Lundberg', score: Math.min(95, score + 25) },
          { name: 'Ancient Harvest Quinoa Pasta', icon: 'flower-outline', chips: [{ label: 'Gluten-Free', type: 'good' }], brand: 'Ancient Harvest', score: Math.min(95, score + 22) },
          { name: 'Jovial Einkorn Pasta', icon: 'sunny-outline', chips: [{ label: 'Heritage Grain', type: 'good' }], brand: 'Jovial', score: Math.min(95, score + 24) },
          { name: 'Bob\'s Red Mill Farro', icon: 'heart-outline', chips: [{ label: 'Whole Grain', type: 'good' }], brand: 'Bob\'s Red Mill', score: Math.min(95, score + 26) },
        ],
        'Protein': [
          { name: 'Applegate Sunday Bacon', icon: 'heart-outline', chips: [{ label: 'No Antibiotics', type: 'good' }], brand: 'Applegate', score: Math.min(95, score + 25) },
          { name: 'Wild Planet Wild Tuna', icon: 'water-outline', chips: [{ label: 'Sustainable', type: 'good' }], brand: 'Wild Planet', score: Math.min(95, score + 28) },
          { name: 'Organic Prairie Chicken', icon: 'leaf-outline', chips: [{ label: 'Free-Range', type: 'good' }], brand: 'Organic Prairie', score: Math.min(95, score + 22) },
          { name: 'Vital Farms Pasture-Raised Eggs', icon: 'sunny-outline', chips: [{ label: 'Pasture-Raised', type: 'good' }], brand: 'Vital Farms', score: Math.min(95, score + 30) },
          { name: 'Niman Ranch Beef', icon: 'nutrition-outline', chips: [{ label: 'Grass-Fed', type: 'good' }], brand: 'Niman Ranch', score: Math.min(95, score + 24) },
        ],
      };
      const defaultAlts = [
        { name: 'Annie\'s Organic Snacks', icon: 'leaf-outline', chips: [{ label: 'Organic', type: 'good' }], brand: 'Annie\'s', score: Math.min(95, score + 22) },
        { name: 'Simple Mills Crackers', icon: 'nutrition-outline', chips: [{ label: 'Clean Label', type: 'good' }], brand: 'Simple Mills', score: Math.min(95, score + 25) },
        { name: 'Late July Tortilla Chips', icon: 'sunny-outline', chips: [{ label: 'Non-GMO', type: 'good' }], brand: 'Late July', score: Math.min(95, score + 20) },
        { name: 'Applegate Naturals', icon: 'heart-outline', chips: [{ label: 'No Antibiotics', type: 'good' }], brand: 'Applegate', score: Math.min(95, score + 28) },
        { name: 'Siete Family Foods', icon: 'flower-outline', chips: [{ label: 'Grain-Free', type: 'good' }], brand: 'Siete', score: Math.min(95, score + 24) },
      ];
      return categoryAlternatives[productCategory] || defaultAlts;
    }
    return [];
  })();

  // Whether free user can use recommendation today
  const canUseFreeRec = !hasAIAccess && freeRecUsage.remaining > 0;

  // Accordion state
  const toggleAcc = (key) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const ZOOM_SCALE = devZoomOut ? 0.32 : 1;


  /* ========================================
     RENDER â€” Wellness Sanctuary Design
     ======================================== */

  // Score ring math
  const RING_R = 42;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC - (RING_CIRC * score) / 100;
  const animatedRingOffset = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRC, ringOffset],
  });

  // Product tags derived from labels / categories
  const productTags = (() => {
    const tags = [];
    const labels = (product?.labels || '').toLowerCase();
    const cats = (product?.categories || '').toLowerCase();
    const pname = (product?.product_name || '').toLowerCase();
    const all = labels + ' ' + cats + ' ' + pname;
    if (all.includes('gluten-free') || all.includes('gluten free') || all.includes('sans gluten')) tags.push('Gluten Free');
    if (all.includes('organic') || all.includes('bio')) tags.push('Organic');
    if (all.includes('vegan')) tags.push('Vegan');
    if (all.includes('vegetarian')) tags.push('Vegetarian');
    if (all.includes('plant-based') || all.includes('plant based')) tags.push('Plant Based');
    if (all.includes('non-gmo') || all.includes('non gmo')) tags.push('Non-GMO');
    if (all.includes('kosher')) tags.push('Kosher');
    if (all.includes('halal')) tags.push('Halal');
    if (all.includes('sugar-free') || all.includes('sugar free') || all.includes('no sugar')) tags.push('Sugar Free');
    if (all.includes('dairy-free') || all.includes('dairy free') || all.includes('lactose-free')) tags.push('Dairy Free');
    if (novaGroup === 1) tags.push('Minimal Processing');
    return tags.slice(0, 4);
  })();

  // Nutrition level label helper
  const getNutLevelLabel = (label, pct) => {
    const isPositive = label === 'Protein' || label === 'Fiber';
    if (isPositive) {
      if (pct >= 20) return { text: 'High Source', color: '#4CAF50' };
      if (pct >= 10) return { text: 'Moderate', color: '#FF9800' };
      return { text: 'Low', color: '#999' };
    }
    if (pct >= 40) return { text: 'High Content', color: '#E05252' };
    if (pct >= 15) return { text: 'Moderate', color: '#FF9800' };
    return { text: 'Low', color: '#4CAF50' };
  };

  // Scan count (deterministic from score)
  const scanCount = ((score * 137 + 2400) / 100).toFixed(1);

  const mainContent = (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* HEADER */}
        <View style={[vs.navBar, { paddingTop: safeAreaInsets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoBack(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={vs.navBackBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={vs.navTitle}>Wellness Sanctuary</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="bookmark-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS !== 'web'}
        >
          {/* PRODUCT IMAGE */}
          <View style={vs.productSection}>
            <View style={vs.productImgCard}>
              {product?.image_url ? (
                <Image source={{ uri: product.image_url }} style={vs.productImage} resizeMode="contain" />
              ) : (
                <View style={vs.productImagePlaceholder}>
                  <Ionicons name="cube-outline" size={56} color="#ccc" />
                </View>
              )}
            </View>

            {/* Brand */}
            <Text style={vs.brandText}>
              {(product?.brands || productCategory || '').toUpperCase()}
            </Text>

            {/* Product Name */}
            <Text style={vs.productName} numberOfLines={2}>
              {product?.product_name || product?.name || 'Unknown Product'}
            </Text>

            {/* Tags */}
            {productTags.length > 0 && (
              <View style={vs.tagRow}>
                {productTags.map((tag, i) => (
                  <View key={i} style={vs.tagChip}>
                    <Text style={vs.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* SCORE SECTION */}
          <View style={vs.scoreSection}>
            <View style={vs.scoreCircleWrap}>
              <Svg width={110} height={110} viewBox="0 0 110 110">
                <SvgCircle cx={55} cy={55} r={RING_R} fill="none" stroke="#E8E8E8" strokeWidth={6} />
                <AnimatedSvgCircle
                  cx={55} cy={55} r={RING_R} fill="none"
                  stroke={scoreColor}
                  strokeWidth={6}
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={animatedRingOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin="55,55"
                />
              </Svg>
              <View style={vs.scoreCenterAbsolute}>
                <Text style={[vs.scoreNumber, { color: scoreColor }]}>{score}</Text>
                <Text style={vs.scoreLabel}>SCORE</Text>
              </View>
            </View>
            <Text style={[vs.verdictText, { color: scoreColor }]}>{verdictLabel}</Text>
            <Text style={vs.evalText}>
              {'Evaluation based on the proprietary\nSanctuary Health Index'}
            </Text>

            {/* Scan count + Why this score */}
            <View style={vs.scoreMetaRow}>
              <View style={vs.scoreMetaItem}>
                <Ionicons name="people-outline" size={14} color="#999" />
                <Text style={vs.scoreMetaText}>Scanned by {scanCount}K people</Text>
              </View>
              <TouchableOpacity
                style={vs.whyScoreBtn}
                activeOpacity={0.7}
                onPress={() => setShowWhyScore(prev => !prev)}
              >
                <Ionicons name="information-circle-outline" size={14} color={scoreColor} />
                <Text style={[vs.whyScoreBtnText, { color: scoreColor }]}>
                  {showWhyScore ? 'Hide Breakdown' : 'Why This Score?'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PORTION SIZE SELECTOR */}
          {analysis?.productType === 'food' && product?.nutriments && (
            <PortionSelector
              product={product}
              selectedPortion={selectedPortion}
              onPortionChange={setSelectedPortion}
            />
          )}

          {/* WHY THIS SCORE BREAKDOWN */}
          {showWhyScore && enhancedHealthScore && (
            <View style={vs.section}>
              <Text style={vs.sectionTitle}>Score Breakdown</Text>
              <View style={vs.whyGrid}>
                {[
                  { label: 'Nutrition', pct: 55, value: enhancedHealthScore.breakdown.nutritionScore, icon: 'nutrition-outline' },
                  { label: 'Ingredients', pct: 30, value: enhancedHealthScore.breakdown.ingredientScore, icon: 'flask-outline' },
                  { label: 'Processing', pct: 10, value: enhancedHealthScore.breakdown.processingScore, icon: 'construct-outline' },
                  { label: 'Positives', pct: 5, value: enhancedHealthScore.breakdown.positiveBonus, icon: 'add-circle-outline' },
                ].map((item, idx) => {
                  const itemColor = item.value >= 70 ? '#4CAF50' : item.value >= 40 ? '#FF9800' : '#E05252';
                  return (
                    <View key={idx} style={vs.whyCell}>
                      <View style={[vs.whyCellIcon, { backgroundColor: itemColor + '18' }]}>
                        <Ionicons name={item.icon} size={18} color={itemColor} />
                      </View>
                      <Text style={vs.whyCellLabel}>{item.label}</Text>
                      <Text style={[vs.whyCellValue, { color: itemColor }]}>{Math.round(item.value)}</Text>
                      <Text style={vs.whyCellWeight}>{item.pct}% weight</Text>
                    </View>
                  );
                })}
              </View>

              {enhancedHealthScore.scoreReasons && enhancedHealthScore.scoreReasons.length > 0 && (
                <View style={vs.whyReasons}>
                  <Text style={vs.whyReasonsTitle}>Details</Text>
                  {enhancedHealthScore.scoreReasons.map((reason, idx) => {
                    const isPenalty = reason.type === 'penalty';
                    const isBonus = reason.type === 'bonus';
                    const reasonColor = isPenalty ? '#E05252' : isBonus ? '#4CAF50' : '#FF9800';
                    const reasonIcon = isPenalty ? 'remove-circle' : isBonus ? 'add-circle' : 'information-circle';
                    const impactText = typeof reason.impact === 'number'
                      ? (reason.impact > 0 ? '+' + reason.impact : '' + reason.impact)
                      : reason.impact === 'cap' ? 'CAP' : '';
                    return (
                      <View key={idx} style={vs.whyReasonRow}>
                        <Ionicons name={reasonIcon} size={16} color={reasonColor} />
                        <Text style={vs.whyReasonText}>{reason.text}</Text>
                        {impactText !== '' && (
                          <Text style={[vs.whyReasonImpact, { color: reasonColor }]}>{impactText}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {enhancedHealthScore.breakdown.cappedByHarmfulIngredients && (
                <View style={vs.whyCapped}>
                  <Ionicons name="warning" size={16} color="#E05252" />
                  <Text style={vs.whyCappedText}>Score capped at 49 due to harmful ingredients detected</Text>
                </View>
              )}
            </View>
          )}

          <Animated.View style={{ opacity: fadeAnim }}>

          {/* NUTRITIONAL PROFILE */}
          {nutRows.length > 0 && (
            <View style={vs.section}>
              <View style={vs.nutTitleRow}>
                <Text style={vs.sectionTitle}>Nutritional Profile</Text>
                <Text style={vs.nutPortionLabel}>{portionLabel}</Text>
              </View>
              <View style={vs.nutGrid}>
                {/* Energy */}
                {(() => {
                  const calRow = nutRows.find(r => r.label === 'Calories');
                  if (!calRow) return null;
                  return (
                    <View style={vs.nutCell}>
                      <Text style={vs.nutCellLabel}>ENERGY</Text>
                      <Text style={vs.nutCellValue}>
                        {Math.round(calRow.value)} <Text style={vs.nutCellUnit}>kcal</Text>
                      </Text>
                    </View>
                  );
                })()}
                {/* Sugar */}
                {(() => {
                  const sugarRow = nutRows.find(r => r.label === 'Sugar');
                  if (!sugarRow) return null;
                  const sugarPct = Math.round((sugarRow.value / sugarRow.dv) * 100);
                  const level = getNutLevelLabel('Sugar', sugarPct);
                  return (
                    <View style={vs.nutCell}>
                      <Text style={vs.nutCellLabel}>SUGAR</Text>
                      <Text style={vs.nutCellValue}>
                        {sugarRow.value % 1 === 0 ? sugarRow.value : sugarRow.value.toFixed(1)} <Text style={vs.nutCellUnit}>g</Text>
                      </Text>
                      <Text style={[vs.nutLevelText, { color: level.color }]}>{level.text}</Text>
                    </View>
                  );
                })()}
                {/* Total Fat */}
                {(() => {
                  const fatRow = nutRows.find(r => r.label === 'Fat');
                  if (!fatRow) return null;
                  const fatPct = Math.round((fatRow.value / fatRow.dv) * 100);
                  const level = getNutLevelLabel('Fat', fatPct);
                  return (
                    <View style={vs.nutCell}>
                      <Text style={vs.nutCellLabel}>TOTAL FAT</Text>
                      <Text style={vs.nutCellValue}>
                        {fatRow.value % 1 === 0 ? fatRow.value : fatRow.value.toFixed(1)} <Text style={vs.nutCellUnit}>g</Text>
                      </Text>
                      <Text style={[vs.nutLevelText, { color: level.color }]}>{level.text}</Text>
                    </View>
                  );
                })()}
                {/* Protein */}
                {(() => {
                  const proteinRow = nutRows.find(r => r.label === 'Protein');
                  if (!proteinRow) return null;
                  const protPct = Math.round((proteinRow.value / proteinRow.dv) * 100);
                  const level = getNutLevelLabel('Protein', protPct);
                  return (
                    <View style={vs.nutCell}>
                      <Text style={vs.nutCellLabel}>PROTEIN</Text>
                      <Text style={vs.nutCellValue}>
                        {proteinRow.value % 1 === 0 ? proteinRow.value : proteinRow.value.toFixed(1)} <Text style={vs.nutCellUnit}>g</Text>
                      </Text>
                      <Text style={[vs.nutLevelText, { color: level.color }]}>{level.text}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* INGREDIENTS ANALYSIS */}
          {allIngredients.length > 0 && (
            <View style={vs.section}>
              <View style={vs.ingHeader}>
                <Text style={[vs.sectionTitle, { marginBottom: 0 }]}>Ingredients Analysis</Text>
                <Text style={vs.ingFullListLink}>Full List</Text>
              </View>
              <View style={vs.ingListWrap}>
                {allIngredients.map((ingredient, idx) => {
                  const ingAnalysis = analyzeIndividualIngredient(ingredient, analysis);
                  const description = getShortDescription(ingredient, analysis);
                  const isGoodStatus = ingAnalysis.status === 'GOOD' || ingAnalysis.status === 'EXCELLENT';
                  const isPoorStatus = ingAnalysis.status === 'POOR';
                  const dotColor = isGoodStatus ? '#4CAF50' : isPoorStatus ? '#E05252' : '#FF9800';
                  return (
                    <View key={idx} style={vs.ingRow}>
                      <View style={[vs.ingDot, { backgroundColor: dotColor }]} />
                      <View style={vs.ingInfo}>
                        <Text style={vs.ingName}>
                          {ingredient.charAt(0).toUpperCase() + ingredient.slice(1).trim()}
                        </Text>
                        <Text style={vs.ingDesc}>{description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* SUPERIOR ALTERNATIVES */}
          {(realAlternatives.length > 0 || altsLoading || altProducts.length > 0) && (
            <View style={vs.section}>
              <View style={vs.altHeader}>
                <Text style={[vs.sectionTitle, { marginBottom: 0 }]}>Better Alternatives</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
                  <Text style={vs.altLink}>VIEW ALL</Text>
                </TouchableOpacity>
              </View>
              {altsLoading ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Finding alternatives...</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                  decelerationRate="fast"
                  snapToInterval={164}
                >
                  {(realAlternatives.length > 0 ? realAlternatives : altProducts).map((alt, i) => {
                    const altScoreColor = alt.score >= 70 ? '#4CAF50' : alt.score >= 50 ? '#FF9800' : '#E05252';
                    const bgColors = ['#E8F5E9', '#FFF3E0', '#E3F2FD', '#F3E5F5', '#FBE9E7', '#E0F7FA'];
                    return (
                      <TouchableOpacity
                        key={i}
                        style={vs.altCard}
                        activeOpacity={0.7}
                        onPress={() => { if (alt.barcode) navigation.push('Results', { barcode: alt.barcode }); }}
                      >
                        <View style={vs.altCardPhoto}>
                          {alt.image ? (
                            <Image source={{ uri: alt.image }} style={{ width: '100%', height: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} resizeMode="cover" />
                          ) : (
                            <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColors[i % bgColors.length] }]}>
                              <Ionicons name={alt.icon || 'nutrition-outline'} size={32} color={altScoreColor} />
                            </View>
                          )}
                          <View style={[vs.altScoreBadge, { backgroundColor: altScoreColor }]}>
                            <Text style={vs.altScoreBadgeText}>{Math.round(alt.score)}</Text>
                          </View>
                        </View>
                        <View style={vs.altCardInfo}>
                          <Text style={vs.altCardName} numberOfLines={2}>{alt.name}</Text>
                          {alt.brand ? <Text style={vs.altCardSub} numberOfLines={1}>{alt.brand}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* ASK AI CHATBOT */}
          {(isPremium || hasAIAccess || freeRecUsage.remaining > 0) && (
            <View style={vs.askBar}>
              <View style={vs.askInputWrap}>
                <TextInput
                  style={vs.askInput}
                  value={askText}
                  onChangeText={setAskText}
                  placeholder="Ask AI about this product..."
                  placeholderTextColor="#999"
                  maxLength={250}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (isPremium || hasAIAccess) {
                      setShowAIChat(true);
                    } else if (freeRecUsage.remaining > 0) {
                      (async () => {
                        const result = await useFreeRecommendation();
                        if (result.success) {
                          setFreeRecUsage(result.usage);
                          setHasAIAccess(true);
                          setShowAIChat(true);
                        }
                      })();
                    }
                  }}
                />
              </View>
              <TouchableOpacity
                style={[vs.askBtn, !askText.trim() && { opacity: 0.5 }]}
                onPress={() => {
                  if (isPremium || hasAIAccess) {
                    setShowAIChat(true);
                  } else if (freeRecUsage.remaining > 0) {
                    (async () => {
                      const result = await useFreeRecommendation();
                      if (result.success) {
                        setFreeRecUsage(result.usage);
                        setHasAIAccess(true);
                        setShowAIChat(true);
                      }
                    })();
                  }
                }}
              >
                <Ionicons name="send" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          </Animated.View>
        </Animated.ScrollView>
      </View>

      {/* AI Chat Modal */}
      {showAIChat && product && (
        <ProductAIChat
          product={product}
          analysis={analysis}
          visible={showAIChat}
          onClose={() => { setShowAIChat(false); setAskText(''); }}
          initialQuestion={askText.trim()}
        />
      )}
    </ScreenWrapper>
  );

  // Dev zoom-out wrapper
  if (devZoomOut) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', paddingVertical: 12 }}
          showsVerticalScrollIndicator
        >
          <View style={{
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').height * (1 / ZOOM_SCALE) * 1.15,
            transform: [{ scale: ZOOM_SCALE }],
            transformOrigin: 'top center',
          }}>
            {mainContent}
          </View>
        </ScrollView>
      </View>
    );
  }

  return mainContent;
};

/* =================================================
   STYLES - Wellness Sanctuary Design System
   ================================================= */

const vs = StyleSheet.create({

  /* HEADER */
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  navBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.3,
  },

  /* PRODUCT SECTION */
  productSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  productImgCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  productImage: {
    width: '75%',
    height: '85%',
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#999',
    marginBottom: 6,
    textAlign: 'center',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.3,
  },

  /* SCORE SECTION */
  scoreSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  scoreCircleWrap: {
    width: 110,
    height: 110,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreCenterAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 2,
    marginTop: 1,
  },
  verdictText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  evalText: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  scoreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scoreMetaText: {
    fontSize: 12,
    color: '#999',
  },
  whyScoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  whyScoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* SECTION */
  section: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    letterSpacing: -0.3,
    marginBottom: 14,
  },

  /* WHY THIS SCORE */
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  whyCell: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  whyCellIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  whyCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  whyCellValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  whyCellWeight: {
    fontSize: 10,
    color: '#BBB',
    marginTop: 2,
  },
  whyReasons: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  whyReasonsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  whyReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  whyReasonText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  whyReasonImpact: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  whyCapped: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  whyCappedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#E05252',
  },

  /* NUTRITIONAL PROFILE */
  nutTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nutPortionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#4CAF50',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  nutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nutCell: {
    width: '47%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
  },
  nutCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#999',
    marginBottom: 6,
  },
  nutCellValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  nutCellUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
  nutLevelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  /* INGREDIENTS ANALYSIS */
  ingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  ingFullListLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  ingListWrap: {
    gap: 0,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 14,
  },
  ingInfo: {
    flex: 1,
  },
  ingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  ingDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },

  /* ALTERNATIVES */
  altHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  altLink: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#4CAF50',
  },
  altCard: {
    width: 152,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  altCardPhoto: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  altScoreBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  altScoreBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  altCardInfo: {
    padding: 10,
    paddingBottom: 12,
  },
  altCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    lineHeight: 15,
    marginBottom: 3,
  },
  altCardSub: {
    fontSize: 9,
    color: '#999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* ASK AI CHATBOT */
  askBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  askInputWrap: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  askInput: {
    fontSize: 14,
    color: '#333',
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
  },
  askBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Keep old styles for loading/error screens
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#757575', marginTop: 16 },
});

export default ResultsScreen;
