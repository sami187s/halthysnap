import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, ScrollView, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const TestSubscriptionScreen = ({ navigation }) => {
  const [currentTier, setCurrentTier] = useState('free');

  React.useEffect(() => {
    checkCurrentSubscription();
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      setCurrentTier(subscriptionType === 'Premium' ? 'premium' : 'free');
    } catch (error) {
      console.log('Error checking subscription:', error);
    }
  };

  const switchToFree = async () => {
    try {
      await AsyncStorage.setItem('subscriptionType', 'Free');
      await AsyncStorage.removeItem('premiumTrialActivated');
      await AsyncStorage.setItem('premiumTrialUsedToday', '0');
      setCurrentTier('free');
      
      Alert.alert(
        'Free Mode Active', 
        'Unlimited basic scans\nBasic ingredient information\nNo AI analysis\nNo advanced insights\n\nYou can try 2 premium scans anytime!',
        [
          {
            text: 'Continue with Free',
            onPress: () => {
              console.log('User chose Free mode - navigating to Home');
              navigation.navigate('Home');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to set free plan');
    }
  };

  const switchToPremium = async () => {
    try {
      await AsyncStorage.setItem('subscriptionType', 'Premium');
      await AsyncStorage.removeItem('premiumTrialActivated');
      await AsyncStorage.removeItem('premiumTrialUsedToday');
      setCurrentTier('premium');
      
      Alert.alert(
        'Premium Subscription Active!', 
        'Unlimited scans\nAI analysis for all products\nMissing ingredients detection\nAdvanced insights\nNo ads or limitations\n\nWelcome to Premium! All features unlocked!',
        [
          {
            text: 'Start Premium Scanning!',
            onPress: () => {
              console.log('User activated Premium - navigating to Home');
              // Navigate to Home with premium activated flag
              navigation.navigate('Home', { premiumActivated: true });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to activate premium plan');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>HealthyScan Premium</Text>
          <Text style={styles.heroSubtitle}>Professional ingredient analysis</Text>
        </View>
      </View>

      {/* Current Status - If already premium */}
      {currentTier === 'premium' && (
        <View style={styles.premiumActiveContainer}>
          <View style={styles.premiumActiveCard}>
            <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
            <Text style={styles.premiumActiveText}>Premium Active</Text>
            <Text style={styles.premiumActiveSubtext}>All features unlocked</Text>
            <TouchableOpacity 
              style={styles.goHomeButton} 
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.goHomeButtonText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Premium Plan Card - Only show if not premium */}
      {currentTier !== 'premium' && (
        <View style={styles.mainContent}>
          {/* Left Side - Benefits */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitsHeaderContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitsHeader}>Premium Features</Text>
            </View>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <MaterialIcons name="psychology" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.benefitTitle}>AI Analysis</Text>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="warning" size={20} color="#FF6B35" />
                </View>
                <Text style={styles.benefitTitle}>Hidden Dangers</Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="bulb" size={20} color="#FF9800" />
                </View>
                <Text style={styles.benefitTitle}>Smart Insights</Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="flash" size={20} color="#2196F3" />
                </View>
                <Text style={styles.benefitTitle}>Unlimited Scans</Text>
              </View>
            </View>
          </View>

          {/* Right Side - Pricing */}
          <View style={styles.pricingContainer}>
            <View style={styles.pricingCard}>
              <View style={styles.priceDisplay}>
                <View style={styles.priceRow}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <Text style={styles.bigPrice}>1.99</Text>
                </View>
                <Text style={styles.pricePeriod}>per week</Text>
              </View>
              
              <Text style={styles.priceNote}>Cancel anytime</Text>

              
              {/* Upgrade Button */}
              <TouchableOpacity 
                style={styles.upgradeButton} 
                onPress={switchToPremium}
                activeOpacity={0.8}
              >
                <View style={styles.upgradeButtonContent}>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.upgradeButtonText}>Get Premium</Text>
                </View>
              </TouchableOpacity>

              {/* Trust Indicators */}
              <View style={styles.trustBadges}>
                <View style={styles.trustBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.trustText}>Cancel anytime</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.trustText}>Secure payment</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Continue Free Option - Only show if not premium */}
      {currentTier !== 'premium' && (
        <View style={styles.freeOptionContainer}>
          <TouchableOpacity 
            style={styles.continueFreeButton} 
            onPress={switchToFree}
            activeOpacity={0.7}
          >
            <Text style={styles.continueFreeText}>Continue with Free Version</Text>
          </TouchableOpacity>

          {/* Legal Links - Required by Apple for subscriptions */}
          <View style={styles.legalLinksContainer}>
            <Text style={styles.subscriptionInfo}>
              Subscription: $0.00/week • Promotional access
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={async () => {
                const url = 'https://sites.google.com/view/vee-privacy-policy';
                try {
                  const supported = await Linking.canOpenURL(url);
                  if (supported) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Unable to open Privacy Policy. Please check your internet connection.');
                  }
                } catch (error) {
                  console.error('Error opening privacy policy:', error);
                  Alert.alert('Error', 'Unable to open Privacy Policy at this time.');
                }
              }}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}> • </Text>
              <TouchableOpacity onPress={async () => {
                const url = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
                try {
                  const supported = await Linking.canOpenURL(url);
                  if (supported) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Unable to open Terms of Use. Please check your internet connection.');
                  }
                } catch (error) {
                  console.error('Error opening terms:', error);
                  Alert.alert('Error', 'Unable to open Terms of Use at this time.');
                }
              }}>
                <Text style={styles.legalLinkText}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Header Styles
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
  },

  // Premium Active Container
  premiumActiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Premium Active Card
  premiumActiveCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    maxWidth: 400,
    width: '100%',
  },
  premiumActiveText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 24,
    marginBottom: 12,
  },
  premiumActiveSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  goHomeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goHomeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Premium Container
  premiumContainer: {
    paddingHorizontal: 24,
    marginTop: -20, // Overlap with header
  },
  premiumCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 15,
    position: 'relative',
  },

  // Special Badge
  specialBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    right: 24,
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    zIndex: 1,
  },
  specialBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginLeft: 6,
  },

  // Premium Header
  premiumHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  premiumIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Price Display
  priceDisplay: {
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 4,
  },
  bigPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Benefits Section
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  benefitsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
    color: '#666',
  },

  // Upgrade Button
  upgradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  upgradeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  upgradeButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },

  // Trust Badges
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  trustBadge: {
    alignItems: 'center',
    flex: 1,
  },
  trustText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },

  // Main Content Layout
  mainContent: {
    flex: 1,
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    gap: 24,
  },

  // Benefits Container (Left Side)
  benefitsContainer: {
    flex: screenWidth > 768 ? 1 : 0,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 24,
    marginBottom: screenWidth > 768 ? 0 : 24,
  },

  benefitsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  benefitsHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 12,
  },

  benefitsList: {
    gap: 16,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },

  // Pricing Container (Right Side)
  pricingContainer: {
    flex: screenWidth > 768 ? 0.6 : 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    minWidth: screenWidth > 768 ? 280 : '100%',
  },

  priceDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 8,
  },

  bigPrice: {
    fontSize: 64,
    fontWeight: '800',
    color: '#4CAF50',
    lineHeight: 64,
  },

  pricePeriod: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },

  priceNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Upgrade Button
  upgradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 200,
  },

  upgradeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Trust Badges
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  trustText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Free Option
  freeOptionContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  continueFreeButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },

  continueFreeText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },

  // Legal Links (Required by Apple App Store)
  legalLinksContainer: {
    marginTop: 24,
    alignItems: 'center',
  },

  subscriptionInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },

  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  legalLinkText: {
    fontSize: 12,
    color: '#4CAF50',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  legalDivider: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 4,
  },
});

export default TestSubscriptionScreen;