/**
 * Vee List Screen - Top Products
 * Curated list of highest-rated products, reachable from Settings.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCuratedProducts } from '../services/tursoDB';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';

const CACHE_KEY = '@vee_curated_cache';

const PRIMARY      = '#27a567';
const PRIMARY_TINT = 'rgba(39,165,103,0.10)';
const AMBER        = '#f5a623';
const AMBER_TINT   = 'rgba(245,166,35,0.10)';
const RED          = '#e74c3c';
const RED_TINT     = 'rgba(231,76,60,0.10)';

const scoreBand = (score) => {
  if (score >= 75) return { color: PRIMARY, bg: PRIMARY_TINT };
  if (score >= 50) return { color: AMBER,   bg: AMBER_TINT   };
  return { color: RED, bg: RED_TINT };
};

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

// A single grid card — fades + rises on mount with a small per-card delay.
const ProductCard = ({ item, index, onPress }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const [imgSrc, setImgSrc] = useState(item.image);
  const [fallbackVariant, setFallbackVariant] = useState(1);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgSrc(item.image);
    setFallbackVariant(1);
    setImgFailed(false);
  }, [item.id, item.image]);

  useEffect(() => {
    const delay = Math.min(index, 10) * 50;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleImageError = () => {
    const next = buildOffUrl(item.barcode, fallbackVariant);
    if (next && imgSrc !== next) {
      setImgSrc(next);
      setFallbackVariant(prev => prev + 1);
    } else {
      setImgFailed(true);
    }
  };

  const score = item.defaultScore;
  const band = scoreBand(score);

  return (
    <Animated.View style={[styles.cardWrap, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.thumbWrap}>
          {imgSrc && !imgFailed ? (
            <Image
              source={{ uri: imgSrc }}
              style={styles.thumb}
              resizeMode="contain"
              onError={handleImageError}
            />
          ) : (
            <Ionicons name="leaf-outline" size={28} color="#c7cdc7" />
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: band.bg }]}>
          <Text style={[styles.scoreBadgeNum, { color: band.color }]}>{score}</Text>
          <Text style={[styles.scoreBadgeMax, { color: band.color }]}>/100</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SkeletonGrid = () => (
  <View style={styles.skeletonGrid}>
    {[0, 1, 2, 3].map(i => (
      <View key={i} style={styles.skeletonCard} />
    ))}
  </View>
);

const VeeListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsetsWithFallback();
  const [activeCategory, setActiveCategory] = useState('All');
  const [customProducts, setCustomProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [topRated, setTopRated] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          // Step 1: Show cached products INSTANTLY (no waiting for network)
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached && !cancelled) {
            setCustomProducts(JSON.parse(cached));
            setLoading(false);
          }
          // Step 2: Refresh from Turso in background, update cache
          const fresh = await fetchCuratedProducts();
          if (!cancelled) {
            setCustomProducts(fresh);
            setLoading(false);
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
          }
        } catch {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  // Merge curated picks first, then hardcoded elite list (no duplicates)
  const allProducts = [
    ...customProducts,
    ...ELITE_PRODUCTS.filter(e => !customProducts.some(c => c.barcode === e.barcode)),
  ];

  // Category chips derived from whatever categories actually exist in the data
  const categories = ['All', ...Array.from(new Set(allProducts.map(p => p.filterCat).filter(Boolean)))];

  let filteredProducts = activeCategory === 'All'
    ? allProducts
    : allProducts.filter((p) => p.filterCat === activeCategory);

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredProducts = filteredProducts.filter((p) =>
      (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    );
  }

  if (topRated) {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.defaultScore || 0) - (a.defaultScore || 0));
  }

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

  const renderProductCard = ({ item, index }) => (
    <ProductCard item={item} index={index} onPress={() => handleProductPress(item)} />
  );

  const showSkeleton = loading && allProducts.length === 0;

  const ListHeader = () => (
    <>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#a3a8a3" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products"
          placeholderTextColor="#a3a8a3"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.chipRow}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarCount}>
          {showSkeleton ? 'Loading…' : `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`}
        </Text>
        <TouchableOpacity
          style={[styles.sortToggle, topRated && styles.sortToggleActive]}
          onPress={() => setTopRated(v => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name="trending-up" size={14} color={topRated ? PRIMARY : '#737373'} />
          <Text style={[styles.sortToggleText, topRated && styles.sortToggleTextActive]}>Top rated</Text>
        </TouchableOpacity>
      </View>

      {showSkeleton && <SkeletonGrid />}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#171717" />
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <Ionicons name="ribbon" size={20} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Top Products</Text>
          <Text style={styles.headerSub}>Ranked by health score</Text>
        </View>
      </View>

      {showSkeleton ? (
        <View style={{ flex: 1 }}>
          <ListHeader />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={28} color="#c7cdc7" />
              </View>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyDesc}>Try a different category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f3f3',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#27a567',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#171717', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#a3a8a3', marginTop: 1 },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#171717', padding: 0 },

  // Category chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#27a567' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#737373' },
  chipTextActive: { color: '#FFFFFF' },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  toolbarCount: { fontSize: 12, color: '#a3a8a3' },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f5f5f5',
  },
  sortToggleActive: { backgroundColor: 'rgba(39,165,103,0.08)' },
  sortToggleText: { fontSize: 12, fontWeight: '600', color: '#737373' },
  sortToggleTextActive: { color: '#27a567' },

  // Grid
  gridContent: { paddingHorizontal: 20, paddingBottom: 100 },
  row: { gap: 12, marginBottom: 12 },
  cardWrap: { flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f5f5f5',
    padding: 12,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  thumb: { width: '100%', height: '100%' },
  cardName: { fontSize: 13, fontWeight: '600', color: '#171717', marginBottom: 2 },
  cardBrand: { fontSize: 11, color: '#a3a8a3', marginBottom: 8 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scoreBadgeNum: { fontSize: 14, fontWeight: '800' },
  scoreBadgeMax: { fontSize: 11, fontWeight: '600', opacity: 0.7 },

  // Skeleton loading
  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 12,
  },
  skeletonCard: {
    width: '47%', height: 190,
    borderRadius: 16, backgroundColor: '#f7f7f5',
    marginBottom: 12,
  },

  // Empty state
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#a3a8a3' },
});

export default VeeListScreen;
