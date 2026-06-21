import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProductImage = ({ imageUrl, productType, style, forceIcon = false }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getProductIcon = (type) => {
    switch (type) {
      case 'food':
        return 'restaurant';
      case 'beauty':
        return 'flower';
      default:
        return 'cube';
    }
  };

  const getProductColor = (type) => {
    switch (type) {
      case 'food':
        return '#4CAF50';
      case 'beauty':
        return '#9C27B0';
      default:
        return '#FF9800';
    }
  };

  // Always show icon if forceIcon is true, or if no image/error
  if (forceIcon || !imageUrl || imageError) {
    return (
      <View style={[styles.imagePlaceholder, style]}>
        <Ionicons 
          name={getProductIcon(productType)} 
          size={40} 
          color={getProductColor(productType)} 
        />
        <Text style={styles.placeholderText}>
          {productType === 'food' ? 'Food' : 
           productType === 'beauty' ? 'Beauty' : 'Product'}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.productImage, style]}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        onLoadStart={() => setIsLoading(true)}
        resizeMode="cover"
      />
      {isLoading && (
        <View style={[styles.loadingOverlay, style]}>
          <Ionicons name="image" size={40} color="#ccc" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  productImage: {
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    borderRadius: 8,
  },
});

export default ProductImage;
