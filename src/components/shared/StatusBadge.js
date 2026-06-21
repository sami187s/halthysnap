import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_BADGE, getStatusColors } from '../../utils/resultScreenStyles';

const StatusBadge = ({ status, size = 'normal' }) => {
  const statusColors = getStatusColors(status);
  
  const sizeStyle = size === 'small' 
    ? { paddingHorizontal: 6, paddingVertical: 2, fontSize: 9 }
    : { paddingHorizontal: STATUS_BADGE.paddingHorizontal, paddingVertical: STATUS_BADGE.paddingVertical, fontSize: STATUS_BADGE.fontSize };

  return (
    <View style={[styles.badge, { backgroundColor: statusColors.backgroundColor }, sizeStyle]}>
      <Text style={[styles.text, { color: statusColors.textColor, fontSize: sizeStyle.fontSize }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: STATUS_BADGE.borderRadius,
  },
  text: {
    fontWeight: STATUS_BADGE.fontWeight,
    letterSpacing: STATUS_BADGE.letterSpacing,
  },
});

export default StatusBadge;
