import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ResultsScreen from '../../ResultsScreen';

const PreviewStack = createNativeStackNavigator();
const { width: DEV_SCREEN_W, height: DEV_SCREEN_H } = Dimensions.get('window');
const PREVIEW_SCALE = 0.5;

const RESULTS_MOCK_PARAMS = {
  devHasAIAccess: true,
  devProduct: {
    product_name: 'Organic Granola Bar',
    brands: 'Nature Valley',
    code: '0016000275690',
    ingredients_text: 'Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Soy Lecithin, BHA',
    nutriments: { 'energy-kcal_100g': 450, fat_100g: 16, sugars_100g: 28, salt_100g: 0.3, proteins_100g: 8, fiber_100g: 4, 'saturated-fat_100g': 2 },
    nutriscore_grade: 'c',
    image_url: '',
    categories: 'Snacks, Granola bars',
    source: 'OpenFoodFacts',
  },
  devAnalysis: {
    score: 62,
    productType: 'food',
    totalIngredients: 8,
    goodIngredients: ['Whole Grain Oats', 'Honey', 'Soy Lecithin'],
    badIngredients: ['BHA'],
    moderateIngredients: ['Sugar', 'Canola Oil', 'Salt'],
    excellentIngredients: ['Whole Grain Oats'],
    analyzedIngredients: [
      { name: 'Whole Grain Oats', status: 'EXCELLENT', score: 90 },
      { name: 'Sugar', status: 'MODERATE', score: 50 },
      { name: 'Canola Oil', status: 'MODERATE', score: 55 },
      { name: 'Rice Flour', status: 'GOOD', score: 70 },
      { name: 'Honey', status: 'GOOD', score: 75 },
      { name: 'Salt', status: 'MODERATE', score: 50 },
      { name: 'Soy Lecithin', status: 'GOOD', score: 72 },
      { name: 'BHA', status: 'POOR', score: 20 },
    ],
    additives: [{ name: 'BHA', ecode: 'E321', concern: 'Synthetic antioxidant' }],
    excellentCount: 1,
    goodCount: 3,
    moderateCount: 3,
    badCount: 1,
  },
  devAiAnalysis: {
    summary: 'This granola bar has a moderate health profile. While it contains wholesome oats and honey, it also includes BHA (E321), a synthetic antioxidant linked to potential health concerns.',
    concerns: ['BHA (E321) is a synthetic preservative', 'High sugar content at 28g per 100g'],
    keyInsights: ['Whole grain oats provide good fiber', 'Honey adds natural sweetness'],
  },
};

/**
 * DevScreen — Development-only screen for quick navigation to any app screen.
 * 
 * This screen is only registered in __DEV__ mode and will NOT appear in production builds.
 * Access it by shaking the device or via the floating dev button on the Home screen.
 */

