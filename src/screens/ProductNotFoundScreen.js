import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/shared/ScreenWrapper';
import ScreenHeader from '../components/shared/ScreenHeader';

const { width, height } = Dimensions.get('window');

const ProductNotFoundScreen = ({ route, navigation }) => {
  const { barcode, productType = 'cosmetic' } = route.params || {};

  const isFood = productType === 'food';
  const productTypeText = isFood ? 'Food Product' : 'Cosmetic Product';
  const productIconName = isFood ? 'restaurant-outline' : 'medical-outline';
  const alternativeText = isFood 
    ? 'Try searching for similar food items or check if the barcode is correct.' 
    : 'Try searching for similar cosmetic products or check if the barcode is correct.';

  const handleTryAgain = () => {
    navigation.goBack();
  };

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  const handleHome = () => {
    navigation.navigate('Home');
  };

  return (
    <ScreenWrapper>
      <ScreenHeader title="Product Not Found" onBack={handleHome} />

      {/* Main Content */}
      <View style={styles.content}>
        
        {/* Icon and Main Message */}
        <View style={styles.iconContainer}>
          <Ionicons name={productIconName} size={60} color="#666" style={styles.productIcon} />
          <View style={styles.notFoundIcon}>
            <Ionicons name="close-circle" size={48} color="#FF5722" />
          </View>
        </View>

        <Text style={styles.mainTitle}>
          {productTypeText} Not Found
        </Text>

        <Text style={styles.subtitle}>
          We couldn't find this product in our database.
        </Text>

        {/* Barcode Display */}
        {barcode && (
          <View style={styles.barcodeContainer}>
            <Text style={styles.barcodeLabel}>Scanned Barcode:</Text>
            <Text style={styles.barcodeText}>{barcode}</Text>
          </View>
        )}

        {/* Database Growth Message */}
        <View style={styles.growthContainer}>
          <View style={styles.growthHeader}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
            <Text style={styles.growthTitle}>Our Database is Growing!</Text>
          </View>
          <Text style={styles.growthText}>
            We're constantly expanding our product database. Your scans help us learn which products to add next. Together, we're building the most comprehensive health database!
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>140+</Text>
              <Text style={styles.statLabel}>Ingredients</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>Growing</Text>
              <Text style={styles.statLabel}>Daily</Text>
            </View>
          </View>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>What you can do:</Text>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="search" size={20} color="#4CAF50" />
            <Text style={styles.suggestionText}>
              Search manually for the product name
            </Text>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="camera" size={20} color="#4CAF50" />
            <Text style={styles.suggestionText}>
              Try scanning the barcode again
            </Text>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="information-circle" size={20} color="#4CAF50" />
            <Text style={styles.suggestionText}>
              {alternativeText}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.searchButton]} 
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.searchButtonText}>Search Manually</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.tryAgainButton]} 
          onPress={handleTryAgain}
        >
          <Ionicons name="camera" size={20} color="#4CAF50" style={styles.buttonIcon} />
          <Text style={styles.tryAgainButtonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 30,
    alignItems: 'center',
  },
  productIcon: {
    marginBottom: 10,
  },
  notFoundIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  barcodeContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  barcodeLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 5,
  },
  barcodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  growthContainer: {
    width: '100%',
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  growthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 8,
  },
  growthText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  suggestionsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tryAgainButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tryAgainButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductNotFoundScreen;
