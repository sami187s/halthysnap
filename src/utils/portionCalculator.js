// Dynamic Portion Size Calculator
// Calculates nutrition values based on user-selected portion sizes

export const PORTION_PRESETS = {
  FOOD: [
    { id: 'per50g', label: 'Per 50g', multiplier: 0.5, unit: 'g' },
    { id: 'per100g', label: 'Per 100g', multiplier: 1.0, unit: 'g', default: true },
    { id: 'per200g', label: 'Per 200g', multiplier: 2.0, unit: 'g' },
    { id: 'perPackage', label: 'Per Package', multiplier: 'package', unit: 'pkg' }
  ],
  DRINK: [
    { id: 'per50ml', label: 'Per 50ml', multiplier: 0.5, unit: 'ml' },
    { id: 'per100ml', label: 'Per 100ml', multiplier: 1.0, unit: 'ml', default: true },
    { id: 'per250ml', label: 'Per 250ml', multiplier: 2.5, unit: 'ml' },
    { id: 'per500ml', label: 'Per 500ml', multiplier: 5.0, unit: 'ml' },
    { id: 'perBottle', label: 'Per Bottle', multiplier: 'package', unit: 'bottle' }
  ]
};

// Detect if product is a drink based on categories, name, and packaging
export const isDrinkProduct = (product) => {
  if (!product) return false;
  
  const categories = (product.categories || '').toLowerCase();
  const productName = (product.product_name || '').toLowerCase();
  const quantity = (product.quantity || '').toLowerCase();
  const servingSize = (product.serving_size || '').toLowerCase();
  const packaging = (product.packaging || '').toLowerCase();
  const textToCheck = `${categories} ${productName}`;
  
  // Food products that should NOT be drinks (override any drink keywords)
  const solidFoodKeywords = [
    'bread', 'cookie', 'biscuit', 'cake', 'chocolate', 'candy', 'snack',
    'cereal', 'pasta', 'rice', 'meat', 'cheese', 'yogurt', 'ice-cream',
    'frozen', 'canned-food', 'preserves', 'jam', 'honey', 'oil', 'vinegar',
    'spice', 'seasoning', 'sauce', 'dressing', 'soup', 'meal', 'pizza'
  ];
  
  for (const keyword of solidFoodKeywords) {
    if (textToCheck.includes(keyword)) {
      return false;
    }
  }
  
  // Check quantity/serving for liquid units (ml, cl, l, fl oz)
  const liquidUnitRegex = /\d+\s*(ml|cl|fl\s*oz|litre|liter)\b/;
  if (liquidUnitRegex.test(quantity) || liquidUnitRegex.test(servingSize)) {
    return true;
  }
  // Standalone "l" unit (e.g. "1.5 l", "2l") — must be careful not to match "100g" etc.
  const literRegex = /\d+\.?\d*\s*l\b/;
  if (literRegex.test(quantity)) {
    return true;
  }
  
  // Check packaging for drink containers
  const drinkPackaging = ['bottle', 'can', 'carton', 'tetra', 'pouch'];
  for (const pkg of drinkPackaging) {
    if (packaging.includes(pkg)) return true;
  }
  
  // Drink keywords in categories/name
  const drinkKeywords = [
    'beverages', 'beverage', 'drinks', 'drink', 'juices', 'juice',
    'sodas', 'soda', 'waters', 'water', 'teas', 'tea', 'coffees', 'coffee',
    'soft-drinks', 'energy-drinks', 'energy drink', 'sports-drinks',
    'alcoholic-beverages', 'non-alcoholic-beverages',
    'fruit-juices', 'vegetable-juices',
    'kombucha', 'smoothie', 'shake', 'lemonade', 'cola', 'pepsi',
    'fanta', 'sprite', 'redbull', 'red bull', 'monster energy',
    'mineral water', 'sparkling', 'fizzy', 'nectar', 'squash', 'cordial',
    'iced tea', 'ice tea'
  ];
  
  // Liquid dairy
  const liquidDairyKeywords = [
    'milk', 'dairy-drinks', 'plant-based-beverages', 'soy-milk', 
    'almond-milk', 'oat-milk', 'coconut-milk'
  ];
  
  for (const keyword of [...drinkKeywords, ...liquidDairyKeywords]) {
    if (textToCheck.includes(keyword)) {
      return true;
    }
  }
  
  return false;
};

// Calculate adjusted nutrition values based on portion
export const calculatePortionNutrition = (nutriments, portion, product) => {
  if (!nutriments || !portion) return nutriments;
  
  const adjustedNutriments = {};
  const multiplier = portion.multiplier;
  
  // Handle package-based calculations
  if (multiplier === 'package') {
    const packageSize = getPackageSize(product);
    const actualMultiplier = packageSize / 100; // Convert to per 100g multiplier
    
    Object.keys(nutriments).forEach(key => {
      if (key.includes('_100g') && typeof nutriments[key] === 'number') {
        adjustedNutriments[key] = nutriments[key] * actualMultiplier;
      } else {
        adjustedNutriments[key] = nutriments[key];
      }
    });
  } else {
    // Handle fixed multipliers
    Object.keys(nutriments).forEach(key => {
      if (key.includes('_100g') && typeof nutriments[key] === 'number') {
        adjustedNutriments[key] = nutriments[key] * multiplier;
      } else {
        adjustedNutriments[key] = nutriments[key];
      }
    });
  }
  
  return adjustedNutriments;
};

