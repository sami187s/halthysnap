/**
 * FREE Food Recognition using Hugging Face AI
 * Uses Vision Transformer model trained on food images
 * 100% FREE - No API key needed!
 */

import axios from 'axios';
import { Platform } from 'react-native';

// FREE Hugging Face API endpoint
const FOOD_API = 'https://api-inference.huggingface.co/models/nateraw/food';

/**
 * Recognize food from photo using FREE AI
 * @param {string} imageUri - Local image URI
 * @returns {Object} - { foodName, confidence, alternatives }
 */
export const recognizeFood = async (imageUri) => {
  try {
    console.log('🤖 Analyzing food with AI...');
    
    // Convert image to base64
    const base64 = await imageToBase64(imageUri);
    
    // Call FREE Hugging Face API
    const response = await axios.post(
      FOOD_API,
      { inputs: base64 },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ AI recognized:', response.data);

    if (response.data && response.data.length > 0) {
      const top = response.data[0];
      
      return {
        foodName: cleanName(top.label),
        confidence: top.score,
        alternatives: response.data.slice(1, 4).map(item => ({
          name: cleanName(item.label),
          confidence: item.score
        }))
      };
    }

    throw new Error('No food detected');

  } catch (error) {
    console.error('❌ AI error:', error.message);
    
    // Fallback: Return error so user can type manually
    return {
      foodName: 'Unknown',
      confidence: 0,
      alternatives: [],
      error: 'Could not analyze image. Please type food name.'
    };
  }
};

/**
 * Convert image to base64
 */
const imageToBase64 = async (imageUri) => {
  try {
    if (Platform.OS === 'web') {
      // Web: Convert blob to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } else {
      // Mobile: Use expo-file-system
      const FileSystem = require('expo-file-system').default;
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    }
  } catch (error) {
    console.error('❌ Image conversion failed:', error);
    throw error;
  }
};

/**
 * Clean food name (remove model prefixes)
 */
const cleanName = (label) => {
  // Remove "n01234_" prefixes
  let name = label.replace(/^n\d+[_\s]+/, '');
  // Replace _ with spaces
  name = name.replace(/_/g, ' ');
  // Capitalize words
  return name.split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
};

/**
 * Check if food recognition confidence is acceptable
 */
export const isConfidenceAcceptable = (confidence) => {
  return confidence >= 0.5; // 50% threshold
};

/**
 * Format food name for API queries
 * e.g., "Cheeseburger" -> "cheeseburger"
 */
export const normalizeFoodName = (foodName) => {
  return foodName.toLowerCase().trim();
};

// Export as object for consistency
export const mlKitAPI = {
  recognizeFood,
  isConfidenceAcceptable,
  normalizeFoodName
};

// Keep old name for backward compatibility
export const clarifaiAPI = mlKitAPI;

export default mlKitAPI;
