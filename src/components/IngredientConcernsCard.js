import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SECTION_CARD, COLORS } from '../utils/resultScreenStyles';
import IngredientCard from './shared/IngredientCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Built-in short definitions for common concerning ingredients
const INGREDIENT_DEFINITIONS = {
  'bha': 'BHA (Butylated Hydroxyanisole) is a synthetic antioxidant preservative. Some studies link it to potential hormone disruption and it is classified as possibly carcinogenic.',
  'bht': 'BHT (Butylated Hydroxytoluene) is a synthetic preservative used to prevent fats from going rancid. May cause allergic reactions in some individuals.',
  'sugar': 'A simple carbohydrate that provides quick energy. Excess consumption is linked to obesity, diabetes, and tooth decay.',
  'salt': 'Sodium chloride used for flavoring. High intake is associated with elevated blood pressure and cardiovascular risks.',
  'canola oil': 'A vegetable oil extracted from rapeseed. It is heavily processed and may contain trans fats from the refining process.',
  'high fructose corn syrup': 'A highly processed sweetener made from corn starch. Linked to obesity, insulin resistance, and metabolic disorders.',
  'sodium nitrite': 'A preservative used in cured meats. May form carcinogenic nitrosamines when cooked at high temperatures.',
  'aspartame': 'An artificial sweetener about 200× sweeter than sugar. Controversial due to studies suggesting potential neurological effects.',
  'sucralose': 'An artificial sweetener made from sugar. Some research suggests it may alter gut bacteria and glucose metabolism.',
  'msg': 'Monosodium glutamate is a flavor enhancer. Generally recognized as safe, but some people report sensitivity symptoms.',
  'artificial flavor': 'Synthetic chemicals designed to mimic natural flavors. Their exact composition is often undisclosed.',
  'artificial color': 'Synthetic dyes used to make food more visually appealing. Some are linked to hyperactivity in children.',
  'hydrogenated': 'Hydrogenated oils contain trans fats created through processing. Trans fats raise bad cholesterol and increase heart disease risk.',
  'paraben': 'A preservative used in cosmetics. May mimic estrogen in the body and is linked to potential endocrine disruption.',
  'sulfate': 'A foaming agent in personal care products. Can strip natural oils and cause skin or scalp irritation.',
  'formaldehyde': 'A chemical preservative classified as a known carcinogen. Can cause skin irritation and allergic reactions.',
  'triclosan': 'An antibacterial agent. Linked to hormone disruption, antibiotic resistance, and environmental harm.',
  'phthalate': 'A plasticizer used in fragrances. Known endocrine disruptor linked to reproductive and developmental issues.',
  'mineral oil': 'A petroleum-derived ingredient that forms a barrier on skin. May clog pores and prevent skin from breathing.',
  'red dye': 'Synthetic red food coloring. Some variants (Red 40) are linked to hyperactivity and allergic reactions.',
  'yellow dye': 'Synthetic yellow food coloring. Tartrazine (Yellow 5) may cause allergic reactions in sensitive individuals.',
  'blue dye': 'Synthetic blue food coloring. Linked to potential hypersensitivity reactions in some studies.',
  'trans fat': 'Artificially created fats that raise LDL (bad) cholesterol and lower HDL (good) cholesterol, increasing heart disease risk.',
  'petroleum': 'Petroleum-derived ingredients can form a film on skin, potentially clogging pores and preventing natural moisture regulation.',
  'aluminum': 'Used in antiperspirants to block sweat glands. Concerns exist about potential links to breast cancer and Alzheimer\'s, though evidence is inconclusive.',
};

/**
 * Look up a short definition for an ingredient.
 * First tries the analyzeIndividual helper (which queries the full database),
 * then falls back to the built-in dictionary above.
 */
