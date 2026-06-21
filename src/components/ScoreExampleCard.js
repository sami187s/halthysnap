import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateScoreExample } from '../utils/enhancedScoring';

const ScoreExampleCard = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [examples] = useState(() => calculateScoreExample());
  
  return (
    <View style={styles.exampleCard}>
      <TouchableOpacity 
        style={styles.exampleHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.titleRow}>
          <Ionicons name="calculator" size={20} color="#666" />
          <Text style={styles.exampleTitle}>Scoring Example: Chocolate Bar</Text>
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.exampleContent}>
          <Text style={styles.exampleSubtitle}>Research-grade scoring prevents gaming the system:</Text>
          
          {/* Full Bar Example */}
          <View style={styles.exampleItem}>
            <View style={styles.exampleScoreRow}>
              <Text style={styles.portionLabel}>Chocolate Bar (100g):</Text>
              <View style={[styles.scoreDisplay, { backgroundColor: examples.fullBarScore.color }]}>
                <Text style={styles.scoreText}>{examples.fullBarScore.score}</Text>
              </View>
              <Text style={[styles.gradeText, { color: examples.fullBarScore.color }]}>
                {examples.fullBarScore.grade}
              </Text>
            </View>
            <Text style={styles.reasonText}>
              Nutrition 55% + Ingredients 30% + Processing 10% + Positive 5%
            </Text>
          </View>
          
          <View style={styles.fairnessNote}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.fairnessText}>
              <Text style={styles.boldText}>Research-Grade Scoring:</Text> Uses NOVA processing classification, 
              tiered penalties for sugar/sodium/fat, and rewards fiber, protein and whole grains.
            </Text>
          </View>
          
          <View style={styles.takeaway}>
            <Ionicons name="bulb" size={16} color="#FF9800" />
            <Text style={styles.takeawayText}>
              Scores start at 100 and subtract penalties — harder to manipulate than additive systems!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  exampleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  exampleContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exampleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  exampleItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  exampleScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  portionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreDisplay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 70,
  },
  reasonText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  fairnessNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  fairnessText: {
    fontSize: 11,
    color: '#2e7d32',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: 'bold',
  },
  takeaway: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  takeawayText: {
    fontSize: 11,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default ScoreExampleCard;
