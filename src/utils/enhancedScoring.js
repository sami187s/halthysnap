// Enhanced Health Scoring System v2
// Research-grade scoring: Nutrition 55% + Ingredients 30% + Processing 10% + Positive Nutrients 5%
// Starts at 100 and subtracts penalties — harder to manipulate

import { analyzeIngredients } from './enhancedIngredientAnalyzer';

export const calculateHealthScore = (product, adjustedNutrition = null, portion = null) => {
  
  const nutritionData = adjustedNutrition || product?.nutriments || {};
  const scoreReasons = []; // Tracks human-readable reasons for the score
  
  // Step 1: Nutrition Score (55% weight) — start at 100, subtract penalties
  const nutritionResult = calculateNutritionScore(nutritionData, portion, product?.nutriments);
  const nutritionScore = nutritionResult.score;
  scoreReasons.push(...nutritionResult.reasons);
  
  // Step 2: Ingredient Risk Score (30% weight) — start at 100, subtract per ingredient
  const ingredientAnalysis = analyzeEnhancedIngredientRisks(product);
  const ingredientResult = calculateIngredientScore(ingredientAnalysis);
  const ingredientScore = ingredientResult.score;
  scoreReasons.push(...ingredientResult.reasons);
  
  // Step 3: Processing Score (10% weight) — NOVA-style classification
  const processingResult = calculateProcessingScore(product);
  const processingScore = processingResult.score;
  scoreReasons.push(...processingResult.reasons);
  
  // Step 4: Positive Nutrient Bonus (5% weight) — rewards fiber, protein, whole grains
  const positiveResult = calculatePositiveNutrientBonus(nutritionData, product);
  const positiveBonus = positiveResult.score;
  scoreReasons.push(...positiveResult.reasons);
  
  // Step 5: Weighted final score
  let finalScore = Math.round(
    (nutritionScore * 0.55) + 
    (ingredientScore * 0.30) + 
    (processingScore * 0.10) + 
    (positiveBonus * 0.05)
  );
  
  // Step 6: Critical Safety Cap — carcinogens/endocrine disruptors cap at 49
  const hasHighRiskIngredients = ingredientAnalysis.penalties.some(p => p.type === 'harmful-chemical');
  if (hasHighRiskIngredients) {
    finalScore = Math.min(finalScore, 49);
    scoreReasons.push({ text: 'Capped at 49 — harmful chemical detected', type: 'penalty', impact: 'cap' });
  }
  
  // Step 7: Clamp 0–100
  finalScore = Math.max(0, Math.min(100, finalScore));

  // Step 8: Nutriscore adjustment — use official grade when Turso/OFF data is available
  // This corrects for missing nutrition data in the DB (most products lack full nutritional values)
  const nsGrade = (product?.nutriscore_grade || '').toLowerCase().trim();
  if (nsGrade === 'a') {
    const boost = Math.min(15, 100 - finalScore);
    finalScore = Math.min(100, finalScore + boost);
    scoreReasons.push({ text: 'Nutri-Score A — excellent nutritional quality', type: 'bonus', impact: boost });
  } else if (nsGrade === 'b') {
    const boost = Math.min(8, 100 - finalScore);
    finalScore = Math.min(100, finalScore + boost);
    scoreReasons.push({ text: 'Nutri-Score B — good nutritional quality', type: 'bonus', impact: boost });
  } else if (nsGrade === 'd') {
    const pen = Math.min(15, finalScore);
    finalScore = Math.max(0, finalScore - pen);
    scoreReasons.push({ text: 'Nutri-Score D — poor nutritional quality', type: 'penalty', impact: -pen });
  } else if (nsGrade === 'e') {
    const pen = Math.min(32, finalScore);
    finalScore = Math.max(0, finalScore - pen);
    scoreReasons.push({ text: 'Nutri-Score E — very poor nutritional quality', type: 'penalty', impact: -pen });
  }
  // grade 'c' and unknown → no adjustment (neutral)
  
  const result = {
    score: finalScore,
    grade: getScoreGrade(finalScore),
    color: getScoreColor(finalScore),
    letter: getScoreLetter(finalScore),
    breakdown: {
      nutritionScore: nutritionScore,
      ingredientScore: ingredientScore,
      processingScore: processingScore,
      positiveBonus: positiveBonus,
      finalScore: finalScore,
      cappedByHarmfulIngredients: hasHighRiskIngredients && finalScore <= 49,
      methodology: 'Research-grade: Nutrition 55% + Ingredients 30% + Processing 10% + Positive 5%'
    },
    scoreReasons: scoreReasons,
    details: {
      penalties: ingredientAnalysis.penalties,
      bonuses: ingredientAnalysis.bonuses || [],
      portionInfo: portion ? `Calculated for ${portion.label}` : 'Per 100g/ml',
      harmfulIngredientCap: hasHighRiskIngredients ? 'Score capped at 49 due to high-risk ingredients' : null
    }
  };
  
  return result;
};

