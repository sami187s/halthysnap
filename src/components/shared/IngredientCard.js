import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { 
  CARD_STYLES, 
  SPACING, 
  TYPOGRAPHY, 
  INGREDIENT_GRID,
  STATUS_BADGE,
  getStatusColors 
} from '../../utils/resultScreenStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Built-in short definitions for common ingredients
const INGREDIENT_DEFS = {
  'bha': 'BHA (Butylated Hydroxyanisole) is a synthetic preservative. Some studies link it to potential hormone disruption.',
  'bht': 'BHT (Butylated Hydroxytoluene) is a synthetic preservative to prevent fats from going rancid.',
  'sugar': 'A simple carbohydrate that provides quick energy. Excess intake is linked to obesity and diabetes.',
  'salt': 'Sodium chloride used for flavoring. High intake raises blood pressure.',
  'canola oil': 'A vegetable oil from rapeseed. Heavily processed and may contain trace trans fats.',
  'high fructose corn syrup': 'A highly processed sweetener linked to obesity and metabolic disorders.',
  'sodium nitrite': 'A cured-meat preservative that may form carcinogenic nitrosamines when cooked.',
  'aspartame': 'An artificial sweetener ~200× sweeter than sugar, with debated health effects.',
  'sucralose': 'An artificial sweetener that some research links to altered gut bacteria.',
  'msg': 'Monosodium glutamate, a flavor enhancer. Generally safe but some report sensitivity.',
  'artificial flavor': 'Synthetic chemicals mimicking natural flavors; exact composition often undisclosed.',
  'artificial color': 'Synthetic dyes for visual appeal. Some linked to hyperactivity in children.',
  'hydrogenated': 'Hydrogenated oils contain trans fats that raise bad cholesterol.',
  'paraben': 'A cosmetic preservative that may mimic estrogen in the body.',
  'sulfate': 'A foaming agent that can strip natural oils and irritate skin.',
  'formaldehyde': 'A preservative classified as a known carcinogen.',
  'triclosan': 'An antibacterial agent linked to hormone disruption.',
  'phthalate': 'A plasticizer in fragrances, known to disrupt the endocrine system.',
  'mineral oil': 'A petroleum-derived ingredient that may clog pores.',
  'whole grain oats': 'A highly nutritious whole grain rich in fiber, protein, and antioxidants. Supports heart health.',
  'honey': 'A natural sweetener with trace antioxidants and antimicrobial properties.',
  'olive oil': 'A heart-healthy fat rich in monounsaturated fatty acids and antioxidants.',
  'water': 'The most essential ingredient. Used as a base in many products.',
  'rice flour': 'A gluten-free flour made from ground rice. Easy to digest.',
  'soy lecithin': 'A natural emulsifier derived from soybeans. Helps blend ingredients smoothly.',
  'glycerin': 'A humectant that draws moisture to the skin. Generally well tolerated.',
  'vitamin c': 'A powerful antioxidant that brightens skin and boosts collagen production.',
  'vitamin e': 'An antioxidant that protects cells and nourishes skin.',
  'niacinamide': 'Vitamin B3 that improves skin texture, minimizes pores, and evens tone.',
  'hyaluronic acid': 'A moisture-binding molecule that deeply hydrates and plumps skin.',
  'aloe vera': 'A soothing plant extract with anti-inflammatory and moisturizing properties.',
  'shea butter': 'A rich natural moisturizer packed with vitamins A and E.',
  'coconut oil': 'A natural oil with antimicrobial and moisturizing properties.',
  'trans fat': 'Artificially created fats that raise bad cholesterol and heart disease risk.',
  'red dye': 'Synthetic food coloring linked to allergic reactions in some people.',
  'yellow dye': 'Synthetic food coloring that may trigger sensitivities.',
  'blue dye': 'Synthetic food coloring studied for potential hypersensitivity reactions.',
};

/** Get a short definition for an ingredient */
const getDefinition = (ingredientName, description) => {
  // If the component already has a good description, use it
  if (description && description.length > 15 && description !== 'Analyzed ingredient' && description !== 'Not analyzed yet') {
    return description;
  }
  const lower = (ingredientName || '').toLowerCase();
  for (const [key, def] of Object.entries(INGREDIENT_DEFS)) {
    if (lower.includes(key) || key.includes(lower)) return def;
  }
  return description || `${ingredientName} is an ingredient found in this product.`;
};

const IngredientCard = ({ 
  ingredient, 
  status, 
  description, 
  isAIDetected = false,
  delay = 0,
  onPress 
}) => {
  const [showLearnMore, setShowLearnMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statusColors = getStatusColors(status);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const content = (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: statusColors.color }]} />
        <Text style={styles.ingredientName} numberOfLines={2}>
          {ingredient}
        </Text>
      </View>
      
      <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
        <Text style={[styles.statusText, { color: statusColors.textColor }]}>
          {status}
        </Text>
      </View>
      
      {description && !showLearnMore && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      {/* Learn More button */}
      <TouchableOpacity
        style={styles.learnMoreBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowLearnMore(v => !v);
        }}
      >
        <Ionicons
          name={showLearnMore ? 'close-circle' : 'information-circle-outline'}
          size={13}
          color="#5C6BC0"
        />
        <Text style={styles.learnMoreText}>
          {showLearnMore ? 'Close' : 'Learn More'}
        </Text>
      </TouchableOpacity>

      {/* Expanded definition */}
      {showLearnMore && (
        <View style={styles.definitionBox}>
          <Text style={styles.definitionText}>
            {getDefinition(ingredient, description)}
          </Text>
        </View>
      )}
      
      {isAIDetected && (
        <View style={styles.aiDetectedBadge}>
          <Ionicons name="sparkles" size={10} color="#9C27B0" />
          <Text style={styles.aiDetectedText}>AI</Text>
        </View>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    width: INGREDIENT_GRID.columnWidth,
    backgroundColor: '#fff',
    borderRadius: INGREDIENT_GRID.cardRadius,
    padding: INGREDIENT_GRID.cardPadding,
    marginBottom: INGREDIENT_GRID.cardMarginBottom,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: SPACING.sm,
  },
  ingredientName: {
    flex: 1,
    ...TYPOGRAPHY.ingredientName,
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: STATUS_BADGE.paddingHorizontal,
    paddingVertical: STATUS_BADGE.paddingVertical,
    borderRadius: STATUS_BADGE.borderRadius,
    marginBottom: SPACING.sm,
  },
  statusText: {
    fontSize: STATUS_BADGE.fontSize,
    fontWeight: STATUS_BADGE.fontWeight,
    letterSpacing: STATUS_BADGE.letterSpacing,
    textTransform: 'uppercase',
  },
  description: {
    ...TYPOGRAPHY.description,
    color: '#666',
    marginTop: SPACING.xs,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  learnMoreText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#5C6BC0',
    marginLeft: 3,
  },
  definitionBox: {
    backgroundColor: '#F3F0FF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#5C6BC0',
  },
  definitionText: {
    fontSize: 11,
    lineHeight: 15,
    color: '#424242',
  },
  aiDetectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiDetectedText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9C27B0',
    marginLeft: 2,
  },
});

export default IngredientCard;
