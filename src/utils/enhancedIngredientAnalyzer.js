// Enhanced Ingredient Analyzer with Professional Database Integration
// import { professionalIngredientDatabase, enhancedIngredientLookup } from './professionalIngredientDatabase';
// import { getQuickLearningLink, generateUnknownIngredientExplanation } from './ingredientLearningLinks';

// Load comprehensive cosmetic database
let cosmeticDatabase = null;
let generalDatabase = null;
let professionalData = null;
let professionalIngredientDatabase = null;
let enhancedIngredientLookup = null;
let getQuickLearningLink = null;
let generateUnknownIngredientExplanation = null;

// Try to load databases and functions
try {
  const profDb = require('./professionalIngredientDatabase');
  professionalIngredientDatabase = profDb.professionalIngredientDatabase;
  enhancedIngredientLookup = profDb.enhancedIngredientLookup;
} catch (error) {
  console.log('⚠️ Professional ingredient database module not available');
}

try {
  const learningLinks = require('./ingredientLearningLinks');
  getQuickLearningLink = learningLinks.getQuickLearningLink;
  generateUnknownIngredientExplanation = learningLinks.generateUnknownIngredientExplanation;
} catch (error) {
  console.log('⚠️ Learning links module not available');
  // Fallback functions
  getQuickLearningLink = (ingredient, productType) => `https://google.com/search?q=${encodeURIComponent(ingredient)}+cosmetic+ingredient`;
  generateUnknownIngredientExplanation = (ingredient) => `${ingredient} is not in our database. Tap to learn more.`;
}

try {
  cosmeticDatabase = require('../data/cosing_database.json');
  console.log('✅ Cosmetic database loaded successfully:', Object.keys(cosmeticDatabase.ingredients || {}).length, 'ingredients');
} catch (error) {
  console.log('⚠️ Cosmetic database not found:', error.message);
}

try {
  generalDatabase = require('../data/ingredientsDatabase.json');
  console.log('✅ General ingredients database loaded successfully:', (generalDatabase || []).length, 'ingredients');
} catch (error) {
  console.log('⚠️ General ingredients database not found:', error.message);
}

try {
  professionalData = require('../data/professional_database.json');
  console.log('✅ Professional database loaded successfully');
} catch (error) {
  console.log('🔄 Professional database not yet integrated, using manual data');
}

