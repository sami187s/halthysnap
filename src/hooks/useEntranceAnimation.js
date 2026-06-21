import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * useEntranceAnimation — reusable hook matching the Home screen's
 * entrance animation (fade + slide + spring scale).
 *
 * Returns { fadeAnim, slideAnim, scaleAnim } Animated.Value refs.
 * Automatically starts animations on mount.
 *
 * Usage:
 *   const { fadeAnim, slideAnim, scaleAnim } = useEntranceAnimation();
 *   <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
 */
export const useEntranceAnimation = ({ delay = 100 } = {}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return { fadeAnim, slideAnim, scaleAnim };
};

export default useEntranceAnimation;