// Nutrition Score (0-100) — starts at 100, subtracts tiered penalties
// Based on research-grade thresholds similar to Nutri-Score
const calculateNutritionScore = (nutritionData, portion = null, originalNutrition = null) => {
  let score = 100;
  const reasons = [];
  
  if (!nutritionData || typeof nutritionData !== 'object') {
    return { score: 50, reasons: [] };
  }
  
  // Sugar penalties (per 100g)
  const sugar = nutritionData.sugars_100g || 0;
  if (sugar > 35) { score -= 35; reasons.push({ text: `Very high sugar (${sugar.toFixed(1)}g)`, type: 'penalty', impact: -35 }); }
  else if (sugar > 20) { score -= 20; reasons.push({ text: `High sugar (${sugar.toFixed(1)}g)`, type: 'penalty', impact: -20 }); }
  else if (sugar > 10) { score -= 10; reasons.push({ text: `Moderate sugar (${sugar.toFixed(1)}g)`, type: 'penalty', impact: -10 }); }
  else if (sugar > 5) { score -= 5; reasons.push({ text: `Slight sugar (${sugar.toFixed(1)}g)`, type: 'penalty', impact: -5 }); }
  
  // Sodium penalties (per 100g — convert from salt or use sodium directly)
  // Open Food Facts stores sodium_100g in grams; we want mg
  const sodiumG = nutritionData.sodium_100g || 0;
  const sodiumMg = sodiumG * 1000; // convert g to mg
  // Also check salt and convert: salt = sodium × 2.5
  const salt = nutritionData.salt_100g || 0;
  const sodiumFromSalt = salt * 400; // salt in g → sodium in mg (salt/2.5*1000)
  const effectiveSodiumMg = Math.max(sodiumMg, sodiumFromSalt);
  
  if (effectiveSodiumMg > 1200) { score -= 30; reasons.push({ text: `Very high sodium (${Math.round(effectiveSodiumMg)}mg)`, type: 'penalty', impact: -30 }); }
  else if (effectiveSodiumMg > 800) { score -= 20; reasons.push({ text: `High sodium (${Math.round(effectiveSodiumMg)}mg)`, type: 'penalty', impact: -20 }); }
  else if (effectiveSodiumMg > 400) { score -= 10; reasons.push({ text: `Moderate sodium (${Math.round(effectiveSodiumMg)}mg)`, type: 'penalty', impact: -10 }); }
  else if (effectiveSodiumMg > 200) { score -= 5; reasons.push({ text: `Slight sodium (${Math.round(effectiveSodiumMg)}mg)`, type: 'penalty', impact: -5 }); }
  
  // Saturated fat penalties (per 100g)
  const satFat = nutritionData['saturated-fat_100g'] || 0;
  if (satFat > 10) { score -= 20; reasons.push({ text: `Very high saturated fat (${satFat.toFixed(1)}g)`, type: 'penalty', impact: -20 }); }
  else if (satFat > 6) { score -= 10; reasons.push({ text: `High saturated fat (${satFat.toFixed(1)}g)`, type: 'penalty', impact: -10 }); }
  else if (satFat > 3) { score -= 5; reasons.push({ text: `Moderate saturated fat (${satFat.toFixed(1)}g)`, type: 'penalty', impact: -5 }); }
  
  // Calorie density penalty (per 100g)
  const calories = nutritionData['energy-kcal_100g'] || nutritionData.energy_100g || 0;
  if (calories > 500) { score -= 15; reasons.push({ text: `Very high calories (${Math.round(calories)} kcal)`, type: 'penalty', impact: -15 }); }
  else if (calories > 350) { score -= 8; reasons.push({ text: `High calories (${Math.round(calories)} kcal)`, type: 'penalty', impact: -8 }); }
  
  return { score: Math.max(0, Math.min(100, score)), reasons }; 
};

