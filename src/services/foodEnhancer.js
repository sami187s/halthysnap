/**
 * Food Enhancer Service
 * Applies modifiers to nutrition data based on user answers
 * Handles: cooking methods, portions, ingredients, etc.
 */

import { FOOD_QUESTIONS } from '../data/foodQuestions';

/**
 * Apply all modifiers to nutrition data based on user answers
 * @param {Object} baseNutrition - Base nutrition from USDA
 * @param {string} foodName - Food name
 * @param {Object} userAnswers - User's answers to questions
 * @returns {Object} - Enhanced nutrition data
 */
export const applyModifiers = (baseNutrition, foodName, userAnswers) => {
  if (!baseNutrition || !userAnswers || Object.keys(userAnswers).length === 0) {
    return baseNutrition;
  }

  // Clone nutrition data to avoid mutation
  let enhanced = { ...baseNutrition };
  
  const normalized = foodName.toLowerCase().trim();
  const foodConfig = FOOD_QUESTIONS[normalized] || findFoodConfig(normalized);
  
  if (!foodConfig || !foodConfig.questions) {
    return enhanced;
  }

  // Step 1: Apply calorie/fat/protein modifiers (additive)
  enhanced = applyAdditiveModifiers(enhanced, foodConfig, userAnswers);
  
  // Step 2: Apply portion multipliers (multiplicative - do this LAST)
  enhanced = applyPortionMultiplier(enhanced, foodConfig, userAnswers);
  
  return enhanced;
};

/**
 * Apply additive modifiers (calories, fat, protein from cooking methods, ingredients)
 */
const applyAdditiveModifiers = (nutrition, foodConfig, userAnswers) => {
  let modified = { ...nutrition };
  
  for (const question of foodConfig.questions) {
    const answer = userAnswers[question.id];
    if (!answer) continue;
    
    // Calorie modifier
    if (question.calorieModifier && question.calorieModifier[answer] !== undefined) {
      modified.calories = (modified.calories || 0) + question.calorieModifier[answer];
      console.log(`📊 Added ${question.calorieModifier[answer]} calories from ${question.id}`);
    }
    
    // Fat modifier
    if (question.fatModifier && question.fatModifier[answer] !== undefined) {
      modified.fat = (modified.fat || 0) + question.fatModifier[answer];
      console.log(`📊 Added ${question.fatModifier[answer]}g fat from ${question.id}`);
    }
    
    // Protein modifier
    if (question.proteinModifier && question.proteinModifier[answer] !== undefined) {
      modified.protein = (modified.protein || 0) + question.proteinModifier[answer];
      console.log(`📊 Added ${question.proteinModifier[answer]}g protein from ${question.id}`);
    }
    
    // Sugar modifier
    if (question.sugarModifier && question.sugarModifier[answer] !== undefined) {
      modified.sugar = (modified.sugar || 0) + question.sugarModifier[answer];
    }
    
    // Sodium modifier
    if (question.sodiumModifier && question.sodiumModifier[answer] !== undefined) {
      modified.sodium = (modified.sodium || 0) + question.sodiumModifier[answer];
    }
    
    // Fiber modifier
    if (question.fiberModifier && question.fiberModifier[answer] !== undefined) {
      modified.fiber = (modified.fiber || 0) + question.fiberModifier[answer];
    }
  }
  
  return modified;
};

/**
 * Apply portion multiplier (multiply ALL nutrients)
 */
