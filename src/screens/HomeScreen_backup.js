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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { smartNavigateToResults } from '../utils/smartNavigation';
import EdgeToEdgeWrapper from '../components/EdgeToEdgeWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScanContext } from '../contexts/ScanContext';
import SmartPostScanHandler, { useSmartPostScan } from '../components/SmartPostScanHandler';
import { 
  createFadeAnimation, 
  createSlideAnimation, 
  createStaggerAnimation,
  createScaleAnimation 
} from '../utils/luxuryAnimations';
import { checkAndResetDailyCounters, getPremiumTrialUsage } from '../utils/dailyReset';

// Safe imports with fallbacks
let AlternativeBarcodeScanner;

try {
  AlternativeBarcodeScanner = require('../components/AlternativeBarcodeScanner').default;
} catch (error) {
  AlternativeBarcodeScanner = ({ onClose, onBarCodeScanned }) => (
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

const HomeScreen = ({ navigation, route }) => {
  const { setIsScanning } = useScanContext();
  const { showPostScan, scanData, handleScanComplete, handleClose } = useSmartPostScan();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [remainingScans, setRemainingScans] = useState(0);
  const [showTrialCompleteModal, setShowTrialCompleteModal] = useState(false);

  // Animation refs for smooth luxury animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const logoBreathing = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let loadTimer;
    let breathingTimer;
    let breathingAnim;
    let entranceAnim;
    
    loadTimer = setTimeout(() => {
      setIsLoaded(true);
      
      // Start elegant entrance animations
      entranceAnim = Animated.stagger(150, [
        createFadeAnimation(fadeAnim, 1, 600),
        createSlideAnimation(slideAnim, 0, 500),
        createFadeAnimation(titleAnim, 1, 400),
        createScaleAnimation(buttonScale, 1, 300),
      ]);
      
      entranceAnim.start();

      // Start breathing animation for logo
      breathingAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(logoBreathing, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(logoBreathing, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start breathing after entrance animations complete
      breathingTimer = setTimeout(() => breathingAnim.start(), 800);
    }, 100);

    getBarCodeScannerPermissions();
    checkAndResetDailyCounters(); // Reset counters if it's a new day
    checkSubscriptionStatus();
    
    return () => {
      // Clean up all animations and timers to prevent memory leaks
      if (loadTimer) clearTimeout(loadTimer);
      if (breathingTimer) clearTimeout(breathingTimer);
      if (breathingAnim) breathingAnim.stop();
      if (entranceAnim) entranceAnim.stop();
      setIsScanning(false);
    };
  }, []);

  // Handle screen focus - ensure tab bar is shown and state is fresh
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      checkSubscriptionStatus();

      // Check if user just activated premium
      if (route.params?.premiumActivated) {
        Alert.alert(
          '🎉 Premium Activated!',
          'You now have unlimited scans and AI-powered analysis. Start scanning to experience the difference!',
          [{ text: 'Got it!', style: 'default' }]
        );
        navigation.setParams({ premiumActivated: undefined });
      }

      return () => {
        // When screen loses focus, make sure tab bar is visible
        if (!scanning) {
          setIsScanning(false);
        }
      };
    }, [scanning, setIsScanning, route.params])
  );

  // Check subscription status and remaining premium trial scans
  const checkSubscriptionStatus = async () => {
    try {
      // Check subscription status from AsyncStorage
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const isPremiumActive = subscriptionType === 'Premium';
      
      let remaining = 2; // Default to 2 available
      let trial = false;
      
      if (isPremiumActive) {
        // User has active premium subscription
        remaining = 999; // Unlimited for premium users
        setIsPremium(true);
        setIsTrialMode(false);
        setRemainingScans(remaining);
        console.log('✅ Premium subscription active');
        return;
      }
      
      // For free users, automatically give daily trial scans
      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      const used = usedStr ? parseInt(usedStr) : 0;
      remaining = Math.max(0, 2 - used);
      
      // Set trial mode if they have remaining scans or haven't used any yet
      trial = true;
      
      // Ensure they're marked as trial user for daily reset
      if (subscriptionType !== 'Trial') {
        await AsyncStorage.multiSet([
          ['subscriptionType', 'Trial'],
          ['premiumTrialActivated', 'true']
        ]);
      }
      
      setIsPremium(false); // Free user
      setIsTrialMode(trial);
      setRemainingScans(remaining);
      
      console.log('🔍 HomeScreen subscription check:', {
        subscriptionType: isPremiumActive ? 'Premium' : 'Trial',
        isPremiumActive,
        trial,
        remaining,
        dailyScansAvailable: remaining > 0
      });
    } catch (error) {
      console.log('Error checking subscription:', error);
      setIsPremium(false);
      setIsTrialMode(true); // Default to trial mode
      setRemainingScans(2);
    }
  };

  // Navigate to subscription page
  const switchToPremium = () => {
    console.log('💳 User clicked Get Premium - navigating to subscription screen');
    navigation.navigate('Subscription');
  };

  // Show subscription options after trial
  const showSubscriptionOptions = () => {
    console.log('🎯 Trial completed - showing subscription page');
    navigation.navigate('MainTabs', { screen: 'Premium' });
  };

  // Switch to Free version (Cancel Subscription)
  const switchToFree = async () => {
    try {
      await AsyncStorage.setItem('subscriptionType', 'Free');
      await AsyncStorage.removeItem('premiumTrialActivated');
      await AsyncStorage.setItem('premiumTrialUsedToday', '0'); // Reset trial usage
      setIsPremium(false);
      setIsTrialMode(false);
      setRemainingScans(0);
      Alert.alert(
        '📱 Free Version Active',
        '✅ Unlimited basic scans (no AI)\n✅ Option to try 2 premium scans\n\nPerfect for basic product checking!',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to switch to free version');
    }
  };

  // Check and use trial scan
  const useTrialScan = async () => {
    if (!isTrialMode) return false;
    
    try {
      const used = await AsyncStorage.getItem('premiumTrialUsedToday');
      const usedCount = parseInt(used || '0');
      
      // If trying to do 3rd scan, show subscription
      if (usedCount >= 2) {
        // Show beautiful custom modal instead of basic Alert
        setShowTrialCompleteModal(true);
        
        // Animate modal entrance
        Animated.spring(modalScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
        
        return false;
      }
      
      // Allow the scan (1st or 2nd scan)
      const newCount = usedCount + 1;
      await AsyncStorage.setItem('premiumTrialUsedToday', newCount.toString());
      setRemainingScans(2 - newCount);
      
      // Show motivational message after 2nd scan
      if (newCount === 2) {
        setTimeout(() => {
          Alert.alert(
            '⭐ Amazing!',
            'You\'ve completed 2 premium scans!\n\nYour next scan will unlock the upgrade option.',
            [{ text: 'Got it!' }]
          );
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error('Error using trial scan:', error);
      return false;
    }
  };

  // Activate Premium Trial - Give exactly 2 premium scans
  const activatePremiumTrial = async () => {
    try {
      // Set trial mode (not full premium)
      await AsyncStorage.setItem('subscriptionType', 'Trial');
      await AsyncStorage.setItem('premiumTrialActivated', 'true');
      await AsyncStorage.setItem('premiumTrialUsedToday', '0');
      
      // Update UI to show trial mode (not premium)
      setIsPremium(false);
      setIsTrialMode(true);
      setRemainingScans(2);
      
      Alert.alert(
        '🌟 Premium Trial Activated!',
        '✅ Exactly 2 premium scans unlocked\n✅ Full AI analysis included\n✅ All premium features available\n\nStart scanning to experience the difference!',
        [{ text: 'Start Scanning!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to activate premium trial');
    }
  };



  const getBarCodeScannerPermissions = async () => {
    try {
      setHasPermission(true);
    } catch (error) {
      setHasPermission(false);
    }
  };

  // Safe navigation functions
  const navigateToAbout = () => {
    try {
      navigation.navigate('About');
    } catch (error) {
    }
  };





  const startScanning = async () => {
    if (hasPermission === null) {
      Alert.alert('Permission Required', 'Camera permission is required to scan barcodes.');
      return;
    }
    
    if (hasPermission === false) {
      Alert.alert('No Access', 'Camera access is not available on this device.');
      return;
    }

    // Free version has unlimited basic scans, premium has unlimited AI scans
    const subscriptionType = await AsyncStorage.getItem('subscriptionType');
    const isPremiumUser = subscriptionType === 'Premium';
    
    // Always allow scanning - free users get unlimited basic scans
    setScanning(true);
    setIsScanning(true); // Hide tab bar
    setScanned(false);
  };

  // New: Start food photo scanning
  const startFoodPhotoScan = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to scan food photos',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Navigate to FoodPhotoResults screen
        navigation.navigate('FoodPhotoResults', { 
          imageUri: result.assets[0].uri 
        });
      }
    } catch (error) {
      console.error('❌ Error launching camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      setScanning(false);
      setIsScanning(false); // Show tab bar
      
      // No scan limits for basic scanning - free users get unlimited basic scans
      // Premium trial scans are tracked in ResultsScreen when AI features are used
      
      console.log('📱 HomeScreen: Barcode scanned:', data);
      
      // Use smart post-scan handler to determine next action
      console.log('🧭 HomeScreen: Processing scan with smart flow');
      await handleScanComplete(data);
      
    } catch (error) {
      console.log('❌ HomeScreen: Navigation error:', error.message);
      console.log('❌ HomeScreen: Error details:', error);
      
      Alert.alert(
        'Scan Error', 
        'Could not process the scanned product. This might be due to:\n\n• Product not found in database\n• Network connection issue\n• Invalid barcode\n\nPlease try again or search manually.',
        [
          {
            text: 'Search Manually',
            onPress: () => {
              setScanned(false);
              navigation.navigate('Search');
            }
          },
          {
            text: 'Try Again',
            onPress: () => setScanned(false)
          }
        ]
      );
    }
  };

  const handleScannerClose = () => {
    setScanning(false);
    setIsScanning(false); // Show tab bar
    setScanned(false);
  };

  // Handle continuing with free scan (no upgrade needed)
  const handleContinueFreeScan = async (data) => {
    try {
      console.log('🆓 HomeScreen: Continuing with free scan');
      await smartNavigateToResults(navigation, data);
    } catch (error) {
      console.error('❌ HomeScreen: Free scan navigation error:', error);
      Alert.alert('Error', 'Failed to process scan. Please try again.');
    }
  };

  // Handle upgrade selection
  const handleUpgradeSelected = () => {
    navigation.navigate('Subscription');
  };

  if (!isLoaded) {
    return (
      <EdgeToEdgeWrapper>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Ionicons name="leaf" size={isTablet ? 85 : 75} color="#4CAF50" />
            <Text style={styles.appTitle}>HealthyScan</Text>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </EdgeToEdgeWrapper>
    );
  }

  if (scanning) {
    return (
      <AlternativeBarcodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        onClose={handleScannerClose}
      />
    );
  }

  return (
    <EdgeToEdgeWrapper>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F0A" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['rgba(100, 200, 160, 0.10)', 'rgba(10, 15, 10, 0)']}
            start={{ x: 0.4, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={styles.backgroundGlow}
            pointerEvents="none"
          />
          {/* Header with smooth slide animation */}
          <Animated.View style={[
            styles.header, 
            { transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.headerContent}>
              <Animated.Text style={[styles.headerTitle, { opacity: titleAnim }]}>
                Vee: Advanced Eye-{'\n'}Comfort Home
              </Animated.Text>
              <Animated.Text style={[styles.headerSubtitle, { opacity: titleAnim }]}>
                Scan products to check their safety
              </Animated.Text>
            </View>
            <TouchableOpacity
              style={styles.aboutButton}
              onPress={navigateToAbout}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          </Animated.View>



          {/* Main Content with elegant animations */}
          <Animated.View style={[
            styles.mainWrapper,
            { transform: [{ scale: buttonScale }] }
          ]}>
        
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          {/* Android soft glow */}
          {Platform.OS === 'android' && <View style={styles.logoGlowAndroid} />}
          <Animated.View style={[
            styles.leafGlow,
            { transform: [{ scale: logoBreathing }] }
          ]}>
            <Svg
              width={isTablet ? 112 : 96}
              height={isTablet ? 112 : 96}
              viewBox="0 0 120 120"
            >
              <Defs>
                <SvgLinearGradient id="leafStroke" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFF4C9" />
                  <Stop offset="50%" stopColor="#F8E79A" />
                  <Stop offset="100%" stopColor="#D6FFB3" />
                </SvgLinearGradient>
                <SvgLinearGradient id="leafCore" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0%" stopColor="rgba(255, 244, 201, 0.6)" />
                  <Stop offset="100%" stopColor="rgba(214, 255, 179, 0.1)" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M58 103C76 95 92 74 92 50C92 32 78 17 58 15C38 17 24 32 24 50C24 70 36 89 52 100"
                stroke="url(#leafStroke)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.88}
              />
              <Path
                d="M58 97C46 79 40 55 52 34"
                stroke="url(#leafCore)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.8}
              />
            </Svg>
          </Animated.View>
        </View>

        {/* Welcome Text */}
        <Text style={styles.welcomeText}>
          Discover what's in your food and personal care products
        </Text>
        
        <Text style={styles.descriptionText}>
          Scan the barcode to get an instant health score and ingredient analysis
        </Text>

        {/* Daily Premium Scans with SVG Circular Progress Ring */}
        {!isPremium && (
          <View style={styles.dailyScansCard}>
            {/* SVG Circular Progress Ring */}
            <View style={styles.progressRingContainer}>
              <Svg width={56} height={56} viewBox="0 0 56 56">
                <Defs>
                  <SvgLinearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
                    {PROGRESS_GRADIENT_STOPS.map((stop) => (
                      <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </SvgLinearGradient>
                </Defs>
                {/* Background track */}
                <Circle
                  cx={28}
                  cy={28}
                  r={24}
                  stroke="#1A2A1A"
                  strokeWidth={3}
                  fill="transparent"
                />
                {/* Gold fill arc */}
                <Circle
                  cx={28}
                  cy={28}
                  r={24}
                  stroke="url(#progressGradient)"
                  strokeWidth={3}
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - remainingScans / 2)}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="28, 28"
                />
              </Svg>
            </View>
            
            {/* Text Content */}
            <View style={styles.dailyScansTextContent}>
              <Text style={styles.dailyScansTitle}>Daily Premium Scans</Text>
              <Text style={styles.dailyScansSubtext}>
                {remainingScans} of 2 remaining • Resets every 24h
              </Text>
            </View>
          </View>
        )}

        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond-outline" size={16} color="#C8AA6E" />
            <Text style={styles.premiumText}>Premium • Unlimited Scans</Text>
          </View>
        )}

        {/* Main Scan Buttons */}
        <View style={styles.buttonContainer}>
          {/* Barcode Scanner Button */}
          <View style={styles.scanButtonWrapper}>
            {Platform.OS === 'android' && <View style={styles.buttonGlowAndroid} />}
            <LinearGradient
              colors={GOLD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradientBorder}
            >
              <TouchableOpacity
                style={styles.scanButton}
                onPress={startScanning}
                activeOpacity={0.8}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                accessible={true}
                accessibilityLabel="Start barcode scanning"
              >
                <Ionicons name="barcode-outline" size={44} color="#C8D8C0" />
                <Text style={styles.scanButtonText}>Scan a Barcode</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Food Photo Scanner Button */}
          <View style={styles.scanButtonWrapper}>
            {Platform.OS === 'android' && <View style={styles.buttonGlowAndroid} />}
            <LinearGradient
              colors={GOLD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradientBorder}
            >
              <TouchableOpacity
                style={styles.foodPhotoButton}
                onPress={startFoodPhotoScan}
                activeOpacity={0.8}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                accessible={true}
                accessibilityLabel="Scan food photo"
              >
                <Ionicons name="camera-outline" size={44} color="#C8D8C0" />
                <Text style={styles.scanButtonText}>Scan a Meal</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        </Animated.View>

        </Animated.View>

        {/* Smart Post-Scan Handler */}
        <SmartPostScanHandler
          navigation={navigation}
          scanData={scanData}
          onContinueFree={handleContinueFreeScan}
          onUpgradeSelected={handleUpgradeSelected}
          visible={showPostScan}
          onClose={handleClose}
        />

        {/* Beautiful Trial Complete Modal */}
        <Modal
          visible={showTrialCompleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTrialCompleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { transform: [{ scale: modalScale }] }
              ]}
            >
              <LinearGradient
                colors={['#0D120D', '#1A2A1A', '#0D120D']}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Icon */}
                <View style={styles.modalIconContainer}>
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="diamond" size={50} color="#C8AA6E" />
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.modalTitle}>🎯 Trial Complete!</Text>
                
                {/* Message */}
                <Text style={styles.modalMessage}>
                  You've successfully used your{'\n'}
                  <Text style={styles.modalHighlight}>2 free premium scans</Text>
                </Text>
                
                {/* Features List */}
                <View style={styles.modalFeaturesContainer}>
                  <View style={styles.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#C8AA6E" />
                    <Text style={styles.modalFeatureText}>Unlimited AI Analysis</Text>
                  </View>
                  <View style={styles.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#C8AA6E" />
                    <Text style={styles.modalFeatureText}>Advanced Health Insights</Text>
                  </View>
                  <View style={styles.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#C8AA6E" />
                    <Text style={styles.modalFeatureText}>AI Ingredient Expert</Text>
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.modalUpgradeButton}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowTrialCompleteModal(false);
                      showSubscriptionOptions();
                    }}
                  >
                    <LinearGradient
                      colors={['#C8AA6E', '#D4BC82', '#A88E52']}
                      style={styles.modalUpgradeGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="diamond" size={20} color="#FFF" />
                      <Text style={styles.modalUpgradeButtonText}>Upgrade to Premium</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.modalLaterButton}
                    activeOpacity={0.7}
                    onPress={() => setShowTrialCompleteModal(false)}
                  >
                    <Text style={styles.modalLaterButtonText}>Maybe Later</Text>
                    <Text style={styles.modalLaterSubtext}>Continue with basic features</Text>
                  </TouchableOpacity>
                </View>

                {/* Legal Links */}
                <View style={styles.modalLegalContainer}>
                  <Text style={styles.modalSubscriptionInfo}>$2.99/week • Auto-renewable</Text>
                  <View style={styles.modalLegalLinks}>
                    <TouchableOpacity onPress={async () => {
                      const url = 'https://sites.google.com/view/vee-privacy-policy';
                      try {
                        const supported = await Linking.canOpenURL(url);
                        if (supported) {
                          await Linking.openURL(url);
                        } else {
                          Alert.alert('Error', 'Unable to open Privacy Policy. Please check your internet connection.');
                        }
                      } catch (error) {
                        console.error('Error opening privacy policy:', error);
                        Alert.alert('Error', 'Unable to open Privacy Policy at this time.');
                      }
                    }}>
                      <Text style={styles.modalLegalText}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalLegalDivider}> • </Text>
                    <TouchableOpacity onPress={async () => {
                      const url = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
                      try {
                        const supported = await Linking.canOpenURL(url);
                        if (supported) {
                          await Linking.openURL(url);
                        } else {
                          Alert.alert('Error', 'Unable to open Terms of Use. Please check your internet connection.');
                        }
                      } catch (error) {
                        console.error('Error opening terms:', error);
                        Alert.alert('Error', 'Unable to open Terms of Use at this time.');
                      }
                    }}>
                      <Text style={styles.modalLegalText}>Terms of Use</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>
      </ScrollView>
    </EdgeToEdgeWrapper>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const GOLD_GRADIENT = ['rgba(180, 220, 160, 0.4)', 'rgba(120, 200, 140, 0.35)'];
const PROGRESS_GRADIENT_STOPS = [
  { offset: '0%', color: '#F8E9B0' },
  { offset: '60%', color: '#D9F1C0' },
  { offset: '100%', color: '#C4F7B3' },
];

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#0A0F0A',
  },
  scrollContent: {
    flexGrow: 1,
    ...(Platform.OS === 'web' 
      ? { minHeight: '100vh', paddingBottom: 50 } 
      : { minHeight: screenHeight, paddingBottom: 95 }
    ),
  },
  container: {
    flex: Platform.OS === 'web' ? undefined : 1,
    backgroundColor: '#0A0F0A',
    width: '100%',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 400,
    borderRadius: 200,
    opacity: 0.6,
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#8A9A8A',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    minHeight: 120,
    position: 'relative',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: '400',
    color: '#D8D8D8',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: isTablet ? 34 : 28,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: isTablet ? 14 : 12,
    color: '#6A7A6A',
    marginTop: 2,
  },
  aboutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
  },

  // Main Content
  mainWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 48 : 28,
    maxWidth: isTablet ? 500 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTablet ? 44 : 36,
    marginTop: isTablet ? 8 : 4,
  },
  logoGlowAndroid: {
    position: 'absolute',
    width: isTablet ? 140 : 120,
    height: isTablet ? 140 : 120,
    borderRadius: isTablet ? 70 : 60,
    backgroundColor: 'rgba(200, 240, 180, 0.06)',
  },
  leafGlow: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 20 : 18,
    borderRadius: 999,
    backgroundColor: 'transparent',
    shadowColor: '#D4E8A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: isTablet ? 40 : 34,
    elevation: 0,
  },
  
  welcomeText: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '500',
    color: '#D8D8D8',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: isTablet ? 32 : 28,
    paddingHorizontal: 20,
    letterSpacing: 0.2,
  },
  descriptionText: {
    fontSize: isTablet ? 14 : 13,
    color: '#6A7A6A',
    textAlign: 'center',
    marginBottom: isTablet ? 44 : 36,
    lineHeight: isTablet ? 22 : 20,
    paddingHorizontal: 24,
  },

  // Button container
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 14,
  },
  scanButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGradientBorder: {
    width: '100%',
    borderRadius: 22,
    padding: 1.5,
    shadowColor: '#5ABF6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonGlowAndroid: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 26,
    backgroundColor: 'rgba(140, 255, 180, 0.10)',
  },
  scanButton: {
    backgroundColor: '#111A11',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 28 : 22,
    paddingVertical: isTablet ? 24 : 20,
    borderRadius: 22,
    width: '100%',
    borderWidth: 0,
    shadowColor: '#5ABF6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  foodPhotoButton: {
    backgroundColor: '#111A11',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 28 : 22,
    paddingVertical: isTablet ? 24 : 20,
    borderRadius: 22,
    width: '100%',
    borderWidth: 0,
    shadowColor: '#5ABF6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  scanButtonText: {
    color: '#E8E8E8',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 36 : 30,
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    minWidth: isTablet ? 280 : 240,
    marginBottom: 12,
  },
  searchButtonText: {
    color: '#4CAF50',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Subscription status styles
  subscriptionStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  basicScansRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    color: '#8A9A8A',
  },
  
  // Daily Scans with SVG Circular Progress Ring
  dailyScansCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 30, 20, 0.6)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 36,
    width: '100%',
  },
  progressRingContainer: {
    marginRight: 16,
    width: 56,
    height: 56,
    shadowColor: '#9BF6B5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  dailyScansTextContent: {
    flex: 1,
  },
  dailyScansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dailyScansTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D8D8D8',
  },
  dailyScansSubtext: {
    fontSize: 12,
    color: '#6A7A6A',
    marginTop: 3,
  },
  tryPremiumTrialButton: {
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8AA6E',
    shadowColor: '#C8AA6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minWidth: '80%',
  },
  tryPremiumTrialText: {
    color: '#C8AA6E',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  tryPremiumTrialButtonSmall: {
    backgroundColor: 'rgba(200, 170, 110, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8AA6E',
    alignSelf: 'center',
  },
  tryPremiumTrialTextSmall: {
    color: '#C8AA6E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  getPremiumButton: {
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: '85%',
  },
  getPremiumButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  upgradeButton: {
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8AA6E',
  },
  upgradeButtonText: {
    color: '#C8AA6E',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 170, 110, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C8AA6E',
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C8AA6E',
    marginLeft: 6,
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  smallSubscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  smallCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    color: '#8A9A8A',
  },
  testModeSmallText: {
    fontSize: 10,
    color: '#5A6A5A',
    fontStyle: 'italic',
  },
  
  // Trial Complete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(200, 170, 110, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(200, 170, 110, 0.3)',
    shadowColor: '#C8AA6E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8A9A8A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalHighlight: {
    fontWeight: 'bold',
    color: '#C8AA6E',
    fontSize: 18,
  },
  modalFeaturesContainer: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalFeatureText: {
    fontSize: 16,
    color: '#E8E8E8',
    marginLeft: 12,
    fontWeight: '600',
  },
  modalButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  modalUpgradeButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#C8AA6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalUpgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalUpgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalLaterButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#2A3A2A',
    alignItems: 'center',
  },
  modalLaterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8A9A8A',
    marginBottom: 4,
  },
  modalLaterSubtext: {
    fontSize: 12,
    color: '#5A6A5A',
  },

  // Legal Links in Modal
  modalLegalContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3A2A',
  },
  modalSubscriptionInfo: {
    fontSize: 12,
    color: '#8A9A8A',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalLegalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modalLegalText: {
    fontSize: 11,
    color: '#C8AA6E',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  modalLegalDivider: {
    fontSize: 11,
    color: '#5A6A5A',
    marginHorizontal: 4,
  },
});

export default HomeScreen;
