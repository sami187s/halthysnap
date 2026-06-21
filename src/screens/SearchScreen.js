import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { searchProductByName } from '../services/reliableAPI';
import { getProductTypeFromCategories } from '../utils/enhancedIngredientAnalyzer';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import { useTheme } from '../contexts/ThemeContext';

// ── Dark theme tokens ─────────────────────────────────────────────────
const BG           = '#0a0a0a';
const SURFACE_LOW  = '#111111';
const SURFACE_MID  = '#1a1a1a';
const SURFACE_HIGH = '#222222';
const ON_SURFACE   = '#ffffff';
const ON_SURF_VAR  = '#a0a0a0';
const OUTLINE_VAR  = '#333333';

const FILTER_TABS = [
  { key: 'all',      label: 'All',      icon: 'grid-outline'      },
  { key: 'food',     label: 'Food',     icon: 'nutrition-outline' },
  { key: 'cosmetic', label: 'Cosmetic', icon: 'sparkles-outline'  },
];

// Renders a product image with onError fallback to the type icon placeholder
const ProductImg = React.memo(({ uri, typeIcon, theme: t }) => {
  const [err, setErr] = React.useState(false);
  if (!uri || err) {
    return (
      <View style={[st.productImg, st.productImgPlaceholder, { backgroundColor: t?.bgIcon || '#1a1a1a' }]}>
        <Ionicons name={typeIcon} size={24} color={t?.textMuted || '#666'} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={st.productImg}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
  );
});

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [hasSearched, setHasSearched]       = useState(false);
  const [isPremium, setIsPremium]           = useState(true);
  const [remainingSearches, setRemainingSearches] = useState(2);
  const [activeFilter, setActiveFilter]     = useState('all');
  const [resultCounts, setResultCounts]     = useState({ food: 0, cosmetic: 0 });

  const safeAreaInsets = useSafeAreaInsetsWithFallback();
  const { theme, isDark } = useTheme();

  useEffect(() => { checkSearchStatus(); }, []);
  useFocusEffect(React.useCallback(() => { checkSearchStatus(); }, []));

  const checkSearchStatus = async () => {
    try {
      const subType = await AsyncStorage.getItem('subscriptionType');
      const isPrem  = subType === 'Premium';
      setIsPremium(isPrem);
      if (isPrem) {
        setRemainingSearches(999);
      } else {
        const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
        const used = usedStr ? parseInt(usedStr) : 0;
        setRemainingSearches(Math.max(0, 2 - used));
      }
    } catch (e) { /* ignore */ }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) {
      Alert.alert('Search Error', 'Please enter at least 3 characters to search.');
      return;
    }

    // Check connectivity before making any network calls — on iOS this
    // gives a clear error instead of a confusing timeout/connection failure.
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert(
          'No Internet',
          'Your device is not connected to the internet. Please check your Wi-Fi or mobile data and try again.'
        );
        return;
      }
    } catch { /* NetInfo unavailable — proceed anyway */ }

    setLoading(true);
    setHasSearched(true);
    try {
      const result = await searchProductByName(searchQuery.trim());
      if (result.success) {
        setSearchResults(result.data);
        setResultCounts(result.counts || { food: 0, cosmetic: 0 });
        setActiveFilter('all');
      } else {
        setSearchResults([]);
        Alert.alert('No Results', result.error);
      }
    } catch (e) {
      Alert.alert('Search Error', 'Failed to search products. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (product) => {
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
      const isPrem  = subType === 'Premium';
      if (isPrem) {
        navigation.navigate(isFood ? 'Results' : 'CosmeticResults', {
          barcode: product.barcode, fromSearch: true, freeAIAccess: true,
        });
        return;
      }
      const usedStr = await AsyncStorage.getItem('premiumTrialUsedToday');
      let used = usedStr ? parseInt(usedStr) : 0;
      const hasAI = used < 2;
      if (used < 2) {
        const newUsed = used + 1;
        await AsyncStorage.setItem('premiumTrialUsedToday', newUsed.toString());
        setRemainingSearches(2 - newUsed);
        if (newUsed >= 2) {
          setTimeout(() => {
            Alert.alert(
              'Premium Trial Complete',
              "You've used your 2 free premium searches.\n\nUpgrade to Premium for unlimited AI analysis!",
              [
                { text: 'Continue Free', style: 'cancel' },
                { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
              ]
            );
          }, 1500);
        }
      }
      navigation.navigate(isFood ? 'Results' : 'CosmeticResults', {
        barcode: product.barcode, fromSearch: true, freeAIAccess: hasAI,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to open product. Please try again.');
    }
  };

  const filteredResults = activeFilter === 'all'
    ? searchResults
    : searchResults.filter(i => i.productType === activeFilter);

  const renderProductItem = ({ item, index }) => {
    const isFood    = item.productType === 'food';
    const typeIcon  = isFood ? 'nutrition-outline' : 'sparkles-outline';
    const typeLabel = isFood ? 'Food' : 'Cosmetic';
    const isLast    = index === filteredResults.length - 1;

    return (
      <TouchableOpacity
        style={[st.productItem, { backgroundColor: theme.bgCard, borderColor: theme.border }, isLast && { borderBottomWidth: 0 }]}
        onPress={() => handleProductSelect(item)}
        activeOpacity={0.7}
      >
        {/* Product image */}
        <View style={st.productImgWrap}>
          <ProductImg uri={item.image} typeIcon={typeIcon} theme={theme} />
          <View style={[st.typeDot, { backgroundColor: isFood ? '#2E7D32' : '#6B3FA0', borderColor: theme.bgCard }]}>
            <Ionicons name={typeIcon} size={8} color="#fff" />
          </View>
        </View>

        {/* Product details */}
        <View style={st.productDetails}>
          <Text style={[st.productName, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
          {item.brand ? (
            <Text style={[st.productBrand, { color: theme.textMuted }]} numberOfLines={1}>{item.brand}</Text>
          ) : null}
          <View style={[st.typeChip, { backgroundColor: isFood ? 'rgba(46,125,50,0.15)' : 'rgba(107,63,160,0.15)' }]}>
            <Ionicons name={typeIcon} size={11} color={isFood ? '#4CAF50' : '#9C6ADE'} />
            <Text style={[st.typeChipText, { color: isFood ? '#4CAF50' : '#9C6ADE' }]}>{typeLabel}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={st.emptyState}>
        <Ionicons
          name={hasSearched ? 'search-outline' : 'leaf-outline'}
          size={52}
          color={theme.textDim}
        />
        <Text style={[st.emptyTitle, { color: theme.text }]}>
          {hasSearched ? 'No products found' : 'Search for products'}
        </Text>
        <Text style={[st.emptyDesc, { color: theme.textMuted }]}>
          {hasSearched
            ? 'Try different keywords or check the spelling'
            : 'Enter a product name to check its health score and ingredients'}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* ── FIXED HEADER ─────────────────────────────────── */}
      <View style={[st.header, { backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(245,245,245,0.97)', borderBottomColor: theme.headerBorder }]}>
        <View style={st.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: theme.text }]}>Search Products</Text>
        </View>
      </View>

      {/* ── SEARCH BAR ──────────────────────────────────── */}
      <View style={[st.searchBar, { marginTop: Platform.OS === 'ios' ? 90 : 72, backgroundColor: theme.bg }]}>
        <View style={[st.searchInputWrap, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.textMuted} />
          <TextInput
            style={[st.searchInput, { color: theme.text }]}
            placeholder="Search food, cosmetics..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[st.searchBtn, { opacity: searchQuery.trim().length < 3 ? 0.4 : 1 }]}
          onPress={handleSearch}
          disabled={searchQuery.trim().length < 3 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#000000" />
            : <Text style={st.searchBtnText}>Search</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── PREMIUM STATUS PILL ─────────────────────────── */}
      <View style={[st.statusPill, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Ionicons
          name={isPremium ? 'star' : remainingSearches > 0 ? 'sparkles' : 'infinite'}
          size={13}
          color={theme.textMuted}
        />
        <Text style={[st.statusText, { color: theme.textMuted }]}>
          {isPremium
            ? 'Premium · Unlimited AI searches'
            : remainingSearches > 0
              ? `${remainingSearches} AI trial search${remainingSearches === 1 ? '' : 'es'} left`
              : 'Unlimited free searches · Upgrade for AI'}
        </Text>
      </View>

      {/* ── FILTER TABS ─────────────────────────────────── */}
      {hasSearched && searchResults.length > 0 && (
        <View style={st.filterRow}>
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            const count = tab.key === 'all'
              ? searchResults.length
              : tab.key === 'food'
                ? resultCounts.food
                : resultCounts.cosmetic;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.filterTab, { backgroundColor: theme.bgCard, borderColor: theme.border }, isActive && st.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon} size={13} color={isActive ? '#000000' : theme.textMuted} />
                <Text style={[st.filterTabText, { color: theme.textMuted }, isActive && st.filterTabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[st.filterBadge, { backgroundColor: theme.bgIcon }, isActive && st.filterBadgeActive]}>
                  <Text style={[st.filterBadgeText, { color: theme.textMuted }, isActive && st.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── RESULTS LIST ────────────────────────────────── */}
      <FlatList
        data={filteredResults}
        renderItem={renderProductItem}
        keyExtractor={(item, i) => item.barcode || i.toString()}
        style={{ flex: 1 }}
        contentContainerStyle={st.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* ── BOTTOM HINT ─────────────────────────────────── */}
      <View style={[st.bottomHint, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <Text style={[st.bottomHintText, { color: theme.textMuted }]}>Can't find it? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
          <Text style={[st.bottomHintLink, { color: theme.text }]}>Try scanning the barcode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  // Header — matches HomeScreen dark header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240,240,240,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: BG,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE_LOW,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ON_SURFACE,
  },
  searchBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  searchBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: SURFACE_LOW,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: ON_SURF_VAR,
    letterSpacing: 0.5,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    backgroundColor: SURFACE_LOW,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  filterTabActive: {
    backgroundColor: '#ffffff',
    borderColor: 'transparent',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: ON_SURF_VAR,
    letterSpacing: 0.5,
  },
  filterTabTextActive: {
    color: '#000000',
  },
  filterBadge: {
    backgroundColor: SURFACE_HIGH,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ON_SURF_VAR,
  },
  filterBadgeTextActive: {
    color: '#000000',
  },

  // Results list
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Product item
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: SURFACE_LOW,
    gap: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  productImgWrap: { position: 'relative' },
  productImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  productImgPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: SURFACE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SURFACE_LOW,
  },
  productDetails: { flex: 1 },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: ON_SURFACE,
    marginBottom: 3,
    lineHeight: 20,
  },
  productBrand: {
    fontSize: 12,
    color: ON_SURF_VAR,
    marginBottom: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ON_SURFACE,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: ON_SURF_VAR,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Bottom hint
  bottomHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: BG,
  },
  bottomHintText: {
    fontSize: 13,
    color: ON_SURF_VAR,
  },
  bottomHintLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

export default SearchScreen;
