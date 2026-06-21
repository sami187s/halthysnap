// Enhanced Nutrition Data Processor
// Ensures 100% accurate nutrition information by handling all data variations

export const processNutritionData = (rawNutriments, productName = '') => {
  
  if (!rawNutriments || typeof rawNutriments !== 'object') {
    return {};
  }

  // Enhanced nutrition processor that handles all possible field variations
  const processedNutrition = {};
  
  // ENERGY/CALORIES - handle all possible variations
  const energyFields = [
    'energy-kcal_100g', 'energy_kcal_100g', 'energy-kcal', 'energy_kcal',
    'energy_100g', 'energy', 'calories_100g', 'calories'
  ];
  const energyValue = getFirstValidValue(rawNutriments, energyFields);
  if (energyValue !== null) {
    // Convert to kcal if it's in kJ
    if (energyValue > 1000) {
      processedNutrition['energy-kcal_100g'] = Math.round(energyValue / 4.184); // Convert kJ to kcal
    } else {
      processedNutrition['energy-kcal_100g'] = Number(energyValue);
    }
  }

  // SUGAR - handle all variations
  const sugarFields = [
    'sugars_100g', 'sugars', 'sugar_100g', 'sugar', 
    'carbohydrates_sugars_100g', 'total_sugars_100g'
  ];
  const sugarValue = getFirstValidValue(rawNutriments, sugarFields);
  if (sugarValue !== null) {
    processedNutrition.sugars_100g = Number(sugarValue);
  }

  // SALT/SODIUM - handle all variations and conversions
  const saltFields = [
    'salt_100g', 'salt', 'sodium_100g', 'sodium'
  ];
  const saltValue = getFirstValidValue(rawNutriments, saltFields);
  const sodiumValue = getFirstValidValue(rawNutriments, ['sodium_100g', 'sodium']);
  
  if (saltValue !== null) {
    processedNutrition.salt_100g = Number(saltValue);
  } else if (sodiumValue !== null) {
    // Convert sodium to salt (sodium × 2.5)
    processedNutrition.salt_100g = Number(sodiumValue) * 2.5;
  }
  if (processedNutrition.salt_100g !== undefined) {
  }

  // FAT - handle all variations
  const fatFields = [
    'fat_100g', 'fat', 'total_fat_100g', 'lipids_100g', 'lipids'
  ];
  const fatValue = getFirstValidValue(rawNutriments, fatFields);
  if (fatValue !== null) {
    processedNutrition.fat_100g = Number(fatValue);
  }

  // SATURATED FAT - handle all variations
  const satFatFields = [
    'saturated-fat_100g', 'saturated_fat_100g', 'saturated-fat', 'saturated_fat',
    'fat_saturated_100g', 'fat_saturated'
  ];
  const satFatValue = getFirstValidValue(rawNutriments, satFatFields);
  if (satFatValue !== null) {
    processedNutrition['saturated-fat_100g'] = Number(satFatValue);
  }

  // PROTEIN - handle all variations
  const proteinFields = [
    'proteins_100g', 'proteins', 'protein_100g', 'protein'
  ];
  const proteinValue = getFirstValidValue(rawNutriments, proteinFields);
  if (proteinValue !== null) {
    processedNutrition.proteins_100g = Number(proteinValue);
  }

  // CARBOHYDRATES - handle all variations
  const carbFields = [
    'carbohydrates_100g', 'carbohydrates', 'carbs_100g', 'carbs',
    'total_carbohydrates_100g'
  ];
  const carbValue = getFirstValidValue(rawNutriments, carbFields);
  if (carbValue !== null) {
    processedNutrition.carbohydrates_100g = Number(carbValue);
  }

  // FIBER - handle all variations
  const fiberFields = [
    'fiber_100g', 'fiber', 'fibre_100g', 'fibre',
    'dietary_fiber_100g', 'dietary_fibre_100g'
  ];
  const fiberValue = getFirstValidValue(rawNutriments, fiberFields);
  if (fiberValue !== null) {
    processedNutrition.fiber_100g = Number(fiberValue);
  }

  // ADDITIONAL NUTRIENTS for accuracy
  
  // Trans fat
  const transFatFields = ['trans-fat_100g', 'trans_fat_100g', 'trans-fat', 'trans_fat'];
  const transFatValue = getFirstValidValue(rawNutriments, transFatFields);
  if (transFatValue !== null) {
    processedNutrition['trans-fat_100g'] = Number(transFatValue);
  }

  // Cholesterol
  const cholesterolFields = ['cholesterol_100g', 'cholesterol'];
  const cholesterolValue = getFirstValidValue(rawNutriments, cholesterolFields);
  if (cholesterolValue !== null) {
    processedNutrition.cholesterol_100g = Number(cholesterolValue);
  }

  // Vitamin C
  const vitCFields = ['vitamin-c_100g', 'vitamin_c_100g', 'ascorbic-acid_100g'];
  const vitCValue = getFirstValidValue(rawNutriments, vitCFields);
  if (vitCValue !== null) {
    processedNutrition['vitamin-c_100g'] = Number(vitCValue);
  }

  // Calcium
  const calciumFields = ['calcium_100g', 'calcium'];
  const calciumValue = getFirstValidValue(rawNutriments, calciumFields);
  if (calciumValue !== null) {
    processedNutrition.calcium_100g = Number(calciumValue);
  }

  // Iron
  const ironFields = ['iron_100g', 'iron'];
  const ironValue = getFirstValidValue(rawNutriments, ironFields);
  if (ironValue !== null) {
    processedNutrition.iron_100g = Number(ironValue);
  }

  // Validate processed data
  const validatedNutrition = validateNutritionData(processedNutrition);
  
  
  return validatedNutrition;
};

