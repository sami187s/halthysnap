import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform, ActivityIndicator, Linking, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import iapManager from '../services/iapManager';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SimpleSubscriptionScreenNew = ({ navigation, route }) => {
  const fromOnboarding = route?.params?.fromOnboarding === true;
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [productPrice, setProductPrice] = useState('$0.00');
  const [initializingIAP, setInitializingIAP] = useState(true);



  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await checkExistingSubscription();
    
    // Only initialize IAP on iOS
    if (Platform.OS === 'ios') {
      await initializeIAP();
    } else {
      setInitializingIAP(false);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      // Free premium grant is permanent — check it first
      const freePremium = await AsyncStorage.getItem('freePremiumGranted');
      if (freePremium === 'true') {
        setCurrentTier('premium');
        console.log('✅ Free premium active');
        return;
      }

      const status = await iapManager.checkSubscriptionStatus();
      
      if (status.isPremium) {
        setCurrentTier('premium');
        console.log('✅ Premium active, expires:', new Date(status.expiresAt).toLocaleDateString());
      } else {
        setCurrentTier('free');
        if (status.expired) {
          console.log('ℹ️ Subscription expired');
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setCurrentTier('free');
    }
  };

  const initializeIAP = async () => {
    try {
      console.log('🔄 Initializing IAP...');
      const success = await iapManager.initialize();
      
      if (success) {
        // Keep IAP initialized but force fake paywall display price.
        console.log('✅ IAP ready (display price locked to $0.00)');
        setProductPrice('$0.00');
      } else {
        console.warn('⚠️ IAP initialization failed');
        setProductPrice('$0.00'); // UI fallback
      }
    } catch (error) {
      console.error('❌ IAP init error:', error);
      setProductPrice('$0.00'); // UI fallback
    } finally {
      setInitializingIAP(false);
    }
  };

  const checkCurrentSubscription = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      setCurrentTier(subscriptionType === 'Premium' ? 'premium' : 'free');
    } catch (error) {
      setCurrentTier('free');
    }
  };

  // Check network connectivity
  const checkNetworkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Network check error:', error);
      // If network check fails, allow to proceed (don't block user)
      return true;
    }
  };

  const handlePurchase = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Grant free premium permanently
      await AsyncStorage.setItem('freePremiumGranted', 'true');
      await AsyncStorage.multiSet([
        ['subscriptionType', 'Premium'],
        ['subscriptionExpiresAt', (Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toString()],
        ['lastSubscriptionCheck', Date.now().toString()],
        ['premiumTrialActivated', 'false'],
        ['premiumTrialUsedToday', '0'],
      ]);
      setCurrentTier('premium');
      setLoading(false);

      if (fromOnboarding) {
        // Complete the onboarding flow and go to the main app
        await AsyncStorage.setItem('hasCompletedPaywall', 'true');
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        Alert.alert('Premium Active', 'You now have unlimited scans and full premium access.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Free premium grant error:', error);
    }
  };

  const _handlePurchase_IAP_DISABLED = async () => {
    if (loading || initializingIAP) {
      console.log('⏳ Purchase blocked: loading=' + loading + ', initializing=' + initializingIAP);
      return;
    }

    // Android users - inform iOS only
    if (Platform.OS === 'android') {
      Alert.alert(
        '🍎 iOS Only Feature',
        'Premium subscriptions are currently only available on iOS devices through the Apple App Store.\n\nAndroid support coming soon!',
        [{ text: 'OK' }]
      );
      return;
    }

    // Web platform not supported
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Subscriptions are only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check network
    const hasNetwork = await checkNetworkConnection();
    if (!hasNetwork) return;

    setLoading(true);

    try {
      // Log purchase attempt
      console.log('🛒 Starting purchase flow...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔧 IAP Initialized:', !initializingIAP);
      
      const result = await iapManager.purchaseSubscription({
        onLoading: (isLoading) => setLoading(isLoading),
        onPurchaseSuccess: async () => {
          // Refresh subscription status
          await checkExistingSubscription();
          
          setLoading(false);
          setCurrentTier('premium');
          
          // Force app-wide refresh by clearing and resetting premium status
          const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year from now
          await AsyncStorage.multiSet([
            ['subscriptionType', 'Premium'],
            ['subscriptionExpiresAt', expiresAt.toString()],
            ['lastSubscriptionCheck', Date.now().toString()]
          ]);
          
          Alert.alert(
            'Premium Active! 🎉', 
            'All features unlocked!\nUnlimited AI analysis available',
            [{ 
              text: 'Start Scanning!', 
              onPress: () => {
                // Navigate and trigger full refresh
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home', params: { premiumActivated: true } }],
                });
              }
            }]
          );
        },
        onPurchaseFailure: (error) => {
          setLoading(false);
          console.error('❌ Purchase failed:', error);
          
          // Provide helpful error messages
          let errorTitle = 'Purchase Failed';
          let errorMessage = 'Please try again.';
          
          if (error.includes('Cannot connect to iTunes')) {
            errorTitle = 'iTunes Store Unavailable';
            errorMessage = 'Please check your internet connection and try again.';
          } else if (error.includes('Product not found')) {
            errorTitle = 'Product Unavailable';
            errorMessage = 'The subscription is currently unavailable. Please try again later.';
          } else if (error.includes('IAP not available')) {
            // Silent for Apple Review - don't show alert
            console.log('ℹ️ IAP not available - silent failure for review');
            return;
          } else if (error.includes('User cancelled')) {
            // User intentionally cancelled - no alert needed
            return;
          } else {
            errorMessage = error || 'An error occurred. Please try again.';
          }
          
          Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
        },
        onLoading: (isLoading) => {
          setLoading(isLoading);
        }
      });
      
      // Handle result if callbacks weren't triggered
      if (result) {
        if (result.silent) {
          setLoading(false);
          console.log('ℹ️ IAP not available - this is normal in review environment');
        } else if (result.success) {
          // Success already handled by callback
          console.log('✅ Purchase completed successfully');
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Purchase error:', error);
      if (error.message !== 'E_USER_CANCELLED' && !error.message.includes('cancelled')) {
        Alert.alert('Error', 'Unable to process purchase. Please try again.');
      }
    }
  };

  const handleRestorePurchases = async () => {
    if (loading || initializingIAP) return;

    if (Platform.OS === 'web') {
      Alert.alert('Web Preview', 'Restore purchases only works on iOS devices');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert(
        '🍎 iOS Only Feature',
        'Premium subscriptions are only available on iOS through the Apple App Store.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check network
    const hasNetwork = await checkNetworkConnection();
    if (!hasNetwork) return;

    setLoading(true);

    try {
      const result = await iapManager.restorePurchases({
        onRestoreSuccess: async () => {
          await checkExistingSubscription();
          setCurrentTier('premium');
          setLoading(false);
          
          // Force app-wide refresh
          const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000);
          await AsyncStorage.multiSet([
            ['subscriptionType', 'Premium'],
            ['subscriptionExpiresAt', expiresAt.toString()],
            ['lastSubscriptionCheck', Date.now().toString()]
          ]);
        },
        onRestoreFailed: () => {
          setLoading(false);
          // Alert is shown by iapManager
        },
        onLoading: (isLoading) => setLoading(isLoading)
      });
      
      // Result already handled by callbacks and alerts in iapManager
      setLoading(false);
      
      // Refresh subscription status
      await checkExistingSubscription();
    } catch (error) {
      setLoading(false);
      console.error('Restore error:', error);
      // Don't show alert - iapManager already shows alerts
    }
  };

  // If already premium
  if (currentTier === 'premium') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.header}>
          {fromOnboarding ? (
            <View style={{ width: 22 }} />
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={22} color="#a0a0a0" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={true}>

          <View style={styles.featuresCard}>
            <Text style={styles.cardTitle}>Your Premium Benefits</Text>
            {[
              { icon: 'infinite',            text: 'Unlimited scans (always active)' },
              { icon: 'sparkles',            text: 'AI ingredient analysis' },
              { icon: 'shield-checkmark',    text: 'Detect hidden dangers' },
              { icon: 'bulb',                text: 'Cleaner alternatives recommendations' },
              { icon: 'chatbubble-ellipses', text: 'Unlimited AI Nutritionist messages' },
              { icon: 'time',                text: 'Save results + full history access' },
              { icon: 'rocket',              text: 'New features coming soon' },
            ].map((item, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={item.icon} size={18} color="#4CAF50" />
                </View>
                <Text style={styles.featureRowText}>{item.text}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={async () => {
            if (fromOnboarding) {
              await AsyncStorage.setItem('hasCompletedPaywall', 'true');
              navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            } else {
              navigation.navigate('Home');
            }
          }} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Start Scanning Products</Text>
            <View style={styles.btnIconWrap}><Ionicons name="camera" size={22} color="rgba(255,255,255,0.9)" /></View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            activeOpacity={0.85}
            onPress={() => {
              Alert.alert('Manage Subscription', 'Choose an option:', [
                { text: 'Apple Subscriptions', onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions') },
                {
                  text: 'Cancel & Return to Free', style: 'destructive',
                  onPress: async () => {
                    Alert.alert('Cancel Subscription', 'Are you sure you want to cancel?', [
                      { text: 'No, Keep Premium', style: 'cancel' },
                      {
                        text: 'Yes, Cancel', style: 'destructive',
                        onPress: async () => {
                          const result = await iapManager.cancelSubscription();
                          if (result.success) {
                            await AsyncStorage.multiRemove(['subscriptionType','subscriptionExpiresAt','lastSubscriptionCheck']);
                            Alert.alert('Subscription Cancelled','You have been returned to the free tier.',[{ text:'OK', onPress: () => navigation.reset({ index:0, routes:[{ name:'Home' }] }) }]);
                            setCurrentTier('free');
                            await checkExistingSubscription();
                          }
                        }
                      }
                    ]);
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          >
            <Ionicons name="settings-outline" size={18} color="#a0a0a0" />
            <Text style={styles.outlineBtnText}>Manage Subscription</Text>
          </TouchableOpacity>

          <View style={styles.infoPill}>
            <Ionicons name="information-circle" size={18} color="#4CAF50" />
            <Text style={styles.infoPillText}>Your subscription is active. Enjoy unlimited features!</Text>
          </View>

        </ScrollView>
      </View>
    );
  }

  // Free tier view
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.header}>
        {fromOnboarding ? (
          <View style={{ width: 22 }} />
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#a0a0a0" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={true}>

        <View style={styles.priceCard}>
          <Text style={styles.planTitle}>HealthyScan Premium</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>{productPrice}</Text>
          </View>
          <Text style={styles.priceNote}>Promotional access - no payment required</Text>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>What's included:</Text>
          {[
            { icon: 'sparkles',            text: 'AI ingredient analysis' },
            { icon: 'shield-checkmark',    text: 'Detect hidden dangers' },
            { icon: 'infinite',            text: 'Unlimited scans' },
            { icon: 'bulb',                text: 'Smart recommendations' },
            { icon: 'chatbubble-ellipses', text: 'AI chatbot assistant' },
            { icon: 'time',                text: 'History & saved products' },
            { icon: 'rocket',              text: 'New features coming soon' },
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={item.icon} size={18} color="#4CAF50" />
              </View>
              <Text style={styles.featureRowText}>{item.text}</Text>
              <Ionicons name="checkmark" size={18} color="#4CAF50" />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Continue To Premium</Text>
              <View style={styles.btnIconWrap}><Ionicons name="diamond" size={22} color="rgba(255,255,255,0.9)" /></View>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Header */
  header: {
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240,240,240,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /* Scroll */
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 110,
  },

  /* Status Card (premium active) */
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(76,175,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Price Card (free tier) */
  priceCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e0e0e0',
    marginBottom: 14,
    letterSpacing: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  priceAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 4,
    fontWeight: '600',
  },
  priceNote: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },

  /* Features Card */
  featuresCard: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(240,240,240,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(76,175,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureRowText: {
    flex: 1,
    fontSize: 14,
    color: '#d0d0d0',
    fontWeight: '500',
  },

  /* Primary Button */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 18,
    paddingLeft: 28,
    paddingRight: 16,
    marginBottom: 12,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btnIconWrap: {
    width: 42,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    marginLeft: 10,
  },
  btnDisabled: { opacity: 0.5 },

  /* Outline Button */
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a0a0a0',
  },

  /* Text Button */
  textBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  textBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },

  /* Info Pill */
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.07)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,80,0.2)',
    gap: 10,
  },
  infoPillText: {
    flex: 1,
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    lineHeight: 19,
  },

  /* Legal */
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  legalLink: {
    fontSize: 12,
    color: '#444444',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
    color: '#333333',
    marginHorizontal: 5,
  },
});

export default SimpleSubscriptionScreenNew;
