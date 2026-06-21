import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SECTION_CARD, getVerdictInfo, generateQuickSummary } from '../utils/resultScreenStyles';

const RING_SIZE = 120;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ScoreRing = ({ score, color, animate = true }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    if (animate) {
      // Animate ring fill
      Animated.timing(animatedProgress, {
        toValue: Math.min(score, 100) / 100,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Animate score count-up
      Animated.timing(animatedScore, {
        toValue: Math.round(score),
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Listen to animated value for display
      const listenerId = animatedScore.addListener(({ value }) => {
        setDisplayScore(Math.round(value));
      });
      return () => animatedScore.removeListener(listenerId);
    } else {
      setDisplayScore(Math.round(score));
    }
  }, [score, animate]);

  const strokeDashoffset = animate
    ? animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [RING_CIRCUMFERENCE, 0],
      })
    : RING_CIRCUMFERENCE * (1 - Math.min(score, 100) / 100);

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#F0F0F0"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringTextWrap}>
        <Text style={[styles.ringScore, { color }]}>{displayScore}</Text>
        <Text style={styles.ringTotal}>/100</Text>
      </View>
    </View>
  );
};

/**
 * VerdictCard — the very first thing the user sees on the results screen.
 * Shows big verdict (Healthy / Moderate / Not Recommended), score ring, and one-liner.
 *
 * Props:
 *  - score        : number 0-100
 *  - grade        : string from enhancedHealthScore.grade  (optional)
 *  - letter       : string from enhancedHealthScore.letter (optional)
 *  - color        : hex color from enhancedHealthScore.color (optional, auto-derived from score)
 *  - aiSummary    : string from aiAnalysis.summary (optional)
 *  - enhancedHealthScore : full object (optional — for penalty/bonus summary)
 *  - analysis     : analysis object (optional — ingredient counts fallback)
 *  - productName  : string
 *  - productType  : 'food' | 'beauty' | 'household'
 */
const VerdictCard = ({
  score = 0,
  grade,
  letter,
  color,
  aiSummary,
  enhancedHealthScore,
  analysis,
  productName,
  productType,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const finalScore = Math.round(score);
  const verdict = getVerdictInfo(finalScore);
  const finalColor = color || verdict.color;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Build the one-line summary
  let oneLiner = '';
  if (aiSummary && aiSummary.length > 0 && aiSummary.length <= 120) {
    oneLiner = aiSummary;
  } else if (aiSummary && aiSummary.length > 120) {
    const firstSentence = aiSummary.split(/[.!?]/)[0];
    oneLiner = firstSentence.length > 100 ? firstSentence.slice(0, 100) + '…' : firstSentence;
  } else {
    oneLiner = generateQuickSummary(enhancedHealthScore, analysis);
  }

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.row}>
        {/* Animated Score ring */}
        <ScoreRing score={finalScore} color={finalColor} animate={true} />

        {/* Verdict text */}
        <View style={styles.verdictSide}>
          <Text style={[styles.verdictLabel, { color: finalColor }]}>
            {verdict.label}
          </Text>
          {(grade || letter) && (
            <Text style={styles.gradeRow}>
              {grade ? grade : ''}{letter ? ` · ${letter}` : ''}
            </Text>
          )}
          <Text style={styles.typeLabel}>
            {productType === 'food' ? 'Nutritional Quality' : 'Ingredient Safety'}
          </Text>
        </View>
      </View>

      {/* One-line summary */}
      {oneLiner ? (
        <Text style={styles.oneLiner} numberOfLines={2}>
          {oneLiner}
        </Text>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...SECTION_CARD,
    paddingTop: 24,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTextWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringScore: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  ringTotal: {
    fontSize: 13,
    color: '#888888',
    marginTop: -2,
  },
  verdictSide: {
    flex: 1,
    marginLeft: 24,
  },
  verdictLabel: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  gradeRow: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  typeLabel: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  oneLiner: {
    fontSize: 15,
    color: '#3D3D3D',
    marginTop: 16,
    lineHeight: 22,
  },
});

export default VerdictCard;
