import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  ActivityIndicator,
  Animated,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import LuxuryLoadingComponent from '../components/LuxuryLoadingComponent';
import { fetchProductByBarcode } from '../services/reliableAPI';
import { analyzeIngredients } from '../utils/enhancedIngredientAnalyzer';

export default function CosmeticResultsScreen({ route, navigation }) {
  console.log('🧴 CosmeticResultsScreen: Component mounted');
  console.log('🧴 CosmeticResultsScreen: Route params:', route.params);
  
  const { barcode } = route.params;
  console.log('🧴 CosmeticResultsScreen: Barcode extracted:', barcode);
  
  const safeAreaInsets = useSafeAreaInsetsWithFallback();
  
  const [product, setProduct] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState({
    safetyInfo: false
  });

  // Animation refs
  const containerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🔄 CosmeticResultsScreen: useEffect triggered, fetching real data');
    fetchProductData();
  }, [barcode]);

  const fetchProductData = async () => {
    try {
      console.log('🧴 CosmeticResultsScreen: Starting fetch for barcode:', barcode);
      setLoading(true);
      setError(null);
      
      // Fetch real product data from API
      const productData = await fetchProductByBarcode(barcode);
      console.log('📦 CosmeticResultsScreen: Product data received:', productData ? 'Found' : 'Not found');
      
      if (!productData || !productData.product_name) {
        console.log('❌ CosmeticResultsScreen: No product data, navigating to ProductNotFound');
        navigation.replace('ProductNotFound', { 
          barcode,
          productType: 'cosmetic' 
        });
        return;
      }

      console.log('✅ CosmeticResultsScreen: Product found, setting data');
      setProduct(productData);
      
      // Analyze ingredients for cosmetic products using enhanced analyzer
      const ingredients = productData.ingredients_text || '';
      console.log('🧪 CosmeticResultsScreen: Analyzing ingredients:', ingredients);
      
      let analysisResult;
      if (ingredients) {
        // Use enhanced ingredient analyzer for cosmetic products
        analysisResult = analyzeIngredients(ingredients, 'cosmetic', {}, productData);
        console.log('🧪 CosmeticResultsScreen: Enhanced analysis completed:', analysisResult);
      } else {
        // Fallback for products without ingredient data
        analysisResult = {
          score: 60,
          totalIngredients: 0,
          goodIngredients: [],
          badIngredients: [],
          moderateIngredients: [],
          excellentIngredients: [],
          analyzedIngredients: [],
          productType: 'cosmetic',
          excellentCount: 0,
          goodCount: 0,
          moderateCount: 0,
          badCount: 0,
          additives: []
        };
        console.log('⚠️ CosmeticResultsScreen: No ingredients found, using fallback analysis');
      }

      setAnalysis(analysisResult);
      setLoading(false);
      
      // Start fade animation
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('❌ CosmeticResultsScreen: Error fetching data:', error);
      setError('Failed to analyze product. Please try again.');
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#4CAF50'; // Green
    if (score >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
  };

  const toggleSection = (section) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to analyze individual ingredients
  const analyzeIndividualIngredient = (ingredient, analysis) => {
    const lowerIngredient = ingredient.toLowerCase().trim();
    
    // First check if this ingredient was already analyzed in our main analysis
    const existingAnalysis = analysis.analyzedIngredients?.find(item => 
      item.name?.toLowerCase() === lowerIngredient
    );
    
    if (existingAnalysis) {
      let status, color, textColor, reason;
      
      switch(existingAnalysis.riskLevel) {
        case 'excellent':
          status = 'EXCELLENT';
          color = '#1B5E20';
          textColor = '#1B5E20';
          reason = existingAnalysis.description;
          break;
        case 'low':
          status = 'GOOD';
          color = '#4CAF50';
          textColor = '#2E7D32';
          reason = existingAnalysis.description;
          break;
        case 'moderate':
        case 'medium':
          status = 'MODERATE';
          color = '#FF9800';
          textColor = '#F57C00';
          reason = existingAnalysis.description;
          break;
        case 'high':
          status = 'AVOID';
          color = '#F44336';
          textColor = '#C62828';
          reason = existingAnalysis.description;
          break;
        default:
          status = 'UNKNOWN';
          color = '#9E9E9E';
          textColor = '#666';
          reason = 'Not analyzed yet';
      }
      
      return { status, color, textColor, reason };
    }
    
    // Fallback analysis for cosmetic ingredients
    const cosmeticGoodIngredients = [
      'water', 'aqua', 'glycerin', 'hyaluronic acid', 'vitamin e', 'aloe', 'shea butter',
      'cocoa butter', 'jojoba oil', 'argan oil', 'squalane', 'ceramides', 'niacinamide',
      'retinol', 'vitamin c', 'ascorbic acid', 'tocopherol', 'panthenol', 'allantoin'
    ];
    
    const cosmeticModeratIngredients = [
      'fragrance', 'parfum', 'alcohol', 'denat', 'sodium lauryl sulfate', 'sls',
      'mineral oil', 'petrolatum', 'silicones', 'dimethicone', 'cyclopentasiloxane'
    ];
    
    const cosmeticBadIngredients = [
      'parabens', 'methylparaben', 'propylparaben', 'formaldehyde', 'toluene',
      'phthalates', 'sulfates', 'triclosan', 'hydroquinone', 'mercury', 'lead'
    ];

    if (cosmeticGoodIngredients.some(good => lowerIngredient.includes(good))) {
      return {
        status: 'GOOD',
        color: '#4CAF50',
        textColor: '#2E7D32',
        reason: 'Generally safe cosmetic ingredient'
      };
    } else if (cosmeticBadIngredients.some(bad => lowerIngredient.includes(bad))) {
      return {
        status: 'AVOID',
        color: '#F44336',
        textColor: '#C62828',
        reason: 'Potentially harmful cosmetic ingredient'
      };
    } else if (cosmeticModeratIngredients.some(mod => lowerIngredient.includes(mod))) {
      return {
        status: 'MODERATE',
        color: '#FF9800',
        textColor: '#F57C00',
        reason: 'Common cosmetic ingredient with some concerns'
      };
    } else {
      return {
        status: 'UNKNOWN',
        color: '#9E9E9E',
        textColor: '#666',
        reason: 'Ingredient not in database'
      };
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleScanAnother = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    console.log('⏳ CosmeticResultsScreen: Showing loading screen');
    return (
      <LuxuryLoadingComponent 
        message="Analyzing cosmetic ingredients..." 
        style={{ backgroundColor: '#FAFAFA' }}
      />
    );
  }

  if (error) {
    console.log('❌ CosmeticResultsScreen: Showing error screen');
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleScanAnother}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  console.log('✅ CosmeticResultsScreen: Rendering main content');

  const score = analysis?.score || 50;
  const scoreColor = getScoreColor(score);
  const gradeText = getScoreGrade(score);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeAreaInsets.top + 12 }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cosmetic Analysis</Text>
        <TouchableOpacity onPress={handleScanAnother} style={styles.headerButton}>
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Product & Score Card - Yuka Style */}
          <View style={styles.yukaStyleCard}>
            {/* Product Image */}
            <View style={styles.yukaProductImageContainer}>
              {product?.image_url ? (
                <Image 
                  source={{ uri: product.image_url }} 
                  style={styles.yukaProductImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.yukaProductImagePlaceholder}>
                  <Ionicons name="flask" size={40} color="#9C27B0" />
                  <Text style={styles.productImageText}>Cosmetic Product</Text>
                </View>
              )}
            </View>

            {/* Product Info */}
            <View style={styles.yukaProductInfo}>
              <Text style={styles.yukaProductName}>{product?.product_name || 'Unknown Product'}</Text>
              <Text style={styles.yukaProductCategory}>Personal Care & Cosmetics</Text>
              {product?.brands && (
                <Text style={styles.yukaProductBrand}>{product.brands}</Text>
              )}
            </View>

            {/* Score Section */}
            <View style={styles.yukaScoreSection}>
              <View style={[styles.yukaScoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.yukaScoreNumber, { color: scoreColor }]}>{score}</Text>
                <Text style={styles.yukaScoreMax}>/100</Text>
              </View>
              <View style={styles.yukaScoreDetails}>
                <Text style={[styles.yukaScoreGrade, { color: scoreColor }]}>{gradeText.toUpperCase()}</Text>
                <Text style={styles.yukaScoreDescription}>
                  {score >= 75 ? "This cosmetic product has good ingredient safety" : 
                   score >= 50 ? "This cosmetic product has moderate ingredient concerns" : 
                   "This cosmetic product has some concerning ingredients"}
                </Text>
              </View>
            </View>

            {/* Ingredient Counts Summary */}
            {analysis && (
              <View style={styles.yukaIngredientCounts}>
                <View style={styles.countsRow}>
                  <View style={styles.countItem}>
                    <View style={[styles.countDot, { backgroundColor: '#1B5E20' }]} />
                    <Text style={styles.countText}>
                      {analysis.excellentCount || 0} Excellent
                    </Text>
                  </View>
                  <View style={styles.countItem}>
                    <View style={[styles.countDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.countText}>
                      {analysis.goodCount || analysis.goodIngredients?.length || 0} Good
                    </Text>
                  </View>
                  <View style={styles.countItem}>
                    <View style={[styles.countDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.countText}>
                      {analysis.moderateCount || analysis.moderateIngredients?.length || 0} Moderate
                    </Text>
                  </View>
                  <View style={styles.countItem}>
                    <View style={[styles.countDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.countText}>
                      {analysis.badCount || analysis.badIngredients?.length || 0} Poor
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ALL INGREDIENTS SECTION - ALWAYS OPEN */}
          {analysis && product?.ingredients_text && (
            <View style={styles.analysisCard}>
              <View style={styles.sectionHeaderFixed}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="list" size={24} color="#4CAF50" />
                  <Text style={styles.sectionTitle}>All Ingredients ({analysis.totalIngredients || 0})</Text>
                </View>
              </View>

              <View style={styles.sectionContent}>
                {/* Unknown Ingredients Warning */}
                {(() => {
                  const ingredients = product.ingredients_text
                    .toLowerCase()
                    .split(/[,;.]/)
                    .map(ingredient => ingredient.trim())
                    .filter(ingredient => ingredient.length > 2);
                  
                  const unknownCount = ingredients.filter(ingredient => {
                    const ingredientAnalysis = analyzeIndividualIngredient(ingredient, analysis);
                    return ingredientAnalysis.status === 'UNKNOWN';
                  }).length;
                  
                  const unknownPercentage = (unknownCount / ingredients.length) * 100;
                  
                  if (unknownPercentage > 40) {
                    return (
                      <View style={styles.warningContainer}>
                        <Ionicons name="warning" size={24} color="#FF9800" />
                        <Text style={styles.warningText}>
                          Too many unknown ingredients ({unknownCount}/{ingredients.length}). 
                          Analysis may be incomplete.
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Ingredient Legend */}
                <View style={styles.ingredientLegend}>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#1B5E20' }]} />
                      <Text style={styles.legendText}>Excellent</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                      <Text style={styles.legendText}>Good</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                      <Text style={styles.legendText}>Moderate</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                      <Text style={styles.legendText}>Poor</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
                      <Text style={styles.legendText}>Unknown</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.allIngredientsList}>
                  {product.ingredients_text
                    .toLowerCase()
                    .split(/[,;.]/)
                    .map(ingredient => ingredient.trim())
                    .filter(ingredient => ingredient.length > 2)
                    .map((ingredient, index) => {
                      const ingredientAnalysis = analyzeIndividualIngredient(ingredient, analysis);
                      
                      return (
                        <View key={`${ingredient}-${index}`} style={[
                          styles.individualIngredientItem,
                          { 
                            borderLeftColor: ingredientAnalysis.color,
                            backgroundColor: ingredientAnalysis.status === 'UNKNOWN' ? '#F5F5F5' : 
                                           ingredientAnalysis.status === 'AVOID' ? '#FFEBEE' :
                                           ingredientAnalysis.status === 'MODERATE' ? '#FFF8E1' :
                                           ingredientAnalysis.status === 'GOOD' ? '#E8F5E8' : 
                                           ingredientAnalysis.status === 'EXCELLENT' ? '#E8F5E8' : '#FAFAFA'
                          }
                        ]}>
                          <View style={styles.ingredientItemHeader}>
                            <View style={[styles.ingredientColorDot, { backgroundColor: ingredientAnalysis.color }]} />
                            <Text style={[styles.ingredientItemName, { 
                              color: ingredientAnalysis.status === 'UNKNOWN' ? '#666' : ingredientAnalysis.textColor,
                              fontWeight: ingredientAnalysis.status === 'UNKNOWN' ? '400' : '600'
                            }]}>
                              {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                            </Text>
                            <View style={[styles.ingredientStatusBadge, { backgroundColor: ingredientAnalysis.color }]}>
                              <Text style={styles.statusBadgeText}>{ingredientAnalysis.status}</Text>
                            </View>
                          </View>
                          {ingredientAnalysis.reason && (
                            <Text style={styles.ingredientItemReason}>
                              {ingredientAnalysis.reason}
                            </Text>
                          )}
                          {ingredientAnalysis.status === 'UNKNOWN' && (
                            <Text style={styles.unknownIngredientNote}>
                              This ingredient needs further research for cosmetic safety analysis.
                            </Text>
                          )}
                        </View>
                      );
                    })
                  }
                </View>
              </View>
            </View>
          )}

          {/* Safety Information */}
          {analysis && (
            <View style={styles.analysisCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('safetyInfo')}
              >
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
                  <Text style={styles.sectionTitle}>Safety Information</Text>
                </View>
                <Ionicons 
                  name={expandedSection.safetyInfo ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>

              {expandedSection.safetyInfo && (
                <View style={styles.sectionContent}>
                  <View style={styles.noAdditivesContainer}>
                    <Ionicons 
                      name={score >= 70 ? "checkmark-circle" : score >= 40 ? "warning" : "alert-circle"} 
                      size={48} 
                      color={scoreColor} 
                    />
                    <Text style={[styles.noAdditivesText, { color: scoreColor }]}>
                      {score >= 70 ? "Generally Safe" : score >= 40 ? "Use with Caution" : "Review Carefully"}
                    </Text>
                    <Text style={styles.noAdditivesSubtext}>
                      {score >= 70 
                        ? "This product contains mostly safe ingredients. Always patch test new products."
                        : score >= 40 
                        ? "This product contains some ingredients that may cause sensitivity. Patch test recommended."
                        : "This product contains several concerning ingredients. Consider alternatives if you have sensitive skin."
                      }
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bottom Actions */}
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleScanAnother}>
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Scan Another Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={20} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>Back to Scanner</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  
  // Yuka-style card styles
  yukaStyleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  yukaProductImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  yukaProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  yukaProductImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageText: {
    fontSize: 10,
    color: '#9C27B0',
    marginTop: 4,
    textAlign: 'center',
  },
  yukaProductInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  yukaProductName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  yukaProductCategory: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '600',
    marginBottom: 4,
  },
  yukaProductBrand: {
    fontSize: 12,
    color: '#666',
  },
  yukaScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  yukaScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  yukaScoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  yukaScoreMax: {
    fontSize: 12,
    color: '#666',
    marginTop: -4,
  },
  yukaScoreDetails: {
    flex: 1,
    marginLeft: 20,
  },
  yukaScoreGrade: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  yukaScoreDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  yukaIngredientCounts: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  countText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  
  // Analysis sections
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  
  // Warning and legend styles
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  ingredientLegend: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    width: '48%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  
  // Ingredients list styles
  allIngredientsList: {
    marginTop: 8,
  },
  individualIngredientItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  ingredientItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ingredientColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ingredientItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  ingredientItemReason: {
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
    fontStyle: 'italic',
  },
  unknownIngredientNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 16,
    marginTop: 2,
  },
  
  // Safety info styles
  noAdditivesContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 16,
  },
  noAdditivesText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  noAdditivesSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Action buttons
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
    marginLeft: 8,
  },
  
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
