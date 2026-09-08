/**
 * USDA FoodData Central API Service
 * Fetches nutrition data for food items (FREE API)
 * Get your API key: https://fdc.nal.usda.gov/api-key-signup.html
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEnhancer } from './foodEnhancer';
import { getIngredientInfoFromTurso, saveIngredientInfoToTurso } from './tursoDB';

const LOCAL_ING_CACHE_PREFIX = '@ing_info_';

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

/**
 * Look up what an ingredient is and what it does.
 * Flow: on-device cache → Turso cache → USDA API → save (both caches) → return.
 * Once looked up once, this device never re-hits the network for it again.
 */
export const getIngredientInfo = async (ingredientName) => {
  const normalizedName = (ingredientName || '').toLowerCase().trim();
  if (!normalizedName) return buildFallbackInfo(ingredientName);

  // ── Step 1: Check on-device cache — no network at all ─────────────────
  const localKey = LOCAL_ING_CACHE_PREFIX + normalizedName;
  try {
    const localHit = await AsyncStorage.getItem(localKey);
    if (localHit) {
      console.log('⚡⚡ Ingredient local cache hit:', normalizedName);
      return JSON.parse(localHit);
    }
  } catch { /* storage unavailable — fall through */ }

  // ── Step 2: Check Turso cache ───────────────────────────────────────────
  try {
    const cached = await getIngredientInfoFromTurso(normalizedName);
    if (cached && cached.whatItIs) {
      console.log('⚡ Ingredient cache hit:', normalizedName);
      AsyncStorage.setItem(localKey, JSON.stringify(cached)).catch(() => {});
      return cached;
    }
  } catch { /* Turso unavailable — fall through to USDA */ }

  // ── Step 2: Build info locally + optionally enrich from USDA ──────────
  const what    = buildWhatItIs(normalizedName, '', '');
  const role    = buildWhatItDoes(normalizedName, null, null, null, null, null, null);
  const verdict = buildHealthVerdict(normalizedName);
  const who     = buildWhoSays(normalizedName);

  // Try USDA to see if we can get better nutrient context (non-blocking enrichment)
  let usdaDesc = '';
  try {
    const response = await axios.get(`${USDA_API_URL}/foods/search`, {
      params: {
        query: ingredientName,
        api_key: USDA_API_KEY,
        pageSize: 3,
        dataType: 'Foundation,SR Legacy',
      },
      timeout: 7000,
    });
    const foods = response.data?.foods || [];
    if (foods.length > 0) {
      const lower = normalizedName;
      const best = foods.find(f => f.description?.toLowerCase().includes(lower)) || foods[0];
      usdaDesc = best.description || '';
    }
  } catch { /* USDA unavailable — use local data only */ }

  const info = {
    name: normalizedName,
    whatItIs:      what,
    whatItDoes:    role,
    healthVerdict: verdict,
    whoSays:       who,
    usdaDescription: usdaDesc,
    source: 'USDA FoodData Central + WHO/JECFA',
  };

  // ── Step 3: Save to both caches (fire-and-forget) ──────────────────────
  saveIngredientInfoToTurso(info).catch(() => {});
  AsyncStorage.setItem(localKey, JSON.stringify(info)).catch(() => {});

  return info;
};

