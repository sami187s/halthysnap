import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PORTION_PRESETS, isDrinkProduct } from '../utils/portionCalculator';

const PortionSelector = ({ product, selectedPortion, onPortionChange }) => {
  const isProductDrink = isDrinkProduct(product);
  const portionOptions = isProductDrink ? PORTION_PRESETS.DRINK : PORTION_PRESETS.FOOD;

  React.useEffect(() => {
    // Set default or reset if the current portion doesn't belong to the right set
    const currentIds = portionOptions.map(p => p.id);
    if (!selectedPortion || !currentIds.includes(selectedPortion.id)) {
      const defaultPortion = portionOptions.find(p => p.default) || portionOptions[1];
      onPortionChange(defaultPortion);
    }
  }, [selectedPortion, portionOptions, onPortionChange]);

  if (!selectedPortion) return null;

  const unit = isProductDrink ? 'ml' : 'g';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ionicons name={isProductDrink ? 'water-outline' : 'scale-outline'} size={14} color="#666" />
        <Text style={styles.label}>Serving</Text>
        <View style={styles.pills}>
          {portionOptions.map((option) => {
            const isActive = selectedPortion.id === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => onPortionChange(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {option.label.replace('Per ', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {selectedPortion.multiplier !== 1 && selectedPortion.multiplier !== 'package' && (
        <Text style={styles.hint}>
          Score adjusted for {selectedPortion.label.replace('Per ', '').toLowerCase()} serving
        </Text>
      )}
      {selectedPortion.multiplier === 'package' && (
        <Text style={styles.hint}>
          Score adjusted for full package size
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginRight: 4,
  },
  pills: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  pillActive: {
    backgroundColor: '#2E7D32',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },
  pillTextActive: {
    color: '#FFF',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginLeft: 20,
  },
});

export default PortionSelector;