// Ingredient Risk Score (0-100) — starts at 100, subtracts per risky ingredient
const calculateIngredientScore = (ingredientAnalysis) => {
  let score = 100;
  const reasons = [];
  
  // Subtract penalties from analysis
  if (ingredientAnalysis.penalties && ingredientAnalysis.penalties.length > 0) {
    ingredientAnalysis.penalties.forEach(p => {
      score -= (p.penalty || 0);
      reasons.push({ 
        text: `${p.ingredient || 'Unknown'}: ${p.reason || 'Risky ingredient'}`, 
        type: 'penalty', 
        impact: -(p.penalty || 0) 
      });
    });
  }
  
  // Small bonuses for good ingredients (max +15 recovery)
  const totalBonus = Math.min(15, ingredientAnalysis.totalBonus || 0);
  if (totalBonus > 0) {
    score += totalBonus;
  }
  
  return { score: Math.max(0, Math.min(100, score)), reasons };
};

// NOVA-style Processing Score (0-100)
// Classifies food by processing level
const calculateProcessingScore = (product) => {
  const reasons = [];
  const ingredients = (product?.ingredients_text || '').toLowerCase();
  const productName = (product?.product_name || '').toLowerCase();
  const ingredientCount = ingredients ? ingredients.split(',').length : 0;
  
  // Ultra-processed indicators
  const ultraProcessedMarkers = [
    'flavor enhancer', 'flavour enhancer', 'emulsifier', 'modified starch', 
    'modified corn starch', 'hydrogenated', 'hydrolysed', 'hydrolyzed',
    'maltodextrin', 'dextrose', 'glucose syrup', 'inverted sugar',
    'high fructose corn syrup', 'corn syrup solids', 'interesterified',
    'mono and diglycerides', 'polysorbate', 'carrageenan',
    'sodium stearoyl lactylate', 'cellulose gum', 'xanthan gum',
    'soy protein isolate', 'whey protein isolate', 'casein',
    'mechanically separated', 'artificial', 'flavoring', 'colouring',
    'coloring', 'e621', 'msg', 'aspartame', 'acesulfame',
    'sucralose', 'saccharin', 'neotame'
  ];
  
  // Whole food indicators
  const wholeFoodMarkers = [
    'whole grain', 'whole wheat', 'brown rice', 'oats', 'quinoa',
    'fresh', 'raw', 'dried fruit', 'nuts', 'seeds', 'legumes',
    'vegetables', 'fruits', 'olive oil', 'coconut oil'
  ];
  
  // Minimally processed indicators
  const minimalProcessMarkers = [
    'pasteurized', 'frozen', 'dried', 'fermented', 'roasted',
    'ground', 'filtered', 'pressed'
  ];
  
  let ultraCount = 0;
  let wholeCount = 0;
  let minimalCount = 0;
  
  ultraProcessedMarkers.forEach(m => { if (ingredients.includes(m)) ultraCount++; });
  wholeFoodMarkers.forEach(m => { if (ingredients.includes(m) || productName.includes(m)) wholeCount++; });
  minimalProcessMarkers.forEach(m => { if (ingredients.includes(m)) minimalCount++; });
  
  let score;
  let novaClass;
  
  if (wholeCount >= 2 && ultraCount === 0 && ingredientCount <= 3) {
    score = 100;
    novaClass = 'Whole food';
    reasons.push({ text: 'Whole food (minimal ingredients)', type: 'bonus', impact: 0 });
  } else if (ultraCount === 0 && ingredientCount <= 5 && (minimalCount > 0 || wholeCount > 0)) {
    score = 80;
    novaClass = 'Minimally processed';
    reasons.push({ text: 'Minimally processed food', type: 'bonus', impact: 0 });
  } else if (ultraCount <= 1 && ingredientCount <= 10) {
    score = 50;
    novaClass = 'Processed';
    reasons.push({ text: 'Processed food', type: 'penalty', impact: -50 });
  } else {
    score = 20;
    novaClass = 'Ultra-processed';
    const markers = [];
    if (ultraCount >= 3) markers.push(`${ultraCount} ultra-processed additives`);
    if (ingredientCount > 8) markers.push(`${ingredientCount} ingredients`);
    reasons.push({ text: `Ultra-processed${markers.length ? ' — ' + markers.join(', ') : ''}`, type: 'penalty', impact: -80 });
  }
  
  return { score, novaClass, reasons };
};