const applyPortionMultiplier = (nutrition, foodConfig, userAnswers) => {
  // Find portion question
  const portionQuestion = foodConfig.questions.find(q => q.id === 'portion' || q.id === 'bowl_size' || q.id === 'slices' || q.id === 'count' || q.id === 'size');
  
  if (!portionQuestion) {
    return nutrition;
  }
  
  const answer = userAnswers[portionQuestion.id];
  if (!answer || !portionQuestion.portionMultiplier) {
    return nutrition;
  }
  
  const multiplier = portionQuestion.portionMultiplier[answer];
  if (!multiplier) {
    return nutrition;
  }
  
  console.log(`📊 Applying portion multiplier: ${multiplier}x for "${answer}"`);
  
  // Multiply all nutrients
  return {
    ...nutrition,
    calories: Math.round((nutrition.calories || 0) * multiplier),
    protein: Math.round((nutrition.protein || 0) * multiplier * 10) / 10,
    carbs: Math.round((nutrition.carbs || 0) * multiplier * 10) / 10,
    fat: Math.round((nutrition.fat || 0) * multiplier * 10) / 10,
    saturatedFat: Math.round((nutrition.saturatedFat || 0) * multiplier * 10) / 10,
    transFat: Math.round((nutrition.transFat || 0) * multiplier * 10) / 10,
    sugar: Math.round((nutrition.sugar || 0) * multiplier * 10) / 10,
    fiber: Math.round((nutrition.fiber || 0) * multiplier * 10) / 10,
    sodium: Math.round((nutrition.sodium || 0) * multiplier),
    potassium: Math.round((nutrition.potassium || 0) * multiplier),
    vitaminC: Math.round((nutrition.vitaminC || 0) * multiplier * 10) / 10,
    vitaminA: Math.round((nutrition.vitaminA || 0) * multiplier * 10) / 10,
    calcium: Math.round((nutrition.calcium || 0) * multiplier),
    iron: Math.round((nutrition.iron || 0) * multiplier * 10) / 10
  };
};

/**
 * Find food config by partial match
 */
const findFoodConfig = (normalized) => {
  for (const [key, value] of Object.entries(FOOD_QUESTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return null;
};

/**
 * Get enhanced USDA search query based on answers
 * @param {string} foodName - Base food name
 * @param {Object} userAnswers - User answers
 * @returns {string} - Enhanced search query
 */
export const getEnhancedUSDAQuery = (foodName, userAnswers) => {
  if (!userAnswers || Object.keys(userAnswers).length === 0) {
    return foodName;
  }
  
  const normalized = foodName.toLowerCase().trim();
  const foodConfig = FOOD_QUESTIONS[normalized] || findFoodConfig(normalized);
  
  if (!foodConfig) {
    return foodName;
  }
  
  // Find questions with usdaModifier
  for (const question of foodConfig.questions) {
    const answer = userAnswers[question.id];
    if (answer && question.usdaModifier) {
      if (typeof question.usdaModifier === 'function') {
        const modifiedQuery = question.usdaModifier(answer);
        console.log(`🔍 Enhanced USDA query: "${foodName}" → "${modifiedQuery}"`);
        return modifiedQuery;
      }
    }
  }
  
  return foodName;
};

/**
 * Get summary of user choices for display
 * @param {string} foodName - Food name
 * @param {Object} userAnswers - User answers
 * @returns {string} - Human-readable summary
 */
export const getChoicesSummary = (foodName, userAnswers) => {
  if (!userAnswers || Object.keys(userAnswers).length === 0) {
    return foodName;
  }
  
  const normalized = foodName.toLowerCase().trim();
  const foodConfig = FOOD_QUESTIONS[normalized] || findFoodConfig(normalized);
  
  if (!foodConfig) {
    return foodName;
  }
  
  const choices = [];
  for (const question of foodConfig.questions) {
    const answer = userAnswers[question.id];
    if (answer) {
      choices.push(answer);
    }
  }
  
  if (choices.length === 0) {
    return foodName;
  }
  
  // Format: "Brown Rice, Fried, 2 cups"
  return `${foodName} (${choices.join(', ')})`;
};

/**
 * Calculate nutrition confidence score based on answers
 * @param {Object} userAnswers - User answers
 * @returns {number} - Confidence 0-1
 */
export const calculateConfidence = (userAnswers) => {
  if (!userAnswers || Object.keys(userAnswers).length === 0) {
    return 0.5; // Base confidence without questions
  }
  
  // More answers = higher confidence
  const answerCount = Object.keys(userAnswers).length;
  
  if (answerCount >= 3) return 0.95;
  if (answerCount === 2) return 0.85;
  if (answerCount === 1) return 0.75;
  
  return 0.5;
};

export const FoodEnhancer = {
  applyModifiers,
  getEnhancedUSDAQuery,
  getChoicesSummary,
  calculateConfidence
};

export default FoodEnhancer;
