// Centralized Color Configuration for HealthyScan App
// Updated color scheme: Medium->Good (green), Excellent->Very Dark Green

export const HEALTH_COLORS = {
  // Score-based colors
  EXCELLENT: '#1B5E20',      // Very dark green (90-100)
  GOOD: '#4CAF50',           // Green (70-89) - was "Medium/Orange"  
  AVERAGE: '#FF9800',        // Orange (50-69) - was "Good"
  POOR: '#FF5722',           // Red-orange (25-49)
  VERY_POOR: '#F44336',      // Red (0-24)
  
  // Legacy colors for compatibility
  GREEN: '#4CAF50',
  DARK_GREEN: '#1B5E20',
  ORANGE: '#FF9800',
  RED: '#F44336',
  
  // Status colors
  SAFE: '#4CAF50',
  MODERATE: '#4CAF50',       // Changed from orange to green
  RISKY: '#F44336',
  
  // UI colors
  PRIMARY: '#4CAF50',
  LOADING: '#4CAF50',
  SUCCESS: '#1B5E20',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  
  // Light theme UI colors
  BACKGROUND: '#F5F5F0',
  SURFACE: '#FFFFFF',
  TEXT: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
};

// Get color based on health score
export const getHealthScoreColor = (score) => {
  if (score >= 90) return HEALTH_COLORS.EXCELLENT;    // Very dark green
  if (score >= 70) return HEALTH_COLORS.GOOD;         // Green (was medium/orange)
  if (score >= 50) return HEALTH_COLORS.AVERAGE;      // Orange
  if (score >= 25) return HEALTH_COLORS.POOR;         // Red-orange
  return HEALTH_COLORS.VERY_POOR;                     // Red
};

// Get label based on health score
export const getHealthScoreLabel = (score) => {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';        // Changed from 'MEDIUM'
  if (score >= 50) return 'AVERAGE';     // Was 'GOOD'
  if (score >= 25) return 'POOR';
  return 'VERY POOR';
};

export default { HEALTH_COLORS, getHealthScoreColor, getHealthScoreLabel };
