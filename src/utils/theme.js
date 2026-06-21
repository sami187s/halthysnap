// Centralized Light Green Theme for HealthyScan / Vee App
// Clean, fresh green aesthetic with natural accents

export const THEME = {
  // Core backgrounds
  background: '#F5F5F0',
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F8FAF5',
  surfaceDark: '#EDF5E1',

  // Gradient backgrounds
  gradientStart: '#B2DFBC',
  gradientMid: '#C8E6C9',
  gradientEnd: '#F5F5F0',
  gradientColors: ['#B2DFBC', '#C8E6C9', '#E8F5E9', '#F1F8E9', '#F5F5F0'],

  // Borders & dividers
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  borderSubtle: '#F0F0F0',
  borderGreen: '#C8E6C9',
  divider: '#EEEEEE',

  // Primary accent (Green)
  primary: '#4CAF50',
  primaryDark: '#2E7D32',
  primaryDeep: '#1B5E20',
  primaryLight: '#66BB6A',
  primaryMuted: 'rgba(76, 175, 80, 0.08)',
  primaryGlow: 'rgba(46, 125, 50, 0.15)',

  // Orange accent (Analyze Meal, warnings)
  orange: '#FF9800',
  orangeDark: '#EF6C00',
  orangeLight: '#FFB74D',
  orangeMuted: 'rgba(255, 152, 0, 0.08)',

  // Text hierarchy
  text: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textGreen: '#1B5E20',
  textWhite: '#FFFFFF',

  // Health score colors (semantic — keep unchanged)
  excellent: '#1B5E20',
  good: '#4CAF50',
  moderate: '#FF9800',
  poor: '#F44336',
  warning: '#FF9800',
  error: '#F44336',

  // Health score backgrounds
  excellentBg: 'rgba(27, 94, 32, 0.1)',
  goodBg: 'rgba(76, 175, 80, 0.1)',
  moderateBg: 'rgba(255, 152, 0, 0.1)',
  poorBg: 'rgba(244, 67, 54, 0.1)',
  unknownBg: 'rgba(158, 158, 158, 0.08)',

  // AI/Premium — purple for AI distinction (modern pattern: Notion AI, Apple Intelligence)
  aiPurple: '#7B61FF',
  aiPurpleBg: 'rgba(123, 97, 255, 0.08)',
  aiPurpleLight: 'rgba(123, 97, 255, 0.12)',
  aiAccent: '#7B61FF',
  aiAccentBg: 'rgba(123, 97, 255, 0.08)',
  premiumGreen: '#2E7D32',

  // Redesigned color palette (4 core semantic colors)
  brandGreen: '#2E7D32',     // actions, confirmed, good
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
  contentHorizontal: 20,
  headerVertical: 15,
};

// Shadow helpers
export const GLOW = {
  green: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  greenStrong: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  borderRadius: 16,
  borderWidth: 1,
  borderColor: THEME.border,
  ...GLOW.card,
};

// Common input style
export const INPUT = {
  backgroundColor: THEME.surface,
  borderWidth: 1,
  borderColor: THEME.border,
  borderRadius: 12,
  color: THEME.text,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

// Standardized header style (white bar + green title)
export const HEADER = {
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.headerVertical,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
    backgroundColor: '#F1F8E9',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default THEME;