// Get package size from product data
const getPackageSize = (product) => {
  // Try to extract package size from various fields
  if (product?.quantity) {
    const quantity = product.quantity.toLowerCase();
    
    // Extract numeric value and unit
    const match = quantity.match(/(\d+(?:\.\d+)?)\s*(g|ml|kg|l|oz|fl\s*oz)/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].replace(/\s/g, '');
      
      // Convert to grams/ml
      switch (unit) {
        case 'kg': return value * 1000;
        case 'l': return value * 1000;
        case 'oz': return value * 28.35;
        case 'floz': return value * 29.57;
        default: return value;
      }
    }
  }
  
  // Fallback estimates based on product type
  if (isDrinkProduct(product)) {
    return 330; // Default bottle/can size in ml
  }
  
  return 100; // Default package size in g
};

// Calculate dynamic risk score based on portion consumption
export const calculateDynamicRisk = (nutriments, portion, thresholds) => {
  if (!nutriments || !portion) return { score: 70, adjustments: [] };
  
  const adjustedNutriments = calculatePortionNutrition(nutriments, portion, {});
  const adjustments = [];
  let score = 70; // Start with neutral score
  
  // Sugar risk adjustment
  if (adjustedNutriments.sugars_100g !== undefined) {
    const sugarAmount = adjustedNutriments.sugars_100g;
    if (sugarAmount > 25) {
      score -= 20;
      adjustments.push({ type: 'sugar', amount: sugarAmount, impact: -20, reason: 'Very high sugar content' });
    } else if (sugarAmount > 15) {
      score -= 10;
      adjustments.push({ type: 'sugar', amount: sugarAmount, impact: -10, reason: 'High sugar content' });
    } else if (sugarAmount > 8) {
      score -= 5;
      adjustments.push({ type: 'sugar', amount: sugarAmount, impact: -5, reason: 'Moderate sugar content' });
    }
  }
  
  // Salt risk adjustment
  if (adjustedNutriments.salt_100g !== undefined) {
    const saltAmount = adjustedNutriments.salt_100g;
    if (saltAmount > 2.0) {
      score -= 15;
      adjustments.push({ type: 'salt', amount: saltAmount, impact: -15, reason: 'Very high salt content' });
    } else if (saltAmount > 1.5) {
      score -= 8;
      adjustments.push({ type: 'salt', amount: saltAmount, impact: -8, reason: 'High salt content' });
    } else if (saltAmount > 0.8) {
      score -= 4;
      adjustments.push({ type: 'salt', amount: saltAmount, impact: -4, reason: 'Moderate salt content' });
    }
  }
  
  // Saturated fat risk adjustment
  if (adjustedNutriments['saturated-fat_100g'] !== undefined) {
    const satFatAmount = adjustedNutriments['saturated-fat_100g'];
    if (satFatAmount > 10) {
      score -= 12;
      adjustments.push({ type: 'saturated-fat', amount: satFatAmount, impact: -12, reason: 'High saturated fat' });
    } else if (satFatAmount > 5) {
      score -= 6;
      adjustments.push({ type: 'saturated-fat', amount: satFatAmount, impact: -6, reason: 'Moderate saturated fat' });
    }
  }
  
  // Calorie density consideration
  if (adjustedNutriments['energy-kcal_100g'] !== undefined) {
    const calories = adjustedNutriments['energy-kcal_100g'];
    if (calories > 500) {
      score -= 8;
      adjustments.push({ type: 'calories', amount: calories, impact: -8, reason: 'Very high calorie density' });
    } else if (calories > 350) {
      score -= 4;
      adjustments.push({ type: 'calories', amount: calories, impact: -4, reason: 'High calorie density' });
    }
  }
  
  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));
  
  return { score, adjustments };
};

// Get nutrition display label with portion info
export const getNutritionLabel = (key, portion) => {
  const baseLabels = {
    'energy-kcal_100g': 'CALORIES',
    'sugars_100g': 'SUGAR',
    'salt_100g': 'SALT',
    'fat_100g': 'FAT',
    'saturated-fat_100g': 'SAT. FAT',
    'fiber_100g': 'FIBER',
    'proteins_100g': 'PROTEIN',
    'carbohydrates_100g': 'CARBS'
  };
  
  const baseLabel = baseLabels[key] || key.replace(/_100g$/, '').toUpperCase();
  return `${baseLabel} (${portion.label})`;
};

// Format nutrition value with appropriate units
export const formatNutritionValue = (value, key, portion) => {
  if (typeof value !== 'number') return 'N/A';
  
  let unit = 'g';
  let displayValue = value;
  
  // Special handling for calories
  if (key.includes('energy-kcal')) {
    unit = 'kcal';
    displayValue = Math.round(value);
  } else {
    // Round to appropriate decimal places
    displayValue = value < 1 ? value.toFixed(2) : value.toFixed(1);
  }
  
  return `${displayValue}${unit}`;
};
