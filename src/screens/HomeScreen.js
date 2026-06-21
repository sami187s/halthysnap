import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
  Modal,
  Linking,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { smartNavigateToResults } from '../utils/smartNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScanContext } from '../contexts/ScanContext';
import { useTheme } from '../contexts/ThemeContext';
import SmartPostScanHandler, { useSmartPostScan } from '../components/SmartPostScanHandler';
import ScanResultPreview from '../components/ScanResultPreview';
import { getHistory, getHistoryStats } from '../utils/historyManager';
import {
  createFadeAnimation,
  createSlideAnimation,
  createScaleAnimation,
} from '../utils/luxuryAnimations';
import { checkAndResetDailyCounters } from '../utils/dailyReset';

// Safe imports with fallbacks
let AlternativeBarcodeScanner;
try {
  AlternativeBarcodeScanner = require('../components/AlternativeBarcodeScanner').default;
} catch (error) {
  AlternativeBarcodeScanner = ({ onClose }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
        Camera not available on this device
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 }}
        onPress={onClose}
      >
        <Text style={{ color: '#fff', fontSize: 16 }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const DAILY_SCAN_LIMIT = 2;

const HomeScreen = ({ navigation, route }) => {
  const { setIsScanning } = useScanContext();
  const { theme, isDark } = useTheme();
  const { showPostScan, scanData, handleScanComplete, handleClose } = useSmartPostScan();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewBarcode, setPreviewBarcode] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [scanMode, setScanMode] = useState('food');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [remainingScans, setRemainingScans] = useState(0);
  const [showTrialCompleteModal, setShowTrialCompleteModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [averageScore, setAverageScore] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.95)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let loadTimer;
    let entranceAnim;

    loadTimer = setTimeout(() => {
      setIsLoaded(true);

      entranceAnim = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]);

      entranceAnim.start();
    }, 100);

    getBarCodeScannerPermissions();
    checkAndResetDailyCounters();
    checkSubscriptionStatus();
    loadUserName();
    loadProfileData();

    return () => {
      if (loadTimer) clearTimeout(loadTimer);
      if (entranceAnim) entranceAnim.stop();
      setIsScanning(false);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      checkSubscriptionStatus();
      loadProfileData();

      if (route.params?.premiumActivated) {
        Alert.alert(
          '\uD83C\uDF89 Premium Activated!',
          'You now have unlimited scans and AI-powered analysis!',
          [{ text: 'Got it!', style: 'default' }]
        );
        navigation.setParams({ premiumActivated: undefined });
      }

      if (route.params?.startScanning) {
        navigation.setParams({ startScanning: undefined });
        setTimeout(() => startScanning('food'), 100);
      }

      return () => {
        if (!scanning) {
          setIsScanning(false);
        }
      };
    }, [scanning, setIsScanning, route.params])
  );

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name || 'there');
    } catch {
      setUserName('there');
    }
  };

  const loadProfileData = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('scan_history');
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      if (history.length > 0) {
        setTotalScans(history.length);
        const avg = Math.round(history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length);
        setAverageScore(avg);
        setRecentScans(history.slice(0, 5));
        const saved = history.filter(item => item.score >= 70).slice(0, 4);
        setSavedProducts(saved);
      } else {
        setTotalScans(0);
        setAverageScore(0);
        setRecentScans([]);
        setSavedProducts([]);
      }
    } catch {
      // Silently fail
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const isPremiumActive = subscriptionType === 'Premium';

      if (isPremiumActive) {
        setIsPremium(true);
        setIsTrialMode(false);
        setRemainingScans(999);
        return;
      }

      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      const used = usedStr ? parseInt(usedStr) : 0;
      const remaining = Math.max(0, DAILY_SCAN_LIMIT - used);

      if (subscriptionType !== 'Trial') {
        await AsyncStorage.multiSet([
          ['subscriptionType', 'Trial'],
          ['premiumTrialActivated', 'true'],
        ]);
      }

      setIsPremium(false);
      setIsTrialMode(true);
      setRemainingScans(remaining);
    } catch {
      setIsPremium(false);
      setIsTrialMode(true);
      setRemainingScans(DAILY_SCAN_LIMIT);
    }
  };

  const showSubscriptionOptions = () => {
    navigation.navigate('Subscription');
  };

  const getBarCodeScannerPermissions = async () => {
    try {
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  };

  const navigateToAbout = () => {
    try {
      navigation.navigate('About');
    } catch {}
  };

  const startScanning = async (mode = 'food') => {
    if (hasPermission === null) {
      Alert.alert('Permission Required', 'Camera permission is required to scan barcodes.');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('No Access', 'Camera access is not available on this device.');
      return;
    }
    setScanMode(mode);
    setScanning(true);
    setIsScanning(true);
    setScanned(false);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (showPreview && data !== previewBarcode) {
      setPreviewBarcode(data);
      return;
    }
    if (scanned) return;
    setScanned(true);
    try {
      setPreviewBarcode(data);
      setShowPreview(true);
    } catch {
      Alert.alert('Scan Error', 'Could not process the scanned product. Please try again.', [
        { text: 'Search Manually', onPress: () => { setScanned(false); navigation.navigate('Search'); } },
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleScannerClose = () => {
    setScanning(false);
    setIsScanning(false);
    setScanned(false);
    setShowPreview(false);
    setPreviewBarcode(null);
  };

  const handlePreviewViewDetails = async (barcode, productType) => {
    setScanning(false);
    setIsScanning(false);
    setShowPreview(false);
    setPreviewBarcode(null);
    setScanned(false);
    try {
      if (productType === 'food') {
        navigation.navigate('Results', { barcode });
      } else {
        navigation.navigate('CosmeticResults', { barcode });
      }
    } catch {
      Alert.alert('Error', 'Failed to load product details.');
    }
  };

  const handlePreviewScanAgain = () => {
    setShowPreview(false);
    setPreviewBarcode(null);
    setScanned(false);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewBarcode(null);
    setScanning(false);
    setIsScanning(false);
    setScanned(false);
  };

  const handleContinueFreeScan = async (data) => {
    try {
      await smartNavigateToResults(navigation, data);
    } catch {
      Alert.alert('Error', 'Failed to process scan. Please try again.');
    }
  };

  const handleUpgradeSelected = () => {
    navigation.navigate('Subscription');
  };

  const progressWidth = isPremium ? 1 : remainingScans / DAILY_SCAN_LIMIT;

  // Loading state
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#131313', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Path d="M25 5C18 8 10 18 10 28C10 38 18 45 25 45C32 45 40 38 40 28C40 18 32 8 25 5Z" fill="#2E7D32" />
          <Path d="M18 10C13 16 10 24 13 32" stroke="#4CAF50" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Svg>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: 1, textTransform: 'uppercase' }}>HealthyScan</Text>
        <Text style={{ fontSize: 13, color: '#919191', fontWeight: '500' }}>Loading...</Text>
      </View>
    );
  }

  // Scanner fullscreen
  if (scanning) {
    return (
      <View style={{ flex: 1 }}>
        <AlternativeBarcodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          onClose={handleScannerClose}
          continuousScan={true}
        />
        <ScanResultPreview
          barcode={previewBarcode}
          visible={showPreview}
          onViewDetails={handlePreviewViewDetails}
          onScanAgain={handlePreviewScanAgain}
          onClose={handlePreviewClose}
        />
      </View>
    );
  }

  // =========================================
  // Main Home Screen — Wellness Sanctuary
  // =========================================
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* -- FIXED HEADER -- */}
      <View style={[noir.header, { backgroundColor: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(245,245,245,0.95)', borderBottomColor: theme.headerBorder }]}>
        <View style={noir.headerLeft}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Settings'); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[noir.headerTitle, { color: theme.text }]}>Wellness Sanctuary</Text>
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert('Coming Soon', 'Profile is coming in a future update!', [{ text: 'OK' }]); }}
          style={[noir.avatarBtn, { backgroundColor: theme.bgIcon, borderColor: theme.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={noir.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={noir.greeting}>
          <Text style={[noir.greetingLabel, { color: theme.textMuted }]}>WELCOME BACK</Text>
          <Text style={[noir.greetingName, { color: theme.text }]}>Hey, {userName}!</Text>
        </View>

        {/* Cards */}
        <View style={noir.cardsSection}>

          {/* Food Card */}
          <TouchableOpacity
            style={noir.card}
            activeOpacity={0.92}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('food'); }}
          >
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVN8OqpMJu8XEkG4bT4rEO2ih5Ywq65AVsDoRO4y7d82Z7D5NBYTMS5P3Ed_Nitk_tLK2dA3q0HNJOlHt158vjTJKMWU_HZ4aux5whdjhi-RXshv_lCpktOOwet1j2yoltSPJgZ0rC4NSFXYCyFLLgB7-kqWksO5FgmW2wSjgy8yjB1NEwvhZmRvIgfj9UvgBaT5XxyxLEAIXEvPEeDQy1I8Hcjh9VYWUJrS87bfvn1PpyLuxhRAlovOyfFBEM0CcMAB8s26wRnkJp' }}
              style={noir.cardBgImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.35)', '#0a0a0a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={noir.cardContent}>
              <View style={noir.cardTop}>
                <Text style={noir.cardTitle}>Scan Food</Text>
                <Text style={noir.cardSubtitle}>Instant nutritional analysis</Text>
              </View>
              <TouchableOpacity
                style={noir.cardBtn}
                activeOpacity={0.85}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('food'); }}
              >
                <Text style={noir.cardBtnText}>SCAN NOW</Text>
                <Ionicons name="barcode-outline" size={14} color="#000000" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Cosmetic Card */}
          <TouchableOpacity
            style={noir.card}
            activeOpacity={0.92}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('cosmetic'); }}
          >
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOHUDvv7KLGJw8CTEt1hg7e4s50Ji4bdnV3ekfdUOfRtyRBTDgoLSImXCobPS78VAuggAKnI9e0K3RC0I-iU_NofS63UfoqPoimV2LZUQ71VXU4MhKAa_D69wnebHWdPpEJO6ZnMGcT8tJVSfrkWFaC1A3PjWVqoC7q-qjCh57gwnn8tyRB1gAh1o3eCWxZS81CICzPm1pD2Jjek7yXxf-nUIJkeFAhwUJsEEClZ0e86esK53KaIkZfrNK6FpZ9Q8tfpeKvubLu722' }}
              style={noir.cardBgImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.35)', '#0a0a0a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={noir.cardContent}>
              <View style={noir.cardTop}>
                <Text style={noir.cardTitle}>Scan Cosmetic</Text>
                <Text style={noir.cardSubtitle}>Ingredient safety check</Text>
              </View>
              <TouchableOpacity
                style={noir.cardBtn}
                activeOpacity={0.85}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('cosmetic'); }}
              >
                <Text style={noir.cardBtnText}>SCAN NOW</Text>
                <Ionicons name="barcode-outline" size={14} color="#000000" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

        </View>



      </ScrollView>

      {/* Post-Scan Handler */}
      <SmartPostScanHandler
        navigation={navigation}
        scanData={scanData}
        onContinueFree={handleContinueFreeScan}
        onUpgradeSelected={handleUpgradeSelected}
        visible={showPostScan}
        onClose={handleClose}
      />

      {/* Trial Complete Modal */}
      <Modal
        visible={showTrialCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTrialCompleteModal(false)}
      >
        <View style={hs.modalOverlay}>
          <Animated.View style={[hs.modalWrap, { transform: [{ scale: modalScale }] }]}>
            <View style={hs.modalBody}>
              <View style={hs.modalIcon}>
                <Ionicons name="diamond" size={36} color="#4CAF50" />
              </View>
              <Text style={hs.modalTitle}>Daily Limit Reached</Text>
              <Text style={hs.modalMsg}>
                You have used all {DAILY_SCAN_LIMIT} daily scans.{'\n'}
                They will reset tomorrow, or upgrade for unlimited.
              </Text>
              <View style={hs.modalFeatures}>
                {['Unlimited AI Analysis', 'Advanced Health Insights', 'AI Ingredient Expert'].map((f) => (
                  <View key={f} style={hs.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={hs.modalFeatureLabel}>{f}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={hs.modalUpgradeBtn}
                activeOpacity={0.85}
                onPress={() => { setShowTrialCompleteModal(false); showSubscriptionOptions(); }}
              >
                <Text style={hs.modalUpgradeTxt}>Continue to Premium</Text>
              </TouchableOpacity>
              <TouchableOpacity style={hs.modalLaterBtn} onPress={() => setShowTrialCompleteModal(false)}>
                <Text style={hs.modalLaterTxt}>Maybe Later</Text>
              </TouchableOpacity>
              <View style={hs.modalLegal}>
                <Text style={hs.modalLegalPrice}>$0.00/week - Promotional access</Text>
                <View style={hs.modalLegalRow}>
                  <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/vee-privacy-policy').catch(() => {})}>
                    <Text style={hs.modalLegalLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <Text style={hs.modalLegalDot}> | </Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {})}>
                    <Text style={hs.modalLegalLink}>Terms of Use</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

/* =================================================
   STYLES — Wellness Sanctuary HomeScreen
   ================================================= */
const noir = StyleSheet.create({
  /* ── Header ── */
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.8)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240,240,240,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: { padding: 4 },

  /* ── Scroll ── */
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 110 : 90,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  /* ── Greeting ── */
  greeting: {
    marginBottom: 32,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a0a0a0',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },

  /* ── Cards ── */
  cardsSection: {
    marginBottom: 32,
  },
  card: {
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  cardContent: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  cardTop: {
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a0a0a0',
    letterSpacing: 1,
  },
  cardBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /* ── Recent Activity ── */
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a0a0a0',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  activitySeeAll: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

/* =================================================
   STYLES � Modal (kept from old design)
   ================================================= */
const hs = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalWrap: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalBody: {
    backgroundColor: '#1b1b1b',
    padding: 28,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#474747',
  },
  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1f1f1f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e2e2e2',
    marginBottom: 10,
  },
  modalMsg: {
    fontSize: 14,
    color: '#c6c6c6',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  modalFeatures: {
    width: '100%',
    backgroundColor: '#131313',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#474747',
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalFeatureLabel: {
    fontSize: 13,
    color: '#e2e2e2',
    fontWeight: '500',
  },
  modalUpgradeBtn: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalUpgradeTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1c1c',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalLaterBtn: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  modalLaterTxt: {
    fontSize: 13,
    color: '#c6c6c6',
    fontWeight: '500',
  },
  modalLegal: {
    alignItems: 'center',
    gap: 4,
  },
  modalLegalPrice: {
    fontSize: 11,
    color: '#919191',
    fontWeight: '500',
  },
  modalLegalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLegalLink: {
    fontSize: 11,
    color: '#919191',
    textDecorationLine: 'underline',
  },
  modalLegalDot: {
    fontSize: 11,
    color: '#919191',
  },
});

export default HomeScreen;