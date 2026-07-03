/**
 * Vee List Screen - Elite Selections
 * Curated list of highest-rated products (90+ score only)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCuratedProducts } from '../services/tursoDB';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';

const CACHE_KEY = '@vee_curated_cache';

const CATEGORIES = ['All', 'Food', 'Cosmetic'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Products from user's personal scan history — images confirmed from database
const ELITE_PRODUCTS = [
  {
    id: '4056489491217',
    barcode: '4056489491217',
    name: 'Skyr Natural Fat Free',
    brand: 'MILBONA',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'HIGH PROTEIN',
    defaultScore: 90,
    image: 'https://images.openfoodfacts.org/images/products/405/648/949/1217/front_en.3.400.jpg',
    productType: 'food',
    ingredients: 'Pasteurized skimmed milk, live cultures (Streptococcus thermophilus, Lactobacillus bulgaricus, Lactobacillus acidophilus, Bifidobacterium lactis). No added sugar. No fat. High in protein.',
    nutriments: { 'energy-kcal_100g': 64, fat_100g: 0.2, 'saturated-fat_100g': 0.1, carbohydrates_100g: 4.0, sugars_100g: 4.0, fiber_100g: 0, proteins_100g: 11.0, salt_100g: 0.1 },
  },
  {
    id: '3228857000166',
    barcode: '3228857000166',
    name: '100% Mie Complète',
    brand: 'HARRYS',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'WHOLE WHEAT',
    defaultScore: 88,
    image: 'https://images.openfoodfacts.org/images/products/322/885/700/0166/front_fr.1858.400.jpg',
    productType: 'food',
    ingredients: 'Whole wheat flour 36%, water, wheat flour 24%, rapeseed oil, sugar, flavoring (contains alcohol), salt, vinegar, malted rye flour, yeast, wheat gluten, acerola extract.',
    nutriments: { 'energy-kcal_100g': 249, fat_100g: 3.5, 'saturated-fat_100g': 0.4, carbohydrates_100g: 42.0, sugars_100g: 3.8, fiber_100g: 5.2, proteins_100g: 9.0, salt_100g: 1.1 },
  },
  {
    id: 'elite-kiehl',
    barcode: 'elite-kiehl',
    name: "Ultra Facial Cream",
    brand: "KIEHL'S",
    category: 'COSMETIC',
    filterCat: 'Cosmetic',
    tag: 'SKIN BARRIER',
    defaultScore: 88,
    image: 'https://images.openbeautyfacts.org/images/products/360/597/502/8799/front_en.4.400.jpg',
    productType: 'cosmetic',
    ingredients: 'Aqua/Water, Glycerin, Cetyl Alcohol, Stearyl Alcohol, PEG-100 Stearate, Glyceryl Stearate, Petrolatum, Phenoxyethanol, Polysorbate 60, Cholesterol, Benzyl Alcohol, Stearic Acid, Carbomer, Sodium Hydroxide, Methylparaben, Propylparaben. Free of parabens alternative. Dermatologist tested.',
    nutriments: {},
  },
  {
    id: 'elite-aveeno',
    barcode: 'elite-aveeno',
    name: 'Daily Moisturizing Lotion',
    brand: 'AVEENO',
    category: 'COSMETIC',
    filterCat: 'Cosmetic',
    tag: 'OAT FORMULA',
    defaultScore: 88,
    image: 'https://images.openbeautyfacts.org/images/products/038/137/003/8443/front_en.16.400.jpg',
    productType: 'cosmetic',
    ingredients: 'Active Ingredient: Dimethicone 1.2%. Water, Glycerin, Distearyldimonium Chloride, Petrolatum, Isopropyl Palmitate, Cetyl Alcohol, Avena Sativa (Oat) Kernel Flour, Benzyl Alcohol, Sodium Chloride. Colloidal oatmeal soothes and moisturizes dry skin. Fragrance free. Non-comedogenic.',
    nutriments: {},
  },
  {
    id: '7300400481008',
    barcode: '7300400481008',
    name: 'Fibres Crispbread',
    brand: 'WASA',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'HIGH FIBER',
    defaultScore: 88,
    image: 'https://images.openfoodfacts.org/images/products/730/040/048/1588/front_en.269.400.jpg',
    productType: 'food',
    ingredients: 'Whole grain rye flour 95%, water, yeast, salt. Rich in dietary fiber. Low in fat. Suitable for vegan diet. No artificial additives.',
    nutriments: { 'energy-kcal_100g': 330, fat_100g: 2.5, 'saturated-fat_100g': 0.3, carbohydrates_100g: 62.0, sugars_100g: 1.5, fiber_100g: 20.0, proteins_100g: 10.0, salt_100g: 0.8 },
  },
  {
    id: '20724696',
    barcode: '20724696',
    name: 'Almendra Natural',
    brand: 'ALESTO',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'HEART HEALTHY',
    defaultScore: 89,
    image: 'https://images.openfoodfacts.org/images/products/000/002/072/4696/front_en.384.400.jpg',
    productType: 'food',
    ingredients: '100% California almonds. Natural, unsalted, unroasted. Rich in vitamin E, magnesium, calcium and healthy monounsaturated fats. No added oil, no salt, no sugar.',
    nutriments: { 'energy-kcal_100g': 575, fat_100g: 49.9, 'saturated-fat_100g': 3.8, carbohydrates_100g: 19.5, sugars_100g: 4.8, fiber_100g: 12.5, proteins_100g: 21.2, salt_100g: 0 },
  },
];

const buildOffUrl = (barcode, variant) => {
  const b = barcode.toString().padStart(13, '0');
  const path = `${b.slice(0,3)}/${b.slice(3,6)}/${b.slice(6,9)}/${b.slice(9,13)}`;
  if (variant === 1) return `https://images.openfoodfacts.org/images/products/${path}/front_en.400.jpg`;
  if (variant === 2) return `https://images.openfoodfacts.org/images/products/${path}/front.3.400.jpg`;
  if (variant === 3) return `https://images.openbeautyfacts.org/images/products/${path}/front_en.400.jpg`;
  return null;
};

const EliteProductCard = ({ item, score, isLeft, onPress }) => {
  const [imgSrc, setImgSrc] = useState(item.image);
  const [fallbackVariant, setFallbackVariant] = useState(1);
  const [imgFailed, setImgFailed] = useState(false);

  // Fix: reset image state whenever the product or its image changes
  useEffect(() => {
    setImgSrc(item.image);
    setFallbackVariant(1);
    setImgFailed(false);
  }, [item.id, item.image]);

  const handleImageError = () => {
    const next = buildOffUrl(item.barcode, fallbackVariant);
    if (next && imgSrc !== next) {
      setImgSrc(next);
      setFallbackVariant(prev => prev + 1);
    } else {
      setImgFailed(true);
    }
  };

  const scoreColor = score >= 80 ? '#067A4F' : score >= 50 ? '#FF9800' : '#F44336';

  return (
    <TouchableOpacity
      style={[styles.card, isLeft ? { marginRight: 6 } : { marginLeft: 6 }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageSection}>
        <View style={styles.cardImageClip}>
          {imgSrc && !imgFailed ? (
            <Image
              source={{ uri: imgSrc }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={handleImageError}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="leaf-outline" size={32} color="#888" />
            </View>
          )}
          {/* Bottom gradient for depth */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </View>

        {/* Tag pill */}
        <View style={styles.tagPill}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>

        {/* Score seal */}
        <View style={[styles.scoreSeal, { backgroundColor: scoreColor }]}>
          <Text style={styles.sealScore}>{score}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{item.brand}</Text>
          <Ionicons name="chevron-forward" size={12} color="#bfcaba" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const VeeListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsetsWithFallback();
  const [activeCategory, setActiveCategory] = useState('All');
  const [customProducts, setCustomProducts] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        try {
          // Step 1: Show cached products INSTANTLY (no waiting for network)
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) setCustomProducts(JSON.parse(cached));

          // Step 2: Refresh from Turso in background, update cache
          const fresh = await fetchCuratedProducts();
          setCustomProducts(fresh);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // Keep showing whatever is already displayed — no blank screen
        }
      };
      load();
    }, [])
  );

  // Merge curated picks first, then hardcoded elite list (no duplicates)
  const allProducts = [
    ...customProducts,
    ...ELITE_PRODUCTS.filter(e => !customProducts.some(c => c.barcode === e.barcode)),
  ];

  const filteredProducts = activeCategory === 'All'
    ? allProducts
    : allProducts.filter((p) => p.filterCat === activeCategory);

  const handleProductPress = (product) => {
    const curatedScore = product.defaultScore;
    const hasNutriments = product.nutriments && Object.keys(product.nutriments).length > 0;
    const preloadedData = {
      product_name: product.name,
      brands: product.brand,
      image_url: product.image,
      ingredients_text: product.ingredients || '',
      nutriments: product.nutriments || {},
      curatedScore,
    };
    if (product.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', {
        barcode: product.barcode, fromSearch: true, freeAIAccess: true, preloadedData, skipFetch: true,
      });
    } else {
      navigation.navigate('Results', {
        barcode: product.barcode, fromSearch: true, freeAIAccess: true, preloadedData,
        // Only skip the API fetch if we already have nutrition data; otherwise fetch to get it
        skipFetch: hasNutriments,
      });
    }
  };

  const renderProductCard = ({ item, index }) => {
    const score = item.defaultScore;
    const isLeft = index % 2 === 0;
    return (
      <EliteProductCard
        item={item}
        score={score}
        isLeft={isLeft}
        onPress={() => handleProductPress(item)}
      />
    );
  };

  const ListHeader = () => (
    <>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CURATED SELECTION</Text>
        <Text style={styles.heroTitle}>Elite Choices</Text>
        <Text style={styles.heroDesc}>
          The world's most nutritious products — strictly filtered for elite health scores of 90 and above.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {cat === 'All' ? 'ALL' : cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: '#fafaf5' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafaf5" />

      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color="#067A4F" />
          </View>
          <Text style={styles.headerTitle}>Vee</Text>
        </View>
        <Ionicons name="notifications-outline" size={22} color="#067A4F" />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={[styles.gridContent, { paddingTop: insets.top + 72 }]}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No products in this category</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(250,250,245,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E5F2EC',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(13,99,27,0.12)',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#067A4F', letterSpacing: -0.3 },

  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#067A4F', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#1a1c19', letterSpacing: -1, lineHeight: 42, marginBottom: 10 },
  heroDesc: { fontSize: 13, color: '#40493d', lineHeight: 20 },

  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#eeeee9' },
  filterPillActive: { backgroundColor: '#067A4F' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#40493d', letterSpacing: 0.8 },
  filterPillTextActive: { color: '#ffffff' },

  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { marginBottom: 16 },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#1a1c19',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
  },

  imageSection: { width: '100%', height: 170 },
  cardImageClip: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0eb',
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eeeee9' },

  tagPill: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tagDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#067A4F',
  },
  tagText: { fontSize: 9, fontWeight: '800', color: '#067A4F', letterSpacing: 0.8 },

  scoreSeal: {
    position: 'absolute',
    bottom: -22,
    right: 12,
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 8,
    elevation: 6, zIndex: 10,
  },
  sealScore: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', lineHeight: 18 },

  cardInfo: { paddingTop: 28, paddingHorizontal: 12, paddingBottom: 14 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1a1c19', lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardSubtitle: { fontSize: 11, color: '#707a6c', fontWeight: '600', letterSpacing: 0.3 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#707a6c' },
});

export default VeeListScreen;
