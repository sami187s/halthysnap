// Shared styling constants for ResultsScreen and CosmeticResultsScreen
// Ensures visual consistency across both food and cosmetic product displays
import { THEME } from './theme';

export const CARD_STYLES = {
  // Main card styling
  padding: 20,
  borderRadius: 12,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  backgroundColor: THEME.surface,
  
  // Inner card styling
  innerPadding: 16,
  innerRadius: 8,
  innerElevation: 1,
  
  // Section card styling
  sectionPadding: 20,
  sectionRadius: 16,
  sectionElevation: 4,
  sectionShadowOpacity: 0.1,
  sectionShadowRadius: 12,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const TYPOGRAPHY = {
  // Product name
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  
  // Section headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  
  // Ingredient names
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  
  // Descriptions
  description: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Body text
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  
  // Small text
  small: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  
  // Score numbers
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // Large score numbers
  largeScore: {
    fontSize: 32,
    fontWeight: 'bold',
  },
};

export const COLORS = {
  // Health status colors
  excellent: '#1B5E20',      // Dark Green
  good: '#2E7D32',           // Brand Green (actions, confirmed)
  moderate: '#F57C00',       // Warning Orange
  poor: '#C62828',           // Danger Red
  unknown: '#9E9E9E',       // Gray
  
  // Background colors
  excellentBg: 'rgba(27, 94, 32, 0.08)',
  goodBg: 'rgba(46, 125, 50, 0.08)',
  moderateBg: 'rgba(245, 124, 0, 0.08)',
  poorBg: 'rgba(198, 40, 40, 0.08)',
  unknownBg: 'rgba(158, 158, 158, 0.08)',
  
  // Text colors
  excellentText: '#1B5E20',
  goodText: '#2E7D32',
  moderateText: '#F57C00',
  poorText: '#C62828',
  unknownText: '#8A9A8A',
  
  // UI colors
  primary: THEME.primary,
  primaryDark: THEME.primaryDark,
  background: THEME.background,
  surface: THEME.surface,
  border: THEME.border,
  text: '#1A1A1A',
  textSecondary: '#3D3D3D',
  textTertiary: '#888888',
  
  // AI/Premium colors — purple for AI distinction
  aiPurple: '#7B61FF',
  aiPurpleBg: 'rgba(123, 97, 255, 0.08)',
  premiumGold: THEME.premiumGreen,
};

export const INGREDIENT_GRID = {
  columnWidth: '48%',
  gap: SPACING.md,
  cardPadding: 14,
  cardRadius: 10,
  cardMarginBottom: 12,
};

export const STATUS_BADGE = {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 0.5,
};

export const ANIMATION_TIMING = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Helper function to get status colors
export const getStatusColors = (status) => {
  const statusUpper = status.toUpperCase();
  
  switch (statusUpper) {
    case 'EXCELLENT':
      return {
        color: COLORS.excellent,
        backgroundColor: COLORS.excellentBg,
        textColor: COLORS.excellentText,
      };
    case 'GOOD':
      return {
        color: COLORS.good,
        backgroundColor: COLORS.goodBg,
        textColor: COLORS.goodText,
      };
    case 'MODERATE':
    case 'AVERAGE':
      return {
        color: COLORS.moderate,
        backgroundColor: COLORS.moderateBg,
        textColor: COLORS.moderateText,
      };
    case 'POOR':
    case 'BAD':
      return {
        color: COLORS.poor,
        backgroundColor: COLORS.poorBg,
        textColor: COLORS.poorText,
      };
    default:
      return {
        color: COLORS.unknown,
        backgroundColor: COLORS.unknownBg,
        textColor: COLORS.unknownText,
      };
  }
};

// Helper function to get score color
export const getScoreColor = (score) => {
  if (score >= 90) return COLORS.excellent;
  if (score >= 70) return COLORS.good;
  if (score >= 50) return COLORS.moderate;
  if (score >= 25) return COLORS.poor;
  return COLORS.poor;
};

// Helper function to get score background
export const getScoreBackground = (score) => {
  if (score >= 90) return COLORS.excellentBg;
  if (score >= 70) return COLORS.goodBg;
  if (score >= 50) return COLORS.moderateBg;
  if (score >= 25) return COLORS.poorBg;
  return COLORS.poorBg;
};

// Daily recommended values for "% of daily" calculations
export const DAILY_VALUES = {
  'energy-kcal_100g': 2000,   // kcal
  sugars_100g: 50,             // g
  fat_100g: 65,                // g
  'saturated-fat_100g': 20,   // g
  salt_100g: 6,                // g (WHO recommends <5g)
  sodium_100g: 2.3,           // g
  proteins_100g: 50,           // g
  fiber_100g: 25,              // g
};

// Nutrient icon mapping (Ionicons names)
export const NUTRIENT_ICONS = {
  'energy-kcal_100g': { icon: 'flame', label: 'Calories' },
  sugars_100g:        { icon: 'ice-cream', label: 'Sugar' },
  salt_100g:          { icon: 'water', label: 'Salt' },
  fat_100g:           { icon: 'egg', label: 'Fat' },
  'saturated-fat_100g': { icon: 'egg', label: 'Sat. Fat' },
  proteins_100g:      { icon: 'fish', label: 'Protein' },
  fiber_100g:         { icon: 'leaf', label: 'Fiber' },
};

// Verdict helpers
export const getVerdictInfo = (score) => {
  if (score >= 70) return { icon: 'checkmark-circle', label: 'Healthy', color: COLORS.good };
  if (score >= 50) return { icon: 'alert-circle', label: 'Moderate', color: COLORS.moderate };
  return { icon: 'close-circle', label: 'Not Recommended', color: COLORS.poor };
};

// Generate one-line summary from penalties/bonuses
export const generateQuickSummary = (enhancedHealthScore, analysis) => {
  const parts = [];
  if (enhancedHealthScore?.details?.penalties?.length > 0) {
    const top = enhancedHealthScore.details.penalties.slice(0, 2);
    top.forEach(p => parts.push(p.reason));
  }
  if (enhancedHealthScore?.details?.bonuses?.length > 0) {
    const top = enhancedHealthScore.details.bonuses.slice(0, 1);
    top.forEach(b => parts.push(b.reason));
  }
  if (parts.length === 0 && analysis) {
    if (analysis.badIngredients?.length > 0) parts.push(`${analysis.badIngredients.length} concerning ingredients`);
    if (analysis.goodIngredients?.length > 0) parts.push(`${analysis.goodIngredients.length} good ingredients`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Tap for full analysis';
};

// Section wrapper style — new unified card system (shadow-based, no left borders)
export const SECTION_CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  marginHorizontal: 16,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

// Typography hierarchy
export const TYPE = {
  productName: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', lineHeight: 34 },
  sectionHeader: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', color: '#3D3D3D', lineHeight: 22 },
  supporting: { fontSize: 13, fontWeight: '400', color: '#888888', lineHeight: 18 },
};
