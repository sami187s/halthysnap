import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductImage from './ProductImage';

const FoodProductCard = ({ product, analysis, onViewDetails }) => {
  if (!analysis || analysis.productType !== 'food') return null;

  const getNutritionBadge = (value, thresholds) => {
    if (value > thresholds.high) return { style: styles.highBadge, text: 'HIGH' };
    if (value > thresholds.medium) return { style: styles.mediumBadge, text: 'MEDIUM' };
    return { style: styles.goodBadge, text: 'GOOD' };
  };

  const getProteinBadge = (value) => {
    if (value > 15) return { style: styles.goodBadge, text: 'GOOD' };
    if (value > 8) return { style: styles.mediumBadge, text: 'MEDIUM' };
    return { style: styles.highBadge, text: 'LOW' };
  };

  const getFiberBadge = (value) => {
    if (value > 6) return { style: styles.goodBadge, text: 'GOOD' };
    if (value > 3) return { style: styles.mediumBadge, text: 'MEDIUM' };
    return { style: styles.highBadge, text: 'LOW' };
  };

  return (
    <View style={styles.yukaStyleCard}>
      {/* Product Image */}
      <View style={styles.yukaProductImageContainer}>
        <ProductImage
          imageUrl={product?.image_url}
          productType="food"
          style={styles.yukaProductImage}
        />
      </View>

      {/* Additives Status */}
      <View style={styles.additivesStatus}>
        {analysis.additives && analysis.additives.length > 0 ? (
          <Text style={styles.additivesFoundText}>
            {analysis.additives.length} additive{analysis.additives.length !== 1 ? 's' : ''} detected
          </Text>
        ) : (
          <Text style={styles.noAdditivesText}>No additives</Text>
        )}
      </View>

      {/* Nutrition Rows */}
      <View style={styles.nutritionRows}>
        <Text style={styles.nutritionTitle}>NUTRITION</Text>
        
        {/* Overall Nutrition Rating */}
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>NUTRITION</Text>
          <View style={[styles.nutritionBadge, styles.goodBadge]}>
            <Text style={styles.badgeText}>GOOD</Text>
          </View>
        </View>

        {/* Calories */}
        {product?.nutriments?.['energy-kcal_100g'] && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>CALORIES</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {Math.round(product.nutriments['energy-kcal_100g'])} kcal
              </Text>
              {(() => {
                const badge = getNutritionBadge(
                  product.nutriments['energy-kcal_100g'], 
                  { high: 400, medium: 250 }
                );
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Sugar */}
        {product?.nutriments?.sugars_100g !== undefined && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>SUGAR</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {product.nutriments.sugars_100g.toFixed(1)}g
              </Text>
              {(() => {
                const badge = getNutritionBadge(
                  product.nutriments.sugars_100g, 
                  { high: 15, medium: 8 }
                );
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Salt */}
        {product?.nutriments?.salt_100g !== undefined && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>SALT</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {product.nutriments.salt_100g.toFixed(2)}g
              </Text>
              {(() => {
                const badge = getNutritionBadge(
                  product.nutriments.salt_100g, 
                  { high: 1.5, medium: 0.8 }
                );
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Fat */}
        {product?.nutriments?.fat_100g !== undefined && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>FAT</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {product.nutriments.fat_100g.toFixed(1)}g
              </Text>
              {(() => {
                const badge = getNutritionBadge(
                  product.nutriments.fat_100g, 
                  { high: 20, medium: 10 }
                );
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Protein */}
        {product?.nutriments?.proteins_100g !== undefined && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>PROTEIN</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {product.nutriments.proteins_100g.toFixed(1)}g
              </Text>
              {(() => {
                const badge = getProteinBadge(product.nutriments.proteins_100g);
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Fiber */}
        {product?.nutriments?.fiber_100g !== undefined && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>FIBER</Text>
            <View style={styles.nutritionValueContainer}>
              <Text style={styles.nutritionNumber}>
                {product.nutriments.fiber_100g.toFixed(1)}g
              </Text>
              {(() => {
                const badge = getFiberBadge(product.nutriments.fiber_100g);
                return (
                  <View style={[styles.nutritionBadge, badge.style]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </View>

      {/* View Details Button */}
      <TouchableOpacity 
        style={styles.viewDetailsButton}
        onPress={() => onViewDetails?.('nutrition')}
      >
        <Text style={styles.viewDetailsText}>View details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  yukaStyleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  yukaProductImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  yukaProductImage: {
    width: 160,
    height: 200,
  },
  additivesStatus: {
    alignItems: 'center',
    marginBottom: 20,
  },
  noAdditivesText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  additivesFoundText: {
    fontSize: 16,
    color: '#FF5722',
    fontWeight: '600',
  },
  nutritionRows: {
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nutritionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  nutritionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionNumber: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
    minWidth: 60,
    textAlign: 'right',
  },
  nutritionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  goodBadge: {
    backgroundColor: '#4CAF50',
  },
  mediumBadge: {
    backgroundColor: '#FF9800',
  },
  highBadge: {
    backgroundColor: '#F44336',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewDetailsButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FoodProductCard;
