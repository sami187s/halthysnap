import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const BEST_PRODUCTS = [
  { id: 1,  name: 'Organic Rolled Oats',      brand: 'Quaker',                 category: 'Food',     icon: 'leaf-outline' },
  { id: 2,  name: 'Wild Blueberries',          brand: "Wyman's",                category: 'Food',     icon: 'leaf-outline' },
  { id: 3,  name: 'Natural Almond Butter',     brand: "Justin's",               category: 'Food',     icon: 'leaf-outline' },
  { id: 4,  name: 'Chia Seeds',                brand: 'Navitas Organics',       category: 'Food',     icon: 'leaf-outline' },
  { id: 5,  name: 'Plain Greek Yogurt',        brand: 'Chobani',                category: 'Food',     icon: 'leaf-outline' },
  { id: 6,  name: 'Wild Albacore Tuna',        brand: 'Wild Planet',            category: 'Food',     icon: 'leaf-outline' },
  { id: 7,  name: 'Organic Quinoa',            brand: "Bob's Red Mill",         category: 'Food',     icon: 'leaf-outline' },
  { id: 8,  name: 'Extra Virgin Olive Oil',    brand: 'California Olive Ranch', category: 'Food',     icon: 'leaf-outline' },
  { id: 9,  name: 'Dark Chocolate 85%',        brand: 'Lindt Excellence',       category: 'Food',     icon: 'leaf-outline' },
  { id: 10, name: 'Raw Organic Almonds',       brand: 'Blue Diamond',           category: 'Food',     icon: 'leaf-outline' },
  { id: 11, name: 'Organic Brown Rice',        brand: 'Lundberg Family Farms',  category: 'Food',     icon: 'leaf-outline' },
  { id: 12, name: 'Organic Green Tea',         brand: 'Yogi Tea',               category: 'Drinks',   icon: 'cafe-outline' },
  { id: 13, name: 'Coconut Water',             brand: 'Harmless Harvest',       category: 'Drinks',   icon: 'cafe-outline' },
  { id: 14, name: 'Sparkling Water',           brand: 'Spindrift',              category: 'Drinks',   icon: 'cafe-outline' },
  { id: 15, name: 'Organic Lentil Soup',       brand: "Amy's Kitchen",          category: 'Snacks',   icon: 'fast-food-outline' },
  { id: 16, name: 'Rice Cakes',                brand: 'Lundberg',               category: 'Snacks',   icon: 'fast-food-outline' },
  { id: 17, name: 'Hydrating Moisturizer',     brand: 'CeraVe',                 category: 'Cosmetic', icon: 'sparkles-outline' },
  { id: 18, name: 'Mineral Sunscreen SPF 50',  brand: 'EltaMD UV Clear',        category: 'Cosmetic', icon: 'sparkles-outline' },
  { id: 19, name: 'Vitamin C Serum',           brand: 'TruSkin',                category: 'Cosmetic', icon: 'sparkles-outline' },
  { id: 20, name: 'Micellar Cleansing Water',  brand: 'Bioderma Sensibio',      category: 'Cosmetic', icon: 'sparkles-outline' },
];

const FILTER_TABS = ['All', 'Food', 'Drinks', 'Snacks', 'Cosmetic'];

export default function BestProductsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = BEST_PRODUCTS.filter(
    (p) => activeFilter === 'All' || p.category === activeFilter,
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafaf5" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Best Products</Text>
        <Text style={s.headerSub}>Top-rated picks, all scoring 90+</Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterContent}
      >
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.chip, activeFilter === tab && s.chipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveFilter(tab);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, activeFilter === tab && s.chipTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((product, index) => (
          <View key={product.id} style={s.row}>
            <Text style={s.rank}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={s.iconWrap}>
              <Ionicons name={product.icon} size={20} color="#067A4F" />
            </View>
            <View style={s.info}>
              <Text style={s.name} numberOfLines={1}>{product.name}</Text>
              <Text style={s.brand} numberOfLines={1}>{product.brand}</Text>
            </View>
            <View style={s.scoreBadge}>
              <Text style={s.scoreText}>90</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fafaf5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '400',
  },
  filterScroll: {
    maxHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#fafaf5',
  },
  filterContent: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F3F0',
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.12)',
  },
  chipActive: {
    backgroundColor: '#067A4F',
    borderColor: '#067A4F',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A5A5F',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rank: {
    width: 28,
    fontSize: 11,
    fontWeight: '700',
    color: '#C0C0C5',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginRight: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  brand: {
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#067A4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
