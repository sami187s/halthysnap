import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductImage from './ProductImage';

const BeautyProductCard = ({ product, analysis, onViewDetails }) => {
  if (!analysis || analysis.productType === 'food') return null;

  return (
    <View style={styles.yukaStyleCard}>
      {/* Product Image */}
      <View style={styles.yukaProductImageContainer}>
        <ProductImage
          imageUrl={product?.image_url}
          productType={analysis.productType}
          style={styles.yukaProductImage}
        />
      </View>

      {/* Beauty Product Info */}
      <View style={styles.beautyProductInfo}>
        <Text style={styles.beautyProductType}>
          {analysis.productType === 'beauty' ? '🧴 COSMETIC PRODUCT' : '🧽 HOUSEHOLD PRODUCT'}
        </Text>
        
        {/* Ingredient Safety Focus */}
        <View style={styles.beautySafetySection}>
          <Text style={styles.beautySectionTitle}>INGREDIENT SAFETY</Text>
          
          <View style={styles.beautyStatsRow}>
            <View style={styles.beautyStat}>
              <Text style={styles.beautyStatNumber}>{analysis.goodIngredients?.length || 0}</Text>
              <Text style={styles.beautyStatLabel}>Safe</Text>
              <View style={[styles.beautyStatIndicator, { backgroundColor: '#4CAF50' }]} />
            </View>
            
            <View style={styles.beautyStat}>
              <Text style={styles.beautyStatNumber}>{analysis.moderateIngredients?.length || 0}</Text>
              <Text style={styles.beautyStatLabel}>Moderate</Text>
              <View style={[styles.beautyStatIndicator, { backgroundColor: '#FF9800' }]} />
            </View>
            
            <View style={styles.beautyStat}>
              <Text style={styles.beautyStatNumber}>{analysis.badIngredients?.length || 0}</Text>
              <Text style={styles.beautyStatLabel}>Risky</Text>
              <View style={[styles.beautyStatIndicator, { backgroundColor: '#F44336' }]} />
            </View>
          </View>
        </View>

        {/* Harmful Chemicals Section */}
        {analysis.harmfulChemicals && analysis.harmfulChemicals.length > 0 && (
          <View style={styles.chemicalsSection}>
            <Text style={styles.beautySectionTitle}>⚠️ HARMFUL CHEMICALS DETECTED</Text>
            {analysis.harmfulChemicals.slice(0, 3).map((chemical, index) => (
              <View key={index} style={styles.chemicalWarning}>
                <Text style={styles.chemicalName}>{chemical.name}</Text>
                <Text style={styles.chemicalConcern}>{chemical.concern}</Text>
                <View style={[styles.riskBadge, { 
                  backgroundColor: chemical.risk === 'high' ? '#F44336' : '#FF9800' 
                }]}>
                  <Text style={styles.riskText}>{chemical.risk?.toUpperCase() || 'UNKNOWN'} RISK</Text>
                </View>
              </View>
            ))}
            {analysis.harmfulChemicals.length > 3 && (
              <Text style={styles.moreChemicals}>
                +{analysis.harmfulChemicals.length - 3} more harmful chemicals detected
              </Text>
            )}
          </View>
        )}

        {/* Allergens Section */}
        {analysis.allergens && analysis.allergens.length > 0 && (
          <View style={styles.allergensSection}>
            <Text style={styles.beautySectionTitle}>🚨 ALLERGENS DETECTED</Text>
            <View style={styles.allergensList}>
              {analysis.allergens.map((allergen, index) => (
                <View key={index} style={styles.allergenChip}>
                  <Text style={styles.allergenText}>{allergen.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Safety Recommendations */}
        <View style={styles.beautyConcernsSection}>
          <Text style={styles.beautySectionTitle}>SAFETY RECOMMENDATIONS</Text>
          <Text style={styles.beautyConcernText}>
            {analysis.harmfulChemicals?.length > 0 || analysis.allergens?.length > 0
              ? '⚠️ This product contains concerning ingredients:\n• Patch test before use\n• Avoid if you have sensitive skin\n• Consider alternative products'
              : analysis.productType === 'beauty' 
                ? '✅ Relatively safe ingredient profile\n• Still recommended to patch test\n• Check for personal allergies\n• Follow usage instructions' 
                : '• Use in ventilated areas\n• Keep away from children\n• Follow usage instructions carefully'
            }
          </Text>
        </View>

        {/* View Full Analysis Button */}
        <TouchableOpacity 
          style={styles.viewAnalysisButton}
          onPress={() => onViewDetails?.('ingredients')}
        >
          <Text style={styles.viewAnalysisText}>View Full Ingredient Analysis</Text>
          <Ionicons name="chevron-forward" size={20} color="#9C27B0" />
        </TouchableOpacity>
      </View>
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
  beautyProductInfo: {
    flex: 1,
  },
  beautyProductType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9C27B0',
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  beautySafetySection: {
    marginBottom: 16,
  },
  beautySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  beautyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  beautyStat: {
    alignItems: 'center',
    flex: 1,
  },
  beautyStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  beautyStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    marginBottom: 4,
  },
  beautyStatIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  chemicalsSection: {
    marginBottom: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  chemicalWarning: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffebee',
  },
  chemicalName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 2,
  },
  chemicalConcern: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '700',
  },
  moreChemicals: {
    fontSize: 10,
    color: '#d32f2f',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  allergensSection: {
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  allergensList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenChip: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  allergenText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  beautyConcernsSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  beautyConcernText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  viewAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewAnalysisText: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '600',
    marginRight: 8,
  },
});

export default BeautyProductCard;
