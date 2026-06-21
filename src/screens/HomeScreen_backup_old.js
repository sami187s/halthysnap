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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { smartNavigateToResults } from '../utils/smartNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScanContext } from '../contexts/ScanContext';
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
  const { showPostScan, scanData, handleScanComplete, handleClose } = useSmartPostScan();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewBarcode, setPreviewBarcode] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [scanMode, setScanMode] = useState('food'); // 'food' or 'cosmetic'
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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
          'ðŸŽ‰ Premium Activated!',
          'You now have unlimited scans and AI-powered analysis!',
          [{ text: 'Got it!', style: 'default' }]
        );
        navigation.setParams({ premiumActivated: undefined });
      }

      // Auto-start scanner when returning from results via "Scan Another"
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
      // Load history for any user (read directly from storage)
      const historyJson = await AsyncStorage.getItem('scan_history');
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      if (history.length > 0) {
        setTotalScans(history.length);
        const avg = Math.round(history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length);
        setAverageScore(avg);
        setRecentScans(history.slice(0, 5));
        // Saved products = items with score >= 70 (the healthy ones users would want to save)
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
    // In continuous mode: if preview is showing and a NEW barcode is detected,
    // update the preview with the new barcode (no need to close/reopen)
    if (showPreview && data !== previewBarcode) {
      setPreviewBarcode(data);
      return;
    }
    if (scanned) return;
    setScanned(true);
    try {
      // Show the preview card over the camera instead of navigating
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
    setPreviewBarcode(null);2
  };

  const handlePreviewViewDetails = async (barcode, productType) => {
    setScanning(false);
    setIsScanning(false);
    setShowPreview(false);
    setPreviewBarcode(null);
    setScanned(false);
    try {
      // Navigate directly using the product type already detected by the preview
      // This skips the smartNavigation fetch + AsyncStorage reads for instant navigation
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Loading state
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!isLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Path d="M25 5C18 8 10 18 10 28C10 38 18 45 25 45C32 45 40 38 40 28C40 18 32 8 25 5Z" fill="#2E7D32" />
          <Path d="M18 10C13 16 10 24 13 32" stroke="#4CAF50" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Svg>
        <Text style={styles.loadingTitle}>HealthyScan</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scanner fullscreen
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Main Home Screen â€” Wellness Sanctuary
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <View style={hs.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={hs.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* â”€â”€â”€â”€ Header â”€â”€â”€â”€ */}
          <Animated.View style={[hs.header, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Profile'); }}
              activeOpacity={0.7}
              style={hs.headerProfileBtn}
            >
              <View style={hs.headerAvatar}>
                <Ionicons name="person" size={16} color="#555" />
              </View>
              {isPremium && (
                <View style={hs.headerProDot}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={hs.headerTitle}>Wellness Sanctuary</Text>

            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigateToAbout(); }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color="#555" />
            </TouchableOpacity>
          </Animated.View>

          {/* â”€â”€â”€â”€ Greeting â”€â”€â”€â”€ */}
          <View style={hs.greetingWrap}>
            <Text style={hs.greeting}>Hey {userName}</Text>
            <Text style={hs.greetingSub}>What would you like to scan today?</Text>
          </View>

          {/* â”€â”€â”€â”€ Hero Image Placeholder â”€â”€â”€â”€ */}
          <View style={hs.heroCard}>
            <View style={hs.heroPlaceholder}>
              <Ionicons name="leaf-outline" size={48} color="#ccc" />
              <Text style={hs.heroPlaceholderText}>Know what you consume</Text>
            </View>
          </View>

          {/* â”€â”€â”€â”€ Scan Food Button â”€â”€â”€â”€ */}
          <Animated.View style={[hs.scanBtnWrap, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={hs.scanFoodBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('food'); }}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Scan a food product"
            >
              <View style={hs.scanBtnLeft}>
                <View style={[hs.scanIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="scan-outline" size={22} color="#4CAF50" />
                </View>
                <View>
                  <Text style={hs.scanBtnTitle}>Scan a Food</Text>
                  <Text style={hs.scanBtnSub}>Check nutrition & ingredients</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </Animated.View>

          {/* â”€â”€â”€â”€ Scan Cosmetic Button â”€â”€â”€â”€ */}
          <Animated.View style={[hs.scanBtnWrap, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={hs.scanCosmeticBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startScanning('cosmetic'); }}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Scan a cosmetic product"
            >
              <View style={hs.scanBtnLeft}>
                <View style={[hs.scanIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="sparkles-outline" size={22} color="#FF9800" />
                </View>
                <View>
                  <Text style={hs.scanBtnTitle}>Scan Cosmetic</Text>
                  <Text style={hs.scanBtnSub}>Analyze skincare & beauty</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </Animated.View>

          {/* â”€â”€â”€â”€ Quick Stats â”€â”€â”€â”€ */}
          {totalScans > 0 && (
            <View style={hs.statsRow}>
              <View style={hs.statCard}>
                <Text style={hs.statNumber}>{totalScans}</Text>
                <Text style={hs.statLabel}>Products{'\n'}Scanned</Text>
              </View>
              <View style={hs.statCard}>
                <Text style={[hs.statNumber, { color: averageScore >= 70 ? '#4CAF50' : averageScore >= 40 ? '#FF9800' : '#E05252' }]}>
                  {averageScore}
                </Text>
                <Text style={hs.statLabel}>Average{'\n'}Score</Text>
              </View>
              <TouchableOpacity
                style={hs.statCard}
                onPress={() => navigation.navigate('Search')}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={24} color="#4CAF50" />
                <Text style={hs.statLabel}>Search{'\n'}Products</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* â”€â”€â”€â”€ Recent Scans â”€â”€â”€â”€ */}
          {recentScans.length > 0 && (
            <View style={hs.recentSection}>
              <View style={hs.sectionHeader}>
                <Text style={hs.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity onPress={() => navigation.navigate('VeeList')} activeOpacity={0.7}>
                  <Text style={hs.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {recentScans.slice(0, 3).map((item, idx) => {
                const itemScoreColor = (item.score || 0) >= 70 ? '#4CAF50' : (item.score || 0) >= 40 ? '#FF9800' : '#E05252';
                return (
                  <TouchableOpacity
                    key={idx}
                    style={hs.recentItem}
                    onPress={() => {
                      if (item.barcode) {
                        const screen = item.type === 'cosmetic' ? 'CosmeticResults' : 'Results';
                        navigation.navigate(screen, { barcode: item.barcode });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={hs.recentItemLeft}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={hs.recentItemImage} resizeMode="cover" />
                      ) : (
                        <View style={[hs.recentItemImage, hs.recentItemPlaceholder]}>
                          <Ionicons name={item.type === 'cosmetic' ? 'sparkles' : 'nutrition'} size={18} color="#ccc" />
                        </View>
                      )}
                      <View style={hs.recentItemInfo}>
                        <Text style={hs.recentItemName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
                        <Text style={hs.recentItemType}>{item.type === 'cosmetic' ? 'Cosmetic' : 'Food'}</Text>
                      </View>
                    </View>
                    <View style={[hs.recentItemScore, { backgroundColor: itemScoreColor + '15' }]}>
                      <Text style={[hs.recentItemScoreText, { color: itemScoreColor }]}>{item.score || 0}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* â”€â”€â”€â”€ Post-Scan Handler â”€â”€â”€â”€ */}
      <SmartPostScanHandler
        navigation={navigation}
        scanData={scanData}
        onContinueFree={handleContinueFreeScan}
        onUpgradeSelected={handleUpgradeSelected}
        visible={showPostScan}
        onClose={handleClose}
      />

      {/* â”€â”€â”€â”€ Trial Complete Modal â”€â”€â”€â”€ */}
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
                You've used all {DAILY_SCAN_LIMIT} daily scans.{'\n'}
                They'll reset tomorrow, or upgrade for unlimited.
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
                <Text style={hs.modalUpgradeTxt}>Upgrade to Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity style={hs.modalLaterBtn} onPress={() => setShowTrialCompleteModal(false)}>
                <Text style={hs.modalLaterTxt}>Maybe Later</Text>
              </TouchableOpacity>

              <View style={hs.modalLegal}>
                <Text style={hs.modalLegalPrice}>$2.99/week - Auto-renewable</Text>
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
   STYLES â€” Wellness Sanctuary HomeScreen
   ================================================= */
const hs = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 110,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingBottom: 4,
    paddingHorizontal: 22,
  },
  headerProfileBtn: {
    position: 'relative',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  headerProDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#fff',
    borderRadius: 7,
    padding: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.3,
  },

  /* Greeting */
  greetingWrap: {
    paddingHorizontal: 22,
    marginTop: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '800',
    color: '#222',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 15,
    color: '#999',
    fontWeight: '400',
  },

  /* Hero */
  heroCard: {
    marginHorizontal: 22,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8F8F8',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  heroPlaceholderText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 10,
    fontWeight: '500',
  },

  /* Scan Buttons */
  scanBtnWrap: {
    marginHorizontal: 22,
    marginBottom: 12,
  },
  scanFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scanCosmeticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scanBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  scanBtnSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 14,
  },

  /* Recent Scans */
  recentSection: {
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  recentItemImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 12,
  },
  recentItemPlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  recentItemType: {
    fontSize: 11,
    color: '#999',
  },
  recentItemScore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemScoreText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    backgroundColor: '#FFF',
    padding: 28,
    alignItems: 'center',
    borderRadius: 24,
  },
  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F0F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
    marginBottom: 10,
  },
  modalMsg: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  modalFeatures: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalFeatureLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginLeft: 10,
  },
  modalUpgradeBtn: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalUpgradeTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalLaterBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalLaterTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  modalLegal: {
    marginTop: 10,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    width: '100%',
  },
  modalLegalPrice: { fontSize: 12, color: '#999', marginBottom: 4 },
  modalLegalRow: { flexDirection: 'row', alignItems: 'center' },
  modalLegalLink: { fontSize: 11, color: '#4CAF50' },
  modalLegalDot: { fontSize: 11, color: '#CCC', marginHorizontal: 4 },
});

// Keep old styles ref for loading/scanner
const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingTitle: { fontSize: 26, fontWeight: '700', color: '#333', marginTop: 10 },
  loadingSubtext: { fontSize: 14, color: '#999', marginTop: 4 },
});

export default HomeScreen;
