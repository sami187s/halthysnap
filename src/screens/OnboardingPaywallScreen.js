import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEATURES = [
  { icon: 'infinite',             label: 'Unlimited scans' },
  { icon: 'sparkles',             label: 'AI ingredient analysis' },
  { icon: 'shield-checkmark',     label: 'Detect hidden dangers' },
  { icon: 'bulb',                 label: 'Smart recommendations' },
  { icon: 'chatbubble-ellipses',  label: 'AI chatbot assistant' },
  { icon: 'time',                 label: 'History & saved products' },
  { icon: 'rocket',               label: 'New features coming soon' },
];

export default function OnboardingPaywallScreen({ navigation }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStartFree = async () => {
    await AsyncStorage.setItem('hasCompletedPaywall', 'true');
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Ionicons name="leaf" size={18} color="#4CAF50" />
              <Text style={s.logoText}>HealthyScan</Text>
            </View>
            <View style={s.stepBadge}>
              <Text style={s.stepText}>STEP 02 OF 02</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={s.body}>
            <Text style={s.label}>YOUR PLAN</Text>
            <Text style={s.headline}>Everything,{'\n'}free.</Text>
            <Text style={s.sub}>
              Full access to every premium feature —{'\n'}at no charge, forever.
            </Text>
          </View>

          {/* Pricing card */}
          <View style={s.pricingCard}>
            <Text style={s.priceLabel}>YOUR PLAN</Text>
            <View style={s.priceRow}>
              <Text style={s.priceCurrency}>$</Text>
              <Text style={s.priceAmount}>0</Text>
              <Text style={s.priceDecimal}>.00</Text>
            </View>
            <Text style={s.pricePeriod}>Free · Forever</Text>
          </View>

          {/* Feature list */}
          <View style={s.featureCard}>
            <Text style={s.featureCardTitle}>What's included</Text>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={[
                  s.featureRow,
                  i < FEATURES.length - 1 && s.featureRowBorder,
                ]}
              >
                <View style={s.featureIconWrap}>
                  <Ionicons name={f.icon} size={17} color="#4CAF50" />
                </View>
                <Text style={s.featureText}>{f.label}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={s.btnArea}>
            <TouchableOpacity
              style={s.startBtn}
              onPress={handleStartFree}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>START FOR FREE</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.encRow}>
              <Ionicons name="lock-closed" size={12} color="#3a3a3a" />
              <Text style={s.encTitle}>NO CREDIT CARD REQUIRED</Text>
            </View>
            <Text style={s.encSub}>
              Your data is secure, private, and never shared.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingBottom: 40,
  },

  /* Header — matches OnboardingScreen exactly */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  stepBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#111111',
  },
  stepText: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#a0a0a0' },

  /* Body */
  body: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  label: {
    fontSize: 10, fontWeight: '600', color: '#a0a0a0',
    letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12,
  },
  headline: {
    fontSize: 40, fontWeight: '700', lineHeight: 46, letterSpacing: -1,
    color: '#ffffff', marginBottom: 16,
  },
  sub: { fontSize: 14, color: '#a0a0a0', lineHeight: 22 },

  /* Pricing card */
  pricingCard: {
    marginHorizontal: 24,
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  priceLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 3,
    color: '#4CAF50', marginBottom: 8,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  priceCurrency: {
    fontSize: 22, fontWeight: '700', color: '#ffffff', marginTop: 8,
  },
  priceAmount: {
    fontSize: 72, fontWeight: '800', color: '#ffffff',
    lineHeight: 80, letterSpacing: -2,
  },
  priceDecimal: {
    fontSize: 28, fontWeight: '700', color: '#ffffff', marginTop: 16,
  },
  pricePeriod: {
    fontSize: 13, color: '#a0a0a0', marginTop: 4, letterSpacing: 0.3,
  },

  /* Feature list */
  featureCard: {
    marginHorizontal: 24,
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureCardTitle: {
    fontSize: 9, fontWeight: '700', color: '#a0a0a0',
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(76,175,80,0.12)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  featureText: { flex: 1, fontSize: 15, color: '#ffffff', fontWeight: '500' },

  /* Button area — matches OnboardingScreen */
  btnArea: { paddingHorizontal: 24, paddingBottom: 16 },
  startBtn: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: {
    fontSize: 11, fontWeight: '700', color: '#ffffff',
    letterSpacing: 3, textTransform: 'uppercase',
  },

  /* Footer */
  footer: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28, paddingTop: 4,
  },
  encRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  encTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#3a3a3a' },
  encSub: { fontSize: 11, color: '#2a2a2a', lineHeight: 16, textAlign: 'center' },
});