// Positive Nutrient Bonus (0-100 scale, but capped at effective +10 in final calc)
const calculatePositiveNutrientBonus = (nutritionData, product) => {
  let bonus = 0;
  const reasons = [];
  
  const fiber = nutritionData?.fiber_100g || 0;
  const protein = nutritionData?.proteins_100g || 0;
  const productName = (product?.product_name || '').toLowerCase();
  const ingredients = (product?.ingredients_text || '').toLowerCase();
  
  // Fiber bonuses
  if (fiber > 6) { bonus += 6; reasons.push({ text: `High fiber (${fiber.toFixed(1)}g)`, type: 'bonus', impact: +6 }); }
  else if (fiber > 3) { bonus += 3; reasons.push({ text: `Good fiber (${fiber.toFixed(1)}g)`, type: 'bonus', impact: +3 }); }
  
  // Protein bonuses
  if (protein > 20) { bonus += 6; reasons.push({ text: `High protein (${protein.toFixed(1)}g)`, type: 'bonus', impact: +6 }); }
  else if (protein > 10) { bonus += 3; reasons.push({ text: `Good protein (${protein.toFixed(1)}g)`, type: 'bonus', impact: +3 }); }
  
  // Whole grain bonus
  if (ingredients.includes('whole grain') || ingredients.includes('whole wheat') || 
      productName.includes('whole grain') || productName.includes('whole wheat')) {
    bonus += 4;
    reasons.push({ text: 'Contains whole grains', type: 'bonus', impact: +4 });
  }
  
  // Cap total bonus at 10
  bonus = Math.min(10, bonus);
  
  // Scale to 0-100 for the weighted formula (bonus of 10 maps to score of 100)
  const scaledScore = bonus * 10;
  
  return { score: scaledScore, bonus, reasons };
};

