import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { searchProductByName } from '../services/reliableAPI';
import { fetchCuratedProducts } from '../services/tursoDB';
import { getProductTypeFromCategories, analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';
import { calculateHealthScore } from '../utils/enhancedScoring';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';

const ON_SURFACE  = '#171717';
const ON_SURF_VAR = '#8E8E93';
const PRIMARY     = '#22A06B';
const GREEN_SOFT  = '#E7F5EE';
const GREEN_DARK  = '#1F7A50';

// Only "Good" products are shown in Search.
const MIN_SCORE = 70;

const kw = (p) => `${p?.name || ''} ${p?.categories || ''} ${p?.brand || ''}`.toLowerCase();
const isDrink = (p) => /drink|beverage|soda|juice|water|tea|coffee|cola|smoothie/.test(kw(p));
const isSnack = (p) => /snack|chip|crisp|cracker|biscuit|cookie|candy|chocolate|\bbar\b|popcorn|pretzel/.test(kw(p));
const isDairy = (p) => /dairy|milk|yogurt|yoghurt|cheese|kefir|skyr|cream/.test(kw(p));

const CHIPS = [
  { key: 'all',      label: 'All',        match: () => true },
  { key: 'cosmetic', label: 'Cosmetics',  match: (p) => p.productType === 'cosmetic' },
  { key: 'dairy',    label: 'Dairy',      match: (p) => p.productType === 'food' && isDairy(p) },
  { key: 'snack',    label: 'Snacks',     match: (p) => p.productType === 'food' && isSnack(p) },
  { key: 'drink',    label: 'Beverages',  match: (p) => p.productType === 'food' && isDrink(p) },
];

// Client-side score from data the search API already returned (no extra call).
const computeItemScore = (item) => {
  try {
    if (item.productType === 'cosmetic') {
      if (!item.ingredients_text) return null;
      const analysis = analyzeIngredients(item.ingredients_text, 'cosmetic');
      return analysis?.score != null ? Math.round(analysis.score) : null;
    }
    if (!item.nutriments || Object.keys(item.nutriments).length === 0) return null;
    const result = calculateHealthScore({
      product_name: item.name,
      nutriments: item.nutriments,
      ingredients_text: item.ingredients_text || '',
      categories: item.categories || '',
    }, null, null);
    return result?.score != null ? Math.round(result.score) : null;
  } catch {
    return null;
  }
};

// Product thumbnail: real image → seeded stock photo → plain box.
const ProductImg = React.memo(({ uri, seed }) => {
  const [stage, setStage] = React.useState(uri ? 0 : 1);
  const next = () => setStage((s) => Math.min(2, s + 1));
  if (stage === 2) {
    return (
      <View style={[st.thumb, st.thumbBox]}>
        <Ionicons name="cube-outline" size={20} color="#c7cdc7" />
      </View>
    );
  }
  const src =
    stage === 0
      ? uri
      : `https://picsum.photos/seed/${encodeURIComponent(String(seed || 'vee'))}/120/120`;
  return (
    <Image source={{ uri: src }} style={st.thumb} resizeMode="cover" onError={next} />
  );
});

const ScoreBadge = ({ score }) => (
  <View style={st.badge}>
    <Text style={st.badgeNum}>{score}</Text>
    <Text style={st.badgeLabel}>Good</Text>
  </View>
);

const SearchScreen = ({ navigation }) => {
  const insets = useSafeAreaInsetsWithFallback();
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [chip, setChip] = useState('all');
  const [topRated, setTopRated] = useState(true);

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const searching = query.trim().length >= 3;

  // ── Default feed (curated "Top Picks", Good only) ───────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const curated = await fetchCuratedProducts();
        const good = (curated || [])
          .map((p) => ({
            barcode: p.barcode,
            name: p.name,
            brand: p.brand,
            image: p.image || null,
            productType: p.productType || 'food',
            categories: p.category || '',
            score: Number(p.defaultScore) || 0,
          }))
          .filter((p) => p.score >= MIN_SCORE);
        if (alive) setFeed(good);
      } catch {
        if (alive) setFeed([]);
      } finally {
        if (alive) setFeedLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Search-as-you-type ─────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const runSearch = async (q) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    setChip('all');
    try {
      const res = await searchProductByName(q);
      if (id !== requestIdRef.current) return;
      const scored = (res.success ? res.data : [])
        .map((item) => ({ ...item, score: computeItemScore(item) }))
        .filter((item) => item.score != null && item.score >= MIN_SCORE)
        .map((item) => ({
          barcode: item.barcode,
          name: item.name,
          brand: item.brand,
          image: item.image || null,
          productType: item.productType,
          categories: item.categories || '',
          source: item.source || '',
          score: item.score,
        }));
      setResults(scored);
    } catch {
      if (id === requestIdRef.current) setResults([]);
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  };

  const openProduct = async (product) => {
    try {
      if (!product.barcode) {
        Alert.alert('Error', 'Product barcode not available.');
        return;
      }
      let productType = product.productType || 'food';
      if (!product.productType) {
        productType = getProductTypeFromCategories(
          product.categories || '', product.name || '', product.source || ''
        );
      }
      const isFood = productType === 'food';
      const subType = await AsyncStorage.getItem('subscriptionType');
      if (subType === 'Premium') {
        navigation.navigate(isFood ? 'Results' : 'CosmeticResults', {
          barcode: product.barcode, fromSearch: true, freeAIAccess: true,
        });
        return;
      }
      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      const used = usedStr ? parseInt(usedStr, 10) : 0;
      const hasAI = used < 2;
      if (used < 2) {
        await AsyncStorage.setItem('premiumTrialUsedToday', String(used + 1));
      }
      navigation.navigate(isFood ? 'Results' : 'CosmeticResults', {
        barcode: product.barcode, fromSearch: true, freeAIAccess: hasAI,
      });
    } catch {
      Alert.alert('Error', 'Failed to open product. Please try again.');
    }
  };

  // ── Derived list ───────────────────────────────────────────────────────
  const source = searching ? results : feed;
  const matcher = CHIPS.find((c) => c.key === chip)?.match || (() => true);
  let list = source.filter(matcher);
  if (topRated) list = [...list].sort((a, b) => b.score - a.score);

  const busy = searching ? loading : feedLoading;

  const renderItem = ({ item }) => (
    <TouchableOpacity style={st.card} onPress={() => openProduct(item)} activeOpacity={0.75}>
      <ProductImg uri={item.image} seed={item.barcode || item.name} />
      <View style={st.cardMid}>
        <Text style={st.cardName} numberOfLines={1}>{item.name}</Text>
        {item.brand ? <Text style={st.cardBrand} numberOfLines={1}>{item.brand}</Text> : null}
      </View>
      <ScoreBadge score={item.score} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={st.plusBtn}
          onPress={() => navigation.navigate('Home', { startScanning: true })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={ON_SURFACE} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Search</Text>
      </View>

      {/* Search input */}
      <View style={st.searchWrap}>
        <Ionicons name="search" size={18} color={ON_SURF_VAR} />
        <TextInput
          style={st.searchInput}
          placeholder="Product name or barcode"
          placeholderTextColor={ON_SURF_VAR}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={PRIMARY} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={ON_SURF_VAR} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category pills — single scrolling row. The wrapper clips the scroll
          area below its own height, so the horizontal scrollbar can never show. */}
      <View style={st.chipClip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.chipScroll}
          contentContainerStyle={st.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {CHIPS.map((c) => {
            const active = chip === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[st.chip, active && st.chipActive]}
                onPress={() => setChip(c.key)}
                activeOpacity={0.8}
              >
                <Text style={[st.chipText, active && st.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub-header: count + sort */}
      <View style={st.subRow}>
        <Text style={st.countText}>
          {busy ? 'Loading…' : `${list.length} product${list.length === 1 ? '' : 's'}`}
        </Text>
        <TouchableOpacity
          style={[st.sortBadge, topRated && st.sortBadgeActive]}
          onPress={() => setTopRated((v) => !v)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trending-up"
            size={13}
            color={topRated ? PRIMARY : ON_SURF_VAR}
          />
          <Text style={[st.sortText, topRated && st.sortTextActive]}>Top rated</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item, i) => item.barcode || String(i)}
        style={{ flex: 1 }}
        contentContainerStyle={[st.listContent, { paddingBottom: insets.bottom + 90 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          busy ? null : (
            <View style={st.empty}>
              <Ionicons name="leaf-outline" size={30} color="#d4d4d4" />
              <Text style={st.emptyText}>
                {searching ? 'No highly-rated products match that search.' : 'No products to show yet.'}
              </Text>
            </View>
          )
        }
      />
    </KeyboardAvoidingView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  plusBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F3F3',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: ON_SURFACE, letterSpacing: -0.3 },

  searchWrap: {
    marginHorizontal: 24,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: ON_SURFACE, padding: 0 },

  chipClip: { height: 40, marginTop: 16, overflow: 'hidden' },
  chipScroll: { height: 62 }, // taller than the clip → scrollbar sits in the hidden zone
  chipRow: { paddingHorizontal: 24, gap: 8, alignItems: 'flex-start' },
  chip: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#3F3F46' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 4,
  },
  countText: { fontSize: 13, fontWeight: '500', color: ON_SURF_VAR },
  sortBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F2F2F2',
  },
  sortBadgeActive: { backgroundColor: GREEN_SOFT },
  sortText: { fontSize: 12.5, fontWeight: '600', color: ON_SURF_VAR },
  sortTextActive: { color: PRIMARY },

  listContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 14 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
  },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F5F5F5' },
  thumbBox: { alignItems: 'center', justifyContent: 'center' },
  cardMid: { flex: 1 },
  cardName: { fontSize: 15.5, fontWeight: '700', color: ON_SURFACE, marginBottom: 2 },
  cardBrand: { fontSize: 13, fontWeight: '500', color: ON_SURF_VAR },

  badge: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: GREEN_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeNum: { fontSize: 16, fontWeight: '800', color: GREEN_DARK, lineHeight: 18 },
  badgeLabel: { fontSize: 9.5, fontWeight: '700', color: GREEN_DARK },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 10 },
  emptyText: { fontSize: 13.5, color: ON_SURF_VAR, textAlign: 'center', maxWidth: 260 },
});

export default SearchScreen;
