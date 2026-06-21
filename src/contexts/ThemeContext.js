import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@healthyscan_theme';

// Light and dark palettes — used by every screen that consumes this context
export const THEMES = {
  dark: {
    dark: true,
    bg:           '#0a0a0a',
    bgCard:       '#111111',
    bgIcon:       '#1a1a1a',
    border:       'rgba(255,255,255,0.07)',
    borderRow:    'rgba(255,255,255,0.06)',
    text:         '#e0e0e0',
    textMuted:    '#a0a0a0',
    textDim:      '#444444',
    chevron:      '#444444',
    statusBar:    'light-content',
    tabBg:        '#0a0a0a',
    tabBorder:    'rgba(255,255,255,0.05)',
    tabActive:    '#ffffff',
    tabInactive:  '#666666',
    tabActiveBg:  '#1a1a1a',
    headerBg:     'rgba(10,10,10,0.95)',
    headerBorder: 'rgba(255,255,255,0.07)',
    toggleBg:     '#1a1a1a',
    toggleTrack:  '#333333',
    toggleThumb:  '#aaaaaa',
    toggleActive: '#4CAF50',
  },
  light: {
    dark: false,
    bg:           '#f5f5f5',
    bgCard:       '#ffffff',
    bgIcon:       '#f0f0f0',
    border:       'rgba(0,0,0,0.08)',
    borderRow:    'rgba(0,0,0,0.06)',
    text:         '#111111',
    textMuted:    '#555555',
    textDim:      '#999999',
    chevron:      '#999999',
    statusBar:    'dark-content',
    tabBg:        '#ffffff',
    tabBorder:    'rgba(0,0,0,0.08)',
    tabActive:    '#111111',      // ← black label in light mode (was white)
    tabInactive:  '#888888',
    tabActiveBg:  '#f0f0f0',
    headerBg:     'rgba(245,245,245,0.97)',
    headerBorder: 'rgba(0,0,0,0.07)',
    toggleBg:     '#ffffff',
    toggleTrack:  '#e0e0e0',
    toggleThumb:  '#aaaaaa',
    toggleActive: '#4CAF50',
  },
};

const ThemeContext = createContext({
  theme: THEMES.dark,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // default: dark

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