// Analyze ingredient risks and assign penalties
const analyzeIngredientRisks = (ingredientsText) => {
  const penalties = [];
  let totalPenalty = 0;
  
  if (!ingredientsText || typeof ingredientsText !== 'string') {
    return { penalties, totalPenalty };
  }
  
  const ingredients = ingredientsText.toLowerCase();
  
  // High Risk Ingredients (-40 for trans fats, -30 for BHA/BHT, -25 for titanium dioxide)
  const highRiskIngredients = {
    // Trans fats — most dangerous
    'partially hydrogenated': { penalty: 40, reason: 'Trans fats (cardiovascular risk)' },
    'hydrogenated oil': { penalty: 40, reason: 'Trans fats (cardiovascular risk)' },
    
    // BHA / BHT
    'butylated hydroxytoluene': { penalty: 30, reason: 'Endocrine disruptor (BHT)' },
    'butylated hydroxyanisole': { penalty: 30, reason: 'Endocrine disruptor (BHA)' },
    
    // Titanium dioxide
    'titanium dioxide': { penalty: 25, reason: 'Potential genotoxin (banned in EU)' },
    
    // Carcinogens
    'sodium nitrite': { penalty: 25, reason: 'Potential carcinogen' },
    'sodium nitrate': { penalty: 25, reason: 'Potential carcinogen' },
    'potassium bromate': { penalty: 30, reason: 'Known carcinogen' },
    'formaldehyde': { penalty: 30, reason: 'Carcinogen' },
    
    // Endocrine disruptors
    'bpa': { penalty: 30, reason: 'Endocrine disruptor' },
    'phthalates': { penalty: 30, reason: 'Endocrine disruptor' },
    'triclosan': { penalty: 30, reason: 'Endocrine disruptor' }
  };
  
  // Medium Risk Ingredients (-10 to -15)
  const mediumRiskIngredients = {
    // Artificial dyes
    'red 40': { penalty: 15, reason: 'Artificial dye (linked to hyperactivity)' },
    'yellow 5': { penalty: 15, reason: 'Artificial dye' },
    'yellow 6': { penalty: 15, reason: 'Artificial dye' },
    'blue 1': { penalty: 15, reason: 'Artificial dye' },
    'red 3': { penalty: 15, reason: 'Artificial dye' },
    
    // Processed sweeteners
    'high fructose corn syrup': { penalty: 10, reason: 'Ultra-processed sweetener' },
    
    // Artificial sweeteners
    'aspartame': { penalty: 10, reason: 'Artificial sweetener' },
    'acesulfame potassium': { penalty: 10, reason: 'Artificial sweetener' },
    'sucralose': { penalty: 10, reason: 'Artificial sweetener' },
    
    // Parabens
    'methylparaben': { penalty: 10, reason: 'Paraben preservative' },
    'propylparaben': { penalty: 10, reason: 'Paraben preservative' },
    'butylparaben': { penalty: 10, reason: 'Paraben preservative' },
    'ethylparaben': { penalty: 10, reason: 'Paraben preservative' },
    
    // Preservatives
    'sodium benzoate': { penalty: 10, reason: 'Chemical preservative' },
    'potassium sorbate': { penalty: 10, reason: 'Chemical preservative' },
    'calcium propionate': { penalty: 10, reason: 'Chemical preservative' },
    'sulfur dioxide': { penalty: 10, reason: 'Chemical preservative' },
    
    // Other
    'monosodium glutamate': { penalty: 10, reason: 'Flavor enhancer (MSG)' }
  };
  
  // Low Risk Ingredients (-3 to -5)
  const lowRiskIngredients = {
    'artificial flavor': { penalty: 5, reason: 'Synthetic flavoring' },
    'artificial flavoring': { penalty: 5, reason: 'Synthetic flavoring' },
    'natural flavor': { penalty: 3, reason: 'Processed flavoring' },
    'caramel color': { penalty: 5, reason: 'Artificial coloring' },
    'modified corn starch': { penalty: 3, reason: 'Processed starch' },
    'corn syrup': { penalty: 5, reason: 'Processed sweetener' },
    'maltodextrin': { penalty: 3, reason: 'Processed additive' },
    'silicon dioxide': { penalty: 3, reason: 'Anti-caking agent' }
  };
  
  // Check for high risk ingredients
  Object.keys(highRiskIngredients).forEach(ingredient => {
    if (ingredients.includes(ingredient)) {
      const item = highRiskIngredients[ingredient];
      penalties.push({ type: 'high-risk', ingredient, penalty: item.penalty, reason: item.reason });
      totalPenalty += item.penalty;
    }
  });
  
  // Check for medium risk ingredients
  Object.keys(mediumRiskIngredients).forEach(ingredient => {
    if (ingredients.includes(ingredient)) {
      const item = mediumRiskIngredients[ingredient];
      penalties.push({ type: 'medium-risk', ingredient, penalty: item.penalty, reason: item.reason });
      totalPenalty += item.penalty;
    }
  });
  
  // Check for low risk ingredients
  Object.keys(lowRiskIngredients).forEach(ingredient => {
    if (ingredients.includes(ingredient)) {
      const item = lowRiskIngredients[ingredient];
      penalties.push({ type: 'low-risk', ingredient, penalty: item.penalty, reason: item.reason });
      totalPenalty += item.penalty;
    }
  });
  
  return { penalties, totalPenalty };
};

