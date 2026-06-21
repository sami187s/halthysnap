import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { 
  createSmoothAnimation, 
  createSpringAnimation,
  createFadeAnimation,
  createScaleAnimation 
} from '../utils/luxuryAnimations';

const SimpleElegantScoreReveal = ({ 
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Elegant reveal sequence
    const revealSequence = Animated.sequence([
      // 1. Container appears smoothly
      Animated.parallel([
        createFadeAnimation(containerOpacity, 1, 400),
        createSpringAnimation(containerScale, 1, 80, 10),
      ]),
      
      // 2. Score number reveals with spring
      Animated.parallel([
        createSpringAnimation(scoreScale, 1, 120, 8),
        createFadeAnimation(scoreOpacity, 1, 300),
      ]),
      
      // 3. Grade text fades in smoothly
      createFadeAnimation(gradeOpacity, 1, 400),
      
      // 4. Letter badge rotates in elegantly
      createSmoothAnimation(letterRotate, 1, 500),
    ]);

    // Start the main sequence
    revealSequence.start(() => {
      setIsRevealed(true);
      onRevealComplete?.();
      
      // Start subtle pulse animation
      startPulseAnimation();
    });
  }, [score]);

  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        createSmoothAnimation(pulseAnim, 1.05, 2000),
        createSmoothAnimation(pulseAnim, 1, 2000),
      ])
    );
    pulse.start();
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#1B5E20'; // Excellent - Deep Green
    if (score >= 75) return '#4CAF50'; // Good - Green
    if (score >= 55) return '#FF9800'; // Average - Orange
    if (score >= 35) return '#FF5722'; // Poor - Red-orange
    return '#F44336'; // Very Poor - Red
  };

  const scoreColor = getScoreColor(score);

  const letterRotateInterpolate = letterRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
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

      {/* Main score circle with elegant border */}
      <Animated.View style={[
        styles.scoreContainer,
        { 
          borderColor: scoreColor,
          transform: [{ scale: pulseAnim }]
        }
      ]}>
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
      </Animated.View>

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
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
});

export default SimpleElegantScoreReveal;
