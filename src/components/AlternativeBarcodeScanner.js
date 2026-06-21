import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  AppState,
  Platform,
  SafeAreaView,
  Dimensions,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { platformSupports, safeNativeCall, getDebugInfo } from '../utils/platformUtils';

// Import camera modules normally for Expo Go
let CameraView, Camera;
try {
  const cameraModule = require('expo-camera');
  CameraView = cameraModule.CameraView;
  Camera = cameraModule.Camera;
} catch (error) {
}

// Web/unsupported platform fallback component
const CameraFallback = ({ onClose }) => {
  const debugInfo = getDebugInfo();
  
  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={80} color="#fff" />
          <Text style={styles.fallbackText}>
            Camera Issue Detected
          </Text>
          <Text style={styles.fallbackSubtext}>
            Platform: {debugInfo.platform}
          </Text>
          <Text style={styles.fallbackSubtext}>
            Device: {debugInfo.isDevice ? 'Physical' : 'Simulator'}
          </Text>
          <Text style={styles.fallbackSubtext}>
            Expo Go: {debugInfo.expoGoApp ? 'Yes' : 'No'}
          </Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={onClose}>
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const AlternativeBarcodeScanner = ({ onBarCodeScanned, onClose, continuousScan = false }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [lastBarcode, setLastBarcode] = useState(null);
  const scanTimeoutRef = useRef(null);
  const cooldownRef = useRef(null);
  
  // Animation refs for scanning line and corner pulse
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerPulseAnim = useRef(new Animated.Value(1)).current;

  // Show fallback only if camera modules are completely unavailable
  if (!CameraView || !Camera) {
    return <CameraFallback onClose={onClose} />;
  }

  useEffect(() => {
    getCameraPermissions();
    
    // Start scanning line animation
    const scanLineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    scanLineAnimation.start();
    
    // Start corner pulse animation
    const cornerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    cornerAnimation.start();
    
    const handleAppStateChange = (nextAppState) => {
      setIsActive(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // Stop all animations to prevent memory leaks
      scanLineAnimation.stop();
      cornerAnimation.stop();
      
      if (subscription) {
        subscription.remove();
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
      }
    };
  }, []);

  const getCameraPermissions = async () => {
    try {
      if (!Camera) {
        setHasPermission(false);
        return;
      }

      const result = await safeNativeCall(
        () => Camera.requestCameraPermissionsAsync(),
        { status: 'denied' }
      );
      
      setHasPermission(result.status === 'granted');
      
      if (result.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to scan barcodes. Please enable it in your device settings.',
          [
            { text: 'Cancel', onPress: onClose, style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                Linking.openSettings();
                onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned || !isActive) return;
    
    // In continuous mode, ignore if same barcode scanned again
    if (continuousScan && data === lastBarcode) return;
    
    // Haptic feedback on successful scan
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setScanned(true);
    setLastBarcode(data);
    
    // Add a small delay to prevent rapid successive scans
    scanTimeoutRef.current = setTimeout(() => {
      onBarCodeScanned({ type, data });
      
      // In continuous mode, re-enable scanning after a cooldown
      if (continuousScan) {
        cooldownRef.current = setTimeout(() => {
          setScanned(false);
        }, 1500); // 1.5s cooldown before accepting next barcode
      }
    }, 100);
  };

  const handleClose = () => {
    setScanned(false);
    setIsActive(false);
    setLastBarcode(null);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
    }
    onClose();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={getCameraPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
        {isActive && hasPermission && CameraView && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
            }}
          />
        )}
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityLabel="Close scanner"
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 4, textTransform: 'uppercase' }}>Scan Product</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.scannerFrame}>
          <Animated.View 
            style={[
              styles.cornerTopLeft,
              { transform: [{ scale: cornerPulseAnim }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.cornerTopRight,
              { transform: [{ scale: cornerPulseAnim }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.cornerBottomLeft,
              { transform: [{ scale: cornerPulseAnim }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.cornerBottomRight,
              { transform: [{ scale: cornerPulseAnim }] }
            ]} 
          />
          
          {/* Animated scanning line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 250],
                  })
                }]
              }
            ]}
          />
        </View>
        
        <View style={styles.bottomSection}>
          <Text style={styles.instructionText}>
            Position the barcode within the frame
          </Text>
          
          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
              activeOpacity={0.7}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              accessible={true}
              accessibilityLabel="Scan again"
            >
              <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            accessible={true}
            accessibilityLabel="Cancel scanning"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    pointerEvents: 'box-none', // Allow touch events to pass through where needed
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    alignSelf: 'center',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 1.5,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 36,
    height: 36,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 36,
    height: 36,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 56,
    paddingHorizontal: 40,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 28,
  },
  rescanButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  rescanButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  buttonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Fallback styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  fallbackSubtext: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  fallbackButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 14,
  },
  fallbackButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default AlternativeBarcodeScanner;
