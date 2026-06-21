import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SECTION_CARD, DAILY_VALUES, NUTRIENT_ICONS, COLORS } from '../utils/resultScreenStyles';

/**
 * Returns traffic-light level + color for a given nutrient value.
 * Thresholds are per-100g (or per-portion if already adjusted).
 */
const getNutrientLevel = (key, value) => {
  // "Good when HIGH" nutrients (protein, fiber)
  const goodWhenHigh = ['proteins_100g', 'fiber_100g'];

  if (goodWhenHigh.includes(key)) {
    if (key === 'proteins_100g') {
      if (value > 15) return { label: 'GOOD', color: COLORS.good };
      if (value > 8)  return { label: 'MEDIUM', color: COLORS.moderate };
      return { label: 'LOW', color: COLORS.poor };
    }
    // fiber
    if (value > 6) return { label: 'GOOD', color: COLORS.good };
    if (value > 3) return { label: 'MEDIUM', color: COLORS.moderate };
    return { label: 'LOW', color: COLORS.poor };
  }

  // "Bad when HIGH" nutrients
  const thresholds = {
    'energy-kcal_100g': [250, 400],
    sugars_100g:        [8, 15],
    salt_100g:          [0.8, 1.5],
    fat_100g:           [10, 20],
    'saturated-fat_100g': [5, 10],
  };

  const t = thresholds[key] || [10, 20];
  if (value <= t[0]) return { label: 'GOOD', color: COLORS.good };
  if (value <= t[1]) return { label: 'MEDIUM', color: COLORS.moderate };
  return { label: 'HIGH', color: COLORS.poor };
};

/**
 * Format value for display.
 */
const fmt = (key, value) => {
  if (key === 'energy-kcal_100g') return `${Math.round(value)} kcal`;
  return `${value.toFixed(1)}g`;
};

/**
 * Animated progress bar row for each nutrient
 */
const NutrientRow = ({ nutrientKey, value, index }) => {
  const barAnim = useRef(new Animated.Value(0)).current;
  const meta = NUTRIENT_ICONS[nutrientKey] || { icon: 'ellipse', label: nutrientKey };
  const level = getNutrientLevel(nutrientKey, value);
  const daily = DAILY_VALUES[nutrientKey];
  const pct = daily ? Math.min(Math.round((value / daily) * 100), 999) : null;
  const barWidth = Math.min(pct || 50, 100);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: barWidth,
      duration: 600,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [barWidth]);

  const animatedWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        <Ionicons name={meta.icon} size={18} color={level.color} />
        <Text style={styles.label}>{meta.label}</Text>
      </View>
      <View style={styles.barArea}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              { backgroundColor: level.color, width: animatedWidth },
            ]}
          />
        </View>
        {pct !== null && (
          <Text style={[styles.pctText, { color: level.color }]}>
            {pct}% daily
          </Text>
        )}
      </View>
      <View style={styles.valueWrap}>
        <Text style={styles.value}>{fmt(nutrientKey, value)}</Text>
        <View style={[styles.badge, { backgroundColor: level.color }]}>
          <Text style={styles.badgeText}>{level.label}</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * NutritionBreakdownCard — visual nutrition with animated progress bars, icons, % daily.
 */
const NutritionBreakdownCard = ({ nutrition, product, selectedPortion }) => {
  if (!nutrition) return null;

  const nutrients = [];
  const addIfPresent = (key) => {
    let val = nutrition[key];
    if (val === undefined && key === 'fiber_100g') {
      val = product?.nutriments?.fiber_100g;
    }
    if (val !== undefined && val !== null) {
      nutrients.push({ key, value: val });
    }
  };

  addIfPresent('energy-kcal_100g');
  addIfPresent('sugars_100g');
  addIfPresent('fat_100g');
  addIfPresent('saturated-fat_100g');
  addIfPresent('salt_100g');
  addIfPresent('proteins_100g');
  addIfPresent('fiber_100g');

  if (nutrients.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="nutrition" size={20} color="#2E7D32" />
        <Text style={styles.title}>Nutrition Breakdown</Text>
      </View>

      {nutrients.map(({ key, value }, index) => (
        <NutrientRow key={key} nutrientKey={key} value={value} index={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...SECTION_CARD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D3D',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  barArea: {
    flex: 1,
    marginHorizontal: 8,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  pctText: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  valueWrap: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

export default NutritionBreakdownCard;
