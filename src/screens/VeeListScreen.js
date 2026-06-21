/**
 * Vee List Screen - Elite Selections (AURA NOIR Design)
 * Curated list of highest-rated products in 2Ã—2 dark grid
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
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';

const CATEGORIES = ['All', 'Food', 'Cosmetic', 'Beverage'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SCORE_CACHE_KEY = 'vee_list_score_cache';

/* â”€â”€â”€â”€â”€ Pre-verified elite products â”€â”€â”€â”€â”€ */
const ELITE_PRODUCTS = [
  {
    id: '3274080005003',
    barcode: '3274080005003',
    name: 'Natural Spring Water',
    brand: 'EVIAN',
    category: 'BEVERAGE',
    filterCat: 'Beverage',
    tag: 'MINERALS',
    defaultScore: 95,
    image: 'https://media.sobeys.com/original/061314000056_VOILA_7beca970b0ad2512141beb2e92bd8f3cd5343355.JPG',
    productType: 'food',
  },
  {
    id: '7394376616504',
    barcode: '7394376616504',
    name: 'Oat Drink Original',
    brand: 'OATLY',
    category: 'BEVERAGE',
    filterCat: 'Beverage',
    tag: 'PLANT-BASED',
    defaultScore: 71,
    image: 'https://digital.loblaws.ca/PCX/21560949_EA/en/1/21560949_en_front_800.png',
    productType: 'food',
  },
  {
    id: '5000159484695',
    barcode: '5000159484695',
    name: 'Porridge Oats',
    brand: 'QUAKER',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'WHOLE GRAIN',
    defaultScore: 78,
    image: 'https://m.media-amazon.com/images/I/51eKuOrpExL.jpg',
    productType: 'food',
  },
  {
    id: '3228857000166',
    barcode: '3228857000166',
    name: 'Organic White Quinoa',
    brand: 'TIPIAK',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'COMPLETE AMINO',
    defaultScore: 84,
    image: 'https://m.media-amazon.com/images/I/81DQ8tL64oL._AC_UF1000,1000_QL80_.jpg',
    productType: 'food',
  },
  {
    id: '5010119001133',
    barcode: '5010119001133',
    name: 'Smooth Almond Butter',
    brand: 'MERIDIAN',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'PURE Â· RAW',
    defaultScore: 83,
    image: 'https://www.britsuperstore.com/media/catalog/product/cache/7/image/225x225/602f0fa2c1f0d1ba5e241f914e856ff9/m/e/meridian_organic_smooth_almond_butter_170g-1762849553.jpg',
    productType: 'food',
  },
  {
    id: '5060148120057',
    barcode: '5060148120057',
    name: 'Organic Spirulina Powder',
    brand: 'NATURYA',
    category: 'FOOD',
    filterCat: 'Food',
    tag: 'SUPERFOOD',
    defaultScore: 92,
    image: 'https://images.hollandandbarrettimages.co.uk/productimages/HB/724/094373_D.jpg',
    productType: 'food',
  },
  {
    id: '3337875597838',
    barcode: '3337875597838',
    name: 'Toleriane Sensitive Cream',
    brand: 'LA ROCHE-POSAY',
    category: 'COSMETIC',
    filterCat: 'Cosmetic',
    tag: 'SENSITIVE SKIN',
    defaultScore: 76,
    image: 'https://www.laroche-posay.ca/dw/image/v2/AATL_PRD/on/demandware.static/-/Sites-larocheposay-master-catalog/default/dw9ff4849c/2022/3337875578486/lrp_toleriane-sensitive-40ml-3337875578486-00.jpg',
    productType: 'cosmetic',
  },
  {
    id: '3433422408159',
    barcode: '3433422408159',
    name: 'Sensibio H2O Micellar Water',
    brand: 'BIODERMA',
    category: 'COSMETIC',
    filterCat: 'Cosmetic',
    tag: 'GENTLE CLEANSE',
    defaultScore: 74,
    image: 'https://boots.scene7.com/is/image/Boots/10290141?fmt=jpeg&wid=400',
    productType: 'cosmetic',
  },
];

