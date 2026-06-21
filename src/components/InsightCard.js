import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Status configuration for color-coded insight cards.
 *
 *  status:  'good' | 'moderate' | 'poor'
 */
const STATUS_CONFIG = {
  good: {
    icon: 'checkmark-circle',
    label: 'Good',
    color: '#4CAF50',
    barColor: '#4CAF50',
    bgTint: 'rgba(76, 175, 80, 0.06)',
    textColor: '#1B5E20',
  },
  moderate: {
    icon: 'alert-circle',
    label: 'Moderate',
    color: '#FF9800',
    barColor: '#FF9800',
    bgTint: 'rgba(255, 152, 0, 0.06)',
    textColor: '#E65100',
  },
  poor: {
    icon: 'close-circle',
    label: 'Poor',
    color: '#F44336',
    barColor: '#F44336',
    bgTint: 'rgba(244, 67, 54, 0.06)',
    textColor: '#B71C1C',
  },
};

/**
 * InsightCard — A summary card with expandable details.
 *
 * Props:
 *  - title           : string   — Category label (e.g. "Skin Health", "Ingredient Quality")
 *  - status          : 'good' | 'moderate' | 'poor'
 *  - microInsight    : string   — One short sentence (8-12 words max)
 *  - details         : string | string[]  — Full AI explanation shown on expand
 *  - icon            : string   — Ionicons name (optional, defaults to category-appropriate)
 *  - defaultExpanded : boolean  — Start expanded (default false)
 *  - style           : object   — Extra container style
 */
const InsightCard = ({
  title,
  status = 'good',
  microInsight,
  details,
  icon,
  defaultExpanded = false,
  style,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.good;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  // Normalize details to an array of strings
  const detailLines = Array.isArray(details)
    ? details
    : details
    ? details.split('\n').filter((l) => l.trim().length > 0)
    : [];

  const hasDetails = detailLines.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: config.bgTint }, style]}>
      {/* Left color indicator bar */}
      <View style={[styles.colorBar, { backgroundColor: config.barColor }]} />

      <View style={styles.body}>
        {/* ─── 1. Status Line (always visible) ─── */}
        <View style={styles.statusRow}>
          <Ionicons name={config.icon} size={20} color={config.color} style={styles.statusIcon} />
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={config.color}
              style={styles.titleIcon}
            />
          )}
          <Text style={[styles.title, { color: config.textColor }]}>
            {title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: config.barColor + '1A' }]}>
            <Text style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* ─── 2. Micro Insight (short sentence) ─── */}
        {microInsight ? (
          <Text style={styles.microInsight} numberOfLines={2}>
            {microInsight}
          </Text>
        ) : null}

        {/* ─── 3. Learn More toggle ─── */}
        {hasDetails && (
          <TouchableOpacity
            style={styles.learnMoreBtn}
            onPress={toggleExpand}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.learnMoreText, { color: config.color }]}>
              {expanded ? 'Show Less' : 'Learn More'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={config.color}
            />
          </TouchableOpacity>
        )}

        {/* ─── 4. Expanded Content (hidden by default) ─── */}
        {expanded && hasDetails && (
          <View style={styles.expandedContent}>
            {detailLines.map((line, idx) => (
              <Text key={idx} style={styles.detailLine}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  colorBar: {
    width: 5,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  body: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },

  /* ── Status Row ── */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIcon: {
    marginRight: 6,
  },
  titleIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Micro Insight ── */
  microInsight: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
    marginTop: 4,
    marginBottom: 2,
  },

  /* ── Learn More ── */
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },

  /* ── Expanded Content ── */
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  detailLine: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 8,
  },
});

export default InsightCard;
