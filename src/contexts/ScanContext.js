/**
 * Scan Context - Manages scan state across screens
 */

import { createContext, useContext } from 'react';

// Create context for managing scan state across screens
export const ScanContext = createContext({
  isScanning: false,
  setIsScanning: () => {},
});

// Hook to use scan context
export const useScanContext = () => useContext(ScanContext);
