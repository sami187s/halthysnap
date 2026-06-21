import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import ShareCardGenerator from './ShareCardGenerator';

const APP_NAME = 'HealthyScan';

/**
 * ShareButton
 *
 * Sits inside the ScreenHeader's rightComponent slot (or next to it).
 * Handles the full flow: render card → capture → shutter sound → share sheet.
 *
 * Props:
 *  - ready         : boolean — flip to true once results are loaded
 *  - score         : number 0-100
 *  - scoreColor    : string hex
 *  - productName   : string
 *  - brandName     : string (optional)
 *  - verdict       : string — one-line AI summary
 *  - insights      : [{ text, type }]
 */
const ShareButton = ({
  ready = false,
  score = 0,
  scoreColor,
  productName = '',
  brandName,
  verdict = '',
  insights = [],
}) => {
  // ─── Entrance animation ───
  const opacity = useRef(new Animated.Value(0.35)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!ready) return;

    // Delay so the score ring animates first (≈1 s total)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 180,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Subtle pulse loop
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.08,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [ready]);

  // ─── Shutter sound ───
  const playShutter = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // Use a short system-like click. Expo-av cannot access iOS system sounds
        // directly, so we trigger haptic as the main "click" feedback.
        // On iOS the haptic + visual flash gives the camera-shutter feeling.
        undefined,
        { shouldPlay: false },
      );
      // Fallback: just use haptic
    } catch {
      // silent
    }
    // Haptic "click" always works and feels like a shutter
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ─── Capture & share ───
  const handlePress = useCallback(async () => {
    if (capturing || !cardRef.current) return;
    setCapturing(true);

    try {
      // Haptic shutter
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Capture the hidden card
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${productName}`,
          UTI: 'public.png',         // iOS UTI
        });
      }
    } catch (err) {
      console.warn('[ShareButton] capture/share error:', err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, productName]);

  const brandGreen = '#2E7D32';

  return (
    <>
      {/* Visible button */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!ready || capturing}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.btn,
            {
              opacity,
              transform: [{ scale }],
              backgroundColor: ready ? brandGreen : '#BDBDBD',
            },
          ]}
        >
          {/* Soft glow behind */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                backgroundColor: brandGreen,
              },
            ]}
          />
          <Ionicons
            name="camera-outline"
            size={18}
            color="#FFFFFF"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Off-screen card for capture */}
      <View style={styles.offScreen} pointerEvents="none">
        <ShareCardGenerator
          ref={cardRef}
          score={score}
          productName={productName}
          brandName={brandName}
          verdict={verdict}
          insights={insights}
          scoreColor={scoreColor}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginLeft: 8,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    opacity: 0.25,
  },
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 1,       // must be visible for capture
  },
});

export default ShareButton;
