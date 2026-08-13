import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@healthyscan_theme_v2';

// Purely-inspired light palette — used by every screen that consumes this context.
// Dark mode is intentionally retired (design is light-only now): THEMES.dark aliases
// THEMES.light below so the existing isDark/toggleTheme API in SettingsScreen keeps
// working without a crash, it just no longer changes anything visually.
const light = {
  dark: false,
  bg:           '#FBFBF9',
  bgCard:       '#FFFFFF',
  bgIcon:       '#F5F5F1',
  border:       'rgba(0,0,0,0.08)',
  borderRow:    'rgba(0,0,0,0.06)',
  text:         '#171717',
  textMuted:    '#737373',
  textDim:      '#A3A3A3',
  chevron:      '#A3A3A3',
  statusBar:    'dark-content',
  tabBg:        '#FFFFFF',
  tabBorder:    'rgba(0,0,0,0.07)',
  tabActive:    '#067A4F',
  tabInactive:  '#A3A3A3',
  tabActiveBg:  'rgba(6,122,79,0.10)',
  headerBg:     'rgba(251,251,249,0.92)',
  headerBorder: 'rgba(0,0,0,0.06)',
  toggleBg:     '#FFFFFF',
  toggleTrack:  '#E5E5E1',
  toggleThumb:  '#FFFFFF',
  toggleActive: '#067A4F',
};

export const THEMES = {
  light,
  dark: light,
};

const ThemeContext = createContext({
  theme: THEMES.light,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false); // default: light

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(val => { if (val !== null) setIsDark(val === 'dark'); })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? THEMES.dark : THEMES.light, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for consuming screens/components
export const useTheme = () => useContext(ThemeContext);
