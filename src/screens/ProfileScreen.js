import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as StoreReview from 'expo-store-review';

const PRIMARY  = '#067A4F';
const BG       = '#f8faf8';
const SURFACE  = '#ffffff';
const ON_BG    = '#191c1b';
const ON_VAR   = '#a3a8a3';
const BORDER   = 'rgba(0,0,0,0.05)';
const BEST_KEY = '@vee_curated_products';

// Score → color, matching the app's score thresholds.
const scoreColor = (s) => (s >= 75 ? PRIMARY : s >= 50 ? '#f59e0b' : '#ef4444');

// A single Saved/History rail item — square thumbnail, name, brand subtitle,
// score. Rendered inside a horizontal scroll rail.
const RailTile = ({ item, index, onPress }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = Math.min(index, 8) * 50;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const color = scoreColor(item.score || 0);

  return (
    <Animated.View style={[tileStyles.wrap, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <View style={tileStyles.imgWrap}>
          {item.productImage ? (
            <Image source={{ uri: item.productImage }} style={tileStyles.img} />
          ) : (
            <Ionicons name="leaf-outline" size={24} color="#c7cdc7" />
          )}
        </View>
        <Text style={tileStyles.name} numberOfLines={1}>{item.productName || 'Unknown Product'}</Text>
        {item.productSubtitle ? (
          <Text style={tileStyles.subtitle} numberOfLines={1}>{item.productSubtitle}</Text>
        ) : null}
        <Text style={[tileStyles.score, { color }]}>{item.score ?? '–'}/100</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// A few pulsing placeholder tiles, shown while data is loading.
const SkeletonTiles = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={tileStyles.rail}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[tileStyles.skeletonTile, { opacity: pulse }]} />
      ))}
    </View>
  );
};

