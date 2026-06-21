import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const TestSubscriptionScreenExpoGo = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    
    // Simulate purchase flow for testing in Expo Go
    setTimeout(() => {
      Alert.alert(
        '🎉 Purchase Successful!',
        'Welcome to HealthyScan Premium!\n\nThis is a test purchase in development mode. Real payments will work after App Store approval.',
        [
          {
            text: 'Continue',
            onPress: () => {
              setLoading(false);
              navigation.goBack();
            }
          }
        ]
      );
    }, 2000);
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'No previous purchases found.\n\nThis feature will work with real App Store purchases.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HealthyScan Premium</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={60} color="#4CAF50" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Unlock Full Analysis</Text>
        <Text style={styles.subtitle}>Get unlimited scans and detailed insights</Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="infinite" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Unlimited product scans</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Advanced ingredient analysis</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Health risk assessments</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Detailed nutrition insights</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>$1.99</Text>
          <Text style={styles.pricePeriod}>per week</Text>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity 
          style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.purchaseButtonText}>Start Premium</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Test Mode Notice */}
        <View style={styles.testNotice}>
          <Ionicons name="information-circle" size={16} color="#666" />
          <Text style={styles.testNoticeText}>
            Development Mode - No real charges
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  priceText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#CCE5CC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  restoreButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  testNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
  },
  testNoticeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  footer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default TestSubscriptionScreenExpoGo;