// Save unknown ingredients to trust DB (fire-and-forget)
let _AsyncStorage = null;
try { _AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

async function _saveTrustDb(unknownList) {
  if (!_AsyncStorage || !unknownList || unknownList.length === 0) return;
  try {
    const key = 'ai_learned_ingredients';
    const raw = await _AsyncStorage.getItem(key);
    const db = raw ? JSON.parse(raw) : {};
    let changed = false;
    unknownList.forEach(ing => {
      const name = (ing.name || '').toLowerCase().trim();
      if (name && !db[name]) {
        db[name] = { name, riskLevel: 'unknown', score: 50, learnedAt: Date.now() };
        changed = true;
      }
    });
    if (changed) await _AsyncStorage.setItem(key, JSON.stringify(db));
  } catch (e) {}
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
      overallScore: 50,
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
      overallScore: 50,
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

  // Parse ingredients — expand parentheses before splitting so sub-ingredients
  // (e.g. "palm oil (antioxidant: E306)") are kept, not discarded.
  const ingredientsList = productIngredients
    .toLowerCase()
    .replace(/[()[\]]/g, ',') // turn brackets into separators so sub-ingredients survive
    .split(/[,;:\n]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 1)
    .filter(ingredient => !ingredient.match(/^(and|or|the|with|contains|may contain)$/));

  const analyzedIngredients = [];
  const goodIngredients = [];
  const badIngredients = [];
  const moderateIngredients = [];
  const unknownIngredients = [];

  console.log(`🧪 Analyzing ${ingredientsList.length} ingredients for ${productType} product`);

  // Helper: for food products, decide if an unknown ingredient is likely natural
  // Returns true if it looks like a real food ingredient, false if it looks chemical/additive
  function isLikelyNaturalFoodIngredient(name) {
    const n = name.toLowerCase().trim();
    // E-number additives (e100–e999, with optional space)
    if (/^e\s?\d{3,4}[a-z]?$/i.test(n)) return false;
    // Chemical suffixes common in additives/preservatives
    if (/\b(nitrate|nitrite|sulfite|sulphite|benzoate|sorbate|propionate|phosphate|polyphosphate|glutamate|aspartate|saccharin|sucralose|acesulfame|aspartame|carrageenan|xanthan|carboxymethyl|hydroxypropyl|mono.*glyceride|di.*glyceride|tocopherol acetate|ascorbyl|stearoyl|lecithin(?! oil))\b/.test(n)) return false;
    // Multi-word chemical patterns
    if (/\b(modified starch|artificial|color[s]?$|flavou?r[s]?$|preservative)\b/.test(n)) return false;
    // Anything that looks like a natural food word — passes as natural
    return true;
  }

  // Enhanced analysis with multiple databases
  for (const ingredient of ingredientsList) {
    let analysis = null;
    let isUnknown = false;
    let databaseSource = '';
    
    // 1. First try comprehensive cosmetic database (highest priority)
    if (cosmeticDatabase && cosmeticDatabase.ingredients) {
      analysis = lookupCosmeticDatabase(ingredient);
      if (analysis) databaseSource = 'cosmetic-db';
    }
    
    // 2. Try general ingredients database
    if (!analysis && generalDatabase) {
      analysis = lookupGeneralDatabase(ingredient);
      if (analysis) databaseSource = 'general-db';
    }
    
    // 3. Try professional database
    if (!analysis && professionalData) {
      analysis = lookupProfessionalDatabase(ingredient, productType);
      if (analysis) databaseSource = 'professional-db';
    }
    
    // 4. Fallback to enhanced lookup
    if (!analysis && enhancedIngredientLookup) {
      analysis = enhancedIngredientLookup(ingredient);
      if (analysis) databaseSource = 'enhanced-lookup';
    }
    
    // 5. Try fuzzy matching for common ingredient variations
    if (!analysis) {
      analysis = fuzzyIngredientMatch(ingredient);
      if (analysis) databaseSource = 'fuzzy-match';
    }
    
    // Check if ingredient is truly unknown (no data found)
    if (!analysis || !analysis.safety) {
      isUnknown = true;

      // For food products: natural-sounding ingredients default to GOOD, not neutral
      if (productType === 'food' && isLikelyNaturalFoodIngredient(ingredient)) {
        analysis = {
          safety: 78,
          function: 'Natural food ingredient',
          notes: 'Recognized as a natural food component',
          evidence: 'general'
        };
        isUnknown = false; // treat as known-good, skip unknown bucket
      } else {
        console.log(`❓ Unknown ingredient: ${ingredient}`);
        const learningLink = getQuickLearningLink(ingredient, productType);
        unknownIngredients.push({
          name: ingredient,
          score: 50,
          function: 'Unknown ingredient - tap to learn more',
          learningLink: learningLink,
          explanation: generateUnknownIngredientExplanation(ingredient, ingredientsList.length, ingredientsList.length - unknownIngredients.length),
          isUnknown: true
        });
        analysis = {
          safety: 50,
          function: 'Unknown ingredient',
          notes: 'No data available in our database',
          evidence: 'none'
        };
      }
    }
    
    // Categorize based on safety score
    const safetyScore = analysis.safety || 50;
    let category = 'moderate';
    
    // Skip categorization for unknown ingredients (already added to unknownIngredients)
    if (!isUnknown) {
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
    } else {
      category = 'unknown';
    }

    analyzedIngredients.push({
      name: ingredient,
      category: category,
      score: safetyScore,
      acne_risk: analysis.acne || 0,
      irritation: analysis.irritation || 0,
      pregnancy_safe: analysis.pregnancy !== false,
      function: analysis.function || 'unknown',
      notes: analysis.notes || '',
      evidence_quality: analysis.evidence || 'medium',
      isUnknown: isUnknown,
      learningLink: isUnknown ? getQuickLearningLink(ingredient, productType) : null
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
      overallScore: 50,
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

  const finalScore = Math.max(0, Math.min(100, score));

  if (unknownIngredients.length > 0) _saveTrustDb(unknownIngredients).catch(() => {});

  return {
    score: finalScore,
    overallScore: finalScore,
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

// Specific ingredient lookup — checked before any pattern matching.
// Keys are lowercase substrings to match against the ingredient name.
const SPECIFIC_INGREDIENT_LOOKUP = {
  // ── Artificial dyes (POOR) ──────────────────────────────────────────────
  'yellow 5':           { status: 'POOR',     reason: 'Artificial dye (tartrazine) linked to hyperactivity in children, banned in some countries' },
  'yellow 6':           { status: 'POOR',     reason: 'Petroleum-based dye, may trigger allergies and hyperactivity in children' },
  'red 40':             { status: 'POOR',     reason: 'Most widely used artificial dye, linked to behavioral issues and hyperactivity' },
  'red 3':              { status: 'POOR',     reason: 'Artificial dye banned in cosmetics, linked to thyroid tumors in animal studies' },
  'blue 1':             { status: 'POOR',     reason: 'Synthetic dye, potential allergen, may cross the blood-brain barrier' },
  'blue 2':             { status: 'POOR',     reason: 'Artificial dye, limited safety data, avoid for sensitive individuals' },
  'green 3':            { status: 'POOR',     reason: 'Synthetic dye with limited safety data, not widely used' },
  'caramel color':      { status: 'POOR',     reason: 'Some types contain 4-MEI, a potential carcinogen (class 2B)' },
  // ── Controversial additives (POOR) ──────────────────────────────────────
  'titanium dioxide':   { status: 'POOR',     reason: 'Nanoparticle whitener (E171) — banned in EU food since 2022 over DNA damage concerns' },
  'high fructose corn syrup': { status: 'POOR', reason: 'Highly processed sugar linked to obesity, fatty liver and metabolic disease' },
  'corn syrup':         { status: 'POOR',     reason: 'Refined sugar syrup with no nutritional value, rapidly raises blood sugar' },
  'hydrogenated':       { status: 'POOR',     reason: 'Contains trans fats linked to heart disease and inflammation' },
  'partially hydrogenated': { status: 'POOR', reason: 'Trans fat source — banned in many countries due to cardiovascular risk' },
  'sodium nitrate':     { status: 'POOR',     reason: 'Preservative in processed meats, may form cancer-linked nitrosamines' },
  'sodium nitrite':     { status: 'POOR',     reason: 'Curing agent in processed meats, linked to colorectal cancer risk' },
  'potassium bromate':  { status: 'POOR',     reason: 'Flour additive banned in EU, Canada, and many countries — probable human carcinogen' },
  'bht':                { status: 'POOR',     reason: 'Synthetic antioxidant preservative, possible endocrine disruptor' },
  'bha':                { status: 'POOR',     reason: 'Synthetic preservative listed as possible carcinogen by IARC' },
  'tbhq':               { status: 'POOR',     reason: 'Petroleum-derived preservative, linked to immune and behavioral effects' },
  'propyl gallate':     { status: 'POOR',     reason: 'Synthetic antioxidant, possible endocrine disruptor' },
  'acesulfame':         { status: 'POOR',     reason: 'Artificial sweetener, may affect gut microbiome and insulin response' },
  'saccharin':          { status: 'POOR',     reason: 'Oldest artificial sweetener, shown to alter gut bacteria negatively' },
  'aspartame':          { status: 'POOR',     reason: 'Artificial sweetener, classified as possible carcinogen (IARC Group 2B) in 2023' },
  'sucralose':          { status: 'MODERATE', reason: 'Artificial sweetener, may disrupt gut bacteria; generally considered safe in moderation' },
  'monosodium glutamate': { status: 'MODERATE', reason: 'Flavor enhancer (MSG); safe for most people but some report sensitivity' },
  'msg':                { status: 'MODERATE', reason: 'Flavor enhancer (MSG); safe for most people but some report sensitivity' },
  'carrageenan':        { status: 'MODERATE', reason: 'Seaweed-derived thickener, may cause gut inflammation in some individuals' },
  'sodium benzoate':    { status: 'POOR',     reason: 'Preservative that can form benzene (carcinogen) when combined with vitamin C' },
  'potassium sorbate':  { status: 'MODERATE', reason: 'Common preservative, generally recognized as safe but may irritate sensitive individuals' },
  'sodium sulfite':     { status: 'MODERATE', reason: 'Preservative, can trigger asthma attacks in sulfite-sensitive individuals' },
  // ── Flavors (MODERATE) ──────────────────────────────────────────────────
  'natural and artificial flavor': { status: 'MODERATE', reason: 'Mix of natural extracts and synthetic chemicals — exact composition undisclosed' },
  'artificial flavor':  { status: 'MODERATE', reason: 'Synthetic flavoring chemicals — exact composition not disclosed on label' },
  'natural flavor':     { status: 'MODERATE', reason: 'Derived from natural sources but may include processing aids; composition not fully disclosed' },
  // ── Specific sugars (MODERATE) ──────────────────────────────────────────
  'invert sugar':       { status: 'MODERATE', reason: 'Chemically split sucrose; raises blood sugar faster than table sugar' },
  'dextrose':           { status: 'MODERATE', reason: 'Simple glucose sugar with high glycemic index, rapidly raises blood sugar' },
  'maltodextrin':       { status: 'MODERATE', reason: 'Processed starch with very high glycemic index, minimal nutritional value' },
  'fructose':           { status: 'MODERATE', reason: 'Fruit sugar; harmful in large amounts — processed primarily by the liver' },
  // ── Oils & fats (MODERATE) ──────────────────────────────────────────────
  'soy oil':            { status: 'MODERATE', reason: 'Refined vegetable oil high in omega-6 fatty acids; may promote inflammation when overconsumed' },
  'soybean oil':        { status: 'MODERATE', reason: 'Refined vegetable oil high in omega-6 fatty acids; may promote inflammation when overconsumed' },
  'canola oil':         { status: 'MODERATE', reason: 'Processed seed oil, high in omega-6 fats; OK in moderation but highly refined' },
  'palm oil':           { status: 'MODERATE', reason: 'High in saturated fat; environmental concerns over deforestation' },
  'sunflower oil':      { status: 'MODERATE', reason: 'High in omega-6 fatty acids; best consumed in moderation' },
  // ── Common safe ingredients (MODERATE / GOOD) ───────────────────────────
  'cream of tartar':    { status: 'MODERATE', reason: 'Potassium bitartrate from winemaking; stabilizes egg whites, generally safe' },
  'lecithin':           { status: 'MODERATE', reason: 'Emulsifier from soy or sunflower; generally safe, supports cell membranes' },
  'xanthan gum':        { status: 'MODERATE', reason: 'Fermented thickener, generally safe; may cause digestive issues in large amounts' },
  'guar gum':           { status: 'MODERATE', reason: 'Natural fiber thickener; generally safe, can cause bloating in sensitive individuals' },
  'egg white':          { status: 'GOOD',     reason: 'High-quality complete protein, low in fat and calories' },
  'egg yolk':           { status: 'GOOD',     reason: 'Rich in vitamins D, B12 and choline; contains healthy fats' },
  'whole egg':          { status: 'GOOD',     reason: 'Complete protein with essential vitamins and minerals' },
  'skim milk':          { status: 'GOOD',     reason: 'Good source of calcium and protein with low fat content' },
  'whole milk':         { status: 'GOOD',     reason: 'Good source of calcium, protein and fat-soluble vitamins' },
  'butter':             { status: 'MODERATE', reason: 'Natural dairy fat; OK in moderation, high in saturated fat' },
  'cocoa':              { status: 'GOOD',     reason: 'Rich in antioxidants (flavonoids) that support heart health' },
  'dark chocolate':     { status: 'GOOD',     reason: 'High in flavonoids and minerals; beneficial in moderation' },
};

// Food product analysis
export const analyzeFoodProduct = (productIngredients, nutriments = {}, productData = null) => {
  const score = calculateNutriScore(nutriments);
  
  // Parse ingredients
  const ingredients = productIngredients 
    ? productIngredients.split(',').map(ing => ing.trim()).filter(ing => ing.length > 0)
    : [];
  
  // General pattern fallbacks (only used when no specific match found)
  const excellentPatterns = [
    'organic', 'water', 'sea salt', 'himalayan salt', 'olive oil',
    'coconut oil', 'avocado oil', 'lemon juice', 'apple cider vinegar', 'honey'
  ];
  const goodPatterns = [
    'vitamin', 'mineral', 'fiber', 'whole grain', 'whole wheat',
    'fruit juice', 'vegetable', 'spinach', 'kale', 'broccoli',
    'almond', 'walnut', 'cashew', 'oat', 'quinoa', 'flaxseed', 'chia'
  ];
  const poorPatterns = [
    'artificial color', 'artificial dye', 'fd&c', 'certified color',
    'preservative', 'high fructose', 'trans fat', 'hydrogenated',
    'nitrate', 'nitrite', 'sulfite', 'benzoate', 'bht', 'bha', 'tbhq'
  ];

  const excellentIngredients = [];
  const goodIngredients = [];
  const moderateIngredients = [];
  const poorIngredients = [];
  const analyzedIngredients = [];
  
  ingredients.forEach(ingredient => {
    const lowerIng = ingredient.toLowerCase().trim();

    // 1. Check specific lookup table first (most accurate)
    const specificKey = Object.keys(SPECIFIC_INGREDIENT_LOOKUP).find(key => lowerIng.includes(key));
    if (specificKey) {
      const entry = SPECIFIC_INGREDIENT_LOOKUP[specificKey];
      const colorMap = { EXCELLENT: '#1B5E20', GOOD: '#4CAF50', MODERATE: '#FF9800', POOR: '#D32F2F' };
      const analysis = { name: ingredient, status: entry.status, color: colorMap[entry.status], reason: entry.reason };
      analyzedIngredients.push(analysis);
      if (entry.status === 'EXCELLENT' || entry.status === 'GOOD') goodIngredients.push(analysis);
      else if (entry.status === 'POOR') poorIngredients.push(analysis);
      else moderateIngredients.push(analysis);
      if (entry.status === 'EXCELLENT') excellentIngredients.push(analysis);
      return;
    }

    // 2. Fall back to general patterns
    // Check POOR first so "natural and artificial flavor" doesn't get caught by "natural"
    const isPoor      = poorPatterns.some(p => lowerIng.includes(p));
    const isExcellent = !isPoor && excellentPatterns.some(p => lowerIng.includes(p));
    const isGood      = !isPoor && !isExcellent && goodPatterns.some(p => lowerIng.includes(p));

    let reason;
    if (isPoor) {
      if (lowerIng.includes('color') || lowerIng.includes('dye') || lowerIng.includes('fd&c')) reason = 'Artificial food dye with no nutritional value, may affect behavior in children';
      else if (lowerIng.includes('preservative')) reason = 'Chemical preservative, limit consumption';
      else if (lowerIng.includes('hydrogenated')) reason = 'Contains trans fats linked to heart disease';
      else if (lowerIng.includes('nitrate') || lowerIng.includes('nitrite')) reason = 'Curing agent in processed meats, linked to cancer risk';
      else reason = 'Ingredient of concern, consider limiting intake';
    } else if (isExcellent) {
      if (lowerIng.includes('organic')) reason = 'Organic certification ensures no synthetic pesticides';
      else if (lowerIng === 'water') reason = 'Essential base ingredient, hydrating and calorie-free';
      else if (lowerIng.includes('olive oil')) reason = 'Rich in healthy monounsaturated fats and antioxidants';
      else if (lowerIng.includes('honey')) reason = 'Natural sweetener with antimicrobial properties';
      else if (lowerIng.includes('sea salt') || lowerIng.includes('himalayan')) reason = 'Less processed than table salt, contains trace minerals';
      else if (lowerIng.includes('vinegar')) reason = 'Natural preservative, may help regulate blood sugar';
      else reason = 'Minimally processed natural ingredient';
    } else if (isGood) {
      if (lowerIng.includes('vitamin')) reason = 'Essential micronutrient added to support health';
      else if (lowerIng.includes('fiber')) reason = 'Promotes digestive health and helps with satiety';
      else if (lowerIng.includes('whole grain') || lowerIng.includes('whole wheat')) reason = 'Whole grain retains fiber and nutrients unlike refined flour';
      else if (lowerIng.includes('oat')) reason = 'High in beta-glucan fiber, supports heart health and digestion';
      else if (lowerIng.includes('almond') || lowerIng.includes('walnut') || lowerIng.includes('cashew')) reason = 'Nutrient-dense nut with healthy fats, protein and minerals';
      else if (lowerIng.includes('chia') || lowerIng.includes('flax')) reason = 'Rich in omega-3 fatty acids and fiber';
      else reason = 'Beneficial ingredient that supports nutrition';
    } else {
      if (lowerIng.includes('flour')) reason = 'Refined carbohydrate; enriched flour has limited nutrients compared to whole grain';
      else if (lowerIng.includes('sugar')) reason = 'Adds sweetness but increases calorie count with no nutritional benefit';
      else if (lowerIng.includes('salt')) reason = 'Flavor enhancer; monitor total sodium intake';
      else if (lowerIng.includes('starch')) reason = 'Thickening agent from plant sources; high in carbohydrates';
      else if (lowerIng.includes('oil')) reason = 'Fat source; nutritional value depends on the type of oil';
      else if (lowerIng.includes('milk')) reason = 'Dairy source of calcium, protein and vitamins';
      else if (lowerIng.includes('egg')) reason = 'Good source of protein and essential nutrients';
      else if (lowerIng.includes('cream')) reason = 'Dairy fat ingredient, adds richness';
      else reason = 'Common food ingredient, generally safe in normal amounts';
    }

    const status = isExcellent ? 'EXCELLENT' : isGood ? 'GOOD' : isPoor ? 'POOR' : 'MODERATE';
    const colorMap = { EXCELLENT: '#1B5E20', GOOD: '#4CAF50', MODERATE: '#FF9800', POOR: '#D32F2F' };
    const analysis = { name: ingredient, status, color: colorMap[status], reason };
    
    analyzedIngredients.push(analysis);
    if (isExcellent) { excellentIngredients.push(analysis); goodIngredients.push(analysis); }
    else if (isGood) goodIngredients.push(analysis);
    else if (isPoor) poorIngredients.push(analysis);
    else moderateIngredients.push(analysis);
  });
  
  return {
    score: score,
    overallScore: score,  // Alias for UI compatibility
    analyzedIngredients: analyzedIngredients,
    goodIngredients: goodIngredients,
    badIngredients: poorIngredients,
    moderateIngredients: moderateIngredients,
    excellentIngredients: excellentIngredients,
    unknownIngredients: [],
    harmfulChemicals: poorIngredients,
    allergens: [],
    additives: poorIngredients,
    productType: 'food',
    analysisType: 'food-enhanced',
    // Add the counts that the UI expects
    excellentCount: excellentIngredients.length,
    goodCount: goodIngredients.length,
    moderateCount: moderateIngredients.length,
    poorCount: poorIngredients.length,
    totalIngredients: ingredients.length,
    parsedIngredients: ingredients
  };
};

// Simple Nutri-Score calculation
function calculateNutriScore(nutriments) {
  let score = 70; // Base score

  const readVal = (keys) => {
    for (const key of keys) {
      const raw = nutriments?.[key];
      if (raw !== undefined && raw !== null && raw !== '') {
        const val = Number(raw);
        if (Number.isFinite(val)) return val;
      }
    }
    return 0;
  };

  const salt = readVal(['salt', 'salt_100g']);
  const sugars = readVal(['sugars', 'sugars_100g']);
  const saturatedFat = readVal(['saturated_fat', 'saturated-fat_100g', 'saturated_fat_100g']);
  const energy = readVal(['energy', 'energy_100g', 'energy-kcal_100g']);
  const fiber = readVal(['fiber', 'fiber_100g']);
  const proteins = readVal(['proteins', 'proteins_100g']);
  
  if (salt > 1.5) score -= 10;
  if (sugars > 22.5) score -= 10;
  if (saturatedFat > 6) score -= 10;
  if (energy > 2000) score -= 5;
  
  if (fiber > 3) score += 5;
  if (proteins > 8) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

// Product type detection function (MISSING FUNCTION ADDED)
export const getProductTypeFromCategories = (categories = '', productName = '', source = '') => {
  // Convert to lowercase for easier matching
  const categoriesLower = (categories || '').toLowerCase();
  const nameLower = (productName || '').toLowerCase();
  const sourceLower = (source || '').toLowerCase();

  // Source is the most authoritative signal — check it first
  if (sourceLower.includes('beauty') || sourceLower.includes('cosmetic')) {
    return 'beauty';
  }
  if (sourceLower.includes('food') || sourceLower.includes('food facts')) {
    return 'food';
  }

  // Cosmetic category keywords — only match against CATEGORIES, not product name,
  // to avoid false positives like "Ice Cream" → cream, "Olive Oil" → oil, etc.
  const cosmeticCategoryKeywords = [
    'cosmetics', 'beauty', 'skincare', 'makeup', 'personal care',
    'shampoo', 'conditioner', 'moisturizer', 'sunscreen', 'deodorant',
    'perfume', 'fragrance', 'cleanser', 'toner', 'foundation',
    'concealer', 'eyeshadow', 'mascara', 'lipstick', 'hair care',
    'skin care', 'toiletries', 'grooming', 'hygiene',
  ];

  // Cosmetic keywords safe to also check in product NAME (unambiguous — never food)
  const cosmeticNameKeywords = [
    'shampoo', 'conditioner', 'moisturizer', 'sunscreen', 'deodorant',
    'antiperspirant', 'aftershave', 'foundation', 'concealer', 'mascara',
    'lipstick', 'eyeshadow', 'eyeliner', 'blush', 'bronzer', 'nail polish',
    'face wash', 'body wash', 'shower gel', 'micellar', 'eau de toilette',
    'eau de parfum', 'skincare', 'hair mask', 'dry shampoo',
  ];

  // Food indicators — checked in both categories and name
  const foodKeywords = [
    'food', 'beverage', 'drink', 'snack', 'dairy', 'meat', 'vegetable',
    'fruit', 'bread', 'pasta', 'cereal', 'chocolate', 'candy', 'juice',
    'soda', 'water', 'tea', 'coffee', 'milk', 'cheese', 'yogurt',
    'cookie', 'biscuit', 'cake', 'ice cream', 'frozen', 'canned',
    'grocery', 'sugar', 'salt', 'spice', 'sauce', 'oil', 'butter',
    'egg', 'flour', 'rice', 'grain', 'protein', 'nutrition',
  ];

  // Check food category first — food wins over cosmetic categories
  for (const keyword of foodKeywords) {
    if (categoriesLower.includes(keyword) || nameLower.includes(keyword)) {
      return 'food';
    }
  }

  // Check cosmetic categories
  for (const keyword of cosmeticCategoryKeywords) {
    if (categoriesLower.includes(keyword)) {
      return 'beauty';
    }
  }

  // Check unambiguous cosmetic name keywords
  for (const keyword of cosmeticNameKeywords) {
    if (nameLower.includes(keyword)) {
      return 'beauty';
    }
  }

  // Final source-based fallback
  if (sourceLower.includes('openfoodfacts')) {
    return 'food';
  }
  if (sourceLower.includes('openbeautyfacts') || sourceLower.includes('beauty facts')) {
    return 'beauty';
  }

  // Default to food
  return 'food';
};

// Cosmetic database lookup function
function lookupCosmeticDatabase(ingredient) {
  if (!cosmeticDatabase || !cosmeticDatabase.ingredients) return null;
  
  const normalized = ingredient.toLowerCase().trim();
  // Strip parenthetical content, numbers, percentages
  const cleaned = normalized.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\d+%?/g, '').trim();
  const database = cosmeticDatabase.ingredients;
  
  // Direct lookup
  if (database[normalized]) return database[normalized];
  if (cleaned !== normalized && database[cleaned]) return database[cleaned];
  
  // Try alternative forms (underscore, no-space, alphanumeric-only)
  const alternatives = [
    normalized.replace(/\s+/g, '_'),
    cleaned.replace(/\s+/g, '_'),
    normalized.replace(/_/g, ' '),
    cleaned.replace(/_/g, ' '),
    normalized.replace(/\s+/g, ''),
    cleaned.replace(/\s+/g, ''),
    normalized.replace(/[^a-z0-9]/g, ''),
    cleaned.replace(/[^a-z0-9]/g, ''),
    // Also try with / replaced by _
    normalized.replace(/\//g, '_').replace(/\s+/g, '_'),
    cleaned.replace(/\//g, '_').replace(/\s+/g, '_'),
  ];
  
  for (const alt of alternatives) {
    if (alt && database[alt]) return database[alt];
  }
  
  // Partial key match: check if any DB key contains or is contained by the ingredient
  const underscored = cleaned.replace(/\s+/g, '_');
  for (const key of Object.keys(database)) {
    if (key.length > 3 && (key === underscored || key.includes(underscored) || underscored.includes(key))) {
      return database[key];
    }
  }
  
  // Check INCI names (exact match first, then contains)
  const normalizedUpper = cleaned.toUpperCase();
  for (const [key, data] of Object.entries(database)) {
    if (data.inci) {
      const inci = data.inci.toUpperCase();
      if (inci === normalizedUpper || inci === normalized.toUpperCase()) return data;
    }
  }
  for (const [key, data] of Object.entries(database)) {
    if (data.inci && data.inci.toUpperCase().includes(normalizedUpper) && normalizedUpper.length > 3) {
      return data;
    }
  }
  
  return null;
}

// General database lookup function
function lookupGeneralDatabase(ingredient) {
  if (!generalDatabase || !Array.isArray(generalDatabase)) return null;
  
  const normalized = ingredient.toLowerCase().trim();
  const cleaned = normalized.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\d+%?/g, '').trim();
  
  const makeResult = (item) => ({
    safety: item.score || 50,
    function: item.category || 'unknown',
    notes: item.description || 'No description available',
    evidence: 'medium'
  });

  // Check each ingredient in the general database
  for (const item of generalDatabase) {
    const itemName = (item.name || '').toLowerCase();
    // Check name match (exact or cleaned)
    if (itemName === normalized || itemName === cleaned) {
      return makeResult(item);
    }
    
    // Check partial match (ingredient contains DB name or vice versa)
    if (itemName.length > 3 && (normalized.includes(itemName) || itemName.includes(cleaned))) {
      return makeResult(item);
    }
    
    // Check aliases
    if (item.aliases && Array.isArray(item.aliases)) {
      for (const alias of item.aliases) {
        const a = alias.toLowerCase();
        if (a === normalized || a === cleaned || (a.length > 3 && (normalized.includes(a) || a.includes(cleaned)))) {
          return makeResult(item);
        }
      }
    }
  }
  
  return null;
}

// Fuzzy matching for common ingredient variations - GREATLY EXPANDED
function fuzzyIngredientMatch(ingredient) {
  const normalized = ingredient.toLowerCase().trim();
  
  // COMPREHENSIVE ingredient mappings covering most common cosmetic ingredients
  const comprehensiveMappings = {
    // Water and basic solvents
    'water': ['aqua', 'h2o', 'purified water', 'distilled water', 'deionized water'],
    'alcohol': ['ethanol', 'ethyl alcohol', 'alcohol denat', 'sd alcohol', 'denatured alcohol'],
    
    // Moisturizers and humectants
    'glycerin': ['glycerol', 'glycerine'],
    'hyaluronic_acid': ['sodium hyaluronate', 'hyaluronic acid', 'sodium hyaluronate crosspolymer'],
    'propylene_glycol': ['propylene glycol', '1,2-propanediol'],
    'butylene_glycol': ['butylene glycol', '1,3-butanediol'],
    'pentylene_glycol': ['pentylene glycol', '1,2-pentanediol'],
    'hexylene_glycol': ['hexylene glycol', '2-methyl-2,4-pentanediol'],
    
    // Vitamins and actives
    'vitamin_c': ['ascorbic acid', 'l-ascorbic acid', 'magnesium ascorbyl phosphate', 'sodium ascorbyl phosphate'],
    'vitamin_e': ['tocopherol', 'tocopheryl acetate', 'alpha-tocopherol'],
    'niacinamide': ['vitamin b3', 'nicotinamide', 'niacin'],
    'retinol': ['vitamin a', 'retinoic acid', 'retinyl palmitate', 'retinyl acetate'],
    'panthenol': ['pro-vitamin b5', 'provitamin b5', 'dexpanthenol', 'd-panthenol'],
    
    // Emollients and oils
    'shea_butter': ['butyrospermum parkii', 'shea butter butter', 'karite butter'],
    'coconut_oil': ['cocos nucifera', 'coconut oil', 'fractionated coconut oil'],
    'argan_oil': ['argania spinosa', 'argan oil', 'moroccan oil'],
    'jojoba_oil': ['simmondsia chinensis', 'jojoba seed oil'],
    'sweet_almond_oil': ['prunus amygdalus dulcis', 'sweet almond oil'],
    'squalane': ['squalane', 'squalene'],
    
    // Alcohols (fatty)
    'cetyl_alcohol': ['palmityl alcohol', 'cetyl alcohol'],
    'stearyl_alcohol': ['octadecanol', 'stearyl alcohol'],
    'cetearyl_alcohol': ['cetostearyl alcohol', 'cetearyl alcohol'],
    'behenyl_alcohol': ['docosanol', 'behenyl alcohol'],
    
    // Silicones
    'dimethicone': ['polydimethylsiloxane', 'pdms', 'dimethyl polysiloxane'],
    'cyclomethicone': ['cyclopentasiloxane', 'cyclotetrasiloxane', 'cyclohexasiloxane'],
    'amodimethicone': ['amino functional silicone', 'amodimethicone'],
    'dimethiconol': ['dimethiconol', 'silicone polymer'],
    
    // Preservatives
    'phenoxyethanol': ['2-phenoxyethanol', 'phenoxyethanol'],
    'ethylhexylglycerin': ['ethylhexylglycerin', 'octoxyglycerin'],
    'caprylyl_glycol': ['caprylyl glycol', '1,2-octanediol'],
    'benzyl_alcohol': ['benzyl alcohol', 'phenylmethanol'],
    'potassium_sorbate': ['potassium sorbate', 'e202'],
    'sodium_benzoate': ['sodium benzoate', 'e211'],
    'methylparaben': ['methyl paraben', 'methylparaben'],
    'propylparaben': ['propyl paraben', 'propylparaben'],
    'butylparaben': ['butyl paraben', 'butylparaben'],
    
    // Surfactants and cleansers
    'sodium_lauryl_sulfate': ['sls', 'sodium dodecyl sulfate'],
    'sodium_laureth_sulfate': ['sles', 'sodium lauryl ether sulfate'],
    'cocamidopropyl_betaine': ['capb', 'coco betaine', 'coconut betaine'],
    'decyl_glucoside': ['decyl glucoside', 'plantacare 2000'],
    'coco_glucoside': ['coco glucoside', 'sodium cocoyl glutamate'],
    
    // Emulsifiers
    'glyceryl_stearate': ['glyceryl stearate', 'glycerol monostearate'],
    'peg_100_stearate': ['peg-100 stearate', 'polyethylene glycol stearate'],
    'polysorbate_20': ['polysorbate 20', 'tween 20'],
    'polysorbate_80': ['polysorbate 80', 'tween 80'],
    'lecithin': ['soy lecithin', 'sunflower lecithin', 'phosphatidylcholine'],
    
    // Salts and minerals
    'sodium_chloride': ['salt', 'table salt', 'sea salt', 'nacl'],
    'magnesium_sulfate': ['epsom salt', 'magnesium sulfate'],
    'zinc_oxide': ['zinc oxide', 'zno'],
    'titanium_dioxide': ['titanium dioxide', 'tio2', 'ci 77891'],
    'iron_oxides': ['iron oxide', 'ci 77491', 'ci 77492', 'ci 77499'],
    
    // Acids and pH adjusters
    'citric_acid': ['citric acid', 'e330'],
    'lactic_acid': ['lactic acid', 'alpha hydroxy acid'],
    'salicylic_acid': ['salicylic acid', 'bha', 'beta hydroxy acid'],
    'glycolic_acid': ['glycolic acid', 'hydroxyacetic acid'],
    'sodium_hydroxide': ['sodium hydroxide', 'lye', 'caustic soda'],
    
    // Botanical extracts
    'aloe_vera': ['aloe barbadensis', 'aloe vera leaf juice', 'aloe extract'],
    'green_tea': ['camellia sinensis', 'green tea extract'],
    'chamomile': ['chamomilla recutita', 'chamomile extract', 'german chamomile'],
    'calendula': ['calendula officinalis', 'marigold extract'],
    'lavender': ['lavandula angustifolia', 'lavender oil', 'lavender extract'],
    
    // Polymers and thickeners
    'xanthan_gum': ['xanthan gum', 'e415'],
    'guar_gum': ['guar gum', 'e412'],
    'carbomer': ['carbomer 940', 'carbopol'],
    'acrylates_copolymer': ['acrylates copolymer', 'polyacrylate'],
    
    // Fragrance and colorants
    'fragrance': ['parfum', 'perfume', 'scent', 'aroma'],
    'limonene': ['d-limonene', 'limonene'],
    'linalool': ['linalool', '3,7-dimethyl-1,6-octadien-3-ol'],
    'citronellol': ['citronellol', '3,7-dimethyl-6-octen-1-ol'],
    'geraniol': ['geraniol', '3,7-dimethyl-2,6-octadien-1-ol'],
    
    // Peptides and proteins
    'ceramides': ['ceramide', 'ceramide np', 'ceramide ap', 'ceramide eop'],
    'peptides': ['palmitoyl pentapeptide', 'acetyl hexapeptide', 'copper peptides'],
    'collagen': ['hydrolyzed collagen', 'marine collagen', 'collagen peptides'],
    
    // Sun protection
    'avobenzone': ['butyl methoxydibenzoylmethane', 'avobenzone'],
    'octinoxate': ['ethylhexyl methoxycinnamate', 'octyl methoxycinnamate'],
    'oxybenzone': ['benzophenone-3', 'oxybenzone'],
    'octocrylene': ['octocrylene', '2-ethylhexyl 2-cyano-3,3-diphenylacrylate'],
    
    // Miscellaneous common ingredients
    'allantoin': ['allantoin', '5-ureidohydantoin'],
    'bisabolol': ['alpha-bisabolol', 'levomenol'],
    'caffeine': ['caffeine', '1,3,7-trimethylxanthine'],
    'urea': ['urea', 'carbamide'],
    'trehalose': ['trehalose', 'mycose'],
    'pantothenic_acid': ['pantothenic acid', 'vitamin b5'],
    'biotin': ['biotin', 'vitamin b7', 'vitamin h']
  };
  
  // Check if ingredient matches any comprehensive mapping
  for (const [standard, variations] of Object.entries(comprehensiveMappings)) {
    // Check if the normalized ingredient matches the key directly
    const standardKey = standard.replace(/_/g, ' ');
    if (normalized === standardKey || normalized === standard) {
      return getIngredientSafetyRating(standard);
    }
    
    // Check if ingredient matches any variation
    if (variations.includes(normalized)) {
      return getIngredientSafetyRating(standard);
    }
  }
  
  return null;
}

// Get safety rating for identified ingredients
function getIngredientSafetyRating(ingredientKey) {
  const safetyRatings = {
    // EXCELLENT (90+ points) - Very safe ingredients
    'water': { safety: 100, function: 'solvent', notes: 'Essential, completely safe' },
    'aloe_vera': { safety: 95, function: 'soothing', notes: 'Natural, anti-inflammatory' },
    'hyaluronic_acid': { safety: 98, function: 'hydrating', notes: 'Excellent moisturizer, naturally occurring' },
    'glycerin': { safety: 95, function: 'humectant', notes: 'Safe, effective moisturizer' },
    'vitamin_c': { safety: 90, function: 'antioxidant', notes: 'Proven anti-aging benefits' },
    'vitamin_e': { safety: 92, function: 'antioxidant', notes: 'Natural preservative, skin-healing' },
    'niacinamide': { safety: 96, function: 'vitamin', notes: 'Reduces sebum, minimizes pores' },
    'panthenol': { safety: 94, function: 'soothing', notes: 'Pro-vitamin B5, healing properties' },
    'ceramides': { safety: 97, function: 'barrier_repair', notes: 'Natural skin barrier components' },
    'shea_butter': { safety: 94, function: 'emollient', notes: 'Natural, nourishing' },
    'jojoba_oil': { safety: 93, function: 'emollient', notes: 'Technically a wax, mimics sebum' },
    'squalane': { safety: 96, function: 'emollient', notes: 'Naturally derived, lightweight' },
    'zinc_oxide': { safety: 92, function: 'uv_filter', notes: 'Physical sunscreen, gentle' },
    'titanium_dioxide': { safety: 90, function: 'uv_filter', notes: 'Physical sunscreen, safe' },
    'allantoin': { safety: 91, function: 'soothing', notes: 'Skin healing, anti-inflammatory' },
    'bisabolol': { safety: 89, function: 'soothing', notes: 'From chamomile, anti-inflammatory' },
    
    // GOOD (75-89 points) - Generally safe with minor considerations
    'retinol': { safety: 85, function: 'anti-aging', notes: 'Proven anti-aging, start slowly' },
    'dimethicone': { safety: 82, function: 'occlusive', notes: 'Safe silicone, may cause buildup' },
    'cetyl_alcohol': { safety: 85, function: 'emulsifier', notes: 'Fatty alcohol, not drying' },
    'stearyl_alcohol': { safety: 84, function: 'emulsifier', notes: 'Fatty alcohol, conditioning' },
    'cetearyl_alcohol': { safety: 83, function: 'emulsifier', notes: 'Blend of fatty alcohols' },
    'cyclomethicone': { safety: 80, function: 'silicone', notes: 'Evaporates, lightweight feel' },
    'coconut_oil': { safety: 78, function: 'emollient', notes: 'May be comedogenic for some' },
    'argan_oil': { safety: 86, function: 'emollient', notes: 'Rich in antioxidants' },
    'sweet_almond_oil': { safety: 84, function: 'emollient', notes: 'Gentle, suitable for sensitive skin' },
    'glycolic_acid': { safety: 78, function: 'exfoliant', notes: 'Effective AHA, use with sunscreen' },
    'salicylic_acid': { safety: 79, function: 'exfoliant', notes: 'BHA, good for acne-prone skin' },
    'lactic_acid': { safety: 81, function: 'exfoliant', notes: 'Gentle AHA, also moisturizing' },
    'caffeine': { safety: 77, function: 'antioxidant', notes: 'Anti-inflammatory, may cause irritation' },
    'green_tea': { safety: 88, function: 'antioxidant', notes: 'Natural antioxidant, anti-inflammatory' },
    'chamomile': { safety: 87, function: 'soothing', notes: 'Natural anti-inflammatory' },
    
    // MODERATE (55-74 points) - Acceptable with some concerns
    'phenoxyethanol': { safety: 65, function: 'preservative', notes: 'Widely used, generally safe preservative' },
    'ethylhexylglycerin': { safety: 70, function: 'preservative', notes: 'Preservative booster, conditioning' },
    'caprylyl_glycol': { safety: 72, function: 'preservative', notes: 'Mild preservative, skin conditioning' },
    'benzyl_alcohol': { safety: 68, function: 'preservative', notes: 'Natural preservative, potential irritant' },
    'potassium_sorbate': { safety: 74, function: 'preservative', notes: 'Food-grade preservative' },
    'sodium_benzoate': { safety: 73, function: 'preservative', notes: 'Common preservative, generally safe' },
    'sodium_laureth_sulfate': { safety: 62, function: 'surfactant', notes: 'Milder than SLS, may cause dryness' },
    'cocamidopropyl_betaine': { safety: 71, function: 'surfactant', notes: 'Gentle cleanser, coconut-derived' },
    'decyl_glucoside': { safety: 75, function: 'surfactant', notes: 'Plant-derived, gentle cleanser' },
    'fragrance': { safety: 55, function: 'fragrance', notes: 'May cause allergic reactions' },
    'limonene': { safety: 58, function: 'fragrance', notes: 'Citrus scent, potential allergen' },
    'linalool': { safety: 57, function: 'fragrance', notes: 'Floral scent, potential allergen' },
    'alcohol': { safety: 55, function: 'solvent', notes: 'Can be drying, depends on concentration' },
    'citric_acid': { safety: 73, function: 'ph_adjuster', notes: 'Natural acid, gentle exfoliant' },
    'iron_oxides': { safety: 76, function: 'colorant', notes: 'Natural mineral colorants' },
    
    // BAD (20-54 points) - Concerning ingredients
    'sodium_lauryl_sulfate': { safety: 40, function: 'surfactant', notes: 'Harsh cleanser, strips natural oils' },
    'methylparaben': { safety: 35, function: 'preservative', notes: 'Potential hormone disruptor' },
    'propylparaben': { safety: 30, function: 'preservative', notes: 'Potential hormone disruptor' },
    'butylparaben': { safety: 25, function: 'preservative', notes: 'Potential hormone disruptor' },
    'oxybenzone': { safety: 30, function: 'uv_filter', notes: 'Potential hormone disruptor' },
    'avobenzone': { safety: 45, function: 'uv_filter', notes: 'Can degrade, potential irritant' },
    'octinoxate': { safety: 42, function: 'uv_filter', notes: 'Environmental concerns' }
  };
  
  return safetyRatings[ingredientKey] || {
    safety: 75,
    function: 'cosmetic ingredient',
    notes: 'Commonly used ingredient',
    evidence: 'medium'
  };
}
