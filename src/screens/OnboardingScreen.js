import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const nameValid = userName.trim().length > 0;

  const handleStart = async () => {
    const name = userName.trim();
    if (!name) return;
    await AsyncStorage.multiSet([
      ['userName', name],
      ['hasSeenOnboarding', 'true'],
      ['hasCompletedPaywall', 'true'],
    ]);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Header row */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Ionicons name="leaf" size={18} color="#4CAF50" />
              <Text style={s.logoText}>HealthyScan</Text>
            </View>
            <View style={s.stepBadge}>
              <Text style={s.stepText}>STEP 01 OF 01</Text>
            </View>
          </View>

          {/* Main content */}
          <View style={s.body}>
            <Text style={s.label}>PERSONALIZATION</Text>
            <Text style={s.headline}>What should we{'\n'}call you?</Text>
            <Text style={s.sub}>
              To personalize your wellness profile,{'\n'}let's start with your name.
            </Text>

            {/* Name input */}
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="First Name"
                placeholderTextColor="#3a3a3a"
                value={userName}
                onChangeText={setUserName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={30}
                onSubmitEditing={handleStart}
                selectionColor="#4CAF50"
              />
            </View>
          </View>

          {/* CTA button */}
          <View style={s.btnArea}>
            <TouchableOpacity
              style={[s.startBtn, !nameValid && s.startBtnDisabled]}
              disabled={!nameValid}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>LET'S START</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.encRow}>
              <Ionicons name="lock-closed" size={12} color="#3a3a3a" />
              <Text style={s.encTitle}>END-TO-END ENCRYPTION</Text>
            </View>
            <Text style={s.encSub}>
              Your data is secure, private, and never shared.
            </Text>
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, paddingTop: Platform.OS === 'ios' ? 58 : 42 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  stepBadge: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#111111',
  },
  stepText: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#a0a0a0' },

  /* Body */
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  label: {
    fontSize: 10, fontWeight: '600', color: '#a0a0a0',
    letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12,
  },
  headline: {
    fontSize: 40, fontWeight: '700', lineHeight: 46, letterSpacing: -1,
    color: '#ffffff', marginBottom: 16,
  },
  sub: { fontSize: 14, color: '#a0a0a0', lineHeight: 22, marginBottom: 40 },

  /* Input */
  inputWrap: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 18 : 14,
  },
  input: {
    fontSize: 20, fontWeight: '500', color: '#ffffff',
    letterSpacing: -0.3, padding: 0,
  },

  /* Button area */
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
  startBtnDisabled: { opacity: 0.3 },
  startBtnText: {
    fontSize: 11, fontWeight: '700', color: '#ffffff',
    letterSpacing: 3, textTransform: 'uppercase',
  },

  /* Footer */
  footer: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28, paddingTop: 20,
  },
  encRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  encTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#3a3a3a' },
  encSub: { fontSize: 11, color: '#2a2a2a', lineHeight: 16, textAlign: 'center' },
});

export default OnboardingScreen;