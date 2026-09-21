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
import { getQuota } from '../utils/scanQuota';

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
        style={{ backgroundColor: '#067A4F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 }}
        onPress={onClose}
      >
        <Text style={{ color: '#fff', fontSize: 16 }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const DAILY_SCAN_LIMIT = 5; // legacy display counter; real enforcement is in utils/scanQuota.js

// Scan-card height: sized so the greeting + two cards fill the screen down to
// the tab bar, instead of the old fixed 192px leaving a visible empty gap
// underneath them on most phones.
const HOME_HEADER_APPROX  = Platform.OS === 'ios' ? 96 : 78;
const HOME_GREETING_APPROX = 82;
const HOME_TABBAR_APPROX   = 96; // tab bar height + safe-area/scroll-padding clearance
const HOME_CARD_GAP        = 16;
const HOME_CARDS_AVAILABLE = screenHeight - HOME_HEADER_APPROX - HOME_GREETING_APPROX - HOME_TABBAR_APPROX - HOME_CARD_GAP;
const SCAN_CARD_H = Math.max(192, Math.min(260, HOME_CARDS_AVAILABLE / 2));

const LOGO_IMG = require('../../assets/leaf-logo.png');
// Bundled with the app (were loaded from a third-party host, so the cards went blank offline).
const SCAN_FOOD_IMG = require('../../assets/home-scan-food.jpg');
const SCAN_COSMETIC_IMG = require('../../assets/home-scan-cosmetic.jpg');

// Wraps any touchable in a spring scale-down for tap feedback (~0.96 on press).
const AnimatedTouchable = ({ children, style, onPress, scaleTo = 0.96, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <TouchableOpacity activeOpacity={0.85} onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

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
  // Free-tier daily scan quota — null = unlimited (paid / referral unlock)
  const [foodLeft, setFoodLeft] = useState(null);
  const [cosmeticLeft, setCosmeticLeft] = useState(null);

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
    refreshQuota();
    loadUserName();

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
      refreshQuota();

      if (route.params?.premiumActivated) {
        Alert.alert(
          '\uD83C\uDF89 Premium Activated!',
          'You now have unlimited scans!',
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
    navigation.navigate('Subscription', { reason: 'limit' });
  };

  const refreshQuota = async () => {
    try {
      const [food, cosmetic] = await Promise.all([getQuota('food'), getQuota('cosmetic')]);
      setFoodLeft(food.unlimited ? null : food.remaining);
      setCosmeticLeft(cosmetic.unlimited ? null : cosmetic.remaining);
    } catch {
      setFoodLeft(null);
      setCosmeticLeft(null);
    }
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

  const renderQuotaBadge = (left) => {
    if (left === null || left === undefined) return null;
    const done = left <= 0;
    return (
      <View style={noir.quotaBadge}>
        <Ionicons name={done ? 'lock-closed' : 'flash-outline'} size={11} color="#FFFFFF" />
        <Text style={noir.quotaBadgeText}>{done ? 'Limit reached' : `${left} left today`}</Text>
      </View>
    );
  };

  const startScanning = async (mode = 'food') => {
    // Free-tier daily quota: block before opening the camera when exhausted.
    const left = mode === 'cosmetic' ? cosmeticLeft : foodLeft;
    if (left !== null && left <= 0) {
      navigation.navigate('Subscription', { reason: 'limit' });
      return;
    }
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

  // Free-tier quota used up: leave the scanner and show the paywall.
  const handlePreviewBlocked = () => {
    setShowPreview(false);
    setPreviewBarcode(null);
    setScanning(false);
    setIsScanning(false);
    setScanned(false);
    refreshQuota();
    navigation.navigate('Subscription', { reason: 'limit' });
  };

  const handleContinueFreeScan = async (data) => {
    try {
      await smartNavigateToResults(navigation, data);
    } catch {
      Alert.alert('Error', 'Failed to process scan. Please try again.');
    }
  };

  const handleUpgradeSelected = () => {
    navigation.navigate('Subscription', { reason: 'limit' });
  };

  // Loading state
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBFBF9', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Path d="M25 5C18 8 10 18 10 28C10 38 18 45 25 45C32 45 40 38 40 28C40 18 32 8 25 5Z" fill="#067A4F" />
          <Path d="M18 10C13 16 10 24 13 32" stroke="#067A4F" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Svg>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1C1C1E', letterSpacing: 1, textTransform: 'uppercase' }}>Vee</Text>
        <Text style={{ fontSize: 13, color: '#6E6E73', fontWeight: '500' }}>Loading...</Text>
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
          onBlocked={handlePreviewBlocked}
        />
      </View>
    );
  }

  // =========================================
  // Main Home Screen — Wellness Sanctuary
  // =========================================
  return (
    <View style={{ flex: 1, backgroundColor: '#FBFBF9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />

      {/* -- HEADER -- */}
      <View style={noir.header}>
        <TouchableOpacity
          style={noir.headerLeft}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={noir.logoChip}>
            <Image source={LOGO_IMG} style={noir.logoImg} resizeMode="cover" />
          </View>
          <Text style={noir.headerBrand}>Vee</Text>
        </TouchableOpacity>
        <View style={noir.headerRight}>
          <TouchableOpacity
            style={noir.iconBtn}
            onPress={() => navigation.navigate('Profile')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={20} color="#3B5B47" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={noir.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={noir.greeting}>
          <Text style={noir.greetingLabel}>Welcome back</Text>
          <Text style={noir.greetingHeadline}>Hey, let's scan!</Text>
        </View>

        {/* Scan Food card */}
        <AnimatedTouchable
          style={noir.scanCard}
          scaleTo={0.98}
          onPress={() => startScanning('food')}
        >
          <ImageBackground source={SCAN_FOOD_IMG} style={{ flex: 1 }} resizeMode="cover">
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="barcode-outline" size={40} color="rgba(255,255,255,0.45)" style={noir.scanCardMotif} />
            {renderQuotaBadge(foodLeft)}
            <View style={noir.scanCardBody}>
              <View>
                <Text style={noir.scanCardTitle}>Scan Food</Text>
                <Text style={noir.scanCardSubtitle}>Instant nutritional analysis</Text>
              </View>
              <View style={noir.scanPill}>
                <Text style={noir.scanPillText}>SCAN NOW</Text>
                <View style={noir.scanPillIcon}>
                  <Ionicons name="scan" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </ImageBackground>
        </AnimatedTouchable>

        {/* Scan Cosmetic card */}
        <AnimatedTouchable
          style={noir.scanCard}
          scaleTo={0.98}
          onPress={() => startScanning('cosmetic')}
        >
          <ImageBackground source={SCAN_COSMETIC_IMG} style={{ flex: 1 }} resizeMode="cover">
            <LinearGradient
              colors={['rgba(30,122,74,0.30)', 'rgba(30,122,74,0.45)', 'rgba(15,61,36,0.85)']}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {renderQuotaBadge(cosmeticLeft)}
            <View style={noir.scanCardBody}>
              <View>
                <Text style={noir.scanCardTitle}>Scan Cosmetic</Text>
                <Text style={noir.scanCardSubtitle}>Ingredient safety check</Text>
              </View>
              <View style={noir.scanPill}>
                <Text style={noir.scanPillText}>SCAN NOW</Text>
                <View style={noir.scanPillIcon}>
                  <Ionicons name="scan" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </ImageBackground>
        </AnimatedTouchable>
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

    </View>
  );
};

/* =================================================
   STYLES — Wellness Sanctuary HomeScreen
   ================================================= */
const noir = StyleSheet.create({
  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBFBF9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF4EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B5B47',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  /* ── Greeting ── */
  greeting: {
    marginTop: 16,
    marginBottom: 20,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A3A3A3',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    letterSpacing: -0.4,
  },

  /* ── Scan cards ── */
  scanCard: {
    width: '100%',
    height: SCAN_CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scanCardMotif: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  quotaBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 5,
  },
  quotaBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scanCardBody: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  scanCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  /* ── ScanPill ── */
  scanPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  scanPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27a567',
    letterSpacing: 0.4,
  },
  scanPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27a567',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#FFFFFF',
    padding: 28,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F8F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  modalMsg: {
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  modalFeatures: {
    width: '100%',
    backgroundColor: '#F8FAF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.15)',
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalFeatureLabel: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  modalUpgradeBtn: {
    width: '100%',
    backgroundColor: '#067A4F',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 16,
  },
  modalUpgradeTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalLaterBtn: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  modalLaterTxt: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
  },
  modalLegal: {
    alignItems: 'center',
    gap: 4,
  },
  modalLegalPrice: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  modalLegalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLegalLink: {
    fontSize: 11,
    color: '#AEAEB2',
    textDecorationLine: 'underline',
  },
  modalLegalDot: {
    fontSize: 11,
    color: '#AEAEB2',
  },
});

export default HomeScreen;