const SCREENS = [
  // ── Tab Screens ──
  { section: 'Tab Screens' },
  {
    name: 'MainTabs',
    label: 'Home (MainTabs)',
    icon: 'leaf-outline',
    color: '#4CAF50',
    description: 'Main tab navigator with Home, Search, AI Chat, History/Premium',
  },
  {
    name: 'MainTabs',
    label: 'Search Tab',
    icon: 'search-outline',
    color: '#2196F3',
    description: 'Product search screen',
    params: { screen: 'Search' },
  },
  {
    name: 'MainTabs',
    label: 'AI Chat Tab',
    icon: 'nutrition-outline',
    color: '#9C27B0',
    description: 'AI Nutritionist chat screen',
    params: { screen: 'AIChat' },
  },
  {
    name: 'MainTabs',
    label: 'History Tab',
    icon: 'time-outline',
    color: '#FF9800',
    description: 'Scan history (Premium only)',
    params: { screen: 'History' },
  },

  // ── Stack Screens ──
  { section: 'Stack Screens' },
  {
    name: 'Onboarding',
    label: 'Onboarding',
    icon: 'rocket-outline',
    color: '#00BCD4',
    description: 'First-launch onboarding flow',
  },
  {
    name: 'Results',
    label: 'Results + AI ✨',
    icon: 'sparkles-outline',
    color: '#7B61FF',
    description: 'Food product + full AI analysis (zoomed-out full preview)',
    params: {
      devHasAIAccess: true,
      devZoomOut: true,
      devAiAnalysis: {
        summary: 'This granola bar has a moderate health profile. While it contains wholesome oats and honey, it also includes BHA (E321), a synthetic antioxidant linked to potential health concerns. The high sugar content warrants mindful consumption.',
        concerns: [
          'BHA (E321) is a synthetic preservative with possible health concerns',
          'High sugar content at 28g per 100g',
          'Canola oil is heavily processed',
        ],
        keyInsights: [
          'Whole grain oats provide good fiber and sustained energy',
          'Honey adds natural sweetness with trace antioxidants',
          'Soy lecithin is a well-tolerated natural emulsifier',
        ],
      },
      devProduct: {
        product_name: 'Organic Granola Bar',
        brands: 'Nature Valley',
        code: '0016000275690',
        ingredients_text: 'Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Soy Lecithin, BHA',
        nutriments: { 'energy-kcal_100g': 450, fat_100g: 16, sugars_100g: 28, salt_100g: 0.3, proteins_100g: 8, fiber_100g: 4, 'saturated-fat_100g': 2 },
        nutriscore_grade: 'c',
        image_url: '',
        categories: 'Snacks, Granola bars',
        source: 'OpenFoodFacts',
        unique_scans_n: 2841,
        scans_n: 4520,
      },
      devAnalysis: {
        score: 62,
        productType: 'food',
        totalIngredients: 8,
        goodIngredients: ['Whole Grain Oats', 'Honey', 'Soy Lecithin'],
        badIngredients: ['BHA'],
        moderateIngredients: ['Sugar', 'Canola Oil', 'Salt'],
        excellentIngredients: ['Whole Grain Oats'],
        analyzedIngredients: [
          { name: 'Whole Grain Oats', status: 'EXCELLENT', score: 90 },
          { name: 'Sugar', status: 'MODERATE', score: 50 },
          { name: 'Canola Oil', status: 'MODERATE', score: 55 },
          { name: 'Rice Flour', status: 'GOOD', score: 70 },
          { name: 'Honey', status: 'GOOD', score: 75 },
          { name: 'Salt', status: 'MODERATE', score: 50 },
          { name: 'Soy Lecithin', status: 'GOOD', score: 72 },
          { name: 'BHA', status: 'POOR', score: 20 },
        ],
        additives: [{ name: 'BHA', ecode: 'E321', concern: 'Synthetic antioxidant' }],
        excellentCount: 1,
        goodCount: 3,
        moderateCount: 3,
        badCount: 1,
      },
    },
  },
  {
    name: 'ResultsV2',
    label: 'Results V2 (New Design) ✨',
    icon: 'sparkles-outline',
    color: '#7B61FF',
    description: 'New V2 result screen — clean card layout with animated gauges',
    params: {
      devHasAIAccess: true,
      devAiAnalysis: {
        summary: 'This granola bar has a moderate health profile. While it contains wholesome oats and honey, it also includes BHA (E321), a synthetic antioxidant linked to potential health concerns.',
        concerns: ['BHA (E321) is a synthetic preservative', 'High sugar content at 28g per 100g'],
        keyInsights: ['Whole grain oats provide good fiber', 'Honey adds natural sweetness'],
      },
      devProduct: {
        product_name: 'Organic Granola Bar',
        brands: 'Nature Valley',
        code: '0016000275690',
        ingredients_text: 'Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Soy Lecithin, BHA',
        nutriments: { 'energy-kcal_100g': 450, fat_100g: 16, sugars_100g: 28, salt_100g: 0.3, proteins_100g: 8, fiber_100g: 4, 'saturated-fat_100g': 2 },
        nutriscore_grade: 'c',
        image_url: '',
        categories: 'Snacks, Granola bars',
        source: 'OpenFoodFacts',
        unique_scans_n: 2841,
        scans_n: 4520,
      },
      devAnalysis: {
        score: 62,
        productType: 'food',
        totalIngredients: 8,
        goodIngredients: ['Whole Grain Oats', 'Honey', 'Soy Lecithin'],
        badIngredients: ['BHA'],
        moderateIngredients: ['Sugar', 'Canola Oil', 'Salt'],
        excellentIngredients: ['Whole Grain Oats'],
        analyzedIngredients: [
          { name: 'Whole Grain Oats', status: 'EXCELLENT', score: 90 },
          { name: 'Sugar', status: 'MODERATE', score: 50 },
          { name: 'Canola Oil', status: 'MODERATE', score: 55 },
          { name: 'Rice Flour', status: 'GOOD', score: 70 },
          { name: 'Honey', status: 'GOOD', score: 75 },
          { name: 'Salt', status: 'MODERATE', score: 50 },
          { name: 'Soy Lecithin', status: 'GOOD', score: 72 },
          { name: 'BHA', status: 'POOR', score: 20 },
        ],
        additives: [{ name: 'BHA', ecode: 'E321', concern: 'Synthetic antioxidant' }],
        excellentCount: 1,
        goodCount: 3,
        moderateCount: 3,
        badCount: 1,
      },
    },
  },
  {
    name: 'Results',
    label: 'Results (Food) ✅',
    icon: 'restaurant-outline',
    color: '#4CAF50',
    description: 'Food product — mock data, AI always on',
    params: {
      devHasAIAccess: true,
      devAiAnalysis: {
        summary: 'This granola bar has a moderate health profile. While it contains wholesome oats and honey, it also includes BHA (E321), a synthetic antioxidant linked to potential health concerns. The high sugar content warrants mindful consumption.',
        concerns: [
          'BHA (E321) is a synthetic preservative with possible health concerns',
          'High sugar content at 28g per 100g',
          'Canola oil is heavily processed',
        ],
        keyInsights: [
          'Whole grain oats provide good fiber and sustained energy',
          'Honey adds natural sweetness with trace antioxidants',
          'Soy lecithin is a well-tolerated natural emulsifier',
        ],
      },
      devProduct: {
        product_name: 'Organic Granola Bar',
        brands: 'Nature Valley',
        code: '0016000275690',
        ingredients_text: 'Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Soy Lecithin, BHA',
        nutriments: { 'energy-kcal_100g': 450, fat_100g: 16, sugars_100g: 28, salt_100g: 0.3, proteins_100g: 8, fiber_100g: 4, 'saturated-fat_100g': 2 },
        nutriscore_grade: 'c',
        image_url: '',
        categories: 'Snacks, Granola bars',
        source: 'OpenFoodFacts',
        unique_scans_n: 2841,
        scans_n: 4520,
      },
      devAnalysis: {
        score: 62,
        productType: 'food',
        totalIngredients: 8,
        goodIngredients: ['Whole Grain Oats', 'Honey', 'Soy Lecithin'],
        badIngredients: ['BHA'],
        moderateIngredients: ['Sugar', 'Canola Oil', 'Salt'],
        excellentIngredients: ['Whole Grain Oats'],
        analyzedIngredients: [
          { name: 'Whole Grain Oats', status: 'EXCELLENT', score: 90 },
          { name: 'Sugar', status: 'MODERATE', score: 50 },
          { name: 'Canola Oil', status: 'MODERATE', score: 55 },
          { name: 'Rice Flour', status: 'GOOD', score: 70 },
          { name: 'Honey', status: 'GOOD', score: 75 },
          { name: 'Salt', status: 'MODERATE', score: 50 },
          { name: 'Soy Lecithin', status: 'GOOD', score: 72 },
          { name: 'BHA', status: 'POOR', score: 20 },
        ],
        additives: [{ name: 'BHA', ecode: 'E321', concern: 'Synthetic antioxidant' }],
        excellentCount: 1,
        goodCount: 3,
        moderateCount: 3,
        badCount: 1,
      },
    },
  },
  {
    name: 'CosmeticResults',
    label: 'Cosmetic Results ✅',
    icon: 'flower-outline',
    color: '#E91E63',
    description: 'Cosmetic product — zoomed-out full preview',
    params: {
      devZoomOut: true,
      barcode: null,
      devProduct: {
        product_name: 'Moisturizing Face Cream',
        brands: 'CeraVe',
        code: '0301871087556',
        ingredients_text: 'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Dimethicone, Phenoxyethanol, Sodium Lauryl Sulfate, Fragrance',
        image_url: '',
        source: 'OpenBeautyFacts',
      },
      devAnalysis: {
        score: 68,
        productType: 'cosmetic',
        totalIngredients: 8,
        goodIngredients: ['Cetearyl Alcohol'],
        badIngredients: ['Sodium Lauryl Sulfate', 'Fragrance'],
        moderateIngredients: ['Phenoxyethanol', 'Dimethicone'],
        excellentIngredients: ['Aqua', 'Glycerin', 'Niacinamide'],
        analyzedIngredients: [
          { name: 'Aqua', status: 'EXCELLENT', score: 100 },
          { name: 'Glycerin', status: 'EXCELLENT', score: 95 },
          { name: 'Cetearyl Alcohol', status: 'GOOD', score: 75 },
          { name: 'Niacinamide', status: 'EXCELLENT', score: 92 },
          { name: 'Dimethicone', status: 'MODERATE', score: 55 },
          { name: 'Phenoxyethanol', status: 'MODERATE', score: 50 },
          { name: 'Sodium Lauryl Sulfate', status: 'POOR', score: 25 },
          { name: 'Fragrance', status: 'POOR', score: 20 },
        ],
        additives: [],
        excellentCount: 3,
        goodCount: 1,
        moderateCount: 2,
        badCount: 2,
      },
      isCosmetic: true,
    },
  },
  {
    name: 'FoodPhotoResults',
    label: 'Food Photo Results ✅',
    icon: 'camera-outline',
    color: '#FF5722',
    description: 'Food photo analysis — mock data, no AI needed',
    params: {
      imageUri: '',
      devFoodData: { foodName: 'Grilled Chicken Salad', confidence: 0.92, alternatives: [] },
      devNutritionData: {
        foodName: 'Grilled Chicken Salad',
        calories: 320,
        protein: 35,
        carbs: 18,
        fat: 12,
        fiber: 5,
        sugar: 6,
        sodium: 480,
        servingSize: '300g',
      },
      devScoreData: {
        score: 82,
        grade: 'Excellent',
        color: '#4CAF50',
      },
    },
  },
  {
    name: 'ProductNotFound',
    label: 'Product Not Found',
    icon: 'alert-circle-outline',
    color: '#F44336',
    description: 'Shown when barcode lookup fails',
    params: { barcode: '0000000000000' },
  },

  // ── Premium Preview ──
  { section: 'Premium Preview' },
  {
    name: 'MainTabs',
    label: 'Home (Premium) 💎',
    icon: 'diamond-outline',
    color: '#2E7D32',
    description: 'Set subscription → Premium, then open Home',
    devAction: 'setPremiumAndNavigate',
  },
  {
    name: 'MainTabs',
    label: 'Home (Free) 🆓',
    icon: 'leaf-outline',
    color: '#9E9E9E',
    description: 'Reset subscription → Free, then open Home',
    devAction: 'setFreeAndNavigate',
  },

  // ── Utility Screens ──
  { section: 'Utility Screens' },
  {
    name: 'Settings',
    label: 'Settings',
    icon: 'settings-outline',
    color: '#607D8B',
    description: 'App settings and preferences',
  },
  {
    name: 'About',
    label: 'About',
    icon: 'information-circle-outline',
    color: '#3F51B5',
    description: 'About the app',
  },
  {
    name: 'Sources',
    label: 'Sources',
    icon: 'book-outline',
    color: '#795548',
    description: 'Data sources and references',
  },
  {
    name: 'Subscription',
    label: 'Subscription',
    icon: 'diamond-outline',
    color: '#FFD700',
    description: 'Premium subscription page',
  },
  {
    name: 'History',
    label: 'History (Stack)',
    icon: 'time-outline',
    color: '#FF9800',
    description: 'Scan history via stack navigator',
  },
];

