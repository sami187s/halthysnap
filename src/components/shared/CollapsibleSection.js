import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CARD_STYLES, SPACING, TYPOGRAPHY, COLORS } from '../../utils/resultScreenStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CollapsibleSection = ({ 
  title, 
  children, 
  defaultExpanded = false,
  icon,
  badge,
  style
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.icon} />
          )}
          <Text style={styles.title}>{title}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color={COLORS.textSecondary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: CARD_STYLES.backgroundColor,
    borderRadius: CARD_STYLES.borderRadius,
    marginBottom: SPACING.lg,
    shadowColor: CARD_STYLES.shadowColor,
    shadowOffset: CARD_STYLES.shadowOffset,
    shadowOpacity: CARD_STYLES.shadowOpacity,
    shadowRadius: CARD_STYLES.shadowRadius,
    elevation: CARD_STYLES.elevation,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: CARD_STYLES.padding,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: SPACING.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: CARD_STYLES.padding,
    paddingBottom: CARD_STYLES.padding,
  },
});

export default CollapsibleSection;
