// Centralized theme for HealthyScan / Vee App
// Purely-inspired: warm off-white canvas, quiet neutral cards, brand green as the one accent

export const THEME = {
  // Core backgrounds
  background: '#FBFBF9',
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#FBFBF9',
  surfaceDark: '#F5F5F1',

  // Gradient backgrounds — flattened to the warm off-white (no visible gradient, matches Purely's flat canvas)
  gradientStart: '#FBFBF9',
  gradientMid: '#FBFBF9',
  gradientEnd: '#FBFBF9',
  gradientColors: ['#FBFBF9', '#FBFBF9', '#FBFBF9', '#FBFBF9', '#FBFBF9'],

  // Borders & dividers
  border: '#E5E5E1',
  borderLight: '#EFEFEA',
  borderSubtle: '#F5F5F1',
  borderGreen: '#BED9CE',
  divider: '#EFEFEA',

  // Primary accent (Green)
  primary: '#067A4F',
  primaryDark: '#033D28',
  primaryDeep: '#0D2B1F',
  primaryLight: '#40916C',
  primaryMuted: 'rgba(45, 106, 79, 0.08)',
  primaryGlow: 'rgba(45, 106, 79, 0.15)',

  // Orange accent (Analyze Meal, warnings)
  orange: '#FF9800',
  orangeDark: '#EF6C00',
  orangeLight: '#FFB74D',
  orangeMuted: 'rgba(255, 152, 0, 0.08)',

  // Text hierarchy
  text: '#171717',
  textSecondary: '#737373',
  textTertiary: '#A3A3A3',
  textGreen: '#067A4F',
  textWhite: '#FFFFFF',

  // Health score colors — 4-band scale (excellent/good/moderate/poor), Purely-style
  excellent: '#067A4F',
  good: '#84CC16',
  moderate: '#F59E0B',
  poor: '#EF4444',
  warning: '#F59E0B',
  error: '#EF4444',

  // Health score backgrounds
  excellentBg: 'rgba(6, 122, 79, 0.08)',
  goodBg: 'rgba(132, 204, 22, 0.12)',
  moderateBg: 'rgba(245, 158, 11, 0.10)',
  poorBg: 'rgba(239, 68, 68, 0.10)',
  unknownBg: 'rgba(158, 158, 158, 0.08)',

  // AI/Premium — purple for AI distinction (modern pattern: Notion AI, Apple Intelligence)
  aiPurple: '#7B61FF',
  aiPurpleBg: 'rgba(123, 97, 255, 0.08)',
  aiPurpleLight: 'rgba(123, 97, 255, 0.12)',
  aiAccent: '#7B61FF',
  aiAccentBg: 'rgba(123, 97, 255, 0.08)',
  premiumGreen: '#067A4F',

  // Redesigned color palette (4 core semantic colors)
  brandGreen: '#067A4F',     // actions, confirmed, good
  warningOrange: '#F57C00',  // moderate, watch out
  dangerRed: '#C62828',      // bad, avoid
  aiViolet: '#7B61FF',       // AI features only

  // Utility
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  shadow: '#000000',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

// Standardized spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  contentHorizontal: 24,
  headerVertical: 18,
};

// Shadow helpers
export const GLOW = {
  green: {
    shadowColor: '#067A4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  greenStrong: {
    shadowColor: '#067A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  // Soft, diffuse "floating card" shadow — Purely uses a wide low-opacity shadow instead of a hard drop shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Common card style
export const CARD = {
  backgroundColor: THEME.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: THEME.border,
  ...GLOW.card,
};

// Common input style — rounded-full pill, matching Purely's search/input fields
export const INPUT = {
  backgroundColor: THEME.surface,
  borderWidth: 1,
  borderColor: THEME.border,
  borderRadius: 24,
  color: THEME.text,
  paddingHorizontal: 18,
  paddingVertical: 12,
};

// Standardized header style (warm off-white blur bar + green title)
export const HEADER = {
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.headerVertical,
    backgroundColor: 'rgba(251, 251, 249, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textGreen,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EEF6F2',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default THEME;
