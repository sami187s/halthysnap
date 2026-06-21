/**
 * Food Photo Scoring Algorithm
 * Calculates health score (0-100) for real food based on nutrition data
 * Traffic light system: Green (70-100), Yellow (40-69), Red (0-39)
 * 
 * NOW ENHANCED: Works with user-provided answers for accurate scoring
 * - Accounts for cooking methods (fried vs grilled)
 * - Considers portion sizes
 * - Adjusts for added ingredients (sauces, dressings, etc.)
 */

/**
 * Calculate health score for food based on nutrition data
 * @param {Object} nutrition - Enhanced nutrition data from USDA API + modifiers
 * @returns {Object} - { score, color, grade, analysis }
 */
export const calculateFoodScore = (nutrition) => {
  if (!nutrition) {
    return {
      score: 0,
      color: '#999',
      grade: 'UNKNOWN',
      analysis: { positives: [], negatives: ['No nutrition data available'] }
    };
  }

  // Start with neutral score
  let score = 50;
  const positives = [];
  const negatives = [];

  // Extract nutrition values (per 100g serving)
  const calories = nutrition.calories || 0;
  const protein = nutrition.protein || 0;
  const carbs = nutrition.carbs || 0;
  const totalFat = nutrition.totalFat || 0;
  const saturatedFat = nutrition.saturatedFat || 0;
  const transFat = nutrition.transFat || 0;
  const sugar = nutrition.sugar || 0;
  const fiber = nutrition.fiber || 0;
  const sodium = nutrition.sodium || 0;

  // === PENALTIES (subtract points) ===

  // High Calories
  if (calories > 500) {
    score -= 20;
    negatives.push('Very high in calories (>500 kcal)');
  } else if (calories > 400) {
    score -= 10;
    negatives.push('High in calories (400-500 kcal)');
  } else if (calories > 300) {
    score -= 5;
    negatives.push('Moderately high calories (300-400 kcal)');
  }

  // High Sugar
  if (sugar > 15) {
    score -= 20;
    negatives.push(`Very high sugar content (${sugar.toFixed(1)}g)`);
  } else if (sugar > 10) {
    score -= 10;
    negatives.push(`High sugar content (${sugar.toFixed(1)}g)`);
  } else if (sugar > 5) {
    score -= 5;
    negatives.push(`Moderate sugar content (${sugar.toFixed(1)}g)`);
  }

  // High Sodium
  if (sodium > 800) {
    score -= 15;
    negatives.push(`Very high sodium (${sodium.toFixed(0)}mg)`);
  } else if (sodium > 500) {
    score -= 10;
    negatives.push(`High sodium (${sodium.toFixed(0)}mg)`);
  } else if (sodium > 300) {
    score -= 5;
    negatives.push(`Moderate sodium (${sodium.toFixed(0)}mg)`);
  }

  // High Saturated Fat
  if (saturatedFat > 10) {
    score -= 15;
    negatives.push(`Very high saturated fat (${saturatedFat.toFixed(1)}g)`);
  } else if (saturatedFat > 5) {
    score -= 8;
    negatives.push(`High saturated fat (${saturatedFat.toFixed(1)}g)`);
  }

  // Trans Fat (any amount is bad)
  if (transFat > 0) {
    score -= 10;
    negatives.push(`Contains trans fats (${transFat.toFixed(1)}g)`);
  }

  // High Total Fat
  if (totalFat > 25) {
    score -= 10;
    negatives.push(`Very high total fat (${totalFat.toFixed(1)}g)`);
  } else if (totalFat > 15) {
    score -= 5;
    negatives.push(`High total fat (${totalFat.toFixed(1)}g)`);
  }

  // === BONUSES (add points) ===

  // High Protein
  if (protein > 20) {
    score += 15;
    positives.push(`Excellent protein content (${protein.toFixed(1)}g)`);
  } else if (protein > 15) {
    score += 10;
    positives.push(`High protein content (${protein.toFixed(1)}g)`);
  } else if (protein > 10) {
    score += 5;
    positives.push(`Good protein content (${protein.toFixed(1)}g)`);
  }

  // High Fiber
  if (fiber > 8) {
    score += 15;
    positives.push(`Excellent fiber content (${fiber.toFixed(1)}g)`);
  } else if (fiber > 5) {
    score += 10;
    positives.push(`High fiber content (${fiber.toFixed(1)}g)`);
  } else if (fiber > 3) {
    score += 5;
    positives.push(`Good fiber content (${fiber.toFixed(1)}g)`);
  }

  // Low Calorie
  if (calories < 200) {
    score += 10;
    positives.push('Low calorie option');
  } else if (calories < 300) {
    score += 5;
    positives.push('Moderate calorie content');
  }

  // Low Sugar
  if (sugar < 2) {
    score += 5;
    positives.push('Very low sugar');
  }

  // Low Sodium
  if (sodium < 100) {
    score += 5;
    positives.push('Low sodium');
  }

  // Healthy Fat Ratio (unsaturated fats)
  const unsaturatedFat = totalFat - saturatedFat;
  if (unsaturatedFat > saturatedFat && unsaturatedFat > 5) {
    score += 8;
    positives.push('Good balance of healthy fats');
  }

  // Ensure score stays within 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Determine color and grade
  const { color, grade } = getScoreColorAndGrade(score);

  return {
    score: Math.round(score),
    color,
    grade,
    analysis: {
      positives,
      negatives
    }
  };
};