// Enhanced ingredient analysis using the comprehensive analyzer
const analyzeEnhancedIngredientRisks = (product) => {
  const penalties = [];
  const bonuses = [];
  let totalPenalty = 0;
  let totalBonus = 0;
  
  if (!product?.ingredients_text) {
    return { penalties, bonuses, totalPenalty, totalBonus, hasIngredientPenalties: false };
  }
  
  try {
    // Use the comprehensive ingredient analyzer
    const analysis = analyzeIngredients(product.ingredients_text, 'food', product.nutriments);
    
    if (analysis.additives?.length > 0) {
    }

    // Analyze GOOD ingredients for bonuses
    if (analysis.goodIngredients && analysis.goodIngredients.length > 0) {
      analysis.goodIngredients.forEach(ingredient => {
        const bonus = ingredient.status === 'EXCELLENT' ? 3 : 2; // Higher bonus for excellent ingredients
        bonuses.push({ 
          type: 'good-ingredient', 
          ingredient: ingredient.name || ingredient, 
          bonus, 
          reason: ingredient.reason || 'Beneficial ingredient' 
        });
        totalBonus += bonus;
      });
    }
    
    // Analyze bad ingredients
    if (analysis.badIngredients && analysis.badIngredients.length > 0) {
      analysis.badIngredients.forEach(ingredient => {
        const penalty = 15; // High risk penalty
        penalties.push({ 
          type: 'bad-ingredient', 
          ingredient: ingredient.name || ingredient, 
          penalty, 
          reason: ingredient.reason || 'High-risk ingredient' 
        });
        totalPenalty += penalty;
      });
    }
    
    // Analyze harmful chemicals
    if (analysis.harmfulChemicals && analysis.harmfulChemicals.length > 0) {
      analysis.harmfulChemicals.forEach(chemical => {
        const penalty = 20; // Very high risk penalty
        penalties.push({ 
          type: 'harmful-chemical', 
          ingredient: chemical.name || chemical, 
          penalty, 
          reason: chemical.reason || 'Harmful chemical compound' 
        });
        totalPenalty += penalty;
      });
    }
    
    // Analyze additives (E-numbers and preservatives) - THIS IS THE KEY FIX!
    if (analysis.additives && analysis.additives.length > 0) {
      
      analysis.additives.forEach(additive => {
        let penalty = 0;
        
        // Get risk level from either 'level', 'risk', or 'riskLevel' property
        const riskLevel = additive.level || additive.risk || additive.riskLevel || 'moderate';
        
        // Assign penalty based on additive safety level
        switch (riskLevel.toLowerCase()) {
          case 'high':
          case 'avoid':
          case 'concerning':
            penalty = 18;
            break;
          case 'moderate':
          case 'caution':
            penalty = 12;
            break;
          case 'low':
          case 'safe':
            penalty = 6;
            break;
          default:
            penalty = 8;
        }
        
        
        penalties.push({ 
          type: 'additive', 
          ingredient: additive.name || additive.type, 
          penalty, 
          reason: `${additive.type || 'Additive'}: ${additive.function || additive.description || 'Food additive'}`,
          eNumber: additive.eNumber || additive.code,
          level: riskLevel
        });
        totalPenalty += penalty;
      });
    }
    
    // Analyze moderate ingredients
    if (analysis.moderateIngredients && analysis.moderateIngredients.length > 0) {
      analysis.moderateIngredients.forEach(ingredient => {
        const penalty = 8; // Medium risk penalty
        penalties.push({ 
          type: 'moderate-ingredient', 
          ingredient: ingredient.name || ingredient, 
          penalty, 
          reason: ingredient.reason || 'Moderate-risk ingredient' 
        });
        totalPenalty += penalty;
      });
    }
    
    
  } catch (error) {
    // Fallback to basic analysis
    return analyzeIngredientRisks(product.ingredients_text || '');
  }
  
  return { penalties, bonuses, totalPenalty, totalBonus, hasIngredientPenalties: totalPenalty > 0 };
};

