import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');

const TestSubscriptionScreen = ({ navigation }) => {
  const [currentTier, setCurrentTier] = useState('free');

  // Check current subscription on load
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
        '📱 Free Mode Active', 
        '✅ Unlimited basic scans\n✅ Basic ingredient information\n❌ No AI analysis\n❌ No advanced insights\n\nYou can try 2 premium scans anytime!',
        [
          {
            text: 'Continue with Free',
            onPress: () => {
              console.log('📱 User chose Free mode - navigating to Home');
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
        '🎉 Premium Subscription Active!', 
        '✅ Unlimited scans\n✅ AI analysis for all products\n✅ Missing ingredients detection\n✅ Advanced insights\n✅ No ads or limitations\n\nWelcome to Premium! All features unlocked!',
        [
          {
            text: 'Start Premium Scanning!',
            onPress: () => {
              console.log('🎉 User activated Premium - navigating to Home');
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
            <Ionicons name="star" size={40} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>HealthyScan Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock AI-powered insights</Text>
        </View>
      </View>

      {/* Current Status - If already premium */}
      {currentTier === 'premium' && (
        <View style={styles.premiumActiveCard}>
          <Text style={styles.premiumActiveIcon}>🎉</Text>
          <Text style={styles.premiumActiveText}>You're Premium!</Text>
          <Text style={styles.premiumActiveSubtext}>Enjoying unlimited AI analysis</Text>
          <TouchableOpacity 
            style={styles.goHomeButton} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.goHomeButtonText}>Continue to App →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Plan Card - Only show if not premium */}
      {currentTier !== 'premium' && (
        <View style={styles.premiumContainer}>
          <View style={styles.premiumCard}>
            
            {/* Special Badge */}
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>🔥 MOST POPULAR</Text>
            </View>

            {/* Plan Header */}
            <View style={styles.premiumHeader}>
              <Text style={styles.premiumIcon}>⭐</Text>
              <Text style={styles.premiumTitle}>HealthyScan Premium</Text>
              
              {/* Big Price Display */}
              <View style={styles.priceDisplay}>
                <View style={styles.priceRow}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <Text style={styles.bigPrice}>1.99</Text>
                </View>
                <Text style={styles.pricePeriod}>per week</Text>
                <Text style={styles.priceNote}>Cancel anytime • No commitment</Text>
              </View>
            </View>

            {/* Premium Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsHeader}>✨ What you get:</Text>
              
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🧠</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>AI Analysis</Text>
                    <Text style={styles.benefitDesc}>Smart ingredient breakdown</Text>
                  </View>
                </View>
                
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🔍</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Hidden Dangers</Text>
                    <Text style={styles.benefitDesc}>Detect harmful ingredients</Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>💡</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Smart Insights</Text>
                    <Text style={styles.benefitDesc}>Personalized recommendations</Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>⚡</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Unlimited Scans</Text>
                    <Text style={styles.benefitDesc}>No limits, scan everything</Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🏆</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Priority Support</Text>
                    <Text style={styles.benefitDesc}>Get help when you need it</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={switchToPremium}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>🚀 Start Premium Now</Text>
              <Text style={styles.upgradeButtonSubtext}>Instant access to all features</Text>
            </TouchableOpacity>

            {/* Trust Indicators */}
            <View style={styles.trustBadges}>
              <View style={styles.trustBadge}>
                <Text style={styles.trustIcon}>✅</Text>
                <Text style={styles.trustText}>Cancel anytime</Text>
              </View>
              <View style={styles.trustBadge}>
                <Text style={styles.trustIcon}>✅</Text>
                <Text style={styles.trustText}>Instant activation</Text>
              </View>
              <View style={styles.trustBadge}>
                <Text style={styles.trustIcon}>✅</Text>
                <Text style={styles.trustText}>No hidden fees</Text>
              </View>
            </View>

          </View>
        </View>
      )}

      {/* Continue Free Option - Only show if not premium */}
      {currentTier !== 'premium' && (
        <View style={styles.continueSection}>
          <TouchableOpacity 
            style={styles.continueFreeButton} 
            onPress={switchToFree}
            activeOpacity={0.7}
          >
            <Text style={styles.continueFreeText}>Continue with basic features</Text>
          </TouchableOpacity>
          <Text style={styles.limitNote}>Limited to basic scanning only</Text>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  // Header Styles
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // This won't work in RN, we'll use solid color
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
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

  // Premium Active Card
  premiumActiveCard: {
    margin: 24,
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  premiumActiveIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  premiumActiveText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
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
    zIndex: 1,
  },
  specialBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  benefitsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
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
  benefitIcon: {
    fontSize: 24,
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
  upgradeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
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
  trustIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  trustText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Continue Section
  continueSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  continueFreeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  continueFreeText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  limitNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default TestSubscriptionScreen;