const getIngredientDefinition = (name, analysis, analyzeIndividual) => {
  const cleanName = (name || '').replace('(AI detected)', '').trim();
  const lower = cleanName.toLowerCase();

  // Try analyzeIndividual first — it returns { reason }
  if (analyzeIndividual && analysis) {
    try {
      const info = analyzeIndividual(cleanName, analysis);
      if (info?.reason && info.reason !== 'Analyzed ingredient' && info.reason !== 'Not analyzed yet') {
        return info.reason;
      }
    } catch (_) { /* fall through */ }
  }

  // Fallback: check built-in dictionary (partial match)
  for (const [key, definition] of Object.entries(INGREDIENT_DEFINITIONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return definition;
    }
  }

  return `${cleanName} is an ingredient found in this product. Tap the full ingredient list for more details.`;
};

/**
 * IngredientConcernsCard — summarises ingredient quality at a glance.
 *
 * Shows a count badge ("3 concerns" or "No concerns"), lists bad & moderate
 * ingredients visually, and collapses into the full ingredient grid.
 *
 * Props:
 *  - analysis            : full analysis object (from analyzeIngredients)
 *  - product             : product object (for ingredients_text)
 *  - analyzeIndividual   : function(ingredient, analysis) → { status, color, reason }
 */
const IngredientConcernsCard = ({ analysis, product, analyzeIndividual }) => {
  const [expanded, setExpanded] = useState(false);
  const [learnMoreItem, setLearnMoreItem] = useState(null); // tracks which item's definition is open

  if (!analysis) return null;

  const bad = analysis.badIngredients || [];
  const moderate = analysis.moderateIngredients || [];
  const harmful = analysis.harmfulChemicals || [];
  const allergens = analysis.allergens || [];
  const good = analysis.goodIngredients || [];
  const excellent = analysis.excellentIngredients || [];

  const concernCount = bad.length + harmful.length;
  const hasConcerns = concernCount > 0;

  // Build a quick-look list: show up to 5 bad items, then up to 3 moderate
  const quickItems = [];
  bad.slice(0, 5).forEach(i => quickItems.push({ name: typeof i === 'string' ? i : i.name || i, level: 'bad' }));
  harmful.slice(0, 3).forEach(i => quickItems.push({ name: typeof i === 'string' ? i : i.name || i, level: 'bad' }));
  moderate.slice(0, 3).forEach(i => quickItems.push({ name: typeof i === 'string' ? i : i.name || i, level: 'moderate' }));

  // De-dup
  const seen = new Set();
  const unique = quickItems.filter(q => {
    const key = (q.name || '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Full ingredient list (for expansion)
  const allIngredients = analysis.parsedIngredients ||
    (product?.ingredients_text
      ? product.ingredients_text.split(/[,;.]/).map(s => s.trim()).filter(s => s.length > 2)
      : []);

  return (
    <View style={styles.card}>
      {/* Header with count badge */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={hasConcerns ? 'warning' : 'shield-checkmark'}
            size={20}
            color={hasConcerns ? COLORS.poor : COLORS.good}
          />
          <Text style={styles.title}>Ingredient Concerns</Text>
          {/* count badge */}
          <View style={[styles.countBadge, { backgroundColor: hasConcerns ? COLORS.poorBg : COLORS.goodBg }]}>
            <Text style={[styles.countText, { color: hasConcerns ? COLORS.poor : COLORS.good }]}>
              {hasConcerns ? `${concernCount} concern${concernCount !== 1 ? 's' : ''}` : 'None'}
            </Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#757575" />
      </TouchableOpacity>

      {/* Quick-look list (always visible if concerns exist) */}
      {unique.length > 0 && !expanded && (
        <View style={styles.quickList}>
          {unique.map((item, idx) => {
            const isOpen = learnMoreItem === idx;
            return (
              <View key={idx}>
                <View style={styles.quickRow}>
                  <View style={[styles.dot, { backgroundColor: item.level === 'bad' ? COLORS.poor : COLORS.moderate }]} />
                  <Text style={styles.quickName} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity
                    style={styles.learnMoreBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setLearnMoreItem(isOpen ? null : idx);
                    }}
                  >
                    <Ionicons name={isOpen ? 'close-circle' : 'information-circle-outline'} size={16} color="#5C6BC0" />
                    <Text style={styles.learnMoreText}>{isOpen ? 'Close' : 'Learn More'}</Text>
                  </TouchableOpacity>
                  <View style={[styles.quickBadge, { backgroundColor: item.level === 'bad' ? COLORS.poor : COLORS.moderate }]}>
                    <Text style={styles.quickBadgeText}>
                      {item.level === 'bad' ? 'RISKY' : 'MODERATE'}
                    </Text>
                  </View>
                </View>
                {isOpen && (
                  <View style={styles.learnMoreContainer}>
                    <View style={styles.learnMoreCard}>
                      <Ionicons name="book-outline" size={14} color="#5C6BC0" style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={styles.learnMoreDefinition}>
                        {getIngredientDefinition(item.name, analysis, analyzeIndividual)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Summary stats (always visible) */}
      {!expanded && (
        <View style={styles.statsRow}>
          <Stat label="Excellent" count={analysis.excellentCount || excellent.length} color={COLORS.excellent} />
          <Stat label="Good" count={analysis.goodCount || good.length} color={COLORS.good} />
          <Stat label="Moderate" count={analysis.moderateCount || moderate.length} color={COLORS.moderate} />
          <Stat label="Poor" count={analysis.badCount || bad.length} color={COLORS.poor} />
        </View>
      )}

      {/* Allergen chips */}
      {allergens.length > 0 && !expanded && (
        <View style={styles.allergenSection}>
          <Text style={styles.allergenTitle}>🚨 Allergens</Text>
          <View style={styles.chipRow}>
            {allergens.map((a, i) => (
              <View key={i} style={styles.allergenChip}>
                <Text style={styles.allergenChipText}>{typeof a === 'string' ? a : a.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expanded: full ingredient grid */}
      {expanded && (
        <View style={styles.expandedArea}>
          {/* Stats row at top */}
          <View style={styles.statsRow}>
            <Stat label="Excellent" count={analysis.excellentCount || excellent.length} color={COLORS.excellent} />
            <Stat label="Good" count={analysis.goodCount || good.length} color={COLORS.good} />
            <Stat label="Moderate" count={analysis.moderateCount || moderate.length} color={COLORS.moderate} />
            <Stat label="Poor" count={analysis.badCount || bad.length} color={COLORS.poor} />
          </View>

          <View style={styles.grid}>
            {allIngredients.map((ingredient, index) => {
              const isAI = ingredient.includes('(AI detected)');
              const clean = ingredient.replace('(AI detected)', '').trim();
              const info = analyzeIndividual ? analyzeIndividual(clean, analysis) : { status: 'MODERATE', reason: '' };

              return (
                <IngredientCard
                  key={`${clean}-${index}`}
                  ingredient={clean.charAt(0).toUpperCase() + clean.slice(1)}
                  status={info.status}
                  description={info.reason}
                  isAIDetected={isAI}
                  delay={index * 20}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Toggle button */}
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <Text style={styles.toggleText}>
          {expanded ? 'Hide ingredients' : `View all ${analysis.totalIngredients || allIngredients.length} ingredients`}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={18} color="#2E7D32" />
      </TouchableOpacity>
    </View>
  );
};

const Stat = ({ label, count, color }) => (
  <View style={styles.statItem}>
    <View style={[styles.statDot, { backgroundColor: color }]} />
    <Text style={styles.statText}>{count} {label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    ...SECTION_CARD,
  },
  // -- header --
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // -- quick list --
  quickList: {
    marginTop: 14,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  quickName: {
    flex: 1,
    fontSize: 13,
    color: '#424242',
  },
  quickBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  // -- learn more --
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EDE7F6',
    borderRadius: 10,
  },
  learnMoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5C6BC0',
    marginLeft: 3,
  },
  learnMoreContainer: {
    paddingLeft: 16,
    paddingRight: 4,
    marginBottom: 10,
    marginTop: -2,
  },
  learnMoreCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F0FF',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#5C6BC0',
  },
  learnMoreDefinition: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#424242',
  },
  // -- stats --
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: '#616161',
  },
  // -- allergens --
  allergenSection: {
    marginTop: 12,
  },
  allergenTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.poor,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergenChip: {
    backgroundColor: COLORS.poorBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  allergenChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.poor,
  },
  // -- expanded grid --
  expandedArea: {
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  // -- toggle --
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 4,
  },
});

export default IngredientConcernsCard;
