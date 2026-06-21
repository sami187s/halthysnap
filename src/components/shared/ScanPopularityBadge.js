import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatScans = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const getPopularityInfo = (count) => {
  if (count >= 100000) return { label: 'Very Popular', color: '#1B5E20', bg: '#E8F5E9', icon: 'flame' };
  if (count >= 10000) return { label: 'Popular', color: '#2E7D32', bg: '#F1F8E9', icon: 'trending-up' };
  if (count >= 1000) return { label: 'Known Product', color: '#FF9800', bg: '#FFF3E0', icon: 'people' };
  if (count >= 100) return { label: 'Scanned Online', color: '#78909C', bg: '#ECEFF1', icon: 'people-outline' };
  return { label: 'Rarely Scanned', color: '#9E9E9E', bg: '#F5F5F5', icon: 'people-outline' };
};

const ScanPopularityBadge = ({ product }) => {
  const scans = product?.scans_n || product?.unique_scans_n || 0;

  if (!scans || scans === 0) return null;

  const info = getPopularityInfo(scans);

  return (
    <View style={[styles.container, { backgroundColor: info.bg }]}>
      <Ionicons name={info.icon} size={14} color={info.color} />
      <Text style={[styles.countText, { color: info.color }]}>
        {formatScans(scans)} scans worldwide
      </Text>
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.labelText, { color: info.color }]}>
        {info.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginTop: 8,
    gap: 5,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.85,
  },
});

export default ScanPopularityBadge;