const buildWhatItIs = (name, category, usdaDesc) => {
  const n = name.toLowerCase();

  // Common ingredient explanations (covers the most-scanned cases)
  const known = {
    'sugar': 'A simple carbohydrate that sweetens food and provides quick energy.',
    'salt': 'Sodium chloride — a mineral used to season food and act as a preservative.',
    'water': 'The universal solvent used as a base in most food and beverage products.',
    'glucose': 'A simple sugar (monosaccharide) that is the body\'s primary energy source.',
    'fructose': 'A natural sugar found in fruit; sweeter than sucrose.',
    'sucrose': 'Table sugar — a disaccharide of glucose and fructose.',
    'citric acid': 'A natural acid found in citrus fruits, used as a flavour enhancer and preservative.',
    'ascorbic acid': 'Vitamin C — an antioxidant nutrient and natural preservative.',
    'lecithin': 'A naturally occurring fat (phospholipid) that acts as an emulsifier to blend ingredients.',
    'sodium benzoate': 'A synthetic preservative that prevents mould and bacteria growth.',
    'potassium sorbate': 'A mild synthetic preservative used to extend shelf life.',
    'soy lecithin': 'An emulsifier derived from soybeans that helps oil and water mix.',
    'sunflower lecithin': 'A natural emulsifier derived from sunflower seeds.',
    'palm oil': 'A vegetable oil from the fruit of oil palm trees, high in saturated fat.',
    'canola oil': 'A vegetable oil low in saturated fat, used for cooking and frying.',
    'corn syrup': 'A sweetener made from corn starch; mostly glucose.',
    'high fructose corn syrup': 'A processed sweetener made by converting glucose in corn syrup to fructose.',
    'maltodextrin': 'A mildly sweet carbohydrate powder made from starch, used as a filler or thickener.',
    'xanthan gum': 'A polysaccharide produced by fermentation, used as a thickener and stabiliser.',
    'guar gum': 'A natural thickener from guar beans that improves texture.',
    'carrageenan': 'A seaweed-derived additive used to thicken and gel dairy and plant-based products.',
    'sodium chloride': 'Table salt — used for seasoning and preservation.',
    'calcium carbonate': 'A mineral compound used as a calcium supplement and anti-caking agent.',
    'tocopherol': 'Vitamin E — an antioxidant that prevents fats from going rancid.',
    'niacin': 'Vitamin B3 — a water-soluble vitamin added to enrich grain products.',
    'riboflavin': 'Vitamin B2 — a water-soluble vitamin that supports energy metabolism.',
    'thiamine': 'Vitamin B1 — a water-soluble vitamin important for nerve function.',
    'folic acid': 'Synthetic vitamin B9 added to enrich grain products and support cell growth.',
    'iron': 'An essential mineral added to enriched grain products to support red blood cells.',
    'zinc': 'An essential trace mineral that supports immune function and wound healing.',
    'sorbic acid': 'A natural preservative found in berries, also made synthetically.',
    'acetic acid': 'The acid in vinegar; used as a preservative and flavouring.',
    'lactic acid': 'A naturally occurring organic acid produced by fermentation; acts as a preservative.',
    'malic acid': 'A natural acid found in apples and pears, used to add tartness.',
    'tartaric acid': 'A natural acid from grapes, used as a leavening agent and flavour enhancer.',
    'calcium chloride': 'A salt used as a firming agent and preservative in canned vegetables.',
    'sodium nitrate': 'A curing salt used to preserve meats and prevent bacterial growth.',
    'sodium nitrite': 'A curing salt used in processed meats; inhibits bacterial growth.',
    'carnauba wax': 'A plant wax from palm leaves used as a glazing agent on confectionery.',
    'beeswax': 'A natural wax produced by honey bees; used as a glazing agent.',
    'annatto': 'A natural orange-red food colouring derived from the seeds of the achiote tree.',
    'beta carotene': 'A plant pigment (pro-vitamin A) used as a natural yellow-orange colouring.',
    'caramel colour': 'A dark brown colouring made by heating sugar; the most widely used food colour.',
    'cocoa': 'Processed cacao seeds used for chocolate flavour and colour.',
    'vanilla': 'A flavouring derived from vanilla bean orchids.',
    'vanillin': 'The primary flavour compound in vanilla; often produced synthetically.',
    'pectin': 'A natural carbohydrate from fruit skins; used as a gelling agent in jams.',
    'gelatin': 'A protein derived from animal collagen used to thicken and gel foods.',
    'agar': 'A plant-based gelling agent derived from red algae; used as a gelatin substitute.',
    'starch': 'A complex carbohydrate from grains or vegetables; used as a thickener.',
    'modified starch': 'Starch that has been chemically or physically altered to improve its thickening properties.',
    'wheat flour': 'Ground wheat grain; the base of most baked goods.',
    'whole wheat flour': 'Flour that includes the bran and germ of the wheat kernel; higher in fibre.',
    'enriched flour': 'White flour with added B vitamins and iron to replace nutrients lost in milling.',
    'oat flour': 'Flour ground from oats; naturally high in soluble fibre.',
    'almond flour': 'Flour made from blanched ground almonds; gluten-free and high in healthy fats.',
    'coconut flour': 'Flour from dried coconut meat; high in fibre and naturally gluten-free.',
    'cellulose': 'A plant fibre often used as a thickener, anti-caking agent, or filler.',
    'carboxymethylcellulose': 'A cellulose derivative used as a thickener and stabiliser.',
    'sodium phosphate': 'A salt of phosphoric acid used as an emulsifier and leavening agent.',
    'disodium phosphate': 'A sodium salt used as an emulsifier and buffer in processed foods.',
    'mono and diglycerides': 'Emulsifiers derived from fat that help bread stay soft and moist.',
    'propylene glycol': 'A synthetic food-grade solvent and humectant used to retain moisture.',
    'glycerin': 'A sweet-tasting humectant derived from fats; keeps foods moist.',
    'polysorbate 80': 'A synthetic emulsifier used to keep oil and water blended.',
    'sodium stearoyl lactylate': 'An emulsifier and dough conditioner that improves bread texture.',
    'red 40': 'Allura Red — a synthetic red food dye (FDA-approved).',
    'yellow 5': 'Tartrazine — a synthetic yellow food dye (FDA-approved); may cause sensitivity in some people.',
    'yellow 6': 'Sunset Yellow — a synthetic orange-yellow food dye.',
    'blue 1': 'Brilliant Blue — a synthetic blue food dye.',
    'blue 2': 'Indigo Carmine — a synthetic blue food dye.',
    'red 3': 'Erythrosine — a cherry-red synthetic food dye.',
    'green 3': 'Fast Green FCF — a synthetic green food dye.',
    'titanium dioxide': 'A white pigment used to make foods appear bright white; under regulatory review.',
    'silicon dioxide': 'An anti-caking agent that prevents clumping in powdered foods.',
    'calcium silicate': 'An anti-caking agent used to keep powders free-flowing.',
    'magnesium stearate': 'A flow agent and lubricant used in supplements and tablet manufacture.',
    'di-potassium phosphate': 'A potassium salt used as a buffering agent and emulsifier.',
    'tricalcium phosphate': 'A calcium supplement and anti-caking agent.',
    'inulin': 'A prebiotic dietary fibre from chicory root that feeds beneficial gut bacteria.',
    'chicory root': 'A plant root that is a natural source of inulin; added as a prebiotic fibre.',
    'stevia': 'A natural zero-calorie sweetener derived from the Stevia rebaudiana plant.',
    'erythritol': 'A sugar alcohol with almost no calories; found naturally in some fruits.',
    'sorbitol': 'A sugar alcohol used as a sweetener and humectant; lower glycaemic index than sugar.',
    'xylitol': 'A sugar alcohol sweetener derived from birch bark or corn; does not spike blood sugar.',
    'acesulfame potassium': 'A calorie-free synthetic sweetener (Ace-K) 200x sweeter than sugar.',
    'aspartame': 'A low-calorie synthetic sweetener made from two amino acids.',
    'sucralose': 'A non-caloric synthetic sweetener made from sugar; marketed as Splenda.',
    'saccharin': 'One of the oldest synthetic sweeteners; calorie-free.',
    'monk fruit': 'A natural zero-calorie sweetener derived from monk fruit (luo han guo).',
    'allulose': 'A rare sugar naturally in figs; provides 10% of the calories of regular sugar.',
    'tapioca starch': 'Starch from cassava root; used as a gluten-free thickener.',
    'arrowroot': 'A starchy flour from the arrowroot plant used as a gluten-free thickener.',
    'corn starch': 'A thickener derived from corn endosperm, widely used in sauces and baked goods.',
    'potato starch': 'A fine starch from potatoes; used as a thickener and gluten-free binder.',
    'rice flour': 'A gluten-free flour ground from rice; used in baking and as a thickener.',
    'olive oil': 'A cold-pressed oil from olives; high in monounsaturated fats.',
    'sunflower oil': 'A vegetable oil from sunflower seeds; high in linoleic acid.',
    'soybean oil': 'A widely used vegetable oil from soybeans.',
    'vegetable oil': 'A general term for oils extracted from plants.',
    'cocoa butter': 'The fat extracted from cocoa beans; gives chocolate its smooth texture.',
    'shea butter': 'A fat from shea tree nuts; used in confectionery and cosmetics.',
    'whey': 'A dairy by-product from cheese making; high in protein.',
    'casein': 'The main protein in milk; forms a slow-digesting protein source.',
    'lactose': 'The natural sugar in milk; can cause digestive issues in lactose-intolerant individuals.',
    'whey protein': 'A fast-absorbing milk-derived protein commonly used in protein supplements.',
    'soy protein': 'A plant-based protein isolate from soybeans.',
    'pea protein': 'A plant-based protein from yellow split peas.',
    'egg': 'A common food ingredient providing protein, fat, and emulsifying properties.',
    'egg white': 'The protein-rich clear part of an egg; used for structure and leavening.',
    'egg yolk': 'The fatty part of an egg; rich in vitamins and acts as an emulsifier.',
    'honey': 'A natural sweetener produced by bees from flower nectar.',
    'maple syrup': 'A natural sweetener made from boiled maple tree sap.',
    'molasses': 'A by-product of sugar refining; rich in iron and B vitamins.',
    'agave': 'A plant-derived sweetener high in fructose.',
    'yeast': 'A microorganism used for leavening bread and fermentation.',
    'baking soda': 'Sodium bicarbonate — a chemical leavening agent that releases CO₂ when heated.',
    'baking powder': 'A leavening mixture of sodium bicarbonate and an acid; used in baking.',
    'cream of tartar': 'Potassium bitartrate — a baking acid that stabilises egg whites and activates baking soda.',
    'vinegar': 'A dilute acetic acid solution used for flavour and preservation.',
    'turmeric': 'A spice and natural yellow colouring with anti-inflammatory properties.',
    'paprika': 'A spice from dried red peppers; used for colour and mild flavour.',
    'black pepper': 'A widely used spice that adds pungent heat.',
    'cinnamon': 'A spice from tree bark known for its warm flavour and antioxidant properties.',
    'garlic': 'An allium vegetable widely used for flavour and with potential health benefits.',
    'onion': 'An allium vegetable used for flavour and a source of antioxidants.',
    'rosemary extract': 'A natural antioxidant from rosemary used to prevent fat oxidation.',
    'green tea extract': 'A concentrated source of catechins and antioxidants from green tea leaves.',
  };

  for (const [key, desc] of Object.entries(known)) {
    if (n.includes(key) || key.includes(n)) return desc;
  }

  if (category) return `A food ingredient classified as "${category}" in the USDA database.`;
  if (usdaDesc) return `Known as "${usdaDesc}" in the USDA FoodData Central database.`;
  return `A food ingredient found in the USDA database.`;
};

