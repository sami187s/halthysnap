import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [isPremium, setIsPremium] = useState(true);
  const [averageScore, setAverageScore] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [name, subscriptionType, historyJson] = await Promise.all([
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('subscriptionType'),
        AsyncStorage.getItem('scan_history'),
      ]);

      setUserName(name || 'HealthyScan User');
      const premium = subscriptionType === 'Premium';
      setIsPremium(premium);

      // Only load history data for premium users
      if (premium) {
        const history = historyJson ? JSON.parse(historyJson) : [];
        if (history.length > 0) {
          setTotalScans(history.length);
          const avg = Math.round(
            history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length
          );
          setAverageScore(avg);
          setRecentScans(history.slice(0, 5));
          setSavedProducts(history.filter((item) => item.score >= 70).slice(0, 6));
        } else {
          setTotalScans(0);
          setAverageScore(0);
          setRecentScans([]);
          setSavedProducts([]);
        }
      } else {
        // Free users see empty profile
        setTotalScans(0);
        setAverageScore(0);
        setRecentScans([]);
        setSavedProducts([]);
      }
    } catch {
      // Silently fail
    }
  };

  const getScoreColor = (score) =>
    score >= 70 ? '#2E7D32' : score >= 50 ? '#E67A00' : '#D32F2F';
  const getScoreBg = (score) =>
    score >= 70 ? '#E8F5E9' : score >= 50 ? '#FFF3E0' : '#FFEBEE';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#B2DFBC', '#C8E6C9', '#E8F5E9', '#F1F8E9', '#F5F5F0']}
        locations={[0, 0.2, 0.45, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={22} color="#5A7A5A" />
          </TouchableOpacity>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileTop}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#1B5E20', '#2E7D32', '#388E3C']}
              style={styles.avatarGradient}
            >
              <Ionicons name="person" size={40} color="#fff" />
            </LinearGradient>
            {isPremium && (
              <View style={styles.proCheckmark}>
                <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileRole}>Holistic Wellness Advocate</Text>
          {isPremium ? (
            <View style={styles.proBadgeWrap}>
              <Ionicons name="diamond" size={12} color="#2E7D32" />
              <Text style={styles.proBadgeLabel}>Pro Member</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeBadge}
              onPress={() => navigation.navigate('Subscription')}
              activeOpacity={0.7}
            >
              <Ionicons name="diamond-outline" size={12} color="#FF9800" />
              <Text style={styles.upgradeBadgeText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Overall Score Card */}
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={['#1B5E20', '#2E7D32', '#388E3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCardGradient}
          >
            <Text style={styles.scoreCardLabel}>OVERALL SCORE</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>
                  {totalScans > 0 ? averageScore : 0}%
                </Text>
                <Text style={styles.scoreStatusLabel}>
                  {averageScore >= 70
                    ? 'Optimal'
                    : averageScore >= 50
                    ? 'Moderate'
                    : totalScans > 0
                    ? 'Needs Work'
                    : 'No Data'}
                </Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreInfoText}>
                  {totalScans > 0
                    ? averageScore >= 70
                      ? `Your pantry is ${averageScore - 50}% cleaner than the food average. Keep scanning!`
                      : averageScore >= 50
                      ? "You're on the right track. Try scanning for healthier alternatives!"
                      : "Let's find healthier options together!"
                    : 'Start scanning products to see your health score here.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.detailedBtn}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.8}
            >
              <Text style={styles.detailedBtnText}>Detailed Analysis</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color="#2E7D32" />
            <Text style={styles.statNumber}>{totalScans}</Text>
            <Text style={styles.statLabel}>Scan History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={20} color="#2E7D32" />
            <Text style={styles.statNumber}>{savedProducts.length}</Text>
            <Text style={styles.statLabel}>Saved Products</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Insights */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Insights</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentScans.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.recentItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.productType === 'cosmetic') {
                    navigation.navigate('CosmeticResults', { barcode: item.barcode });
                  } else {
                    navigation.navigate('Results', { barcode: item.barcode });
                  }
                }}
              >
                <View style={styles.recentItemLeft}>
                  {item.productImage ? (
                    <Image
                      source={{ uri: item.productImage }}
                      style={styles.recentItemImage}
                    />
                  ) : (
                    <View style={[styles.recentItemImage, styles.recentItemPlaceholder]}>
                      <Ionicons
                        name={
                          item.productType === 'cosmetic'
                            ? 'sparkles-outline'
                            : 'nutrition-outline'
                        }
                        size={18}
                        color="#888"
                      />
                    </View>
                  )}
                  <View style={styles.recentItemInfo}>
                    <Text style={styles.recentItemName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.recentItemType}>
                      {item.productType === 'cosmetic' ? 'Cosmetic' : 'Food'} •{' '}
                      {new Date(item.scannedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.recentItemScore,
                    { backgroundColor: getScoreBg(item.score) },
                  ]}
                >
                  <Text
                    style={[
                      styles.recentItemScoreText,
                      { color: getScoreColor(item.score) },
                    ]}
                  >
                    {item.score}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Saved Favourites */}
        {savedProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Favourites</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {savedProducts.map((item, index) => (
                <TouchableOpacity
                  key={item.id || index}
                  style={styles.savedCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.productType === 'cosmetic') {
                      navigation.navigate('CosmeticResults', { barcode: item.barcode });
                    } else {
                      navigation.navigate('Results', { barcode: item.barcode });
                    }
                  }}
                >
                  {item.productImage ? (
                    <Image
                      source={{ uri: item.productImage }}
                      style={styles.savedCardImage}
                    />
                  ) : (
                    <View style={[styles.savedCardImage, styles.savedCardPlaceholder]}>
                      <Ionicons
                        name={
                          item.productType === 'cosmetic'
                            ? 'sparkles-outline'
                            : 'nutrition-outline'
                        }
                        size={22}
                        color="#aaa"
                      />
                    </View>
                  )}
                  <Text style={styles.savedCardName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.savedCardType}>
                    {item.productType === 'cosmetic' ? 'Cosmetic' : 'Food'}
                  </Text>
                  <View
                    style={[
                      styles.savedCardScore,
                      { backgroundColor: getScoreColor(item.score) },
                    ]}
                  >
                    <Text style={styles.savedCardScoreText}>{item.score}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8F5E9' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 110, paddingHorizontal: 22 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Profile Top */
  profileTop: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  proCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A7A5A',
    marginBottom: 10,
  },
  proBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46,125,50,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.2)',
  },
  proBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.3,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,152,0,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.2)',
  },
  upgradeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E67A00',
    letterSpacing: 0.3,
  },

  /* Score Card */
  scoreCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  scoreCardGradient: {
    padding: 22,
    borderRadius: 20,
  },
  scoreCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  scoreStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  scoreInfo: { flex: 1 },
  scoreInfoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
  },
  detailedBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  detailedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B5E20',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A7A5A',
  },

  /* Sections */
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B5E20',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },

  /* Recent Items */
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  recentItemImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  recentItemPlaceholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemInfo: { flex: 1 },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  recentItemType: {
    fontSize: 11,
    color: '#888',
  },
  recentItemScore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemScoreText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Saved Cards */
  savedCard: {
    width: 140,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingBottom: 10,
  },
  savedCardImage: {
    width: '100%',
    height: 85,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  savedCardPlaceholder: {
    backgroundColor: '#f0f4ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  savedCardType: {
    fontSize: 9,
    fontWeight: '500',
    color: '#999',
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  savedCardScore: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCardScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
});

export default ProfileScreen;
