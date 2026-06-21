/**
 * ScanResultPreview — Yuka-style card that slides up from bottom
 * after scanning a barcode. Shows circular score gauge, product name,
 * health status, and lets users tap to view full results.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { getProductTypeFromCategories, analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';

const { width: SCREEN_W } = Dimensions.get('window');

/* ───── circular gauge constants ───── */
const GAUGE_SIZE = 64;
const GAUGE_STROKE = 6;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/* ───── score helpers ───── */
const getScoreColor = (s) => {
  if (s >= 70) return '#4CAF50';
  if (s >= 50) return '#FF9800';
  if (s >= 25) return '#FF5722';
  return '#F44336';
};
const getScoreLabel = (s) => {
  if (s >= 70) return 'HEALTHY';
  if (s >= 50) return 'MODERATE';
  if (s >= 25) return 'POOR';
  return 'UNHEALTHY';
};

/* ════════════════════════════════════════════ */
const ScanResultPreview = ({
  barcode,
  visible,
  onViewDetails,
  onScanAgain,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [score, setScore] = useState(null);
  const [productType, setProductType] = useState('food');
  const [error, setError] = useState(false);

  /* ── fetch product on barcode change ── */
  useEffect(() => {
    if (!barcode || !visible) return;
    let cancelled = false;

    // Quick bounce animation when barcode changes (new product scanned)
    if (product) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 30, duration: 100, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchProductByBarcode(barcode);
        if (cancelled) return;

        if (!data || !data.product_name) {
          setError(true);
          setLoading(false);
          return;
        }

        setProduct(data);

        const type = getProductTypeFromCategories(
          data.categories,
          data.product_name,
          data.source,
        );
        setProductType(type);

        /* compute score */
        if (type === 'food') {
          const healthScore = calculateHealthScore(data, null, null);
          setScore(healthScore?.score ?? 70);
        } else {
          const analysis = analyzeIngredients(
            data.ingredients_text || '',
            type,
          );
          setScore(analysis?.score ?? 50);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [barcode, visible]);

  /* ── animate in / out ── */
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const scoreColor = score !== null ? getScoreColor(score) : '#9E9E9E';
  const scoreLabel = score !== null ? getScoreLabel(score) : '';
  const scoreValue = score !== null ? Math.round(score) : 0;
  const strokeDashoffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * scoreValue) / 100;

  /* ── render ── */
  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Card */}
      <View style={styles.card}>
        {loading ? (
          /* Loading state */
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Fetching product info…</Text>
          </View>
        ) : error ? (
          /* Error / not found state */
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF9800" />
            <Text style={styles.errorTitle}>Product not found</Text>
            <Text style={styles.errorSub}>
              We couldn't find this product in our database.
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.scanAgainBtn} onPress={onScanAgain} activeOpacity={0.8}>
                <Ionicons name="scan-outline" size={18} color="#fff" />
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Product found — Yuka-style layout */
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onViewDetails(barcode, productType)}
            style={styles.resultContainer}
          >
            {/* Top row: product image + info + chevron */}
            <View style={styles.topRow}>
              {/* Product image */}
              {product?.image_url ? (
                <Image
                  source={{ uri: product.image_url }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.productImage, styles.placeholderImage]}>
                  <Ionicons
                    name={productType === 'food' ? 'fast-food-outline' : 'flask-outline'}
                    size={28}
                    color="#BDBDBD"
                  />
                </View>
              )}

              {/* Info column */}
              <View style={styles.infoCol}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product?.product_name || 'Unknown Product'}
                </Text>
                {product?.brands ? (
                  <Text style={styles.productBrand} numberOfLines={1}>
                    {product.brands}
                  </Text>
                ) : null}
              </View>

              {/* Chevron */}
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={22} color="#BDBDBD" />
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Bottom row: circular gauge + health status */}
            <View style={styles.bottomRow}>
              {/* Circular Score Gauge */}
              <View style={styles.gaugeContainer}>
                <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={styles.gaugeSvg}>
                  {/* Background track */}
                  <Circle
                    cx={GAUGE_SIZE / 2}
                    cy={GAUGE_SIZE / 2}
                    r={GAUGE_RADIUS}
                    stroke="#EEEEEE"
                    strokeWidth={GAUGE_STROKE}
                    fill="none"
                  />
                  {/* Score arc */}
                  <Circle
                    cx={GAUGE_SIZE / 2}
                    cy={GAUGE_SIZE / 2}
                    r={GAUGE_RADIUS}
                    stroke={scoreColor}
                    strokeWidth={GAUGE_STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={GAUGE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    rotation="-90"
                    origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
                  />
                </Svg>
                {/* Score number in center */}
                <View style={styles.gaugeCenter}>
                  <Text style={[styles.gaugeScore, { color: scoreColor }]}>{scoreValue}</Text>
                  <Text style={styles.gaugeMax}>/100</Text>
                </View>
              </View>

              {/* Health Status */}
              <View style={styles.statusCol}>
                <Text style={styles.statusLabel}>HEALTH STATUS</Text>
                <Text style={[styles.statusValue, { color: scoreColor }]}>
                  {scoreLabel}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom action bar (when product found) */}
        {!loading && !error && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => onViewDetails(barcode, productType)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#43A047', '#2E7D32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailsGradient}
              >
                <Text style={styles.detailsText}>View Full Analysis</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rescanButton} onPress={onScanAgain} activeOpacity={0.8}>
              <Ionicons name="scan-outline" size={20} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

/* ════════════ STYLES ════════════ */
const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    zIndex: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },

  /* ── loading ── */
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#757575',
    fontWeight: '500',
  },

  /* ── error ── */
  errorWrap: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
  },
  errorSub: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 6,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#757575',
    fontWeight: '500',
  },

  /* ── result ── */
  resultContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
    lineHeight: 22,
  },
  productBrand: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
    fontWeight: '500',
  },
  chevronWrap: {
    padding: 4,
  },

  /* ── divider ── */
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
  },

  /* ── bottom score row ── */
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },

  /* ── circular gauge ── */
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeSvg: {
    position: 'absolute',
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScore: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  gaugeMax: {
    fontSize: 10,
    color: '#BDBDBD',
    fontWeight: '600',
    marginTop: -2,
  },

  /* ── health status ── */
  statusCol: {
    marginLeft: 16,
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* ── action bar ── */
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  detailsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rescanButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScanResultPreview;
