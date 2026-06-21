import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsetsWithFallback } from '../utils/safeAreaUtils';
import LuxuryLoadingComponent from '../components/LuxuryLoadingComponent';

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

  // Animation refs
  const containerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🔄 CosmeticResultsScreen: useEffect triggered, creating demo data');
    
    // Create demo cosmetic data immediately
    setTimeout(() => {
      const demoProduct = {
        product_name: 'Demo Cosmetic Product',
        ingredients_text: 'water, glycerin, cetyl alcohol, dimethicone, sodium hyaluronate, tocopherol, phenoxyethanol',
        categories: 'cosmetics, beauty, personal care',
        source: 'Demo Analysis',
        barcode: barcode
      };
      
      const demoAnalysis = {
        score: 75,
        totalIngredients: 7,
        goodIngredients: ['water', 'glycerin', 'sodium hyaluronate'],
        badIngredients: ['phenoxyethanol'],
        moderateIngredients: ['cetyl alcohol', 'dimethicone', 'tocopherol']
      };
      
      setProduct(demoProduct);
      setAnalysis(demoAnalysis);
      setLoading(false);
      
      console.log('✅ CosmeticResultsScreen: Demo data loaded successfully');
      
      // Start fade animation
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    }, 1000); // 1 second delay to show loading
    
  }, [barcode]);

  const getScoreColor = (score) => {
    if (score >= 75) return '#4CAF50'; // Green
    if (score >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getScoreGrade = (score) => {
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Average';
    return 'Poor';
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Info */}
        <View style={styles.productCard}>
          <Text style={styles.productName}>{product?.product_name}</Text>
          <Text style={styles.productCategory}>Cosmetic Product</Text>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Health Score</Text>
          </View>
          
          <View style={styles.scoreCircle}>
            <View style={[styles.scoreInner, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          
          <Text style={[styles.scoreGrade, { color: scoreColor }]}>{gradeText}</Text>
        </View>

        {/* Ingredients Analysis */}
        <View style={styles.ingredientsCard}>
          <Text style={styles.sectionTitle}>Ingredient Analysis</Text>
          
          <View style={styles.ingredientsSummary}>
            <Text style={styles.summaryText}>
              Total ingredients: {analysis?.totalIngredients || 0}
            </Text>
          </View>

          {/* Good Ingredients */}
          {analysis?.goodIngredients?.length > 0 && (
            <View style={styles.ingredientSection}>
              <View style={styles.ingredientHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.ingredientHeaderText, { color: '#4CAF50' }]}>
                  Good Ingredients ({analysis.goodIngredients.length})
                </Text>
              </View>
              {analysis.goodIngredients.map((ingredient, index) => (
                <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
              ))}
            </View>
          )}

          {/* Moderate Ingredients */}
          {analysis?.moderateIngredients?.length > 0 && (
            <View style={styles.ingredientSection}>
              <View style={styles.ingredientHeader}>
                <Ionicons name="warning" size={20} color="#FF9800" />
                <Text style={[styles.ingredientHeaderText, { color: '#FF9800' }]}>
                  Moderate Ingredients ({analysis.moderateIngredients.length})
                </Text>
              </View>
              {analysis.moderateIngredients.map((ingredient, index) => (
                <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
              ))}
            </View>
          )}

          {/* Bad Ingredients */}
          {analysis?.badIngredients?.length > 0 && (
            <View style={styles.ingredientSection}>
              <View style={styles.ingredientHeader}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={[styles.ingredientHeaderText, { color: '#F44336' }]}>
                  Concerning Ingredients ({analysis.badIngredients.length})
                </Text>
              </View>
              {analysis.badIngredients.map((ingredient, index) => (
                <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleScanAnother}>
            <Ionicons name="scan" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Scan Another Product</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scoreHeader: {
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreMax: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  scoreGrade: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ingredientsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  ingredientsSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  ingredientSection: {
    marginBottom: 16,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 28,
    marginBottom: 4,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
    marginLeft: 8,
  },
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