const VeeListScreen = () => {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [scores, setScores] = useState({});

  // Load cached scores, then refresh from API in background
  useEffect(() => {
    let mounted = true;

    const loadScores = async () => {
      try {
        const cached = await AsyncStorage.getItem(SCORE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (mounted) setScores(parsed);
        }
      } catch (e) {}

      const newScores = {};
      const fetchOne = async (product) => {
        try {
          const productData = await fetchProductByBarcode(product.barcode);
          if (!productData || !productData.product_name) return;
          if (product.productType === 'cosmetic') {
            const result = await analyzeIngredients(
              productData.ingredients_text || '', 'cosmetic', {}, productData
            );
            newScores[product.barcode] = Math.round(result?.score ?? 0);
          } else {
            const result = await analyzeIngredients(
              productData.ingredients_text || '', 'food',
              productData.nutriments || {}, productData
            );
            if (productData.nutriments) {
              const healthScore = calculateHealthScore(productData, null, null);
              newScores[product.barcode] = Math.round(healthScore?.score ?? result?.score ?? 0);
            } else {
              newScores[product.barcode] = Math.round(result?.score ?? 0);
            }
          }
        } catch (e) {}
      };

      await Promise.all(ELITE_PRODUCTS.map(fetchOne));

      if (mounted && Object.keys(newScores).length > 0) {
        setScores(newScores);
        try { await AsyncStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(newScores)); } catch (e) {}
      }
    };

    loadScores();
    return () => { mounted = false; };
  }, []);

  const filteredProducts =
    activeCategory === 'All'
      ? ELITE_PRODUCTS
      : ELITE_PRODUCTS.filter((p) => p.filterCat === activeCategory);

  const handleProductPress = (product) => {
    if (product.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', { barcode: product.barcode, fromSearch: true });
    } else {
      navigation.navigate('Results', { barcode: product.barcode, fromSearch: true });
    }
  };

  const ScoreBadge = ({ score }) => {
    const isHigh = score >= 70;
    return (
      <View style={[styles.scoreBadge, isHigh ? styles.scoreBadgeHigh : styles.scoreBadgeLow]}>
        <Text style={[styles.scoreText, isHigh ? styles.scoreTextHigh : styles.scoreTextLow]}>
          {score}
        </Text>
      </View>
    );
  };

  const renderProductCard = ({ item, index }) => {
    const score = scores[item.barcode] ?? item.defaultScore;
    const isLeftCard = index % 2 === 0;
    return (
      <View
        style={[styles.card, isLeftCard ? styles.cardLeft : styles.cardRight]}
      >
        {/* Image area */}
        <View style={styles.cardImageWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="contain" />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="leaf-outline" size={32} color="#474747" />
            </View>
          )}
          {/* Score badge top-right */}
          <View style={styles.scoreBadgeWrap}>
            <ScoreBadge score={score} />
          </View>
        </View>

        {/* Info area */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardTagWrap}>
            <Text style={styles.cardTag}>{item.tag}</Text>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CURATED SELECTION</Text>
        <Text style={styles.heroTitle}>{'ELITE\nCHOICES'}</Text>
        <Text style={styles.heroDesc}>
          A clinical audit of the marketplace. Only products meeting our Tier-1 standards are archived here.
        </Text>
      </View>

      {/* Filter Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterNav}
        contentContainerStyle={styles.filterNavContent}
      >
        {CATEGORIES.map((cat) => {
          const label = cat === 'All' ? 'ALL PRODUCTS' : cat.toUpperCase();
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#131313" />
      {filteredProducts.length === 0 ? (
        <>
          <ListHeader />
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No products in this category</Text>
          </View>
        </>
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
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },

  /* â”€â”€ Hero â”€â”€ */
  hero: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 24,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c6c6c6',
    letterSpacing: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
    lineHeight: 54,
    marginBottom: 14,
  },
  heroDesc: {
    fontSize: 13,
    color: '#c6c6c6',
    lineHeight: 20,
    maxWidth: 260,
  },

  /* â”€â”€ Filter Navigation â”€â”€ */
  filterNav: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71,71,71,0.4)',
    marginBottom: 12,
  },
  filterNavContent: {
    paddingHorizontal: 16,
    gap: 24,
    paddingBottom: 0,
  },
  filterTab: {
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  filterTabActive: {
    borderBottomColor: '#ffffff',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#919191',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },

  /* â”€â”€ Grid â”€â”€ */
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },

  /* â”€â”€ Product Card â”€â”€ */
  card: {
    flex: 1,
    backgroundColor: '#1b1b1b',
    overflow: 'hidden',
  },
  cardLeft: {},
  cardRight: {},
  cardImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#353535',
  },
  scoreBadgeWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,19,19,0.8)',
  },
  scoreBadgeHigh: {
    borderColor: '#4CAF50',
  },
  scoreBadgeLow: {
    borderColor: '#919191',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '900',
  },
  scoreTextHigh: {
    color: '#4CAF50',
  },
  scoreTextLow: {
    color: '#919191',
  },
  cardInfo: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71,71,71,0.15)',
  },
  cardBrand: {
    fontSize: 8,
    fontWeight: '700',
    color: '#c6c6c6',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e2e2',
    letterSpacing: -0.3,
    lineHeight: 17,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardTagWrap: {
    alignSelf: 'flex-start',
  },
  cardTag: {
    fontSize: 8,
    fontWeight: '700',
    color: '#e2e2e2',
    backgroundColor: '#353535',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  /* â”€â”€ Empty â”€â”€ */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#919191',
  },
});

export default VeeListScreen;