export default function DevScreen({ navigation }) {
  const handleNavigate = async (screen) => {
    try {
      if (screen.devAction === 'setPremiumAndNavigate') {
        await AsyncStorage.setItem('subscriptionType', 'Premium');
        await AsyncStorage.setItem('subscriptionExpiry', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
        console.log('[DevScreen] ✅ Set subscription to Premium');
        navigation.navigate('MainTabs');
        return;
      }
      if (screen.devAction === 'setFreeAndNavigate') {
        await AsyncStorage.removeItem('subscriptionType');
        await AsyncStorage.removeItem('subscriptionExpiry');
        console.log('[DevScreen] ✅ Reset subscription to Free');
        navigation.navigate('MainTabs');
        return;
      }
      if (screen.params) {
        navigation.navigate(screen.name, screen.params);
      } else {
        navigation.navigate(screen.name);
      }
    } catch (error) {
      console.warn(`[DevScreen] Failed to navigate to ${screen.name}:`, error.message);
    }
  };

  const renderScreenButton = (screen, index) => (
    <TouchableOpacity
      key={`${screen.name}-${index}`}
      style={styles.screenButton}
      onPress={() => handleNavigate(screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: screen.color + '18' }]}>
        <Ionicons name={screen.icon} size={22} color={screen.color} />
      </View>
      <View style={styles.buttonTextContainer}>
        <Text style={styles.buttonLabel}>{screen.label}</Text>
        <Text style={styles.buttonDescription} numberOfLines={1}>
          {screen.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
    </TouchableOpacity>
  );

  const renderSection = (title) => (
    <View key={title} style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dev Menu</Text>
          <Text style={styles.headerSubtitle}>Screen Preview</Text>
        </View>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV</Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="code-slash" size={16} color="#1565C0" />
        <Text style={styles.infoText}>
          Tap any screen to navigate directly. This menu is hidden in production.
        </Text>
      </View>

      {/* Screen List */}
      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && { overflow: 'scroll' }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle="black"
      >
        {SCREENS.map((item, index) => {
          if (item.section) {
            return renderSection(item.section);
          }
          return renderScreenButton(item, index);
        })}

        {/* ── Results Page Preview ── */}
        {renderSection('Results Page Preview')}
        <View style={{
          width: Math.round(DEV_SCREEN_W * PREVIEW_SCALE),
          height: Math.round(DEV_SCREEN_H * PREVIEW_SCALE),
          overflow: 'hidden',
          borderRadius: 16,
          alignSelf: 'center',
          marginBottom: 16,
          marginTop: 8,
        }}>
          <View style={{
            width: DEV_SCREEN_W,
            height: DEV_SCREEN_H,
            transform: [{ scale: PREVIEW_SCALE }],
            transformOrigin: 'top left',
          }}>
            <NavigationContainer independent>
              <PreviewStack.Navigator screenOptions={{ headerShown: false }}>
                <PreviewStack.Screen
                  name="ResultsPreview"
                  component={ResultsScreen}
                  initialParams={RESULTS_MOCK_PARAMS}
                />
              </PreviewStack.Navigator>
            </NavigationContainer>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {SCREENS.filter((s) => !s.section).length} screens registered
          </Text>
          <Text style={styles.footerSubtext}>
            __DEV__ = {__DEV__ ? 'true' : 'false'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#37474F',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0BEC5',
    marginTop: 1,
  },
  devBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  devBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1565C0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  screenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 3,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  buttonDescription: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#BDBDBD',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewContainer: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    minHeight: 220,
  },
});