// Analyze nutrition and assign penalties (PORTION-SCALED WITH MINIMUM PENALTIES)
const analyzeNutritionPenalties = (adjustedNutrition, portion = null, originalNutrition = null) => {
  const penalties = [];
  let totalPenalty = 0;
  
  if (!adjustedNutrition || typeof adjustedNutrition !== 'object') {
    return { penalties, totalPenalty };
  }
  
  // Use original nutrition to check if product is inherently high in bad nutrients
  const baseNutrition = originalNutrition || adjustedNutrition;
  
  // Sugar penalty: >10g → -10 per extra 10g (with minimum penalty rule)
  const sugar = adjustedNutrition.sugars_100g;
  const baseSugar = baseNutrition.sugars_100g;
  if (sugar !== undefined && sugar > 10) {
    const extraSugar = sugar - 10;
    let penalty = Math.floor(extraSugar / 10) * 10;
    
    // Minimum penalty rule: If base product is high in sugar, apply at least -5 penalty
    if (baseSugar > 20 && penalty < 5) {
      penalty = 5;
    }
    
    if (penalty > 0) {
      penalties.push({
        type: 'nutrition',
        nutrient: 'sugar',
        value: sugar,
        baseValue: baseSugar,
        threshold: 10,
        penalty: penalty,
        reason: `High sugar content (${sugar.toFixed(1)}g)`,
        minimumApplied: baseSugar > 20 && penalty === 5
      });
      totalPenalty += penalty;
    }
  }
  
  // Salt penalty: >1g → -10 per extra gram (with minimum penalty rule)
  const salt = adjustedNutrition.salt_100g;
  const baseSalt = baseNutrition.salt_100g;
  if (salt !== undefined && salt > 1) {
    const extraSalt = salt - 1;
    let penalty = Math.floor(extraSalt) * 10;
    
    // Minimum penalty rule: If base product is high in salt, apply at least -5 penalty
    if (baseSalt > 2 && penalty < 5) {
      penalty = 5;
    }
    
    if (penalty > 0) {
      penalties.push({
        type: 'nutrition',
        nutrient: 'salt',
        value: salt,
        baseValue: baseSalt,
        threshold: 1,
        penalty: penalty,
        reason: `High salt content (${salt.toFixed(1)}g)`,
        minimumApplied: baseSalt > 2 && penalty === 5
      });
      totalPenalty += penalty;
    }
  }
  
  // Saturated fat penalty: >5g → -10 per extra 5g (with minimum penalty rule)
  const satFat = adjustedNutrition['saturated-fat_100g'];
  const baseSatFat = baseNutrition['saturated-fat_100g'];
  if (satFat !== undefined && satFat > 5) {
    const extraSatFat = satFat - 5;
    let penalty = Math.floor(extraSatFat / 5) * 10;
    
    // Minimum penalty rule: If base product is high in saturated fat, apply at least -5 penalty
    if (baseSatFat > 10 && penalty < 5) {
      penalty = 5;
    }
    
    if (penalty > 0) {
      penalties.push({
        type: 'nutrition',
        nutrient: 'saturated-fat',
        value: satFat,
        baseValue: baseSatFat,
        threshold: 5,
        penalty: penalty,
        reason: `High saturated fat (${satFat.toFixed(1)}g)`,
        minimumApplied: baseSatFat > 10 && penalty === 5
      });
      totalPenalty += penalty;
    }
  }
  
  // Calories penalty: >400 kcal → -5 per extra 100 kcal
  const calories = adjustedNutrition['energy-kcal_100g'];
  const baseCalories = baseNutrition['energy-kcal_100g'];
  if (calories !== undefined && calories > 400) {
    const extraCalories = calories - 400;
    let penalty = Math.floor(extraCalories / 100) * 5;
    
    // Minimum penalty rule: If base product is very high calorie, apply at least -3 penalty
    if (baseCalories > 600 && penalty < 3) {
      penalty = 3;
    }
    
    if (penalty > 0) {
      penalties.push({
        type: 'nutrition',
        nutrient: 'calories',
        value: calories,
        baseValue: baseCalories,
        threshold: 400,
        penalty: penalty,
        reason: `High calorie density (${Math.round(calories)} kcal)`,
        minimumApplied: baseCalories > 600 && penalty === 3
      });
      totalPenalty += penalty;
    }
  }
  
  return { penalties, totalPenalty };
};

