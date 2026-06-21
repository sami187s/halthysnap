import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Helper functions for scoring and colors
const getScoreColor = (score) => {
  if (score >= 70) return '#4CAF50';      // Excellent - Green
  if (score >= 50) return '#FFBB33';      // Good - Orange  
  if (score >= 25) return '#FF8800';      // Poor - Dark Orange
  return '#FF4444';                       // Very Poor - Red
};

const getYukaGrade = (score) => {
  if (score >= 75) return 'EXCELLENT';
  if (score >= 50) return 'GOOD';
  if (score >= 25) return 'POOR';
  return 'VERY POOR';
};

const getYukaLetter = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  if (score >= 25) return 'D';
  return 'E';
};

const ScoreCard = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreHeader}>
        <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(analysis.overallScore) }]}>
          <Text style={styles.scoreNumber}>{Math.round(analysis.overallScore)}</Text>
          <Text style={styles.scoreTotal}>/100</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
        </View>
        <View style={styles.scoreDetails}>
          <Text style={[styles.scoreGrade, { color: getScoreColor(analysis.overallScore) }]}>
            {getYukaGrade(analysis.overallScore)}
          </Text>
          <Text style={styles.scoreLetter}>Grade: {getYukaLetter(analysis.overallScore)}</Text>
          <Text style={styles.scoreDescription}>
            {analysis.productType === 'food' ? 'Nutritional Quality' : 'Ingredient Safety'}
          </Text>
        </View>
      </View>
      
      {/* Score Breakdown for Transparency */}
      {analysis.scoreBreakdown && (
        <View style={styles.scoreBreakdown}>
          <Text style={styles.breakdownTitle}>Score Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Ingredients:</Text>
            <Text style={styles.breakdownValue}>{analysis.scoreBreakdown.ingredientScore || 'N/A'}</Text>
          </View>
          {analysis.scoreBreakdown.nutritionScore && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Nutrition:</Text>
              <Text style={styles.breakdownValue}>{analysis.scoreBreakdown.nutritionScore}</Text>
            </View>
          )}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Confidence:</Text>
            <Text style={[styles.breakdownValue, { 
              color: analysis.scoreBreakdown.confidence === 'High' ? '#4CAF50' : 
                     analysis.scoreBreakdown.confidence === 'Medium' ? '#FF9800' : '#F44336' 
            }]}>
              {analysis.scoreBreakdown.confidence}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scoreCard: {
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
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 24,
  },
  scoreTotal: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 14,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  scoreDetails: {
    flex: 1,
  },
  scoreBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  scoreGrade: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreLetter: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: '#888',
  },
});

export default ScoreCard;
