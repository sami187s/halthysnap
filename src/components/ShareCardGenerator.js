import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const APP_NAME = 'HealthyScan';
const APP_TAGLINE = 'Scanned with HealthyScan';
const APP_URL = 'healthyscan.app';

// Card dimensions — 9:16 aspect ratio (Instagram Stories / WhatsApp)
const CARD_W = 390;
const CARD_H = 693; // ≈ 390 × 16/9

const RING_SIZE = 140;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Returns gradient colors based on the health score.
 */
const getGradientForScore = (score) => {
  if (score >= 70) {
    return ['#1B5E20', '#2E7D32', '#388E3C']; // deep green
  }
  if (score >= 40) {
    return ['#E65100', '#F57C00', '#FF9800']; // amber / orange
  }
  return ['#B71C1C', '#C62828', '#D32F2F']; // deep red
};

/**
 * Returns the pill background color (semi-transparent white variants).
 */
const getChipStyle = (type) => {
  switch (type) {
    case 'bad':
      return { bg: 'rgba(255,255,255,0.18)', border: 'rgba(255,255,255,0.35)' };
    case 'moderate':
      return { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.28)' };
    case 'good':
    default:
      return { bg: 'rgba(255,255,255,0.22)', border: 'rgba(255,255,255,0.40)' };
  }
};

const chipIcon = (type) => {
  switch (type) {
    case 'bad': return '⚠️';
    case 'moderate': return '⚡';
    case 'good':
    default: return '✓';
  }
};

/**
 * ShareCardGenerator
 *
 * Renders an off-screen branded card that react-native-view-shot captures.
 * Must be mounted (even off-screen) during capture.
 *
 * Props:
 *  - score        : number 0-100
 *  - productName  : string
 *  - brandName    : string (optional)
 *  - verdict      : string — one-line AI verdict
 *  - insights     : [{ text, type: 'good'|'moderate'|'bad' }] — top 3 chips
 *  - scoreColor   : hex color for the ring
 */
const ShareCardGenerator = forwardRef(({
  score = 0,
  productName = 'Unknown Product',
  brandName,
  verdict = '',
  insights = [],
  scoreColor,
}, ref) => {
  const gradientColors = getGradientForScore(score);
  const ringColor = scoreColor || '#FFFFFF';
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(score, 100) / 100);
  const displayInsights = insights.slice(0, 3);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={styles.cardOuter}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* ── Top bar: logo + app name ── */}
        <View style={styles.topBar}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{APP_NAME}</Text>
        </View>

        {/* ── Product name ── */}
        <View style={styles.productSection}>
          {brandName ? (
            <Text style={styles.brand}>{brandName}</Text>
          ) : null}
          <Text style={styles.product} numberOfLines={3}>
            {productName}
          </Text>
        </View>

        {/* ── Score ring ── */}
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#FFFFFF"
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringTextWrap}>
            <Text style={styles.ringScore}>{Math.round(score)}</Text>
            <Text style={styles.ringTotal}>/100</Text>
          </View>
        </View>

        {/* ── AI verdict ── */}
        {verdict ? (
          <Text style={styles.verdict} numberOfLines={2}>
            {verdict}
          </Text>
        ) : null}

        {/* ── Insight chips ── */}
        {displayInsights.length > 0 && (
          <View style={styles.chipsRow}>
            {displayInsights.map((item, i) => {
              const chipS = getChipStyle(item.type);
              return (
                <View
                  key={i}
                  style={[styles.chip, { backgroundColor: chipS.bg, borderColor: chipS.border }]}
                >
                  <Text style={styles.chipIcon}>{chipIcon(item.type)}</Text>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {item.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{APP_TAGLINE}</Text>
          <Text style={styles.footerUrl}>{APP_URL}</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  cardOuter: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    // Positioned off-screen — parent should use absolute positioning
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: 8,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },

  // Product
  productSection: {
    marginTop: 8,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  product: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
  },

  // Ring
  ringWrap: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTextWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringScore: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
  },
  ringTotal: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -2,
  },

  // Verdict
  verdict: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 22,
    marginHorizontal: 8,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 140,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  footerUrl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
});

export default ShareCardGenerator;
