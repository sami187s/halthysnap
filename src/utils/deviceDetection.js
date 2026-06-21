import { Dimensions, Platform } from 'react-native';

export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  
  const isTablet = width > 768;
  const isIpad = Platform.OS === 'ios' && isTablet;
  const aspectRatio = width / height;
  
  return {
    // Screen dimensions
    width,
    height,
    screenWidth,
    screenHeight,
    
    // Device detection
    platform: Platform.OS,
    isTablet,
    isIpad,
    aspectRatio,
    
    // Safe area considerations
    hasNotch: height > 800 && aspectRatio < 2,
    
    // iPad specific
    isIpadPro: isIpad && (width > 1000 || height > 1000),
    isIpadMini: isIpad && width < 900,
    
    // Debug info
    debugString: `${Platform.OS} ${width}x${height} ${isTablet ? 'tablet' : 'phone'}`
  };
};

export const logDeviceInfo = () => {
  const info = getDeviceInfo();
  return info;
};

export const getResponsiveValue = (phoneValue, tabletValue) => {
  const { isTablet } = getDeviceInfo();
  return isTablet ? tabletValue : phoneValue;
};

export const getSafeAreaPadding = () => {
  const { platform, hasNotch } = getDeviceInfo();
  
  if (platform === 'ios') {
    return {
      paddingTop: hasNotch ? 44 : 20,
      paddingBottom: hasNotch ? 34 : 0,
    };
  }
  
  return {
    paddingTop: 24,
    paddingBottom: 0,
  };
};
