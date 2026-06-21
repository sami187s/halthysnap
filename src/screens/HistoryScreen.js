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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      return () => {};
    }, [])
  );

  const loadHistory = async () => {
    try {
      setLoading(true);
      const premium = await checkPremiumStatus();
      setIsPremium(premium);

      if (!premium) { setLoading(false); return; }

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
    if (item.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', {
        barcode: item.barcode,
        productName: item.productName,
        productImage: item.productImage,
        ingredients: item.ingredients,
        fromHistory: true,
      });
    } else {
      navigation.navigate('Results', {
        barcode: item.barcode,
        productName: item.productName,
        productImage: item.productImage,
        fromHistory: true,
      });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#4CAF50';
    if (score >= 40) return '#FF9800';
    return '#F44336';
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
        <View style={[s.header, { height: HEADER_H, paddingTop: HEADER_PT, backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(245,245,245,0.97)', borderBottomColor: theme.headerBorder }]}>
          <Text style={[s.headerTitle, { color: theme.text }]}>SCAN HISTORY</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  // ── Premium Gate ───────────────────────────────────────
  if (!isPremium) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[s.header, { height: HEADER_H, paddingTop: HEADER_PT, backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(245,245,245,0.97)', borderBottomColor: theme.headerBorder }]}>
          <Text style={[s.headerTitle, { color: theme.text }]}>SCAN HISTORY</Text>
        </View>
        <View style={[s.gateWrap, { paddingTop: HEADER_H }]}>
          <View style={[s.gateIconWrap, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="lock-closed" size={36} color="#4CAF50" />
          </View>
          <Text style={[s.gateTitle, { color: theme.text }]}>Premium Only</Text>
          <Text style={[s.gateDesc, { color: theme.textMuted }]}>
            Keep track of every product you scan — full history, health stats, and search.
          </Text>

          <View style={[s.featureBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            {['Up to 1000 saved scans', 'Search your history', 'Health score stats', 'Unlimited AI analysis'].map(f => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark" size={15} color="#4CAF50" />
                <Text style={[s.featureText, { color: theme.text }]}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.upgradeBtn}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={s.upgradeBtnText}>UPGRADE TO PREMIUM</Text>
            <Ionicons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>
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
        <View style={[s.imgWrap, { backgroundColor: theme.bgIcon }]}>
          {item.productImage ? (
            <Image source={{ uri: item.productImage }} style={s.img} resizeMode="cover" />
          ) : (
            <Ionicons name={item.productType === 'food' ? 'nutrition-outline' : 'sparkles-outline'} size={22} color={theme.textMuted} />
          )}
        </View>

        {/* Info */}
        <View style={s.rowInfo}>
          <Text style={[s.rowName, { color: theme.text }]} numberOfLines={2}>{item.productName}</Text>
          <View style={s.rowMeta}>
            <Text style={[s.rowType, { color: theme.textMuted }]}>
              {item.productType === 'food' ? 'FOOD' : 'COSMETIC'}
            </Text>
            <Text style={[s.rowDot, { color: theme.textDim }]}>·</Text>
            <Text style={[s.rowDate, { color: theme.textMuted }]}>{formatDate(item.scannedAt)}</Text>
          </View>
        </View>

        {/* Score + delete */}
        <View style={s.rowRight}>
          <View style={[s.scorePill, { backgroundColor: getScoreColor(item.score) + '22' }]}>
            <Text style={[s.scoreNum, { color: getScoreColor(item.score) }]}>{Math.round(item.score)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item.id, item.productName)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
          { value: stats.healthyCount, label: 'HEALTHY', color: '#4CAF50' },
          { value: stats.moderateCount, label: 'MODERATE', color: '#FF9800' },
          { value: stats.riskyCount, label: 'RISKY', color: '#F44336' },
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
        <Ionicons name="barcode-outline" size={14} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const canGoBack = navigation.canGoBack();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[s.header, { height: HEADER_H, paddingTop: HEADER_PT, backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(245,245,245,0.97)', borderBottomColor: theme.headerBorder }]}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
        <Text style={[s.headerTitle, { color: theme.text }]}>SCAN HISTORY</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <FlatList
        data={filteredHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.list, { paddingTop: HEADER_H + 16, paddingBottom: insets.bottom + 100 }]}
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
              <Text style={[s.countLabel, { color: theme.textMuted }]}>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
              </Text>
            )}
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4CAF50" />
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
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // ── Search ──────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },

  // ── Stats ────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCell: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2, marginTop: 2 },

  // ── Count label ──────────────────────────────────────
  countLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },

  // ── List ────────────────────────────────────────────
  list: { paddingHorizontal: 20 },

  // ── Row item ────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  imgWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  img: { width: 56, height: 56 },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowType: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  rowDot: { fontSize: 10 },
  rowDate: { fontSize: 11, fontWeight: '400' },
  rowRight: { alignItems: 'center', gap: 8, flexShrink: 0 },
  scorePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: { fontSize: 15, fontWeight: '800' },
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
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  scanNowText: { fontSize: 11, fontWeight: '700', color: '#000000', letterSpacing: 2 },

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
