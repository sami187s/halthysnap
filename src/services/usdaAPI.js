/**
 * USDA FoodData Central API Service
 * Fetches nutrition data for food items (FREE API)
 * Get your API key: https://fdc.nal.usda.gov/api-key-signup.html
 */

import axios from 'axios';
import { FoodEnhancer } from './foodEnhancer';

// USDA API Configuration
// Get your own free key: https://fdc.nal.usda.gov/api-key-signup.html
import Constants from 'expo-constants';
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = Constants.expoConfig?.extra?.usdaApiKey || 'DEMO_KEY';

/**
 * Search for food in USDA database
 * @param {string} foodName - Name of food to search
 * @returns {Object} - Nutrition data
 */
export const searchFood = async (foodName) => {
  try {
    console.log('🔍 Searching USDA database for:', foodName);
    
    const response = await axios.get(`${USDA_API_URL}/foods/search`, {
      params: {
        query: foodName,
        api_key: USDA_API_KEY,
        pageSize: 5 // Get top 5 results for better matching
      }
    });

    const foods = response.data?.foods || [];
    
    if (foods.length === 0) {
      console.warn('⚠️ No nutrition data found for:', foodName);
      return getDefaultNutritionData(foodName);
    }

    const food = foods[0];
    console.log('✅ Found nutrition data for:', food.description);

    // Extract nutrition data
    const nutritionData = extractNutritionData(food);
    
    return {
      ...nutritionData,
      foodName: food.description,
      fdcId: food.fdcId,
      dataSource: food.dataType
    };

  } catch (error) {
    console.error('❌ USDA API error:', error.message);
    
    // Return default data on error
    return getDefaultNutritionData(foodName);
  }
};

/**
 * Extract nutrition values from USDA food object
 */
const extractNutritionData = (food) => {
  const nutrients = food.foodNutrients || [];
  
  // Helper to find nutrient by name
  const getNutrient = (names) => {
    const nutrient = nutrients.find(n => 
      names.some(name => n.nutrientName?.toLowerCase().includes(name.toLowerCase()))
    );
    return nutrient?.value || 0;
  };

  return {
    // Energy
    calories: getNutrient(['Energy', 'Calories']),
    
    // Macronutrients
    protein: getNutrient(['Protein']),
    carbs: getNutrient(['Carbohydrate', 'Total carbohydrate']),
    totalFat: getNutrient(['Total lipid', 'Fat, total']),
    
    // Fats breakdown
    saturatedFat: getNutrient(['Fatty acids, total saturated', 'Saturated fat']),
    transFat: getNutrient(['Fatty acids, total trans', 'Trans fat']),
    
    // Sugars and fiber
    sugar: getNutrient(['Sugars, total', 'Total Sugars']),
    fiber: getNutrient(['Fiber, total dietary', 'Dietary fiber']),
    
    // Minerals
    sodium: getNutrient(['Sodium']),
    potassium: getNutrient(['Potassium']),
    
    // Vitamins (bonus data)
    vitaminC: getNutrient(['Vitamin C', 'Ascorbic acid']),
    vitaminA: getNutrient(['Vitamin A']),
    calcium: getNutrient(['Calcium']),
    iron: getNutrient(['Iron'])
  };
};

/**
 * Get default nutrition data when API fails or no data found
 */
