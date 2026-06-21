import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../hooks/useSubscription';
import ScreenWrapper from '../components/shared/ScreenWrapper';
import ScreenHeader from '../components/shared/ScreenHeader';

export default function PremiumFeaturesScreen({ navigation }) {
  const { isActive, refreshSubscription } = useSubscription();

  const handleCancelSubscription = async () => {
    const doCancel = async () => {
      await AsyncStorage.multiRemove([
        'hasSeenOnboarding',
        'hasCompletedPaywall',
        'userName',
        'subscriptionType',
        'subscriptionExpiresAt',
        'originalTransactionId',
        'premiumTrialActivated',
        'premiumTrialUsedToday',
      ]);
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel subscription? This will reset the app back to the beginning.')) {
        await doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel? This will reset the app back to the beginning.',
        [
          { text: 'Keep Subscription', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  const handleManageSubscription = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
      default: 'https://apps.apple.com/account/subscriptions',
    });
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open subscription management:', err);
    });
  };

  const premiumFeatures = [
    { icon: 'infinite', text: 'Unlimited scans' },
    { icon: 'sparkles', text: 'AI ingredient analysis' },
    { icon: 'shield-checkmark', text: 'Detect hidden dangers' },
    { icon: 'bulb', text: 'Smart recommendations' },
    { icon: 'chatbubble-ellipses', text: 'AI chatbot assistant' },
    { icon: 'time', text: 'History & saved products' },
    { icon: 'rocket', text: 'New features coming soon' },
  ];

  return (
    <ScreenWrapper>
      <ScreenHeader title="Premium" onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
        }
      }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={true}>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <Ionicons name="diamond" size={36} color="#2E7D32" />
          </View>
          <Text style={styles.statusTitle}>Premium Active</Text>
          <Text style={styles.statusSubtitle}>You have unlimited access to all features</Text>
        </View>

        {/* Features Card */}
        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>Your Premium Benefits</Text>
          {premiumFeatures.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={item.icon} size={18} color="#2E7D32" />
              </View>
              <Text style={styles.featureRowText}>{item.text}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            </View>
          ))}
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Start Scanning Products</Text>
          <View style={styles.btnIconWrap}>
            <Ionicons name="camera" size={22} color="rgba(255,255,255,0.9)" />
          </View>
        </TouchableOpacity>

        {/* Manage Button */}
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={handleManageSubscription}
          activeOpacity={0.85}
        >
          <Ionicons name="settings-outline" size={18} color="#2E7D32" />
          <Text style={styles.outlineBtnText}>Manage Subscription</Text>
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={refreshSubscription}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={18} color="#2E7D32" />
          <Text style={styles.outlineBtnText}>Refresh Status</Text>
        </TouchableOpacity>

        {/* Cancel Subscription */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelSubscription}
          activeOpacity={0.85}
        >
          <Ionicons name="close-circle-outline" size={18} color="#F44336" />
          <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
        </TouchableOpacity>

        {/* Info Pill */}
        <View style={styles.infoPill}>
          <Ionicons name="information-circle" size={18} color="#2E7D32" />
          <Text style={styles.infoPillText}>
            Your subscription is active. Enjoy unlimited scans and advanced features!
          </Text>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 110,
  },

  /* Status Card */
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#A5D6A7',
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 21,
  },

  /* Features Card */
  featuresCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureRowText: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    fontWeight: '500',
  },

  /* Primary Button */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B7D36',
    borderRadius: 28,
    paddingVertical: 18,
    paddingLeft: 28,
    paddingRight: 16,
    marginBottom: 12,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  btnIconWrap: {
    width: 48,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginLeft: 10,
  },

  /* Outline Button */
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },

  /* Cancel Button */
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.35)',
    backgroundColor: 'rgba(244,67,54,0.07)',
    marginTop: 8,
    marginBottom: 4,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },

  /* Info Pill */
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46,125,50,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: 10,
  },
  infoPillText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    lineHeight: 19,
  },
});