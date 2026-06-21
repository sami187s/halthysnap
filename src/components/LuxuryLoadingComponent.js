import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { 
  createPulseAnimation, 
  createRotateAnimation, 
  createFadeAnimation,
  createScaleAnimation 
} from '../utils/luxuryAnimations';

const LuxuryLoadingComponent = ({ message = 'Analyzing...', style = {} }) => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Start all animations smoothly
    Animated.parallel([
      createFadeAnimation(fadeAnim, 1, 600),
      createScaleAnimation(scaleAnim, 1, 500),
    ]).start();

    // Start continuous animations
    createPulseAnimation(pulseAnim, 0.7, 1, 1200).start();
    createRotateAnimation(rotateAnim, 3000).start();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[
      styles.container, 
      style,
      { 
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      {/* Elegant loading rings */}
      <View style={styles.loadingContainer}>
        <Animated.View style={[
          styles.outerRing,
          { 
            transform: [
              { scale: pulseAnim },
              { rotate: rotateInterpolate }
            ]
          }
        ]}>
          <View style={styles.innerRing}>
            <View style={styles.centerDot} />
          </View>
        </Animated.View>
      </View>

      {/* Smooth message with fade */}
      <Animated.Text style={[
        styles.message,
        { opacity: fadeAnim }
      ]}>
        {message}
      </Animated.Text>

      {/* Subtle progress dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <PulseDot key={index} delay={index * 200} />
        ))}
      </View>
    </Animated.View>
  );
};

const PulseDot = ({ delay = 0 }) => {
  const dotAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay]);

  return (
    <Animated.View style={[
      styles.dot,
      { opacity: dotAnim }
    ]} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    marginBottom: 32,
  },
  outerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E8F5E8',
    borderTopColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FFF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  message: {
    fontSize: 17,
    fontWeight: '500',
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 4,
  },
});

export default LuxuryLoadingComponent;