const buildWhatItDoes = (name, calories, protein, fat, carbs, sodium, fiber) => {
  const n = name.toLowerCase();

  // Functional roles for common categories
  if (['sugar', 'glucose', 'fructose', 'sucrose', 'corn syrup', 'honey', 'maple syrup', 'agave', 'molasses'].some(k => n.includes(k))) {
    return 'Provides sweetness and quick energy. High intake is linked to blood sugar spikes.';
  }
  if (['salt', 'sodium chloride', 'sodium'].some(k => n === k)) {
    return 'Enhances flavour and acts as a preservative. Excess sodium raises blood pressure.';
  }
  if (['oil', 'fat', 'butter', 'lard', 'shortening'].some(k => n.includes(k))) {
    return 'Provides richness, flavour, and fat-soluble vitamins. Portion matters for heart health.';
  }
  if (['lecithin', 'mono and diglycerides', 'polysorbate', 'carrageenan'].some(k => n.includes(k))) {
    return 'Acts as an emulsifier — keeps oil and water blended for smooth texture.';
  }
  if (['gum', 'starch', 'pectin', 'gelatin', 'agar', 'cellulose', 'carboxymethyl'].some(k => n.includes(k))) {
    return 'Thickens or gels the product and improves its texture and stability.';
  }
  if (['benzoate', 'sorbate', 'nitrate', 'nitrite', 'sorbic', 'acetic', 'propionic'].some(k => n.includes(k))) {
    return 'Acts as a preservative — inhibits bacterial and mould growth to extend shelf life.';
  }
  if (['acid', 'vinegar', 'tartaric', 'malic', 'lactic', 'citric'].some(k => n.includes(k))) {
    return 'Adds tartness and acidity, balances sweetness, and can act as a mild preservative.';
  }
  if (['colour', 'color', 'dye', 'red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'annatto', 'beta carotene', 'caramel', 'turmeric', 'paprika', 'titanium'].some(k => n.includes(k))) {
    return 'Added to give or enhance the colour of the product.';
  }
  if (['stevia', 'erythritol', 'sorbitol', 'xylitol', 'aspartame', 'sucralose', 'saccharin', 'acesulfame', 'monk fruit', 'allulose'].some(k => n.includes(k))) {
    return 'A low- or zero-calorie sweetener used to reduce sugar content without losing sweetness.';
  }
  if (['vitamin', 'niacin', 'riboflavin', 'thiamine', 'folic acid', 'ascorbic acid', 'tocopherol', 'calcium', 'iron', 'zinc', 'magnesium'].some(k => n.includes(k))) {
    return 'Added as a vitamin or mineral to boost the nutritional profile of the product.';
  }
  if (['flour', 'starch', 'oat', 'wheat', 'rice', 'barley', 'rye', 'corn', 'tapioca', 'arrowroot'].some(k => n.includes(k))) {
    return 'Provides carbohydrates, structure, and texture in baked goods.';
  }
  if (['protein', 'whey', 'casein', 'soy protein', 'pea protein', 'egg'].some(k => n.includes(k))) {
    return 'Contributes protein content and helps with structure and binding.';
  }
  if (['baking soda', 'baking powder', 'yeast', 'cream of tartar'].some(k => n.includes(k))) {
    return 'Acts as a leavening agent — creates gas bubbles that make baked goods rise.';
  }
  if (['inulin', 'chicory', 'prebiotic', 'fiber', 'fibre'].some(k => n.includes(k))) {
    return 'A dietary fibre that feeds beneficial gut bacteria and supports digestive health.';
  }
  if (['wax', 'shellac', 'carnauba', 'beeswax'].some(k => n.includes(k))) {
    return 'Applied as a glazing agent to give confectionery a shiny coating.';
  }
  if (['anti-caking', 'silicon dioxide', 'calcium silicate', 'magnesium carbonate'].some(k => n.includes(k))) {
    return 'Prevents powder ingredients from clumping together.';
  }
  if (['humectant', 'glycerin', 'glycerol', 'propylene glycol', 'sorbitol'].some(k => n.includes(k))) {
    return 'Retains moisture in the product, keeping it soft and extending shelf life.';
  }
  if (['flavour', 'flavor', 'vanilla', 'vanillin', 'extract', 'spice', 'herb'].some(k => n.includes(k))) {
    return 'Enhances or provides the characteristic taste and aroma of the product.';
  }

  // Fallback: use USDA nutrient data if available
  if (calories !== null) {
    const parts = [];
    if (calories > 0) parts.push(`provides ${calories} kcal per 100 g`);
    if (protein > 0) parts.push(`${protein} g protein`);
    if (fiber > 0) parts.push(`${fiber} g fibre`);
    if (sodium > 0) parts.push(`${sodium} mg sodium`);
    if (parts.length > 0) return `Per 100 g: ${parts.join(', ')}.`;
  }

  return 'Function in this product is not listed in the USDA database.';
};

// ── Health verdict ────────────────────────────────────────────────────────────
// Returns: 'good' | 'moderate' | 'concern' | 'avoid'
const buildHealthVerdict = (n) => {
  // Avoid
  if (['trans fat', 'partially hydrogenated', 'high fructose corn syrup', 'hfcs',
       'sodium nitrite', 'sodium nitrate', 'bha', 'bht', 'potassium bromate',
       'brominated vegetable oil', 'propyl gallate', 'red 3', 'tartrazine',
       'titanium dioxide'].some(k => n.includes(k))) return 'avoid';

  // Concern
  if (['sodium benzoate', 'sodium phosphate', 'disodium', 'red 40', 'yellow 5',
       'yellow 6', 'blue 1', 'blue 2', 'caramel colour', 'caramel color',
       'aspartame', 'acesulfame', 'sucralose', 'saccharin', 'carrageenan',
       'monosodium glutamate', 'msg', 'modified starch', 'bleached flour',
       'enriched flour', 'corn syrup', 'glucose syrup', 'dextrose',
       'maltodextrin', 'cellulose', 'polysorbate', 'carboxymethylcellulose',
       'propylene glycol', 'sulfite', 'sulphite', 'nitrite', 'nitrate'].some(k => n.includes(k))) return 'concern';

  // Good
  if (['vitamin', 'niacin', 'riboflavin', 'thiamine', 'folic acid', 'folate',
       'ascorbic acid', 'tocopherol', 'calcium', 'iron', 'zinc', 'magnesium',
       'potassium', 'fiber', 'fibre', 'inulin', 'chicory root', 'pectin',
       'stevia', 'monk fruit', 'erythritol', 'water', 'olive oil',
       'sunflower oil', 'canola oil', 'flaxseed', 'chia', 'quinoa',
       'oat', 'whole wheat', 'whole grain', 'almond', 'coconut oil',
       'honey', 'maple syrup', 'turmeric', 'ginger', 'cinnamon',
       'green tea', 'rosemary extract', 'lecithin', 'soy lecithin',
       'citric acid', 'lactic acid', 'acetic acid', 'vinegar',
       'beta carotene', 'annatto', 'paprika'].some(k => n.includes(k))) return 'good';

  // Default moderate
  return 'moderate';
};

// ── WHO / JECFA classification ────────────────────────────────────────────────
const buildWhoSays = (n) => {
  // IARC carcinogens
  if (['sodium nitrite', 'sodium nitrate'].some(k => n.includes(k)))
    return 'IARC: Processed meats containing nitrites are Group 1 (carcinogenic to humans). WHO recommends limiting processed meat intake.';
  if (['bha'].some(k => n === k))
    return 'IARC classifies BHA as Group 2B (possibly carcinogenic to humans).';
  if (['bht'].some(k => n === k))
    return 'WHO/JECFA has set an ADI for BHT; excessive intake is discouraged.';
  if (['aspartame'].some(k => n.includes(k)))
    return 'IARC classified aspartame as Group 2B (possibly carcinogenic) in 2023. WHO recommends not using sweeteners for weight control long-term.';
  if (['saccharin'].some(k => n.includes(k)))
    return 'Previously listed as a possible carcinogen; IARC delisted it (Group 3). WHO/JECFA sets ADI at 5 mg/kg body weight.';
  if (['red 3', 'erythrosine'].some(k => n.includes(k)))
    return 'IARC Group 3. The FDA banned Red 3 in cosmetics; food use is still under review. WHO/JECFA ADI is 0.1 mg/kg/day.';
  if (['titanium dioxide'].some(k => n.includes(k)))
    return 'EFSA (2021) concluded titanium dioxide can no longer be considered safe as a food additive. The EU banned it in food in 2022.';

  // Sugar / sweeteners
  if (['sugar', 'sucrose', 'fructose', 'glucose', 'dextrose', 'corn syrup',
       'high fructose', 'hfcs'].some(k => n.includes(k)))
    return 'WHO recommends limiting free sugars to less than 10% of total daily energy intake, ideally below 5%, to reduce obesity and dental caries risk.';
  if (['stevia', 'monk fruit'].some(k => n.includes(k)))
    return 'WHO/JECFA: Acceptable as non-nutritive sweetener. 2023 WHO guideline advises against long-term use of sweeteners for weight management.';
  if (['sucralose'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 15 mg/kg/day. 2023 WHO guideline advises against using sweeteners for weight control.';
  if (['acesulfame'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 15 mg/kg/day. Considered safe at approved levels but under continued review.';

  // Salt / sodium
  if (['sodium chloride', 'salt', 'sodium'].some(k => n.includes(k)))
    return 'WHO recommends less than 5 g of salt (2 g sodium) per day for adults to reduce blood pressure and cardiovascular disease risk.';

  // Trans fat
  if (['trans fat', 'partially hydrogenated', 'hydrogenated'].some(k => n.includes(k)))
    return 'WHO calls for the global elimination of industrially-produced trans-fatty acids. The target was 2023. Trans fats raise LDL cholesterol and increase heart disease risk.';

  // Preservatives
  if (['sodium benzoate'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 5 mg/kg/day. When combined with vitamin C it can form benzene; generally safe at approved food levels.';
  if (['potassium sorbate', 'sorbic acid'].some(k => n.includes(k)))
    return 'WHO/JECFA: Acceptable Daily Intake (ADI) of 25 mg/kg body weight. Considered safe at levels used in food.';

  // Colours
  if (['red 40', 'allura red'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 7 mg/kg/day. EU requires a warning label when used with other azo dyes. FDA-approved in the US.';
  if (['yellow 5', 'tartrazine'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 7.5 mg/kg/day. EU requires warning: "may have an adverse effect on activity and attention in children."';
  if (['yellow 6', 'sunset yellow'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 4 mg/kg/day. EU requires the same attention/activity warning as other azo dyes.';
  if (['caramel colour', 'caramel color'].some(k => n.includes(k)))
    return 'Class IV caramel (E150d) contains 4-MEI, a potential carcinogen. WHO/JECFA has set limits for impurity levels.';
  if (['annatto'].some(k => n.includes(k)))
    return 'WHO/JECFA: ADI "not specified" — considered acceptable at levels used in food. A natural colourant.';
  if (['beta carotene'].some(k => n.includes(k)))
    return 'WHO/JECFA: ADI "not specified" for food use. High-dose supplements in smokers linked to lung cancer risk, but food-level intake is safe.';

  // Emulsifiers / thickeners
  if (['carrageenan'].some(k => n.includes(k)))
    return 'WHO/JECFA has approved carrageenan for food use, but some animal studies raise concerns at very high intakes. An ongoing area of scientific review.';
  if (['polysorbate 80', 'polysorbate'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: 25 mg/kg/day. Some mouse studies suggest gut microbiome effects at very high doses; considered safe at normal food levels.';
  if (['lecithin', 'soy lecithin', 'sunflower lecithin'].some(k => n.includes(k)))
    return 'WHO/JECFA: ADI "not limited" — lecithin is naturally present in all living cells and is safe at any level used in food.';
  if (['xanthan gum'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: "not specified." Considered safe at normal food use levels. Well-tolerated by most people.';
  if (['guar gum'].some(k => n.includes(k)))
    return 'WHO/JECFA: Acceptable at levels needed for food function. Acts as dietary fibre.';

  // Vitamins / minerals
  if (['ascorbic acid', 'vitamin c'].some(k => n.includes(k)))
    return 'WHO Essential Medicine. Vitamin C is an essential micronutrient with an upper tolerable intake of 2,000 mg/day. Safe at normal food levels.';
  if (['tocopherol', 'vitamin e'].some(k => n.includes(k)))
    return 'WHO/JECFA: ADI "not specified" for naturally-occurring tocopherols in food. Upper tolerable level for supplements is 1,000 mg/day.';
  if (['folic acid', 'folate'].some(k => n.includes(k)))
    return 'WHO recommends mandatory flour fortification with folic acid to prevent neural tube defects. Upper tolerable intake: 1,000 µg/day.';
  if (['iron'].some(k => n === k || n.includes(' iron') || n.startsWith('iron ')))
    return 'WHO lists iron as an essential nutrient and recommends iron fortification in flour to combat global anaemia.';
  if (['calcium carbonate', 'calcium'].some(k => n.includes(k)))
    return 'WHO/JECFA: Calcium is an essential nutrient. Calcium carbonate as a food additive has ADI "not specified" — safe at normal food levels.';

  // Oils
  if (['palm oil'].some(k => n.includes(k)))
    return 'WHO advises limiting saturated fat (from palm oil among others) to less than 10% of total energy to reduce cardiovascular risk.';
  if (['trans fat', 'partially hydrogenated'].some(k => n.includes(k)))
    return 'WHO calls for full elimination of industrial trans fats globally by 2023 — linked directly to heart disease.';

  // Misc
  if (['monosodium glutamate', 'msg'].some(k => n.includes(k)))
    return 'WHO/JECFA ADI: "not specified." Glutamate naturally occurs in many foods. Considered safe; "MSG symptom complex" is not confirmed by controlled studies.';
  if (['maltodextrin'].some(k => n.includes(k)))
    return 'No specific WHO ADI. Has a high glycaemic index — can spike blood sugar. Generally regarded as safe at normal food use levels.';
  if (['baking soda', 'sodium bicarbonate'].some(k => n.includes(k)))
    return 'GRAS (FDA). WHO sodium guidelines apply — excess sodium from all sources should be limited to <2 g/day.';

  return 'No specific WHO or JECFA classification applies to this ingredient at normal food intake levels.';
};

const buildFallbackInfo = (ingredientName) => {
  const n = (ingredientName || '').toLowerCase().trim();
  return {
    name: n || ingredientName,
    whatItIs: buildWhatItIs(n, '', ''),
    whatItDoes: buildWhatItDoes(n, null, null, null, null, null, null),
    healthVerdict: buildHealthVerdict(n),
    whoSays: buildWhoSays(n),
    usdaDescription: null,
    source: 'WHO/JECFA + Local Database',
  };
};

// ── E-number Additive Database ───────────────────────────────────────────────
// verdict: 'good' | 'moderate' | 'concern' | 'avoid'
const ADDITIVE_DB = {
  // ── Colours ──────────────────────────────────────────────────────────────
  'E100': { name: 'Curcumin', category: 'Colour', verdict: 'good',    who: 'WHO/JECFA ADI: 3 mg/kg/day. Natural pigment from turmeric; also studied for anti-inflammatory effects.',        what: 'Natural yellow colour extracted from turmeric root.', does: 'Gives food a yellow-orange tint.' },
  'E101': { name: 'Riboflavin (Vitamin B2)', category: 'Colour', verdict: 'good', who: 'WHO/JECFA ADI: not specified. An essential B-vitamin; safe at any level used in food.',             what: 'Natural yellow vitamin (B2) used as a food colour.', does: 'Provides yellow colour and adds nutritional value.' },
  'E102': { name: 'Tartrazine', category: 'Colour', verdict: 'concern', who: 'WHO/JECFA ADI: 7.5 mg/kg/day. EU requires warning: "may have an adverse effect on activity and attention in children."', what: 'Synthetic yellow azo dye.', does: 'Gives food a bright yellow or lemon colour.' },
  'E104': { name: 'Quinoline Yellow', category: 'Colour', verdict: 'concern', who: 'EU requires the children\'s attention warning label. Banned in Australia and the US.',              what: 'Synthetic yellow-green dye.', does: 'Produces a dull yellow-green tint in food and drinks.' },
  'E110': { name: 'Sunset Yellow FCF', category: 'Colour', verdict: 'concern', who: 'WHO/JECFA ADI: 4 mg/kg/day. EU requires the children\'s attention/activity warning label.',         what: 'Synthetic orange-yellow azo dye.', does: 'Colours food and drinks orange or yellow.' },
  'E120': { name: 'Cochineal / Carmine', category: 'Colour', verdict: 'moderate', who: 'WHO/JECFA ADI: 5 mg/kg/day. Natural origin, but can cause severe allergic reactions in some people.', what: 'Red dye derived from the dried cochineal insect.', does: 'Provides a vivid red or pink colour.' },
  'E122': { name: 'Carmoisine (Azorubine)', category: 'Colour', verdict: 'concern', who: 'EU requires the children\'s attention warning. Banned in Canada, Japan, and the US.',          what: 'Synthetic red azo dye.', does: 'Gives food a dark red or maroon colour.' },
  'E123': { name: 'Amaranth', category: 'Colour', verdict: 'avoid',   who: 'Banned in the US (FDA) and Russia. Permitted in the EU with restrictions. Once suspected carcinogen.',        what: 'Synthetic dark red azo dye.', does: 'Colours food and drinks dark red.' },
  'E124': { name: 'Ponceau 4R (Cochineal Red A)', category: 'Colour', verdict: 'concern', who: 'EU requires the children\'s attention warning. Banned in the US and Canada.',           what: 'Synthetic red azo dye.', does: 'Gives food a bright red colour.' },
  'E127': { name: 'Erythrosine (Red 3)', category: 'Colour', verdict: 'concern', who: 'IARC Group 3. FDA banned it in cosmetics; under review for food. WHO/JECFA ADI: 0.1 mg/kg/day.',  what: 'Synthetic cherry-red dye containing iodine.', does: 'Colours food bright cherry-red.' },
  'E129': { name: 'Allura Red AC (Red 40)', category: 'Colour', verdict: 'concern', who: 'WHO/JECFA ADI: 7 mg/kg/day. EU requires the children\'s attention warning label.',            what: 'Synthetic red azo dye — the most widely used red food dye.', does: 'Colours food and drinks red or orange-red.' },
  'E131': { name: 'Patent Blue V', category: 'Colour', verdict: 'concern', who: 'Permitted in EU; not approved by FDA in the US. Can cause rare allergic reactions.',                    what: 'Synthetic blue dye.', does: 'Produces a vivid blue or blue-green colour.' },
  'E132': { name: 'Indigo Carmine (Blue 2)', category: 'Colour', verdict: 'moderate', who: 'WHO/JECFA ADI: 5 mg/kg/day. Generally considered safe at approved levels.',                  what: 'Synthetic blue-purple dye derived from indigo.', does: 'Colours food blue or blue-violet.' },
  'E133': { name: 'Brilliant Blue FCF (Blue 1)', category: 'Colour', verdict: 'concern', who: 'WHO/JECFA ADI: 12.5 mg/kg/day. EU requires the children\'s attention warning label.',    what: 'Synthetic bright blue dye.', does: 'Gives food and drinks a bright blue colour.' },
  'E150a': { name: 'Plain Caramel', category: 'Colour', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified for plain caramel.',                                                     what: 'Caramel colour made by heating sugar without additives.', does: 'Colours food brown — used in soft drinks, sauces, and baked goods.' },
  'E150D': { name: 'Sulphite Ammonia Caramel', category: 'Colour', verdict: 'concern', who: 'Contains 4-MEI — a potential carcinogen. California requires a Prop 65 warning above a threshold level.', what: 'Dark brown colour made with sulphite and ammonia compounds.', does: 'The most common caramel colour — used in cola drinks.' },
  'E160A': { name: 'Beta-Carotene', category: 'Colour', verdict: 'good',   who: 'WHO/JECFA ADI: not specified. A pro-vitamin A; safe at food levels. High-dose supplements in smokers carry increased lung cancer risk.', what: 'Natural orange-yellow pigment found in carrots and other plants.', does: 'Provides orange or yellow colour and adds pro-vitamin A.' },
  'E160B': { name: 'Annatto (Bixin)', category: 'Colour', verdict: 'good',  who: 'WHO/JECFA ADI: 0–12 mg/kg/day. Natural origin; generally well-tolerated.',                           what: 'Natural orange-red colour from the seeds of the achiote tree.', does: 'Gives food and dairy products an orange-yellow colour.' },
  'E162': { name: 'Beetroot Red (Betanin)', category: 'Colour', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Naturally derived; no safety concerns at food levels.',              what: 'Natural red-purple pigment extracted from beetroot.', does: 'Colours food red or pink.' },
  'E171': { name: 'Titanium Dioxide', category: 'Colour', verdict: 'avoid',   who: 'EFSA (2021) concluded it can no longer be considered safe as a food additive. EU banned it in food in 2022. Still permitted in some countries.', what: 'White mineral pigment.', does: 'Makes food appear bright white; used in sweets and chewing gum.' },
  'E172': { name: 'Iron Oxides', category: 'Colour', verdict: 'good',     who: 'WHO/JECFA ADI: 0.5 mg/kg/day. Natural mineral colours; no safety concerns.',                            what: 'Natural mineral pigments in yellow, red, and black.', does: 'Provides earthy yellow, red, or black tones in food coatings.' },

  // ── Preservatives ────────────────────────────────────────────────────────
  'E200': { name: 'Sorbic Acid', category: 'Preservative', verdict: 'good', who: 'WHO/JECFA ADI: 25 mg/kg/day. Naturally found in berries; well-tolerated.',                             what: 'Naturally occurring organic acid used as a preservative.', does: 'Inhibits mould and yeast growth to extend shelf life.' },
  'E202': { name: 'Potassium Sorbate', category: 'Preservative', verdict: 'moderate', who: 'WHO/JECFA ADI: 25 mg/kg/day. Considered safe at food levels.',                              what: 'Potassium salt of sorbic acid.', does: 'Prevents mould and yeast growth in cheese, wine, and baked goods.' },
  'E210': { name: 'Benzoic Acid', category: 'Preservative', verdict: 'concern', who: 'WHO/JECFA ADI: 5 mg/kg/day. Can form benzene when combined with vitamin C (ascorbic acid).',     what: 'Organic acid naturally found in some fruits.', does: 'Inhibits microbial growth in acidic foods and drinks.' },
  'E211': { name: 'Sodium Benzoate', category: 'Preservative', verdict: 'concern', who: 'WHO/JECFA ADI: 5 mg/kg/day. Can react with vitamin C to form benzene. EU children\'s attention warning when combined with azo dyes.', what: 'Sodium salt of benzoic acid — widely used synthetic preservative.', does: 'Prevents mould and bacteria in soft drinks, sauces, and pickles.' },
  'E212': { name: 'Potassium Benzoate', category: 'Preservative', verdict: 'concern', who: 'Same concerns as E211 — can form benzene with ascorbic acid.',                               what: 'Potassium salt of benzoic acid.', does: 'Preserves acidic foods and drinks against microbial growth.' },
  'E220': { name: 'Sulphur Dioxide', category: 'Preservative', verdict: 'concern', who: 'WHO/JECFA ADI: 0.7 mg/kg/day. A known allergen — EU law requires labelling when above 10 mg/kg.', what: 'A gas used as a preservative and antioxidant.', does: 'Prevents browning and microbial spoilage in dried fruits and wine.' },
  'E221': { name: 'Sodium Sulphite', category: 'Preservative', verdict: 'concern', who: 'WHO/JECFA ADI: 0.7 mg/kg/day (as sulphur dioxide). Allergen — must be declared on label.',    what: 'Sodium salt of sulphurous acid.', does: 'Preserves food colour and prevents microbial growth.' },
  'E249': { name: 'Potassium Nitrite', category: 'Preservative', verdict: 'avoid', who: 'IARC: Processed meat containing nitrites is Group 1 carcinogenic. WHO recommends limiting processed meat intake.', what: 'Synthetic curing salt used in processed meat.', does: 'Prevents botulism bacteria and gives cured meats their pink colour.' },
  'E250': { name: 'Sodium Nitrite', category: 'Preservative', verdict: 'avoid', who: 'IARC: Processed meats with nitrites are Group 1 carcinogenic to humans. WHO recommends limiting intake.', what: 'The most common curing salt in processed meat production.', does: 'Prevents bacteria, especially botulism, and gives bacon/ham their colour.' },
  'E251': { name: 'Sodium Nitrate', category: 'Preservative', verdict: 'avoid', who: 'IARC Group 1 (in processed meats). WHO recommends minimising processed meat consumption.',          what: 'Sodium salt used to cure and preserve meat.', does: 'Converts to nitrite in the body — acts as a long-term preservative in cured meats.' },
  'E252': { name: 'Potassium Nitrate (Saltpetre)', category: 'Preservative', verdict: 'avoid', who: 'IARC Group 1 (via nitrite conversion). WHO recommends minimising consumption.',      what: 'Traditional salt used to cure meat and cheese.', does: 'Gradually converts to nitrite during curing, preventing bacterial growth.' },
  'E260': { name: 'Acetic Acid', category: 'Preservative', verdict: 'good', who: 'WHO/JECFA ADI: not specified. The acid in vinegar — naturally produced in fermentation.',              what: 'The main acid in vinegar.', does: 'Preserves food and adds a sharp, tart flavour.' },
  'E270': { name: 'Lactic Acid', category: 'Preservative', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Naturally produced in fermentation; very well-tolerated.',               what: 'Organic acid produced naturally by fermentation.', does: 'Preserves food, adds tartness, and controls acidity.' },
  'E280': { name: 'Propionic Acid', category: 'Preservative', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Naturally occurs in some cheeses; safe at food levels.',          what: 'Short-chain fatty acid naturally present in fermented foods.', does: 'Prevents mould growth in bread and bakery products.' },
  'E282': { name: 'Calcium Propionate', category: 'Preservative', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Generally safe; some studies suggest possible behavioural effects in children at high intake.', what: 'Calcium salt of propionic acid.', does: 'Prevents mould in bread, cakes, and processed cheese.' },

  // ── Antioxidants ─────────────────────────────────────────────────────────
  'E300': { name: 'Ascorbic Acid (Vitamin C)', category: 'Antioxidant', verdict: 'good', who: 'WHO Essential Medicine. Safe at food levels; upper tolerable intake 2,000 mg/day.',       what: 'Vitamin C — an essential water-soluble vitamin.', does: 'Prevents browning and oxidation, and boosts vitamin C content.' },
  'E301': { name: 'Sodium Ascorbate', category: 'Antioxidant', verdict: 'good', who: 'Same as E300. A sodium form of vitamin C — contributes to daily sodium intake.',                   what: 'Sodium salt of vitamin C.', does: 'Antioxidant that prevents colour and flavour loss in processed food.' },
  'E306': { name: 'Tocopherol-rich Extract (Vitamin E)', category: 'Antioxidant', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Natural vitamin E; safe at food levels.',        what: 'Natural vitamin E extracted from vegetable oils.', does: 'Prevents fats from going rancid; adds vitamin E.' },
  'E307': { name: 'Alpha-Tocopherol (Vitamin E)', category: 'Antioxidant', verdict: 'good', who: 'WHO/JECFA ADI: not specified. The most bioavailable form of vitamin E.',               what: 'The primary active form of vitamin E.', does: 'Prevents oxidation of fats and oils; most bioavailable form of vitamin E.' },
  'E320': { name: 'BHA (Butylated Hydroxyanisole)', category: 'Antioxidant', verdict: 'avoid', who: 'IARC classifies BHA as Group 2B (possibly carcinogenic to humans).',               what: 'Synthetic antioxidant used to preserve fats and oils.', does: 'Prevents fats and oils from becoming rancid during storage.' },
  'E321': { name: 'BHT (Butylated Hydroxytoluene)', category: 'Antioxidant', verdict: 'avoid', who: 'WHO/JECFA ADI: 0.3 mg/kg/day. Some animal studies suggest endocrine disruption; banned in some countries.', what: 'Synthetic antioxidant used to preserve fats.', does: 'Prevents oxidation of fats, oils, and fat-containing foods.' },
  'E330': { name: 'Citric Acid', category: 'Antioxidant / Acidity Regulator', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Naturally found in citrus fruits; very well-tolerated.', what: 'Natural acid found abundantly in citrus fruits.', does: 'Adds tartness, prevents browning, and balances acidity.' },
  'E331': { name: 'Sodium Citrates', category: 'Acidity Regulator', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Safe at food levels.',                                          what: 'Sodium salts of citric acid.', does: 'Control acidity and act as a preservative and emulsifier.' },
  'E332': { name: 'Potassium Citrates', category: 'Acidity Regulator', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Also used as a potassium supplement.',                       what: 'Potassium salts of citric acid.', does: 'Control acidity and can serve as a potassium supplement.' },
  'E338': { name: 'Phosphoric Acid', category: 'Acidity Regulator', verdict: 'concern', who: 'WHO/JECFA ADI: 70 mg/kg/day (as phosphorus). High intake is linked to reduced bone mineral density.', what: 'A strong inorganic acid.', does: 'Gives cola drinks their sharp, tangy taste and controls acidity.' },
  'E339': { name: 'Sodium Phosphates', category: 'Emulsifier / Acidity Regulator', verdict: 'moderate', who: 'WHO/JECFA ADI: 70 mg/kg/day (as phosphorus). High phosphate intake is linked to kidney stress.', what: 'Sodium salts of phosphoric acid.', does: 'Emulsify, preserve colour, and control acidity in processed food.' },

  // ── Emulsifiers / Thickeners / Stabilisers ───────────────────────────────
  'E322': { name: 'Lecithins', category: 'Emulsifier', verdict: 'good', who: 'WHO/JECFA ADI: not limited. Lecithin naturally occurs in all living cells; extremely well-tolerated.',     what: 'Naturally occurring phospholipids from soy, sunflower, or egg yolk.', does: 'Keeps oil and water blended for smooth texture in chocolate and baked goods.' },
  'E400': { name: 'Alginic Acid', category: 'Thickener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. A natural dietary fibre from brown seaweed.',                              what: 'Natural polysaccharide extracted from brown seaweed.', does: 'Thickens and gels food; acts as a dietary fibre.' },
  'E401': { name: 'Sodium Alginate', category: 'Thickener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Safe at food levels; natural origin.',                                  what: 'Sodium salt of alginic acid from seaweed.', does: 'Thickens, gels, and stabilises dairy products, sauces, and desserts.' },
  'E406': { name: 'Agar', category: 'Thickener / Gelling Agent', verdict: 'good', who: 'WHO/JECFA ADI: not specified. A natural plant-based gelatin substitute.',                        what: 'Natural gelling agent extracted from red algae.', does: 'Forms firm gels in desserts, confectionery, and vegetarian products.' },
  'E407': { name: 'Carrageenan', category: 'Thickener', verdict: 'concern', who: 'WHO/JECFA has approved it for food use, but some animal studies at very high doses raise gut inflammation concerns. An ongoing area of review.', what: 'Polysaccharide extracted from red seaweed.', does: 'Thickens and gels dairy products, plant-based milks, and processed meats.' },
  'E410': { name: 'Locust Bean Gum (Carob)', category: 'Thickener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Natural dietary fibre; safe.',                                  what: 'Natural gum from carob tree seeds.', does: 'Thickens and stabilises ice cream, sauces, and cream cheese.' },
  'E412': { name: 'Guar Gum', category: 'Thickener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Acts as a dietary fibre; safe at normal levels.',                              what: 'Natural galactomannan gum from guar beans.', does: 'Thickens, stabilises, and improves texture of sauces, dairy, and baked goods.' },
  'E414': { name: 'Acacia Gum (Gum Arabic)', category: 'Thickener / Emulsifier', verdict: 'good', who: 'WHO/JECFA ADI: not specified. A prebiotic dietary fibre; very well-tolerated.', what: 'Natural gum from acacia tree sap.', does: 'Thickens, stabilises, and emulsifies confectionery and soft drinks.' },
  'E415': { name: 'Xanthan Gum', category: 'Thickener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Safe at normal food levels; may cause digestive discomfort in large amounts.', what: 'Polysaccharide produced by bacterial fermentation.', does: 'Thickens, stabilises, and prevents separation in sauces and gluten-free products.' },
  'E420': { name: 'Sorbitol', category: 'Sweetener / Humectant', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified, but high intake (>20g/day) can cause laxative effects.',      what: 'A sugar alcohol naturally found in some fruits.', does: 'Sweetens and retains moisture in diabetic foods, chewing gum, and confectionery.' },
  'E422': { name: 'Glycerol (Glycerine)', category: 'Humectant', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Naturally present in all fats; metabolised as a carbohydrate.',   what: 'A sweet-tasting alcohol derived from fats and oils.', does: 'Retains moisture in food, preventing it from drying out.' },
  'E432': { name: 'Polysorbate 20', category: 'Emulsifier', verdict: 'concern', who: 'WHO/JECFA ADI: 25 mg/kg/day. Some studies suggest gut microbiome disruption at very high doses.', what: 'Synthetic emulsifier derived from sorbitol and lauric acid.', does: 'Keeps oil and water blended in baked goods and ice cream.' },
  'E433': { name: 'Polysorbate 80', category: 'Emulsifier', verdict: 'concern', who: 'WHO/JECFA ADI: 25 mg/kg/day. Some mouse studies suggest gut barrier disruption at high doses.',   what: 'Synthetic emulsifier widely used in ice cream and cosmetics.', does: 'Prevents oil-water separation and improves texture in processed food.' },
  'E440': { name: 'Pectin', category: 'Thickener / Gelling Agent', verdict: 'good', who: 'WHO/JECFA ADI: not specified. A natural dietary fibre from fruit skins; supports gut health.', what: 'Natural polysaccharide found in the cell walls of fruits.', does: 'Forms gels in jams, jellies, and fruit preparations.' },
  'E450': { name: 'Diphosphates', category: 'Emulsifier / Leavening Agent', verdict: 'moderate', who: 'WHO/JECFA ADI: 70 mg/kg/day (as phosphorus). Excessive phosphate intake linked to kidney stress.', what: 'Phosphate salt used as a leavening agent and emulsifier.', does: 'Helps baked goods rise and emulsifies processed cheese.' },
  'E451': { name: 'Triphosphates', category: 'Emulsifier', verdict: 'moderate', who: 'Same phosphate ADI applies. High intake linked to bone density reduction.',                        what: 'Phosphate salt mixture.', does: 'Improves water retention in meat products and emulsifies processed food.' },
  'E460': { name: 'Cellulose', category: 'Bulking Agent / Anti-caking', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Inert plant fibre; not absorbed by the body.',              what: 'Plant fibre from wood pulp or cotton.', does: 'Adds bulk, prevents caking in grated cheese, and acts as a fat replacer.' },
  'E471': { name: 'Mono- and Diglycerides of Fatty Acids', category: 'Emulsifier', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. May contain trace trans fats depending on the source oil.', what: 'Emulsifiers derived from fats and glycerol.', does: 'Keeps bread soft and moist; prevents oil-water separation in margarine.' },
  'E472E': { name: 'Diacetyl Tartaric Acid Esters (DATEM)', category: 'Emulsifier', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Safe at normal food levels.',                what: 'Emulsifier made from tartaric acid and fatty acids.', does: 'Strengthens bread dough and improves volume in baked goods.' },
  'E476': { name: 'Polyglycerol Polyricinoleate (PGPR)', category: 'Emulsifier', verdict: 'moderate', who: 'WHO/JECFA ADI: 7.5 mg/kg/day. Safe; often used to reduce cocoa butter content in cheap chocolate.', what: 'Synthetic emulsifier derived from castor oil and glycerol.', does: 'Reduces viscosity of chocolate allowing less cocoa butter to be used.' },
  'E481': { name: 'Sodium Stearoyl Lactylate (SSL)', category: 'Emulsifier', verdict: 'moderate', who: 'WHO/JECFA ADI: 20 mg/kg/day. Generally considered safe.',                        what: 'Emulsifier and dough conditioner derived from stearic acid.', does: 'Keeps bread soft, improves dough strength, and extends shelf life.' },

  // ── Flavour Enhancers ────────────────────────────────────────────────────
  'E620': { name: 'Glutamic Acid', category: 'Flavour Enhancer', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Glutamate occurs naturally in protein-rich foods.',             what: 'An amino acid naturally found in meat, cheese, and tomatoes.', does: 'Enhances savoury (umami) flavour in food.' },
  'E621': { name: 'Monosodium Glutamate (MSG)', category: 'Flavour Enhancer', verdict: 'concern', who: 'WHO/JECFA ADI: not specified. Considered safe; "MSG symptom complex" not confirmed in controlled studies. Some people report sensitivity.', what: 'The sodium salt of glutamic acid — a common flavour enhancer.', does: 'Intensifies savoury, meaty (umami) taste in processed food.' },
  'E627': { name: 'Disodium Guanylate', category: 'Flavour Enhancer', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Often used with MSG to amplify umami. Not suitable for people with gout.', what: 'Nucleotide derived from dried fish or yeast.', does: 'Amplifies savoury flavour; typically used alongside MSG.' },
  'E631': { name: 'Disodium Inosinate', category: 'Flavour Enhancer', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Not suitable for people with gout or hyperuricaemia.',    what: 'Nucleotide derived from meat or fish.', does: 'Enhances savoury flavour in crisps, instant noodles, and soups.' },
  'E635': { name: 'Disodium Ribonucleotides', category: 'Flavour Enhancer', verdict: 'concern', who: 'WHO/JECFA ADI: not specified. Combination of E627+E631; not suitable for gout sufferers.',   what: 'A blend of guanylate and inosinate nucleotides.', does: 'Potently enhances umami taste — often indicates a highly processed product.' },

  // ── Sweeteners ───────────────────────────────────────────────────────────
  'E950': { name: 'Acesulfame K (Ace-K)', category: 'Sweetener', verdict: 'concern', who: 'WHO/JECFA ADI: 15 mg/kg/day. 2023 WHO guideline advises against using non-sugar sweeteners for weight control long-term.', what: 'Synthetic calorie-free sweetener 200× sweeter than sugar.', does: 'Replaces sugar to reduce calories; often blended with other sweeteners.' },
  'E951': { name: 'Aspartame', category: 'Sweetener', verdict: 'concern', who: 'IARC classified aspartame as Group 2B (possibly carcinogenic) in 2023. WHO/JECFA ADI remains 40 mg/kg/day. 2023 WHO guideline advises against long-term use.', what: 'Synthetic low-calorie sweetener made from two amino acids.', does: 'Provides sweetness without calories in diet drinks, gum, and yoghurt.' },
  'E952': { name: 'Cyclamate', category: 'Sweetener', verdict: 'avoid', who: 'Banned by the FDA in the US since 1969 (suspected carcinogen). Permitted in the EU. IARC Group 3.', what: 'Synthetic sweetener 30× sweeter than sugar.', does: 'Sweetens food and drinks without calories.' },
  'E954': { name: 'Saccharin', category: 'Sweetener', verdict: 'concern', who: 'WHO/JECFA ADI: 5 mg/kg/day. Previously listed as possible carcinogen; IARC moved to Group 3 (not classifiable). 2023 WHO guideline advises against long-term use.', what: 'One of the oldest synthetic sweeteners; 300× sweeter than sugar.', does: 'Provides intense sweetness with no calories.' },
  'E955': { name: 'Sucralose', category: 'Sweetener', verdict: 'concern', who: 'WHO/JECFA ADI: 15 mg/kg/day. 2023 WHO guideline advises against using sweeteners for weight control. Some studies suggest gut microbiome effects.', what: 'Synthetic sweetener made from modified sugar; 600× sweeter.', does: 'Sweetens food and drinks without calories — marketed as Splenda.' },
  'E960': { name: 'Steviol Glycosides (Stevia)', category: 'Sweetener', verdict: 'good', who: 'WHO/JECFA ADI: 4 mg/kg/day. Natural origin; 2023 WHO guideline still advises against using sweeteners for weight control.', what: 'Natural zero-calorie sweetener from the Stevia rebaudiana plant.', does: 'Provides intense sweetness with no calories; used in drinks and reduced-sugar products.' },
  'E965': { name: 'Maltitol', category: 'Sweetener', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Laxative effect above 40 g/day; label must warn of this.',               what: 'Sugar alcohol derived from maltose.', does: 'Sweetens chocolate and confectionery with about half the calories of sugar.' },
  'E967': { name: 'Xylitol', category: 'Sweetener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Does not raise blood glucose. Beneficial for dental health. Toxic to dogs.', what: 'Sugar alcohol found naturally in birch bark and some fruits.', does: 'Sweetens with no blood sugar spike; protects teeth against cavities.' },
  'E968': { name: 'Erythritol', category: 'Sweetener', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Almost fully absorbed and excreted unchanged — very low laxative effect. Generally well-tolerated.', what: 'Naturally occurring sugar alcohol found in fruit and fermented foods.', does: 'Provides near-zero calories with minimal effect on blood sugar or digestion.' },

  // ── Misc ─────────────────────────────────────────────────────────────────
  'E500': { name: 'Sodium Carbonates (Baking Soda)', category: 'Leavening Agent', verdict: 'good', who: 'GRAS (FDA). Sodium content contributes to daily sodium — relevant for those limiting salt intake.', what: 'Sodium bicarbonate and related salts.', does: 'Leavens baked goods by releasing CO₂ when heated; also controls acidity.' },
  'E503': { name: 'Ammonium Carbonates', category: 'Leavening Agent', verdict: 'moderate', who: 'WHO/JECFA ADI: not specified. Traditional leavening agent; safe at food levels.',        what: 'Ammonium salt used as a leavening agent.', does: 'Produces gas that makes biscuits and cookies rise.' },
  'E551': { name: 'Silicon Dioxide (Silica)', category: 'Anti-caking Agent', verdict: 'good', who: 'WHO/JECFA ADI: not specified at normal food levels. No safety concerns with food-grade silica.', what: 'Fine mineral powder (sand) used to prevent clumping.', does: 'Keeps powdered ingredients like salt and spice mixes free-flowing.' },
  'E553B': { name: 'Talc', category: 'Anti-caking Agent', verdict: 'concern', who: 'IARC Group 3. Concerns exist about cosmetic-grade talc; food-grade talc is regulated more strictly.',  what: 'Magnesium silicate mineral powder.', does: 'Prevents powders from clumping; used as a coating on rice and confectionery.' },
  'E901': { name: 'Beeswax', category: 'Glazing Agent', verdict: 'good', who: 'WHO/JECFA ADI: not specified. Natural wax; well-tolerated but not vegan.',                                 what: 'Natural wax produced by honeybees.', does: 'Coats confectionery and fruit to give a shiny finish and extend shelf life.' },
  'E903': { name: 'Carnauba Wax', category: 'Glazing Agent', verdict: 'good', who: 'WHO/JECFA ADI: 7 mg/kg/day. Natural plant wax from Brazilian palm trees.',                           what: 'Natural hard wax from the leaves of the carnauba palm.', does: 'Glazes sweets, chocolate, and pharmaceuticals with a bright shine.' },
  'E950A': { name: 'Acesulfame K', category: 'Sweetener', verdict: 'concern', who: 'Same as E950.', what: 'See E950.', does: 'Synthetic calorie-free sweetener.' },
};

/**
 * Get information about a food additive by its E-number code.
 * Checks Turso cache first; saves after first lookup.
 */
export const getAdditiveInfo = async (eCode) => {
  const key = eCode.toUpperCase().trim();

  // Step 1: Check Turso cache
  try {
    const cached = await getIngredientInfoFromTurso(`additive:${key}`);
    if (cached && cached.whatItIs) {
      return { ...cached, code: key };
    }
  } catch { /* fall through */ }

  // Step 2: Look up local database
  const data = ADDITIVE_DB[key] || ADDITIVE_DB[key.replace(/\s/g, '')] || null;

  const info = data ? {
    name: data.name,
    code: key,
    category: data.category,
    whatItIs: data.what,
    whatItDoes: data.does,
    healthVerdict: data.verdict,
    whoSays: data.who,
    source: 'WHO/JECFA + EFSA/FDA Additive Database',
  } : {
    name: key,
    code: key,
    category: 'Food Additive',
    whatItIs: `${key} is a regulated food additive. Consult the EFSA or FDA database for full details.`,
    whatItDoes: 'Function in this product is not listed in our current database.',
    healthVerdict: 'moderate',
    whoSays: 'No specific WHO/JECFA classification found in our database for this additive.',
    source: 'WHO/JECFA + EFSA/FDA Additive Database',
  };

  // Step 3: Save to Turso (fire-and-forget)
  saveIngredientInfoToTurso({ ...info, name: `additive:${key}` }).catch(() => {});

  return info;
};

export const usdaAPI = {
  searchFood,
  searchFoodEnhanced,
  getFoodById,
  extractNutritionData,
  getIngredientInfo,
  getAdditiveInfo,
};

export default usdaAPI;
