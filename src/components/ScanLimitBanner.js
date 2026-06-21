// Scan Limit Banner Component
// Shows remaining scans for free users and prompts for upgrade

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';

const ScanLimitBanner = ({ navigation, onScanAttempt }) => {
  const { 
    isSubscribed, 
    remainingScans, 
    canScan, 
    isLoading,
    gracePeriodData,
    incrementScan 
  } = useSubscription();

  // Don't show banner if subscribed (unless in grace period)
  if (isSubscribed && !gracePeriodData?.isInGracePeriod) {
    return null;
  }

  // Don't show while loading
  if (isLoading) {
    return null;
  }

  const handleScanPress = async () => {
    if (!canScan()) {
      // Show upgrade prompt
      Alert.alert(
        '🚫 Scan Limit Reached',
        'You\'ve used all your free scans for today. Upgrade to VEE Premium for unlimited scans!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: 'Upgrade Now', 
            onPress: () => navigation.navigate('Subscription'),
            style: 'default'
          }
        ]
      );
      return;
    }

    // Process the scan
    if (onScanAttempt) {
      const scanSuccess = await onScanAttempt();
      
      if (scanSuccess) {
        // Increment scan count for free users
        await incrementScan();
      }
    }
  };

  // Grace period banner (for subscribed users with payment issues)
  if (gracePeriodData?.isInGracePeriod) {
    return (
      <View style={[styles.banner, styles.gracePeriodBanner]}>
        <View style={styles.bannerContent}>
          <Ionicons name="warning" size={24} color="white" />
          <View style={styles.textContainer}>
            <Text style={styles.gracePeriodTitle}>
              Payment Issue Detected
            </Text>
            <Text style={styles.gracePeriodText}>
              {gracePeriodData.daysRemaining} days remaining in grace period
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.actionButtonText}>Fix</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Regular scan limit banner for free users
  const getScansColor = () => {
    if (remainingScans === 0) return '#F44336'; // Red
    if (remainingScans === 1) return '#FF9800'; // Orange
    return '#4CAF50'; // Green
  };

  const getScansMessage = () => {
    if (remainingScans === 0) {
      return 'No scans remaining today';
    }
    if (remainingScans === 1) {
      return '1 scan remaining today';
    }
    return `${remainingScans} scans remaining today`;
  };

  return (
    <View style={[styles.banner, { backgroundColor: getScansColor() }]}>
      <View style={styles.bannerContent}>
        <Ionicons 
          name={remainingScans > 0 ? "scan" : "lock-closed"} 
          size={24} 
          color="white" 
        />
        <View style={styles.textContainer}>
          <Text style={styles.scansText}>
            {getScansMessage()}
          </Text>
          {remainingScans === 0 && (
            <Text style={styles.resetText}>
              Resets tomorrow or upgrade for unlimited
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Ionicons name="diamond" size={16} color="white" />
          <Text style={styles.upgradeButtonText}>
            {remainingScans === 0 ? 'Upgrade' : 'Premium'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Scan Button Component with limit awareness
export const ScanButton = ({ navigation, onPress, disabled }) => {
  const { canScan, remainingScans, isSubscribed } = useSubscription();
  
  const handlePress = () => {
    if (!canScan()) {
      Alert.alert(
        '🚫 Scan Limit Reached',
        'You\'ve used all your free scans for today. Upgrade to VEE Premium for unlimited scans!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: 'Upgrade Now', 
            onPress: () => navigation.navigate('Subscription')
          }
        ]
      );
      return;
    }
    
    if (onPress) {
      onPress();
    }
  };

  const getButtonStyle = () => {
    if (disabled || !canScan()) {
      return [styles.scanButton, styles.disabledScanButton];
    }
    return styles.scanButton;
  };

  const getButtonText = () => {
    if (!canScan()) return 'Upgrade to Scan';
    if (isSubscribed) return 'Scan Product';
    return `Scan Product (${remainingScans} left)`;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled}
    >
      <Ionicons 
        name={canScan() ? "scan" : "lock-closed"} 
        size={32} 
        color="white" 
      />
      <Text style={styles.scanButtonText}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gracePeriodBanner: {
    backgroundColor: '#FF6B6B',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  scansText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  gracePeriodTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gracePeriodText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledScanButton: {
    backgroundColor: '#999',
    shadowColor: '#999',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ScanLimitBanner;