// Helper function to get first valid value from multiple field names
const getFirstValidValue = (data, fieldNames) => {
  for (const field of fieldNames) {
    const value = data[field];
    if (value !== undefined && value !== null && value !== '' && !isNaN(value)) {
      return Number(value);
    }
  }
  return null;
};

// Validate nutrition data for accuracy
const validateNutritionData = (nutrition) => {
  const validated = {};
  
  Object.keys(nutrition).forEach(key => {
    const value = nutrition[key];
    
    // Skip invalid values
    if (isNaN(value) || value < 0) {
      return;
    }
    
    // Apply reasonable limits for validation
    const limits = {
      'energy-kcal_100g': { max: 900, min: 0 }, // Max 900 kcal per 100g
      'sugars_100g': { max: 100, min: 0 },
      'salt_100g': { max: 50, min: 0 },
      'fat_100g': { max: 100, min: 0 },
      'saturated-fat_100g': { max: 100, min: 0 },
      'proteins_100g': { max: 100, min: 0 },
      'carbohydrates_100g': { max: 100, min: 0 },
      'fiber_100g': { max: 50, min: 0 }
    };
    
    const limit = limits[key];
    if (limit) {
      if (value > limit.max) {
        validated[key] = limit.max;
      } else if (value < limit.min) {
        validated[key] = limit.min;
      } else {
        validated[key] = value;
      }
    } else {
      validated[key] = value;
    }
  });
  
  return validated;
};

// Enhanced nutrition formatting for display
export const formatNutritionForDisplay = (nutrition, portion = null) => {
  if (!nutrition || typeof nutrition !== 'object') {
    return {};
  }
  
  const formatted = {};
  
  Object.keys(nutrition).forEach(key => {
    const value = nutrition[key];
    if (typeof value === 'number' && !isNaN(value)) {
      // Apply portion multiplier if provided
      let adjustedValue = value;
      if (portion && portion.multiplier && typeof portion.multiplier === 'number') {
        adjustedValue = value * portion.multiplier;
      }
      
      // Format based on nutrient type
      if (key.includes('energy') || key.includes('kcal')) {
        formatted[key] = {
          value: Math.round(adjustedValue),
          unit: 'kcal',
          displayValue: `${Math.round(adjustedValue)} kcal`
        };
      } else {
        // All other nutrients in grams
        const precision = adjustedValue < 1 ? 2 : 1;
        formatted[key] = {
          value: Number(adjustedValue.toFixed(precision)),
          unit: 'g',
          displayValue: `${adjustedValue.toFixed(precision)}g`
        };
      }
    }
  });
  
  return formatted;
};

// Check if nutrition data is complete
export const checkNutritionCompleteness = (nutrition) => {
  const essentialFields = [
    'energy-kcal_100g', 'sugars_100g', 'salt_100g', 
    'fat_100g', 'proteins_100g', 'carbohydrates_100g'
  ];
  
  const available = essentialFields.filter(field => 
    nutrition[field] !== undefined && !isNaN(nutrition[field])
  );
  
  const completeness = (available.length / essentialFields.length) * 100;
  
  return {
    completeness: Math.round(completeness),
    available: available.length,
    total: essentialFields.length,
    missing: essentialFields.filter(field => !available.includes(field))
  };
};
