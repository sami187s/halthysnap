// Smart Post-Scan Handler
// Manages what happens after scanning - upgrade prompts vs free usage

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionFlowManager } from '../utils/subscriptionFlow';

const SmartPostScanHandler = ({ 
  navigation, 
  scanData, 
  onContinueFree, 
  onUpgradeSelected,
  visible,
  onClose 
}) => {
  const [postScanAction, setPostScanAction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && scanData) {
      handlePostScan();
    }
  }, [visible, scanData]);

  const handlePostScan = async () => {
    try {
      setLoading(true);
      
      // Initialize flow manager
      await subscriptionFlowManager.initialize();
      
      // Increment free usage count
      await subscriptionFlowManager.incrementFreeUsage();
      
      // Get recommended action
      const action = await subscriptionFlowManager.getPostScanAction();
      setPostScanAction(action);
      
    } catch (error) {
      console.error('Post-scan handling error:', error);
      // Default to allowing free usage
      setPostScanAction({ action: 'continue_free', message: 'free_scan_complete' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeInterest = async () => {
    await subscriptionFlowManager.userInterestedInUpgrade();
    if (onUpgradeSelected) {
      onUpgradeSelected();
    } else {
      navigation.navigate('Subscription');
    }
    onClose();
  };

  const handleDismissUpgrade = async () => {
    await subscriptionFlowManager.userDismissedUpgrade();
    handleContinueFree();
  };

  const handleContinueFree = () => {
    if (onContinueFree) {
      onContinueFree(scanData);
    }
    onClose();
  };

  if (!visible || loading) {
    return null;
  }

  // Continue with free usage (no prompt needed)
  if (postScanAction?.action === 'continue_free') {
    // Automatically continue - no modal needed
    setTimeout(handleContinueFree, 0);
    return null;
  }

  // Show upgrade suggestion
  if (postScanAction?.action === 'show_upgrade_prompt') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Ionicons name="diamond" size={40} color="#4CAF50" />
              <Text style={styles.title}>Unlock Premium Features!</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.description}>
                Great scan! Want to unlock detailed ingredient analysis and unlimited scans?
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.benefitText}>Unlimited product scans</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.benefitText}>Advanced AI ingredient analysis</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.benefitText}>Detailed health scores</Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={handleUpgradeInterest}
              >
                <Ionicons name="diamond" size={20} color="white" />
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.freeButton}
                onPress={handleContinueFree}
              >
                <Text style={styles.freeButtonText}>Continue with Basic Scan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={handleDismissUpgrade}
              >
                <Text style={styles.dismissButtonText}>Don't show this again today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Already subscribed - continue normally
  setTimeout(handleContinueFree, 0);
  return null;
};

// Simple hook for easy integration
export const useSmartPostScan = () => {
  const [showPostScan, setShowPostScan] = useState(false);
  const [scanData, setScanData] = useState(null);

  const handleScanComplete = async (data) => {
    setScanData(data);
    setShowPostScan(true);
  };

  const handleClose = () => {
    setShowPostScan(false);
    setScanData(null);
  };

  return {
    showPostScan,
    scanData,
    handleScanComplete,
    handleClose
  };
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    alignItems: 'flex-start',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  actions: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  freeButton: {
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default SmartPostScanHandler;