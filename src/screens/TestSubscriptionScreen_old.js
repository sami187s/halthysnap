import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      {/* Header with premium gradient */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSubtitle}>
            Get AI-powered insights for smarter,{'\n'}healthier product choices
          </Text>
        </View>
      </View>

      {/* Current Status */}
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
        
        {/* Free Plan */}
        <View style={[styles.planCard, styles.freePlanCard]}>
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>📱 Free Plan</Text>
            <Text style={styles.planPrice}>$0</Text>
          </View>
          <View style={styles.planFeatures}>
            <Text style={styles.featureText}>✅ Unlimited basic scans</Text>
            <Text style={styles.featureText}>✅ Basic ingredient info</Text>
            <Text style={styles.featureText}>✅ Health scores</Text>
            <Text style={styles.featureTextDisabled}>❌ AI analysis</Text>
            <Text style={styles.featureTextDisabled}>❌ Advanced insights</Text>
          </View>
          <TouchableOpacity 
            style={[styles.planButton, styles.freeButton, currentTier === 'free' && styles.activePlan]} 
            onPress={switchToFree}
          >
            <Text style={[styles.planButtonText, styles.freeButtonText]}>
              {currentTier === 'free' ? 'Current Plan' : 'Continue Free'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Premium Plan */}
        <View style={[styles.planCard, styles.premiumPlanCard]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
          </View>
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>� Premium Plan</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.planPrice}>$1.99</Text>
              <Text style={styles.planPeriod}>/week</Text>
            </View>
          </View>
          <View style={styles.planFeatures}>
            <Text style={styles.featureText}>✅ Everything in Free</Text>
            <Text style={styles.featureTextPremium}>✅ Unlimited AI analysis</Text>
            <Text style={styles.featureTextPremium}>✅ Advanced ingredient insights</Text>
            <Text style={styles.featureTextPremium}>✅ Missing ingredients detection</Text>
            <Text style={styles.featureTextPremium}>✅ Personalized recommendations</Text>
            <Text style={styles.featureTextPremium}>✅ Priority support</Text>
          </View>
          <TouchableOpacity 
            style={[styles.planButton, styles.premiumButton, currentTier === 'premium' && styles.activePlan]} 
            onPress={switchToPremium}
          >
            <Text style={[styles.planButtonText, styles.premiumButtonText]}>
              {currentTier === 'premium' ? '⭐ Active Plan' : '🚀 Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>

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

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginBottom: 15,
  },
  backText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 22,
  },
  currentStatusCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#d4edda',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
    alignItems: 'center',
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  currentStatusSubtext: {
    fontSize: 14,
    color: '#155724',
  },
  plansContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  freePlanCard: {
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  premiumPlanCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  planPeriod: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 2,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    lineHeight: 20,
  },
  featureTextPremium: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
  featureTextDisabled: {
    fontSize: 14,
    color: '#adb5bd',
    marginBottom: 8,
    lineHeight: 20,
  },
  planButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  freeButton: {
    backgroundColor: '#6c757d',
  },
  premiumButton: {
    backgroundColor: '#4CAF50',
  },
  activePlan: {
    backgroundColor: '#28a745',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  freeButtonText: {
    color: '#fff',
  },
  premiumButtonText: {
    color: '#fff',
  },
  benefitsFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitsList: {
    alignItems: 'center',
  },
  benefitItem: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
    textAlign: 'center',
  },
});

export default TestSubscriptionScreen;