import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/resultScreenStyles';

/**
 * BottomActionBar — clear next actions shown at the bottom of the result scroll.
 *
 * Props:
 *  - onScanAnother      : function — navigate to Home
 *  - onSaveToHistory    : async function — calls saveToHistory
 *  - onViewAlternatives : function — scrolls to guidance or shows AI alternatives
 *  - isPremium          : boolean
 *  - onUpgrade          : function — navigate to Subscription
 *  - alreadySaved       : boolean (auto-saved for premium)
 *  - hasAlternatives    : boolean (AI recommendations available)
 */
const BottomActionBar = ({
  onScanAnother,
  onSaveToHistory,
  onViewAlternatives,
  isPremium,
  onUpgrade,
  alreadySaved = false,
  hasAlternatives = false,
}) => {
  const [saved, setSaved] = useState(alreadySaved);

  const handleSave = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Save scan results to your history with Premium. Upgrade now?',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: onUpgrade },
        ]
      );
      return;
    }
    if (saved) return; // already saved
    try {
      if (onSaveToHistory) await onSaveToHistory();
      setSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Primary: Scan Another */}
      <TouchableOpacity style={styles.primaryBtn} onPress={onScanAnother} activeOpacity={0.8}>
        <Ionicons name="scan" size={22} color="#fff" />
        <Text style={styles.primaryText}>Scan Another</Text>
      </TouchableOpacity>

      {/* Secondary row */}
      <View style={styles.secondaryRow}>
        {/* Save */}
        <TouchableOpacity
          style={[styles.secondaryBtn, saved && styles.savedBtn]}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={saved ? 'checkmark-circle' : isPremium ? 'bookmark-outline' : 'lock-closed-outline'}
            size={18}
            color={saved ? COLORS.good : '#424242'}
          />
          <Text style={[styles.secondaryText, saved && { color: COLORS.good }]}>
            {saved ? 'Saved' : 'Save Result'}
          </Text>
        </TouchableOpacity>

        {/* Alternatives */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onViewAlternatives}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal" size={18} color="#424242" />
          <Text style={styles.secondaryText}>
            {hasAlternatives ? 'View Alternatives' : 'Get Tips'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  savedBtn: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D3D',
    marginLeft: 6,
  },
});

export default BottomActionBar;
