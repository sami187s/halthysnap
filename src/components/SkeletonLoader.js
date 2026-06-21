import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <SkeletonLoader width={60} height={60} borderRadius={30} />
      <View style={styles.cardHeaderText}>
        <SkeletonLoader width="70%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="50%" height={16} />
      </View>
    </View>
    <View style={styles.cardBody}>
      <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="90%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={16} />
    </View>
  </View>
);

const SkeletonProductResult = () => (
  <View style={styles.container}>
    {/* Score Section */}
    <View style={styles.scoreSection}>
      <SkeletonLoader width={120} height={120} borderRadius={60} style={styles.centerItem} />
      <SkeletonLoader width="60%" height={24} style={[styles.centerItem, { marginTop: 16 }]} />
      <SkeletonLoader width="40%" height={18} style={[styles.centerItem, { marginTop: 8 }]} />
    </View>

    {/* Product Info Card */}
    <View style={styles.infoCard}>
      <SkeletonLoader width="80%" height={24} style={{ marginBottom: 12 }} />
      <SkeletonLoader width="50%" height={18} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={18} />
    </View>

    {/* Ingredients Cards */}
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

const SkeletonIngredientList = ({ count = 5 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.ingredientItem}>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <View style={styles.ingredientText}>
          <SkeletonLoader width="70%" height={16} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="90%" height={14} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardBody: {
    marginTop: 8,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  centerItem: {
    alignSelf: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingredientText: {
    marginLeft: 12,
    flex: 1,
  },
});

export default SkeletonLoader;
export { SkeletonCard, SkeletonProductResult, SkeletonIngredientList };