const tileStyles = StyleSheet.create({
  // History rail (horizontal scroll)
  rail: { flexDirection: 'row', gap: 14 },
  wrap: { width: 128 },
  imgWrap: {
    width: '100%', aspectRatio: 1, borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 8,
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  name: { fontSize: 14, fontWeight: '600', color: '#191c1b', marginBottom: 2 },
  subtitle: { fontSize: 12, fontWeight: '500', color: ON_VAR, marginBottom: 2 },
  score: { fontSize: 14, fontWeight: '800' },
  skeletonTile: { width: 128, height: 170, borderRadius: 16, backgroundColor: '#eef1ee' },
});

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [userName, setUserName]       = useState('Guest user');
  const [memberSince, setMemberSince] = useState('');
  const [isPremium, setIsPremium]     = useState(false);
  const [totalScans, setTotalScans]   = useState(0);
  const [allScans, setAllScans]       = useState([]);
  const [savedItems, setSavedItems]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('saved'); // 'saved' | 'history'
  const [profilePhoto, setProfilePhoto] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [name, subType, historyJson, firstLaunch, bestJson] = await Promise.all([
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('subscriptionType'),
        AsyncStorage.getItem('scan_history'),
        AsyncStorage.getItem('firstLaunchDate'),
        AsyncStorage.getItem(BEST_KEY),
      ]);
      setUserName(name || 'Guest user');
      setIsPremium(subType === 'Premium');
      if (firstLaunch) {
        const d = new Date(parseInt(firstLaunch));
        setMemberSince(d.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
      } else {
        const now = new Date();
        await AsyncStorage.setItem('firstLaunchDate', String(now.getTime()));
        setMemberSince(now.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
      }
      const history = historyJson ? JSON.parse(historyJson) : [];
      setTotalScans(history.length);
      setAllScans(history.map(item => ({
        ...item,
        productSubtitle: item.productBrand || '',
      })));

      const best = bestJson ? JSON.parse(bestJson) : [];
      setSavedItems(best.map(item => ({
        id: item.barcode,
        barcode: item.barcode,
        productName: item.name,
        productSubtitle: item.brand,
        productImage: item.image,
        score: item.score ?? item.defaultScore ?? 0,
        productType: item.productType || 'food',
        scannedAt: item.savedAt || null,
      })));

      const photo = await AsyncStorage.getItem('profilePhoto');
      if (photo) setProfilePhoto(photo);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfilePhoto(uri);
      await AsyncStorage.setItem('profilePhoto', uri);
    }
  };

  const scoreColor = (s) => s >= 70 ? PRIMARY : s >= 50 ? '#d97706' : '#dc2626';

  const rateApp = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        return;
      }
    } catch {}
    const url = StoreReview.storeUrl();
    if (url) Linking.openURL(url);
  };

  const openScan = (item) => {
    if (item.productType === 'cosmetic') {
      navigation.navigate('CosmeticResults', { barcode: item.barcode });
    } else {
      navigation.navigate('Results', { barcode: item.barcode });
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={ON_BG} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={20} color={ON_BG} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.avatarCircle}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarCircleImg} />
            ) : (
              <Ionicons name="person-outline" size={44} color={ON_VAR} />
            )}
          </TouchableOpacity>
          {isPremium && (
          <View style={styles.premiumPill}>
            <Text style={styles.premiumPillText}>Premium</Text>
          </View>
          )}

          <Text style={styles.heroName}>{userName}</Text>
          <Text style={styles.heroJoined}>
            {memberSince ? `Member since ${memberSince}` : 'Welcome to Vee'}
          </Text>

          {/* Stat row */}
          <View style={styles.statRow}>
            <View style={styles.statPlain}>
              <Text style={styles.statPlainNum}>{totalScans}</Text>
              <Text style={styles.statPlainLabel}>Scans</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPlain}>
              <Text style={styles.statPlainNum}>{savedItems.length}</Text>
              <Text style={styles.statPlainLabel}>Saved</Text>
            </View>
          </View>
        </View>

        {/* ── Saved / History toggle ── */}
        <View style={styles.section}>
          <View style={styles.toggleWrap}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'saved' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('saved')}
              activeOpacity={0.85}
            >
              <Ionicons name="bookmark" size={14} color={activeTab === 'saved' ? PRIMARY : ON_VAR} />
              <Text style={[styles.toggleText, activeTab === 'saved' && styles.toggleTextActive]}>Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'history' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.85}
            >
              <Ionicons name="time" size={14} color={activeTab === 'history' ? PRIMARY : ON_VAR} />
              <Text style={[styles.toggleText, activeTab === 'history' && styles.toggleTextActive]}>History</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <SkeletonTiles />
          ) : (() => {
            const activeList = activeTab === 'saved' ? savedItems : allScans;
            if (activeList.length === 0) {
              return (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name={activeTab === 'saved' ? 'bookmark-outline' : 'barcode-outline'}
                    size={32}
                    color="#d1d5db"
                  />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'saved' ? 'No saved products yet' : 'No scans yet'}
                  </Text>
                  {activeTab === 'saved' && (
                    <TouchableOpacity
                      style={styles.scanCta}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('Home', { startScanning: true })}
                    >
                      <Text style={styles.scanCtaText}>Scan a product</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            const isSaved = activeTab === 'saved';
            return (
              <>
                <Text style={styles.groupLabel}>{isSaved ? 'Saved products' : 'Recent scans'}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tileStyles.rail}
                >
                  {activeList.slice(0, 8).map((item, idx) => (
                    <RailTile key={item.id || idx} item={item} index={idx} onPress={() => openScan(item)} />
                  ))}
                </ScrollView>
                {activeList.length > 0 && (
                  <TouchableOpacity
                    style={styles.seeAllRow}
                    onPress={() => navigation.navigate('History', isSaved ? { savedOnly: true } : undefined)}
                  >
                    <Text style={styles.seeAllBtn}>View all</Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>

        {/* ── Rate us ── */}
        <TouchableOpacity style={styles.rateCard} activeOpacity={0.85} onPress={rateApp}>
          <View style={styles.rateIconWrap}>
            <Ionicons name="star" size={18} color="#f5a623" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rateTitle}>Enjoying Vee?</Text>
            <Text style={styles.rateSub}>Your review helps grow our community.</Text>
          </View>
          <View style={styles.rateBtn}>
            <Text style={styles.rateBtnText}>Rate</Text>
          </View>
        </TouchableOpacity>

        {/* ── Membership ── */}
        <View style={styles.section}>
          <Text style={styles.groupLabel}>Membership</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('Subscription')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E5F2EC' }]}>
                <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {isPremium ? 'Premium Membership' : 'Upgrade to Premium'}
                </Text>
                <Text style={styles.rowSub}>
                  {isPremium ? 'Active plan' : 'Unlock all features'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Application ── */}
        <View style={styles.section}>
          <Text style={styles.groupLabel}>Application</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('History')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#f2f4f2' }]}>
                <Ionicons name="time-outline" size={20} color="#556158" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]}>History</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#f2f4f2' }]}>
                <Ionicons name="settings-outline" size={20} color="#556158" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]}>Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f2f4f2',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13, fontWeight: '700', color: ON_VAR,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  content: { paddingHorizontal: 24, gap: 28 },

  /* Hero */
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f2f4f2',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatarCircleImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  premiumPill: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 99,
    marginBottom: 12,
  },
  premiumPillText: {
    color: '#fff', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  heroName: {
    fontSize: 20, fontWeight: '800', color: ON_BG,
    letterSpacing: -0.4, textAlign: 'center', marginBottom: 4,
  },
  heroJoined: { fontSize: 13, color: ON_VAR, fontWeight: '500', textAlign: 'center', marginBottom: 24 },

  /* Stat row */
  statRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 },
  statPlain: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: BORDER },
  statPlainNum: { fontSize: 22, fontWeight: '800', color: ON_BG, letterSpacing: -0.4 },
  statPlainLabel: { fontSize: 12, color: ON_VAR, fontWeight: '500' },

  /* Section */
  section: { gap: 12 },
  seeAllBtn: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  seeAllRow: { alignItems: 'center', paddingTop: 4 },
  groupLabel: {
    fontSize: 12, fontWeight: '700', color: ON_VAR,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  /* Rate us */
  rateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: SURFACE, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  rateIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(245,166,35,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  rateTitle: { fontSize: 14, fontWeight: '700', color: ON_BG, marginBottom: 2 },
  rateSub: { fontSize: 12, color: ON_VAR, fontWeight: '500' },
  rateBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 999,
  },
  rateBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Saved / History toggle */
  toggleWrap: {
    flexDirection: 'row', gap: 4,
    backgroundColor: '#f2f4f2', borderRadius: 16, padding: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: ON_VAR },
  toggleTextActive: { color: PRIMARY },

  /* Empty */
  emptyBox: {
    alignItems: 'center', paddingVertical: 32, gap: 10,
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: ON_BG },
  scanCta: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999, marginTop: 4,
  },
  scanCtaText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Card */
  card: {
    backgroundColor: SURFACE, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f2f4f2',
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: ON_BG },
  rowSub: { fontSize: 12, color: ON_VAR, marginTop: 2 },
});
