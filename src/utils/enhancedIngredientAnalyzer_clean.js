// Enhanced Ingredient Analyzer with Professional Database Integration
import { professionalIngredientDatabase, enhancedIngredientLookup } from './professionalIngredientDatabase';

// Load professional database if available
let professionalData = null;
try {
  professionalData = require('../data/professional_database.json');
  console.log('✅ Professional database loaded successfully');
} catch (error) {
  console.log('🔄 Professional database not yet integrated, using manual data');
}

// Simple ingredient analysis for both food and beauty products
export const analyzeIngredients = (productIngredients, productType = 'beauty', nutriments = {}, productData = null) => {
  
  try {
    // Use different analysis for non-food products
    if (productType !== 'food') {
      return analyzeNonFoodProduct(productIngredients, productType);
    }
    
    // Original food analysis continues below...
    return analyzeFoodProduct(productIngredients, nutriments, productData);
  } catch (error) {
    // Return a safe fallback analysis
    return {
      score: 50,
      analyzedIngredients: [],
      goodIngredients: [],
      badIngredients: [],
      moderateIngredients: [],
      unknownIngredients: [],
      harmfulChemicals: [],
      allergens: [],
      additives: [],
      productType: productType,
      analysisType: 'error-fallback',
      error: error.message
    };
  }
};

// Dedicated analysis for beauty/cosmetic/household products with professional database
export const analyzeNonFoodProduct = (productIngredients, productType) => {
  if (!productIngredients || typeof productIngredients !== 'string') {
    return {
      score: 50,
      analyzedIngredients: [],
      goodIngredients: [],
      badIngredients: [],
      moderateIngredients: [],
      unknownIngredients: [],
      harmfulChemicals: [],
      allergens: [],
      additives: [],
      productType: productType,
      analysisType: 'beauty-cosmetic'
    };
  }

  // Parse ingredients
  const ingredientsList = productIngredients
    .toLowerCase()
    .split(/[,;.]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 2);

  const analyzedIngredients = [];
  const goodIngredients = [];
  const badIngredients = [];
  const moderateIngredients = [];
  const unknownIngredients = [];

  // Enhanced analysis with professional database
  for (const ingredient of ingredientsList) {
    let analysis = null;
    
    // First try professional database
    if (professionalData) {
      analysis = lookupProfessionalDatabase(ingredient, productType);
    }
    
    // Fallback to enhanced lookup
    if (!analysis) {
      analysis = enhancedIngredientLookup(ingredient);
    }
    
    // Categorize based on safety score
    const safetyScore = analysis.safety || 60;
    let category = 'moderate';
    
    if (safetyScore >= 85) {
      category = 'excellent';
      goodIngredients.push({
        name: ingredient,
        score: safetyScore,
        function: analysis.function || 'skincare',
        notes: analysis.notes || 'Safe ingredient'
      });
    } else if (safetyScore >= 70) {
      category = 'good';
      goodIngredients.push({
        name: ingredient,
        score: safetyScore,
        function: analysis.function || 'skincare',
        notes: analysis.notes || 'Generally safe'
      });
    } else if (safetyScore >= 45) {
      category = 'moderate';
      moderateIngredients.push({
        name: ingredient,
        score: safetyScore,
        function: analysis.function || 'unknown',
        concerns: analysis.notes || 'May cause irritation in sensitive individuals'
      });
    } else {
      category = 'bad';
      badIngredients.push({
        name: ingredient,
        score: safetyScore,
        function: analysis.function || 'unknown',
        concerns: analysis.notes || 'Safety concerns'
      });
    }

    analyzedIngredients.push({
      name: ingredient,
      category: category,
      score: safetyScore,
      acne_risk: analysis.acne || 0,
      irritation: analysis.irritation || 0,
      pregnancy_safe: analysis.pregnancy !== false,
      function: analysis.function || 'unknown',
      evidence_quality: analysis.evidence || 'medium'
    });
  }

  // Professional database lookup function
  function lookupProfessionalDatabase(ingredient, productType) {
    if (!professionalData) return null;
    
    const database = productType === 'food' ? 
      professionalData.food?.ingredients : 
      professionalData.cosmetic?.ingredients;
    
    if (!database) return null;
    
    // Direct lookup
    const key = ingredient.replace(/\s+/g, '_');
    if (database[key]) {
      return database[key];
    }
    
    // Fuzzy matching
    for (const [dbKey, data] of Object.entries(database)) {
      if (dbKey.includes(key) || key.includes(dbKey.replace(/_/g, ' '))) {
        return data;
      }
      // Check INCI name if available
      if (data.inci && data.inci.toLowerCase().includes(ingredient)) {
        return data;
      }
    }
    
    return null;
  }

  // Calculate overall score based on ingredient categories
  const totalIngredients = analyzedIngredients.length;
  if (totalIngredients === 0) {
    return {
      score: 50,
      analyzedIngredients: [],
      goodIngredients: [],
      badIngredients: [],
      moderateIngredients: [],
      unknownIngredients: [],
      harmfulChemicals: [],
      allergens: [],
      additives: [],
      productType: productType,
      analysisType: 'beauty-professional'
    };
  }

  // Professional scoring algorithm
  const excellentCount = goodIngredients.filter(ing => ing.score >= 85).length;
  const goodCount = goodIngredients.filter(ing => ing.score < 85).length;
  const moderateCount = moderateIngredients.length;
  const badCount = badIngredients.length;
  const unknownCount = unknownIngredients.length;

  // Weight calculation based on safety levels
  const score = Math.round(
    (excellentCount * 95 + goodCount * 80 + moderateCount * 60 + badCount * 25 + unknownCount * 50) / totalIngredients
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    analyzedIngredients,
    goodIngredients,
    badIngredients,
    moderateIngredients,
    unknownIngredients,
    harmfulChemicals: badIngredients.filter(ing => ing.score < 35),
    allergens: analyzedIngredients.filter(ing => ing.irritation > 2),
    additives: analyzedIngredients.filter(ing => ing.function?.includes('preservative')),
    productType: productType,
    analysisType: 'beauty-professional',
    databaseSource: professionalData ? 'professional' : 'manual',
    coverage: `${totalIngredients - unknownCount}/${totalIngredients} recognized`
  };
};

// Food product analysis (simplified for now)
export const analyzeFoodProduct = (productIngredients, nutriments = {}, productData = null) => {
  // Simple food analysis - can be enhanced later
  const score = calculateNutriScore(nutriments);
  
  return {
    score: score,
    analyzedIngredients: [],
    goodIngredients: [],
    badIngredients: [],
    moderateIngredients: [],
    unknownIngredients: [],
    harmfulChemicals: [],
    allergens: [],
    additives: [],
    productType: 'food',
    analysisType: 'food-nutriscore'
  };
};

// Simple Nutri-Score calculation
function calculateNutriScore(nutriments) {
  let score = 70; // Base score
  
  if (nutriments.salt && nutriments.salt > 1.5) score -= 10;
  if (nutriments.sugars && nutriments.sugars > 22.5) score -= 10;
  if (nutriments.saturated_fat && nutriments.saturated_fat > 6) score -= 10;
  if (nutriments.energy && nutriments.energy > 2000) score -= 5;
  
  if (nutriments.fiber && nutriments.fiber > 3) score += 5;
  if (nutriments.proteins && nutriments.proteins > 8) score += 5;
  
  return Math.max(0, Math.min(100, score));
}
