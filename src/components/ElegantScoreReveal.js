import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { 
  createSmoothAnimation, 
  createSpringAnimation,
  createFadeAnimation,
  createStaggerAnimation 
} from '../utils/luxuryAnimations';

const ElegantScoreReveal = ({ 
  score, 
  grade, 
  letter, 
  onRevealComplete,
  style = {} 
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Animation values
  const containerScale = useRef(new Animated.Value(0.8)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const gradeOpacity = useRef(new Animated.Value(0)).current;
  const letterRotate = useRef(new Animated.Value(0)).current;
  const circleProgress = useRef(new Animated.Value(0)).current;
  
  // Particle animations for premium effect
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Elegant reveal sequence
    const revealSequence = Animated.sequence([
      // 1. Container appears smoothly
      Animated.parallel([
        createFadeAnimation(containerOpacity, 1, 400),
        createSpringAnimation(containerScale, 1, 80, 10),
      ]),
      
      // 2. Score circle fills elegantly
      createSmoothAnimation(circleProgress, score / 100, 1200),
      
      // 3. Score number reveals with spring
      Animated.parallel([
        createSpringAnimation(scoreScale, 1, 120, 8),
        createFadeAnimation(scoreOpacity, 1, 300),
      ]),
      
      // 4. Grade text fades in smoothly
      createFadeAnimation(gradeOpacity, 1, 400),
      
      // 5. Letter badge rotates in elegantly
      createSmoothAnimation(letterRotate, 1, 500),
    ]);

    // Start the main sequence
    revealSequence.start(() => {
      setIsRevealed(true);
      onRevealComplete?.();
      
      // Start subtle particle effects after reveal
      startParticleEffects();
    });
  }, [score]);

  const startParticleEffects = () => {
    // Subtle floating particles for premium feel
    const particleAnimations = [
      Animated.loop(
        Animated.sequence([
          createSmoothAnimation(particle1, 1, 2000),
          createSmoothAnimation(particle1, 0, 2000),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          createSmoothAnimation(particle2, 1, 2500),
          createSmoothAnimation(particle2, 0, 2500),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          createSmoothAnimation(particle3, 1, 3000),
          createSmoothAnimation(particle3, 0, 3000),
        ])
      ),
    ];

    Animated.parallel(particleAnimations).start();
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#1B5E20'; // Excellent - Deep Green
    if (score >= 75) return '#4CAF50'; // Good - Green
    if (score >= 55) return '#FF9800'; // Average - Orange
    if (score >= 35) return '#FF5722'; // Poor - Red-orange
    return '#F44336'; // Very Poor - Red
  };

  const scoreColor = getScoreColor(score);

  // Interpolations for smooth animations
  const letterRotateInterpolate = letterRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  const circleStrokeDashoffset = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [251.2, 0], // Circle circumference: 2 * π * 40 ≈ 251.2
  });

  const circleRotation = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const particle1Translate = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const particle2Translate = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const particle3Translate = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  return (
    <Animated.View style={[
      styles.container,
      style,
      {
        opacity: containerOpacity,
        transform: [{ scale: containerScale }],
      }
    ]}>
      {/* Background glow effect */}
      <View style={[styles.glowBackground, { backgroundColor: scoreColor + '10' }]} />
      
      {/* Animated particles for premium effect */}
      {isRevealed && (
        <>
          <Animated.View style={[
            styles.particle,
            styles.particle1,
            {
              opacity: particle1,
              transform: [{ translateY: particle1Translate }],
            }
          ]} />
          <Animated.View style={[
            styles.particle,
            styles.particle2,
            {
              opacity: particle2,
              transform: [{ translateY: particle2Translate }],
            }
          ]} />
          <Animated.View style={[
            styles.particle,
            styles.particle3,
            {
              opacity: particle3,
              transform: [{ translateY: particle3Translate }],
            }
          ]} />
        </>
      )}

      {/* Main score circle */}
      <View style={styles.scoreContainer}>
        {/* Background circle */}
        <View style={[styles.backgroundCircle, { borderColor: '#E0E0E0' }]} />
        
        {/* Animated progress circle using rotation */}
        <Animated.View style={[
          styles.progressCircleContainer,
          { 
            transform: [{ rotate: circleRotation }],
            opacity: circleProgress,
          }
        ]}>
          <View style={[styles.progressArc, { borderTopColor: scoreColor }]} />
        </Animated.View>

        {/* Score number */}
        <Animated.View style={[
          styles.scoreNumberContainer,
          {
            opacity: scoreOpacity,
            transform: [{ scale: scoreScale }],
          }
        ]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>
            {score}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </Animated.View>
      </View>

      {/* Grade text */}
      <Animated.Text style={[
        styles.gradeText,
        { opacity: gradeOpacity, color: scoreColor }
      ]}>
        {grade}
      </Animated.Text>

      {/* Letter badge */}
      <Animated.View style={[
        styles.letterBadge,
        { backgroundColor: scoreColor },
        {
          transform: [{ rotateY: letterRotateInterpolate }],
        }
      ]}>
        <Text style={styles.letterText}>{letter}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    position: 'relative',
  },
  glowBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  scoreContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backgroundCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: '#E0E0E0',
  },
  progressCircleContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  progressArc: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: '#4CAF50',
    transform: [{ rotate: '-90deg' }],
  },
  scoreNumberContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginTop: -5,
  },
  gradeText: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  letterBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  letterText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
  },
  particle1: {
    top: 20,
    left: 60,
  },
  particle2: {
    top: 40,
    right: 80,
  },
  particle3: {
    top: 60,
    left: 80,
  },
});

export default ElegantScoreReveal;
