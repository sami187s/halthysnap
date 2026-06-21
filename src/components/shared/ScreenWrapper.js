import React, { useRef, useEffect } from 'react';
import { View, StatusBar, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../utils/theme';

/**
 * ScreenWrapper — shared wrapper that gives every screen the same
 * lush green gradient background, StatusBar config, and optional
 * entrance fade animation, matching the Home screen look.
 */
const ScreenWrapper = ({ children, style, animate = true }) => {
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 18 : 0)).current;

  useEffect(() => {
    if (!animate) return;
    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]);
    const timer = setTimeout(() => anim.start(), 60);
    return () => {
      clearTimeout(timer);
      anim.stop();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={THEME.gradientColors}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Animated.View
          style={[
            { flex: 1 },
            animate && {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
            style,
          ]}
        >
          {children}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

export default ScreenWrapper;
