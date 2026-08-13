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
import ScoreRing from '../components/ScoreRing';
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
        style={{ backgroundColor: '#067A4F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 }}
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [showScanPicker, setShowScanPicker] = useState(false);

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

  const openHistoryItem = (item) => {
    if (item.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', { barcode: item.barcode });
    } else {
      navigation.navigate('Results', { barcode: item.barcode });
    }
  };

  const listSource = savedProducts.length > 0 ? savedProducts : recentScans;
  const listData = activeFilter === 'all'
    ? listSource
    : listSource.filter((item) => (item.productType || 'food') === activeFilter);

  const progressWidth = isPremium ? 1 : remainingScans / DAILY_SCAN_LIMIT;

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

      {/* -- FIXED HEADER -- */}
      <View style={noir.header}>
        <TouchableOpacity
          style={noir.headerLeft}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={noir.avatarCircle}>
            <Ionicons name="person" size={16} color="#067A4F" />
          </View>
          <Text style={noir.headerBrand}>Vee</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={noir.iconBtn}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color="#556158" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={noir.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={noir.hero}>
          <Text style={noir.heroTitle}>Know what's really{'\n'}in your products.</Text>
          <Text style={noir.heroSubtitle}>
            Search a product or scan its barcode to get an instant health score and safer alternatives.
          </Text>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={noir.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={18} color="#A3A3A3" />
          <Text style={noir.searchBarText}>Search product, brand or barcode</Text>
        </TouchableOpacity>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={noir.filterTabsScroll}
          contentContainerStyle={noir.filterTabsContent}
        >
          {[
            { key: 'all', label: 'All' },
            { key: 'food', label: 'Food' },
            { key: 'cosmetic', label: 'Cosmetics' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[noir.filterChip, activeFilter === f.key && noir.filterChipActive]}
              activeOpacity={0.85}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[noir.filterChipText, activeFilter === f.key && noir.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product list — matches Purely's Home: no section header, straight into the list */}
        {listData.length === 0 ? (
          <View style={noir.emptyList}>
            <Ionicons name="search-outline" size={22} color="#C0C0C5" />
            <Text style={noir.emptyListTitle}>No products found</Text>
            <Text style={noir.emptyListText}>Scan a barcode to add your first product.</Text>
          </View>
        ) : (
          <View style={noir.listWrap}>
            {listData.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={noir.productRow}
                activeOpacity={0.85}
                onPress={() => openHistoryItem(item)}
              >
                <View style={noir.productIconWrap}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={noir.productImg} resizeMode="cover" />
                  ) : (
                    <Ionicons
                      name={item.productType === 'cosmetic' ? 'sparkles-outline' : 'nutrition-outline'}
                      size={18}
                      color="#067A4F"
                    />
                  )}
                </View>
                <View style={noir.productInfo}>
                  <Text style={noir.productName} numberOfLines={1}>{item.productName}</Text>
                  <Text style={noir.productBrand}>{item.productType === 'cosmetic' ? 'Cosmetics' : 'Food'}</Text>
                </View>
                <ScoreRing score={item.score || 0} size={40} stroke={4} />
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Floating scan button — Purely's reference design has no equivalent (it uses a
          separate bottom-tab "Scan" page instead), but scanning is this app's core
          feature so it needs a reachable entry point without cluttering the Home
          composition above. */}
      <TouchableOpacity
        style={noir.fab}
        activeOpacity={0.85}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowScanPicker(true); }}
      >
        <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Scan-type picker sheet */}
      <Modal
        visible={showScanPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScanPicker(false)}
      >
        <TouchableOpacity style={hs.modalOverlay} activeOpacity={1} onPress={() => setShowScanPicker(false)}>
          <View style={noir.pickerSheet}>
            <Text style={noir.pickerTitle}>What are you scanning?</Text>
            <TouchableOpacity
              style={noir.pickerOption}
              activeOpacity={0.85}
              onPress={() => { setShowScanPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('food'); }}
            >
              <Ionicons name="nutrition-outline" size={18} color="#067A4F" />
              <Text style={noir.pickerOptionText}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={noir.pickerOption}
              activeOpacity={0.85}
              onPress={() => { setShowScanPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('cosmetic'); }}
            >
              <Ionicons name="sparkles-outline" size={18} color="#067A4F" />
              <Text style={noir.pickerOptionText}>Cosmetics</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
                <Ionicons name="diamond" size={36} color="#067A4F" />
              </View>
              <Text style={hs.modalTitle}>Daily Limit Reached</Text>
              <Text style={hs.modalMsg}>
                You have used all {DAILY_SCAN_LIMIT} daily scans.{'\n'}
                They will reset tomorrow, or upgrade for unlimited.
              </Text>
              <View style={hs.modalFeatures}>
                {['Unlimited AI Analysis', 'Advanced Health Insights', 'AI Ingredient Expert'].map((f) => (
                  <View key={f} style={hs.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#067A4F" />
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251,251,249,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8ede8',
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#067A4F',
    letterSpacing: -0.3,
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
    color: '#6E6E73',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -1,
  },

  /* ── Hero (matches Purely's Home heading) ── */
  hero: {
    marginBottom: 28,
    gap: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#171717',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#737373',
    maxWidth: 340,
  },

  /* ── Search bar ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
  },
  searchBarText: {
    fontSize: 14,
    color: '#A3A3A3',
  },

  /* ── Empty list state ── */
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  emptyListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    marginTop: 4,
  },
  emptyListText: {
    fontSize: 13,
    color: '#A3A3A3',
    textAlign: 'center',
    maxWidth: 220,
  },
  listWrap: {
    gap: 12,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },

  /* ── Floating scan button ── */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#067A4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#067A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  /* ── Scan-type picker sheet ── */
  pickerSheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },

  /* ── Start-a-scan compact cards ── */
  scanRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanCard: {
    flex: 1,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  scanCardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  scanCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scanCardBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Cards ── */
  cardsSection: {
    marginBottom: 32,
  },
  card: {
    height: 260,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 20,
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },
  cardTop: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0,
  },
  cardBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#067A4F',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /* ── Best Products Filter List ── */
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  filterSectionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6E6E73',
    marginBottom: 16,
  },
  filterTabsScroll: {
    marginBottom: 16,
  },
  filterTabsContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F0',
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.12)',
  },
  filterChipActive: {
    backgroundColor: '#067A4F',
    borderColor: '#067A4F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A5A5F',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  productRank: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  productRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C0C0C5',
    letterSpacing: 0.5,
  },
  productIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
  },
  productScoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#067A4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
    backgroundColor: '#F1F8F1',
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6E6E73',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  activitySeeAll: {
    fontSize: 10,
    fontWeight: '700',
    color: '#067A4F',
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