// Analyze bonuses (positive factors)
const analyzeBonuses = (nutrition, product) => {
  const bonuses = [];
  let totalBonus = 0;
  
  // Fiber bonus: >5g → +10
  const fiber = nutrition?.fiber_100g;
  if (fiber !== undefined && fiber > 5) {
    bonuses.push({
      type: 'nutrition',
      factor: 'fiber',
      value: fiber,
      bonus: 10,
      reason: `High fiber content (${fiber.toFixed(1)}g)`
    });
    totalBonus += 10;
  }
  
  // Protein bonus: >10g → +10
  const protein = nutrition?.proteins_100g;
  if (protein !== undefined && protein > 10) {
    bonuses.push({
      type: 'nutrition',
      factor: 'protein',
      value: protein,
      bonus: 10,
      reason: `High protein content (${protein.toFixed(1)}g)`
    });
    totalBonus += 10;
  }
  
  // Organic bonus: +10
  const labels = product?.labels?.toLowerCase() || '';
  if (labels.includes('organic') || labels.includes('bio')) {
    bonuses.push({
      type: 'certification',
      factor: 'organic',
      bonus: 10,
      reason: 'Certified organic product'
    });
    totalBonus += 10;
  }
  
  // Eco-friendly packaging bonus: +5
  if (labels.includes('recyclable') || labels.includes('eco') || labels.includes('sustainable')) {
    bonuses.push({
      type: 'environmental',
      factor: 'eco-packaging',
      bonus: 5,
      reason: 'Eco-friendly packaging'
    });
    totalBonus += 5;
  }
  
  return { bonuses, totalBonus };
};

// Get score grade (Fair Scoring Scale)
const getScoreGrade = (score) => {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'AVERAGE';
  if (score >= 40) return 'POOR';
  return 'VERY POOR';
};

// Get score color (Updated Color Scheme)
const getScoreColor = (score) => {
  if (score >= 90) return '#1B5E20';  // Very Dark Green - Excellent
  if (score >= 70) return '#4CAF50';  // Green - Good (was Medium/Orange)
  if (score >= 50) return '#FF9800';  // Orange - Average (was Good)
  if (score >= 25) return '#FF5722';  // Red-orange - Poor
  return '#F44336';                   // Red - Very Poor
};

// Get score letter (Fair Scoring Scale)
const getScoreLetter = (score) => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
};

// Fair scoring example calculation
export const calculateScoreExample = () => {
  const chocolateBar = {
    product_name: 'Chocolate Bar Example',
    ingredients_text: 'sugar, cocoa butter, milk powder, cocoa mass, artificial flavor, soy lecithin',
    nutriments: {
      'energy-kcal_100g': 534,
      'sugars_100g': 50,
      'saturated-fat_100g': 15,
      'salt_100g': 0.1,
      'fat_100g': 30,
      'proteins_100g': 6,
      'fiber_100g': 2
    }
  };
  
  const fullBarScore = calculateHealthScore(chocolateBar);
  
  return { 
    fullBarScore, 
    explanation: {
      methodology: 'Research-grade: Nutrition 55% + Ingredients 30% + Processing 10% + Positive 5%',
      breakdown: fullBarScore.breakdown,
      reasons: fullBarScore.scoreReasons
    }
  };
};
