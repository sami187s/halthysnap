/**
 * ScanResultPreviewInline — Static inline version of ScanResultPreview
 * for DevScreen testing. Shows fake product data with circular score gauge.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

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

/* ───── fake products ───── */
const FAKE_PRODUCTS = [
  {
    product_name: 'Plant-Based Single Soya U.H.T',
    brands: 'Alpro',
    image_url: 'https://images.openfoodfacts.org/images/products/541/116/511/3258/front_en.6.400.jpg',
    score: 45,
  },
  {
    product_name: 'Organic Granola Bar',
    brands: 'Nature Valley',
    image_url: '',
    score: 62,
  },
  {
    product_name: 'Fresh Orange Juice',
    brands: 'Tropicana',
    image_url: '',
    score: 78,
  },
  {
    product_name: 'Instant Ramen Noodles',
    brands: 'Maruchan',
    image_url: '',
    score: 18,
  },
];

const ScanResultPreviewInline = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const product = FAKE_PRODUCTS[currentIndex];

  const scoreColor = getScoreColor(product.score);
  const scoreLabel = getScoreLabel(product.score);
  const strokeDashoffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * product.score) / 100;

  const nextProduct = () => {
    setCurrentIndex((prev) => (prev + 1) % FAKE_PRODUCTS.length);
  };

  return (
    <View style={styles.card}>
      {/* Top row: product image + info + chevron */}
      <View style={styles.topRow}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="fast-food-outline" size={28} color="#BDBDBD" />
          </View>
        )}

        <View style={styles.infoCol}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.product_name}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {product.brands}
          </Text>
        </View>

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
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              stroke="#EEEEEE"
              strokeWidth={GAUGE_STROKE}
              fill="none"
            />
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
          <View style={styles.gaugeCenter}>
            <Text style={[styles.gaugeScore, { color: scoreColor }]}>{product.score}</Text>
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

      {/* Action bar */}
      <View style={styles.actionBar}>
        <View style={styles.detailsButton}>
          <LinearGradient
            colors={['#43A047', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.detailsGradient}
          >
            <Text style={styles.detailsText}>View Full Analysis</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </View>

        <TouchableOpacity style={styles.rescanButton} onPress={nextProduct} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={20} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {/* Cycle hint */}
      <Text style={styles.hint}>
        Tap scan icon to cycle products ({currentIndex + 1}/{FAKE_PRODUCTS.length})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
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
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
    marginHorizontal: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
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
  hint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#BDBDBD',
    paddingBottom: 12,
  },
});

export default ScanResultPreviewInline;
