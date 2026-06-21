import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkNutritionCompleteness } from '../utils/nutritionProcessor';

const NutritionAccuracyCard = ({ nutrition, product, isExpanded, onToggle }) => {
  const completeness = checkNutritionCompleteness(nutrition || {});
  
  const getAccuracyColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };
  
  const getAccuracyIcon = (percentage) => {
    if (percentage >= 80) return 'checkmark-circle';
    if (percentage >= 60) return 'warning';
    return 'alert-circle';
  };
  
  const accuracyColor = getAccuracyColor(completeness.completeness);
  const accuracyIcon = getAccuracyIcon(completeness.completeness);
  
  return (
    <View style={styles.accuracyCard}>
      <TouchableOpacity style={styles.accuracyHeader} onPress={onToggle}>
        <View style={styles.accuracyTitleRow}>
          <Ionicons name="analytics" size={20} color="#666" />
          <Text style={styles.accuracyTitle}>Nutrition Data Accuracy</Text>
        </View>
        <View style={styles.accuracyStatus}>
          <Ionicons name={accuracyIcon} size={16} color={accuracyColor} />
          <Text style={[styles.accuracyPercentage, { color: accuracyColor }]}>
            {completeness.completeness}%
          </Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.accuracyDetails}>
          <View style={styles.dataSourceInfo}>
            <Text style={styles.sourceTitle}>Data Source:</Text>
            <Text style={styles.sourceText}>
              {product?.source || 'Open Food Facts'} - World's largest food database
            </Text>
          </View>
          
          <View style={styles.completenessBreakdown}>
            <Text style={styles.breakdownTitle}>Nutrition Fields Coverage:</Text>
            <View style={styles.fieldsList}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Available:</Text>
                <Text style={[styles.fieldValue, { color: '#4CAF50' }]}>
                  {completeness.available} fields
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Missing:</Text>
                <Text style={[styles.fieldValue, { color: '#F44336' }]}>
                  {completeness.total - completeness.available} fields
                </Text>
              </View>
            </View>
          </View>
          
          {completeness.missing.length > 0 && (
            <View style={styles.missingFields}>
              <Text style={styles.missingTitle}>Missing Data:</Text>
              {completeness.missing.map((field, index) => (
                <Text key={index} style={styles.missingField}>
                  • {field.replace(/_100g$/, '').replace(/-/g, ' ').toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          
          <View style={styles.accuracyNote}>
            <Ionicons name="information-circle" size={14} color="#666" />
            <Text style={styles.noteText}>
              Our app processes nutrition data from verified sources and applies
              quality checks to ensure maximum accuracy. Values are automatically
              converted to standardized units (per 100g).
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  accuracyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accuracyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  accuracyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 8,
  },
  accuracyDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dataSourceInfo: {
    marginBottom: 16,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  completenessBreakdown: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  fieldsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#666',
  },
  fieldValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  missingFields: {
    marginBottom: 16,
  },
  missingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  missingField: {
    fontSize: 10,
    color: '#F44336',
    marginBottom: 2,
  },
  accuracyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
  },
  noteText: {
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
    marginLeft: 6,
    flex: 1,
  },
});

export default NutritionAccuracyCard;
