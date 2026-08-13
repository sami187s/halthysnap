import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SPACING } from '../../utils/theme';
import { useSafeAreaInsetsWithFallback } from '../../utils/safeAreaUtils';

/**
 * ScreenHeader — unified white header bar with deep-green title.
 * Consistent across all non-Home screens.
 *
 * Props:
 *  - title        (string)   Screen title
 *  - onBack       (fn|null)  If provided, shows a back arrow
 *  - rightIcon    (string)   Ionicons name for right button
 *  - onRight      (fn)       Handler for right button
 *  - rightComponent (node)   Custom right component (overrides rightIcon)
 */
const ScreenHeader = ({
  title,
  onBack,
  rightIcon,
  onRight,
  rightComponent,
}) => {
  const insets = useSafeAreaInsetsWithFallback();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textGreen} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerPlaceholder} />
      )}

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {rightComponent ? (
        rightComponent
      ) : rightIcon && onRight ? (
        <TouchableOpacity
          onPress={onRight}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={rightIcon} size={22} color={THEME.textGreen} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 12,
    backgroundColor: 'rgba(251,251,249,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F1',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textGreen,
    marginHorizontal: 8,
  },
  headerPlaceholder: {
    width: 40,
  },
});

export default ScreenHeader;
