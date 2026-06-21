import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SECTION_CARD, COLORS } from '../utils/resultScreenStyles';

/**
 * Map recommendation text to a relevant Ionicons icon.
 */
const pickIcon = (text) => {
  const t = (text || '').toLowerCase();
  if (t.includes('water') || t.includes('hydrat'))    return 'water';
  if (t.includes('sugar') || t.includes('sweet'))     return 'ice-cream';
  if (t.includes('sodium') || t.includes('salt'))     return 'water';
  if (t.includes('protein') || t.includes('meat'))    return 'fish';
  if (t.includes('fiber') || t.includes('vegetable')) return 'leaf';
  if (t.includes('fat') || t.includes('oil'))         return 'egg';
  if (t.includes('exercise') || t.includes('workout'))return 'barbell';
  if (t.includes('alternative') || t.includes('swap'))return 'swap-horizontal';
  if (t.includes('avoid') || t.includes('limit'))     return 'close-circle';
  if (t.includes('moderat'))                           return 'speedometer';
  return 'bulb';
};

/**
 * GuidanceCard — "What should I do?" section showing AI recommendations.
 *
 * Props:
 *  - aiAnalysis       : object from AIService (may contain recommendations, naturalAlternatives)
 *  - hasAIAccess      : boolean (Premium or Trial)
 *  - onUpgrade        : function to navigate to Subscription
 */
const GuidanceCard = ({ aiAnalysis, hasAIAccess, onUpgrade }) => {
  // Free users without AI access — show upgrade prompt
  if (!hasAIAccess) {
    const previewRecs = [
      'Switch to lower-sugar options during weekdays.',
      'Choose products with fewer artificial additives.',
      'Prefer whole-food ingredients over refined blends.',
    ];

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bulb" size={20} color={COLORS.moderate} />
          <Text style={styles.title}>What Should I Do?</Text>
        </View>

        <View style={styles.lockedPreviewWrap}>
          <View style={styles.lockedPreviewList}>
            {previewRecs.map((rec, idx) => (
              <View key={`p-${idx}`} style={styles.row}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.greenBg }]}>
                  <Ionicons name="sparkles" size={16} color={COLORS.green} />
                </View>
                <Text style={styles.rowText}>{rec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.lockedOverlay}>
            <Text style={styles.lockedText}>
              Unlock personalized AI-powered recommendations for every product you scan.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.7}>
              <Ionicons name="lock-open" size={16} color="#fff" />
              <Text style={styles.upgradeBtnText}>Unlock AI Recommendations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Premium/Trial user but AI hasn't loaded yet — show loading hint
  if (!aiAnalysis) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bulb" size={20} color={COLORS.moderate} />
          <Text style={styles.title}>What Should I Do?</Text>
        </View>
        <Text style={styles.lockedText}>
          Tap "Get AI Analysis" above to receive personalized recommendations.
        </Text>
      </View>
    );
  }

  const recs = aiAnalysis.recommendations || [];
  const alts = aiAnalysis.naturalAlternatives || [];
  const concerns = aiAnalysis.concerns || [];

  // Nothing to show
  if (recs.length === 0 && alts.length === 0 && concerns.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={20} color={COLORS.moderate} />
        <Text style={styles.title}>What Should I Do?</Text>
      </View>

      {/* Recommendations */}
      {recs.length > 0 && (
        <View style={styles.section}>
          {recs.map((rec, idx) => (
            <View key={`r-${idx}`} style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.goodBg }]}>
                <Ionicons name={pickIcon(rec)} size={16} color={COLORS.good} />
              </View>
              <Text style={styles.rowText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Concerns as tips */}
      {concerns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subheading}>Points to Watch</Text>
          {concerns.map((c, idx) => (
            <View key={`c-${idx}`} style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.moderateBg }]}>
                <Ionicons name="warning" size={16} color={COLORS.moderate} />
              </View>
              <Text style={styles.rowText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Natural alternatives */}
      {alts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subheading}>Healthier Alternatives</Text>
          {alts.map((alt, idx) => (
            <View key={`a-${idx}`} style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.excellentBg }]}>
                <Ionicons name="swap-horizontal" size={16} color={COLORS.excellent} />
              </View>
              <Text style={styles.rowText}>{typeof alt === 'string' ? alt : alt.name || JSON.stringify(alt)}</Text>
            </View>
          ))}
        </View>
      )}
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
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  // -- rows --
  section: {
    marginBottom: 10,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#757575',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: '#3D3D3D',
    lineHeight: 22,
  },
  // -- locked state --
  lockedPreviewWrap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9ECF1',
  },
  lockedPreviewList: {
    padding: 12,
    opacity: 0.28,
  },
  lockedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  lockedText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
    marginBottom: 14,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 14,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default GuidanceCard;
