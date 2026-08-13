import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { THEME } from '../utils/theme';

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// Purely-style 4-band score scale: excellent / good / moderate / poor.
// Kept in one place so every screen's score visuals agree with each other.
export function getScoreBand(score) {
  if (score >= 75) return { key: 'excellent', label: 'Excellent', color: THEME.excellent, bg: THEME.excellentBg };
  if (score >= 50) return { key: 'good', label: 'Good', color: THEME.good, bg: THEME.goodBg };
  if (score >= 25) return { key: 'moderate', label: 'Poor', color: THEME.moderate, bg: THEME.moderateBg };
  return { key: 'poor', label: 'Bad', color: THEME.poor, bg: THEME.poorBg };
}

/**
 * ScoreRing — animated circular health score, Purely-style: thin rounded
 * stroke, color driven by the 4-band scale, number centered inside.
 *
 * Props:
 *  - score      (number)  0-100
 *  - size       (number)  diameter, default 72
 *  - stroke     (number)  ring thickness, default 6
 *  - showLabel  (bool)    show band label ("Excellent"/"Good"/...) under the ring
 */
export default function ScoreRing({ score = 0, size = 72, stroke = 6, showLabel = false }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const band = getScoreBand(clamped);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference - (circumference * clamped) / 100],
  });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={THEME.surfaceDark}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedSvgCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={band.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.scoreText, { fontSize: size / 3.4, color: THEME.text }]}>
            {Math.round(clamped)}
          </Text>
        </View>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: band.color }]}>{band.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