const getDefaultNutritionData = (foodName) => {
  console.log('⚠️ Using estimated nutrition data for:', foodName);
  
  // Basic estimates based on common foods
  const estimatedData = {
    'burger': { calories: 540, protein: 28, carbs: 40, totalFat: 27, saturatedFat: 10, sugar: 8, sodium: 1080, fiber: 2 },
    'hamburger': { calories: 540, protein: 28, carbs: 40, totalFat: 27, saturatedFat: 10, sugar: 8, sodium: 1080, fiber: 2 },
    'cheeseburger': { calories: 600, protein: 30, carbs: 42, totalFat: 32, saturatedFat: 14, sugar: 9, sodium: 1200, fiber: 2 },
    'pizza': { calories: 266, protein: 11, carbs: 33, totalFat: 10, saturatedFat: 4.5, sugar: 3.8, sodium: 598, fiber: 2.3 },
    'salad': { calories: 120, protein: 8, carbs: 15, totalFat: 3, saturatedFat: 1, sugar: 6, sodium: 180, fiber: 5 },
    'pasta': { calories: 220, protein: 8, carbs: 43, totalFat: 1.3, saturatedFat: 0.2, sugar: 1.5, sodium: 6, fiber: 2.5 },
    'chicken': { calories: 239, protein: 27, carbs: 0, totalFat: 14, saturatedFat: 3.8, sugar: 0, sodium: 82, fiber: 0 },
    'rice': { calories: 130, protein: 2.7, carbs: 28, totalFat: 0.3, saturatedFat: 0.1, sugar: 0.1, sodium: 1, fiber: 0.4 },
    'fries': { calories: 312, protein: 3.4, carbs: 41, totalFat: 15, saturatedFat: 2.3, sugar: 0.3, sodium: 210, fiber: 3.8 },
    'soup': { calories: 100, protein: 6, carbs: 12, totalFat: 2.5, saturatedFat: 1, sugar: 3, sodium: 700, fiber: 2 },
    'oatmeal': { calories: 68, protein: 2.4, carbs: 12, totalFat: 1.4, saturatedFat: 0.2, sugar: 0.4, sodium: 49, fiber: 1.7 }
  };

  // Try to find a match
  const lowerFoodName = foodName.toLowerCase();
  for (const [key, value] of Object.entries(estimatedData)) {
    if (lowerFoodName.includes(key)) {
      return {
        ...value,
        transFat: 0,
        potassium: 0,
        vitaminC: 0,
        vitaminA: 0,
        calcium: 0,
        iron: 0,
        foodName: foodName,
        fdcId: null,
        dataSource: 'estimated',
        isEstimated: true
      };
    }
  }

  // Default unknown food
  return {
    calories: 250,
    protein: 10,
    carbs: 30,
    totalFat: 10,
    saturatedFat: 3,
    transFat: 0,
    sugar: 5,
    fiber: 2,
    sodium: 300,
    potassium: 0,
    vitaminC: 0,
    vitaminA: 0,
    calcium: 0,
    iron: 0,
    foodName: foodName,
    fdcId: null,
    dataSource: 'estimated',
    isEstimated: true
  };
};

/**
 * Get detailed food information by FDC ID
 */
export const getFoodById = async (fdcId) => {
  try {
    const response = await axios.get(`${USDA_API_URL}/food/${fdcId}`, {
      params: {
        api_key: USDA_API_KEY
      }
    });

    return extractNutritionData(response.data);
  } catch (error) {
    console.error('❌ Error fetching food by ID:', error.message);
    throw error;
  }
};

/**
 * Enhanced search with user answers for accuracy
 * @param {string} foodName - Base food name
 * @param {Object} userAnswers - User's answers to questions
 * @returns {Object} - Enhanced nutrition data
 */
export const searchFoodEnhanced = async (foodName, userAnswers = {}) => {
  try {
    console.log('🔍 Enhanced search for:', foodName);
    console.log('📋 User answers:', userAnswers);
    
    // Step 1: Get enhanced USDA query
    const enhancedQuery = FoodEnhancer.getEnhancedUSDAQuery(foodName, userAnswers);
    console.log('🎯 Using query:', enhancedQuery);
    
    // Step 2: Search USDA with enhanced query
    const baseNutrition = await searchFood(enhancedQuery);
    
    // Step 3: Apply modifiers based on user answers
    const enhancedNutrition = FoodEnhancer.applyModifiers(baseNutrition, foodName, userAnswers);
    
    // Step 4: Add confidence score
    enhancedNutrition.confidence = FoodEnhancer.calculateConfidence(userAnswers);
    enhancedNutrition.userChoices = FoodEnhancer.getChoicesSummary(foodName, userAnswers);
    
    console.log('✅ Enhanced nutrition data:', enhancedNutrition);
    
    return enhancedNutrition;
    
  } catch (error) {
    console.error('❌ Enhanced search error:', error.message);
    
    // Fallback to basic search
    return await searchFood(foodName);
  }
};

export const usdaAPI = {
  searchFood,
  searchFoodEnhanced,
  getFoodById,
  extractNutritionData
};

export default usdaAPI;
