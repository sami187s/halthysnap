import { Animated, Easing } from 'react-native';

// Apple-style smooth animations with perfect timing curves
export const createSmoothAnimation = (value, toValue, duration = 300, useNativeDriver = true) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Apple's signature ease-out curve
    useNativeDriver,
  });
};

// Elegant spring animation like iOS interfaces
export const createSpringAnimation = (value, toValue, tension = 100, friction = 8) => {
  return Animated.spring(value, {
    toValue,
    tension,
    friction,
    useNativeDriver: true,
  });
};

// Smooth scale animation for buttons and cards
export const createScaleAnimation = (value, toValue = 1, duration = 150) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  });
};

// Fade in animation with perfect timing
export const createFadeAnimation = (value, toValue = 1, duration = 400) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

// Slide animation for smooth transitions
export const createSlideAnimation = (value, toValue, duration = 350) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: Easing.bezier(0.2, 0, 0.2, 1), // Material Design decelerate
    useNativeDriver: true,
  });
};

// Sequential stagger animation for lists
export const createStaggerAnimation = (animations, staggerDelay = 100) => {
  return Animated.stagger(staggerDelay, animations);
};

// Smooth pulse animation for loading states
export const createPulseAnimation = (value, minValue = 0.8, maxValue = 1, duration = 1000) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: maxValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: minValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
};

// Elegant rotate animation
export const createRotateAnimation = (value, duration = 2000) => {
  return Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
};
