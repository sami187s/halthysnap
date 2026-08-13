import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const BEST_PRODUCTS_KEY = '@vee_curated_products';
import { Ionicons } from '@expo/vector-icons';
import ScoreRing from '../components/ScoreRing';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import {
  getHistory,
  deleteHistoryItem,
  clearHistory,
  searchHistory,
  getHistoryStats,
  checkPremiumStatus,
} from '../utils/historyManager';

const HistoryImage = ({ item, theme }) => {
  const [failed, setFailed] = React.useState(false);
  const icon = item.productType === 'food' ? 'nutrition-outline' : 'sparkles-outline';
  if (!item.productImage || failed) {
    return (
      <View style={[s.imgWrap, { backgroundColor: theme.bgIcon }]}>
        <Ionicons name={icon} size={22} color={theme.textMuted} />
      </View>
    );
  }
  return (
    <View style={[s.imgWrap, { backgroundColor: theme.bgIcon }]}>
      <Image
        source={{ uri: item.productImage }}
        style={s.img}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
};

const HistoryScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsetsWithFallback();
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [curatedIds, setCuratedIds] = useState(new Set());
  const [isDevMode, setIsDevMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadCuratedIds();
      AsyncStorage.getItem('@vee_dev_mode').then(v => setIsDevMode(v === 'true'));
      return () => {};
    }, [])
  );

  const loadCuratedIds = async () => {
    try {
      const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setCuratedIds(new Set(list.map(p => p.barcode)));
    } catch { setCuratedIds(new Set()); }
  };

  const handleAddToBest = async (item) => {
    try {
      const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const already = list.some(p => p.barcode === item.barcode);
      if (already) {
        Alert.alert('Already in Best', `"${item.productName}" is already in the Best section.`);
        return;
      }
      const entry = {
        id: item.barcode,
        barcode: item.barcode,
        name: item.productName,
        brand: item.brand || 'Unknown Brand',
        category: item.productType === 'food' ? 'FOOD' : 'COSMETIC',
        filterCat: item.productType === 'food' ? 'Food' : 'Cosmetic',
        tag: 'TOP PICK',
        defaultScore: Math.round(item.score || 0),
        image: item.productImage || null,
        productType: item.productType || 'food',
        ingredients: item.ingredients || '',
        nutriments: item.nutriments || {},
      };
      const updated = [entry, ...list];
      await AsyncStorage.setItem(BEST_PRODUCTS_KEY, JSON.stringify(updated));
      setCuratedIds(prev => new Set([...prev, item.barcode]));
      Alert.alert('Added to Best! 🏆', `"${item.productName}" now appears in the Best section for all users.`);
    } catch (e) {
      Alert.alert('Error', 'Could not add product. Please try again.');
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const premium = await checkPremiumStatus();
      setIsPremium(premium);

      const result = await getHistory();
      if (result.success) {
        setHistory(result.data);
        setFilteredHistory(result.data);
      }

      const statsResult = await getHistoryStats();
      if (statsResult.success) setStats(statsResult.stats);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setFilteredHistory(history); return; }
    const result = await searchHistory(query);
    if (result.success) setFilteredHistory(result.data);
  };

  const handleDeleteItem = (itemId, productName) => {
    Alert.alert('Delete Scan', `Remove "${productName}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const result = await deleteHistoryItem(itemId);
          if (result.success) await loadHistory();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Delete all scan history? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          const result = await clearHistory();
          if (result.success) await loadHistory();
        },
      },
    ]);
  };

  const handleItemPress = (item) => {
    const preloadedData = {
      product_name: item.productName,
      brands: item.brand || '',
      image_url: item.productImage || null,
      ingredients_text: item.ingredients || '',
      nutriments: item.nutriments || {},
      curatedScore: item.score || 0,
    };

    if (item.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', {
        barcode: item.barcode,
        fromHistory: true,
        preloadedData,
      });
    } else {
      navigation.navigate('Results', {
        barcode: item.barcode,
        fromHistory: true,
        preloadedData,
      });
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const HEADER_H = Platform.OS === 'ios' ? 90 : 72;
  const HEADER_PT = Platform.OS === 'ios' ? 48 : 28;

  // ── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: 'rgba(251,251,249,0.92)', borderBottomColor: theme.headerBorder }]}>
          <View style={s.headerLeft}>
            <View style={s.avatar}><Ionicons name="person" size={18} color="#067A4F" /></View>
            <Text style={s.headerTitle}>Vee</Text>
          </View>
          <Ionicons name="notifications-outline" size={22} color="#067A4F" />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#067A4F" />
        </View>
      </View>
    );
  }

  // ── Main ───────────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const isLast = index === filteredHistory.length - 1;
    return (
      <TouchableOpacity
        style={[s.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, isLast && { marginBottom: 0 }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.75}
      >
        {/* Image */}
        <HistoryImage item={item} theme={theme} />

        {/* Info */}
        <View style={s.rowInfo}>
          <Text style={[s.rowName, { color: theme.text }]} numberOfLines={2}>{item.productName}</Text>
          <View style={s.rowMeta}>
            <Text style={[s.rowType, { color: theme.textMuted }]}>
              {item.productType === 'food' ? 'FOOD' : 'COSMETIC'}
            </Text>
            <View style={s.rowDot} />
            <Text style={[s.rowDate, { color: theme.textMuted }]}>{formatDate(item.scannedAt)}</Text>
          </View>
        </View>

          {/* Score + actions */}
          <View style={s.rowRight}>
            <ScoreRing score={item.score} size={46} stroke={5} />
            <TouchableOpacity
              onPress={() => handleAddToBest(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={s.trophyBtn}
            >
              <Ionicons
                name={curatedIds.has(item.barcode) ? 'trophy' : 'trophy-outline'}
                size={16}
                color={curatedIds.has(item.barcode) ? '#067A4F' : theme.textDim}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id, item.productName)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={s.trashBtn}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textDim} />
            </TouchableOpacity>
          </View>
      </TouchableOpacity>
    );
  };

  const renderStats = () => {
    if (!stats || stats.totalScans === 0) return null;
    return (
      <View style={[s.statsRow, { borderBottomColor: theme.border }]}>
        {[
          { value: stats.totalScans, label: 'SCANS', color: theme.text },
          { value: stats.healthyCount, label: 'HEALTHY', color: '#067A4F' },
          { value: stats.moderateCount, label: 'MODERATE', color: '#F59E0B' },
          { value: stats.riskyCount, label: 'RISKY', color: '#EF4444' },
        ].map(({ value, label, color }) => (
          <View key={label} style={s.statCell}>
            <Text style={[s.statNum, { color }]}>{value}</Text>
            <Text style={[s.statLabel, { color: theme.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <Ionicons name="time-outline" size={64} color={theme.textDim} />
      <Text style={[s.emptyTitle, { color: theme.text }]}>No scans yet</Text>
      <Text style={[s.emptyDesc, { color: theme.textMuted }]}>
        Products you scan will appear here
      </Text>
      <TouchableOpacity style={s.scanNowBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
        <Text style={s.scanNowText}>SCAN NOW</Text>
        <Ionicons name="barcode-outline" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const canGoBack = navigation.canGoBack();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: 'rgba(251,251,249,0.92)', borderBottomColor: theme.headerBorder }]}>
        <View style={s.headerLeft}>
          <View style={s.avatar}><Ionicons name="person" size={18} color="#067A4F" /></View>
          <Text style={s.headerTitle}>Vee</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="notifications-outline" size={22} color="#067A4F" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.list, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          <>
            {/* Search */}
            <View style={[s.searchWrap, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                style={[s.searchInput, { color: theme.text }]}
                placeholder="Search products..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {/* Stats */}
            {renderStats()}
            {/* Count label */}
            {filteredHistory.length > 0 && (
              <View style={s.countRow}>
                <Text style={[s.countLabel, { color: theme.textMuted }]}>
                  {filteredHistory.length} {filteredHistory.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
                </Text>
                {history.length > 0 && (
                  <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#067A4F" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F2EC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(13,99,27,0.12)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#067A4F',
    letterSpacing: -0.3,
  },
  bellBtn: {
    padding: 4,
  },

  // ── Search ──────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 20,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },

  // ── Stats ────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    marginBottom: 4,
  },
  statCell: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 3 },

  // ── Count row ────────────────────────────────────────
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  countLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── List ────────────────────────────────────────────
  list: { paddingHorizontal: 20 },

  // ── Row item ────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  imgWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#EEEEE9',
  },
  img: { width: 64, height: 64 },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 14, fontWeight: '600', lineHeight: 19, color: '#171717' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowType: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#737373' },
  rowDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#A3A3A3' },
  rowDate: { fontSize: 11, fontWeight: '400', color: '#737373' },
  rowRight: { alignItems: 'center', gap: 8, flexShrink: 0 },
  trophyBtn: { padding: 2, marginBottom: 4 },
  trashBtn: { padding: 2 },

  // ── Empty ────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginTop: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21, fontWeight: '400' },
  scanNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#067A4F',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    gap: 8,
    marginTop: 8,
  },
  scanNowText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 2 },

  // ── Premium Gate ─────────────────────────────────────
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  gateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  gateDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '400' },
  featureBox: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontWeight: '500' },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  upgradeBtnText: { fontSize: 11, fontWeight: '800', color: '#000000', letterSpacing: 2 },
});

export default HistoryScreen;
