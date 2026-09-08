import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { icon: 'ribbon-outline',             label: 'Top Products', route: 'VeeList' },
  { icon: 'information-circle-outline', label: 'About',        route: 'About'   },
  { icon: 'book-outline',               label: 'Sources',      route: 'Sources' },
];

const DEV_MODE_KEY = '@vee_dev_mode';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const t = theme;
  const [isDevMode, setIsDevMode] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(DEV_MODE_KEY).then(v => setIsDevMode(v === 'true'));
  }, []);

  const handleVersionTap = async () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      const next = !isDevMode;
      await AsyncStorage.setItem(DEV_MODE_KEY, next ? 'true' : 'false');
      setIsDevMode(next);
      Alert.alert(
        next ? '🔓 Developer Mode ON' : '🔒 Developer Mode OFF',
        next ? 'Trophy buttons are now visible. You can save products to the Best section.' : 'Trophy buttons are now hidden from users.',
      );
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />

      {/* Header */}
      <View style={[st.header, { backgroundColor: t.headerBg, borderBottomColor: t.headerBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={t.textMuted} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: t.text }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Upgrade */}
        <Text style={[st.sectionLabel, { color: t.textDim }]}>MEMBERSHIP</Text>
        <View style={[st.section, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <TouchableOpacity
            style={st.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Subscription')}
          >
            <View style={st.rowLeft}>
              <View style={[st.iconBox, { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7' }]}>
                <Ionicons name="diamond" size={20} color="#067A4F" />
              </View>
              <View>
                <Text style={[st.rowLabel, { color: t.text }]}>Upgrade to Premium</Text>
                <Text style={[st.rowSub, { color: t.textDim }]}>Unlock all features — $2.99/week</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.chevron} />
          </TouchableOpacity>
        </View>

        {/* Navigation items */}
        <Text style={[st.sectionLabel, { color: t.textDim }]}>GENERAL</Text>
        <View style={[st.section, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          {NAV_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              style={[
                st.row,
                i < NAV_ITEMS.length - 1 && [st.rowBorder, { borderBottomColor: t.borderRow }],
              ]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={st.rowLeft}>
                <View style={[st.iconBox, { backgroundColor: t.bgIcon, borderColor: t.border }]}>
                  <Ionicons name={item.icon} size={20} color={t.textMuted} />
                </View>
                <Text style={[st.rowLabel, { color: t.text }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.chevron} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Rate Us */}
        <Text style={[st.sectionLabel, { color: t.textDim }]}>SUPPORT</Text>
        <View style={[st.section, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <TouchableOpacity
            style={st.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://apps.apple.com/us/app/vee-product-check/id6751061358')}
          >
            <View style={st.rowLeft}>
              <View style={[st.iconBox, { backgroundColor: '#fff8e1', borderColor: '#fde68a' }]}>
                <Ionicons name="star" size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={[st.rowLabel, { color: t.text }]}>Rate Us</Text>
                <Text style={[st.rowSub, { color: t.textDim }]}>Enjoy the app? Leave a review!</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.chevron} />
          </TouchableOpacity>
        </View>

        {/* Footer — tap 5× to toggle dev mode */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
          <Text style={[st.version, { color: t.textDim }]}>
            Vee v3.3.1{isDevMode ? '  🔓' : ''}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
});

export default SettingsScreen;