/**
 * Get color and grade based on score
 */
export const getScoreColorAndGrade = (score) => {
  if (score >= 70) {
    return {
      color: '#4CAF50', // Green
      grade: 'HEALTHY'
    };
  } else if (score >= 40) {
    return {
      color: '#FF9800', // Yellow
      grade: 'MODERATE'
    };
  } else {
    return {
      color: '#F44336', // Red
      grade: 'RISKY'
    };
  }
};

/**
 * Format nutrition data for display
 */
export const formatNutritionForDisplay = (nutrition) => {
  if (!nutrition) return [];

  return [
    {
      label: 'Calories',
      value: `${nutrition.calories || 0} kcal`,
      icon: 'flame-outline'
    },
    {
      label: 'Protein',
      value: `${(nutrition.protein || 0).toFixed(1)}g`,
      icon: 'fitness-outline',
      isPositive: nutrition.protein > 10
    },
    {
      label: 'Carbs',
      value: `${(nutrition.carbs || 0).toFixed(1)}g`,
      icon: 'nutrition-outline'
    },
    {
      label: 'Total Fat',
      value: `${(nutrition.totalFat || 0).toFixed(1)}g`,
      icon: 'water-outline',
      isNegative: nutrition.totalFat > 20
    },
    {
      label: 'Saturated Fat',
      value: `${(nutrition.saturatedFat || 0).toFixed(1)}g`,
      icon: 'alert-circle-outline',
      isNegative: nutrition.saturatedFat > 5
    },
    {
      label: 'Sugar',
      value: `${(nutrition.sugar || 0).toFixed(1)}g`,
      icon: 'cube-outline',
      isNegative: nutrition.sugar > 10
    },
    {
      label: 'Fiber',
      value: `${(nutrition.fiber || 0).toFixed(1)}g`,
      icon: 'leaf-outline',
      isPositive: nutrition.fiber > 5
    },
    {
      label: 'Sodium',
      value: `${(nutrition.sodium || 0).toFixed(0)}mg`,
      icon: 'beaker-outline',
      isNegative: nutrition.sodium > 500
    }
  ];
};

/**
 * Get emoji based on score
 */
export const getScoreEmoji = (score) => {
  if (score >= 80) return { icon: 'star', color: '#FFD700' };
  if (score >= 70) return { icon: 'checkmark-circle', color: '#4CAF50' };
  if (score >= 60) return { icon: 'thumbs-up', color: '#8BC34A' };
  if (score >= 50) return { icon: 'remove-circle', color: '#FF9800' };
  if (score >= 40) return { icon: 'alert-circle', color: '#FF9800' };
  return { icon: 'close-circle', color: '#F44336' };
};
