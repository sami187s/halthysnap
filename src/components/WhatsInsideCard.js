import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * WhatsInsideCard — "What's Inside"
 *
 * Replaces old Key Insights InsightCard with a scannable chip/tag list.
 * Uses traffic-light colors (red/yellow/green pills) for instant comprehension.
 *
 * Props:
 *  - insights      : Array<{ text: string, type: 'good' | 'moderate' | 'bad' }>
 *  - onSeeFullList : function — scrolls to full ingredient list
 *  - totalIngredients : number — for "See all X ingredients" label
 */
const WhatsInsideCard = ({ insights = [], onSeeFullList, totalIngredients = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 6;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  if (!insights || insights.length === 0) return null;

  const visibleInsights = showAll ? insights : insights.slice(0, MAX_VISIBLE);
  const hiddenCount = insights.length - MAX_VISIBLE;

  const toggleShowAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAll(prev => !prev);
  };

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flask-outline" size={20} color="#1A1A1A" />
        <Text style={styles.title}>What's Inside</Text>
      </View>

      {/* Chip grid */}
      <View style={styles.chipGrid}>
        {visibleInsights.map((insight, index) => {
          const chipStyle = CHIP_STYLES[insight.type] || CHIP_STYLES.moderate;
          return (
            <StaggerChip key={index} delay={index * 50}>
              <View style={[styles.chip, { backgroundColor: chipStyle.bg }]}>
                <Text style={styles.chipDot}>{chipStyle.dot}</Text>
                <Text style={[styles.chipText, { color: chipStyle.text }]} numberOfLines={1}>
                  {insight.text}
                </Text>
              </View>
            </StaggerChip>
          );
        })}
      </View>

      {/* "See X more..." toggle */}
      {hiddenCount > 0 && !showAll && (
        <TouchableOpacity style={styles.seeMoreBtn} onPress={toggleShowAll} activeOpacity={0.7}>
          <Text style={styles.seeMoreText}>See {hiddenCount} more...</Text>
        </TouchableOpacity>
      )}

      {showAll && hiddenCount > 0 && (
        <TouchableOpacity style={styles.seeMoreBtn} onPress={toggleShowAll} activeOpacity={0.7}>
          <Text style={styles.seeMoreText}>Show less</Text>
        </TouchableOpacity>
      )}

      {/* See full ingredient list */}
      {onSeeFullList && (
        <TouchableOpacity style={styles.fullListBtn} onPress={onSeeFullList} activeOpacity={0.7}>
          <Text style={styles.fullListText}>
            See Full Ingredient List{totalIngredients > 0 ? ` (${totalIngredients})` : ''}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#2E7D32" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

/** Stagger-fade each chip in with delay */
const StaggerChip = ({ children, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
};

const CHIP_STYLES = {
  bad: { bg: '#FFF0F0', text: '#C62828', dot: '🔴' },
  moderate: { bg: '#FFFDE7', text: '#F57C00', dot: '🟡' },
  good: { bg: '#F1F8F1', text: '#2E7D32', dot: '🟢' },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipDot: {
    fontSize: 10,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  seeMoreBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
  },
  fullListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  fullListText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 4,
  },
});

export default WhatsInsideCard;
