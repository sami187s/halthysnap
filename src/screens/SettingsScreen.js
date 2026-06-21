import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { icon: 'time-outline',               label: 'Scan History', route: 'History' },
  { icon: 'information-circle-outline', label: 'About',        route: 'About'   },
  { icon: 'book-outline',               label: 'Sources',      route: 'Sources' },
];

const SettingsScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const t = theme;

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

        {/* Cancel Subscription */}
        <Text style={[st.sectionLabel, { color: t.textDim }]}>ACCOUNT</Text>
        <View style={[st.section, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <TouchableOpacity
            style={st.row}
            onPress={handleCancelSubscription}
            activeOpacity={0.7}
          >
            <View style={st.rowLeft}>
              <View style={[st.iconBox, { backgroundColor: '#1a0000', borderColor: '#3a0000' }]}>
                <Ionicons name="close-circle-outline" size={20} color="#F44336" />
              </View>
              <Text style={[st.rowLabel, { color: '#F44336' }]}>Cancel Subscription</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.chevron} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[st.version, { color: t.textDim }]}>HealthyScan v3.3.1</Text>

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
