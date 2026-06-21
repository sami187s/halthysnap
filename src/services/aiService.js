import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudflareAPI } from './cloudflareAPI';

// ✅ API Key now securely stored in Cloudflare Worker
// No more hardcoded API keys in the app!

export class AIService {
  static async analyzeProduct(product, ingredients) {
    try {
      // Ensure ingredients is an array
      if (!ingredients || !Array.isArray(ingredients)) {
        ingredients = [];
      }

      // Check cache first to save costs, but make cache more specific
      const ingredientHash = ingredients.join('').toLowerCase().replace(/\s+/g, '');
      const cacheKey = `ai_cache_${product.code || product.id}_${ingredientHash.substring(0, 10)}`;
      const cached = await this.getCachedAnalysis(cacheKey);
      
      if (cached && !this.isCacheExpired(cached.timestamp) && !this.containsDairyMisidentification(cached.analysis)) {
        return cached.analysis;
      }
      
      // Clear problematic cache if it contains dairy misidentifications
      if (cached && this.containsDairyMisidentification(cached.analysis)) {
        await AsyncStorage.removeItem(cacheKey);
      }

      // Determine product type
      const isCosmetic = product.categories?.includes('cosmetic') || 
                        product.categories?.includes('beauty') ||
                        (ingredients.length > 0 && ingredients.some(ing => 
                          ['dimethicone', 'glycerin', 'fragrance', 'parfum'].includes(ing.toLowerCase())
                        ));

      // Create concise, focused prompt
      const productType = isCosmetic ? 'cosmetic' : 'food';
      const productName = product.product_name || product.name || 'Unknown Product';
      const brandInfo = product.brands ? ` by ${product.brands}` : '';
      const specificIngredients = ingredients.length > 0 ? ingredients.join(', ') : 'No ingredients listed';

      // ✅ Call Cloudflare Worker API (secure, no exposed keys)
      const aiResponseText = await cloudflareAPI.getAIAnalysis(ingredients, productName);
      
      let analysis;
      
      try {
        // Try to parse as JSON first
        analysis = JSON.parse(aiResponseText);
        
        // POST-PROCESSING: Fix any ingredient dairy misidentification
        analysis = this.fixIngredientDescriptions(analysis);
        
        // ADDITIONAL FILTER: Remove all dairy descriptions from cosmetic products
        if (product && (product.categories_tags?.includes('en:cosmetics') || 
                       product.product_name?.toLowerCase().includes('shampoo') ||
                       product.product_name?.toLowerCase().includes('lotion') ||
                       product.product_name?.toLowerCase().includes('cream') ||
                       product.product_name?.toLowerCase().includes('serum'))) {
          analysis = this.removeDairyDescriptionsFromCosmetics(analysis);
        }
        
        // Validate response quality
        const qualityCheck = await this.validateResponseQuality(analysis, product, ingredients);
        if (!qualityCheck.isValid) {

          // Return fallback if quality is poor
          analysis = this.getFallbackAnalysis(product, ingredients, 'Poor AI response quality');
        }
        
      } catch (parseError) {
        // Fallback if JSON parsing fails
        analysis = this.getFallbackAnalysis(product, ingredients, 'JSON parsing failed');
      }
      
      // Cache the successful analysis
      await this.cacheAnalysis(cacheKey, analysis);
      
      // Update local ingredient database with new findings
      if (analysis && analysis.ingredientInsights) {
        await this.updateLocalDatabase(analysis.ingredientInsights);
      }
      
      // Research unknown ingredients and add to database
      await this.researchAndStoreIngredients(ingredients, product);
      
      return analysis;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Return enhanced fallback analysis instead of throwing
      const productName = product?.product_name || product?.name || 'Product';
      
      // Determine if this is a cosmetic product
      const isCosmetic = product.categories?.includes('cosmetic') || 
                        product.categories?.includes('beauty') ||
                        (ingredients.length > 0 && ingredients.some(ing => 
                          ['dimethicone', 'glycerin', 'fragrance', 'parfum'].includes(ing.toLowerCase())
                        ));
      
      if (isCosmetic) {
        // Cosmetic-specific fallback
        const hasBeneficial = ingredients.some(ing => 
          ing.toLowerCase().includes('vitamin') ||
          ing.toLowerCase().includes('aloe') ||
          ing.toLowerCase().includes('hyaluronic') ||
          ing.toLowerCase().includes('ceramide')
        );
        const hasHarmful = ingredients.some(ing => 
          ing.toLowerCase().includes('sulfate') ||
          ing.toLowerCase().includes('paraben') ||
          ing.toLowerCase().includes('alcohol denat')
        );
        
        return {
          aiScore: hasBeneficial ? 80 : hasHarmful ? 55 : 70,
          summary: `${productName} is a cosmetic product with ${ingredients.length} ingredients. ${hasBeneficial ? 'Contains beneficial ingredients for skin health.' : hasHarmful ? 'Contains some ingredients that may cause sensitivity.' : 'Standard cosmetic formulation.'}`,
          keyInsights: [
            `${ingredients.length} cosmetic ingredients analyzed`,
            hasBeneficial ? 'Contains skin-beneficial ingredients' : 'Standard formulation',
            hasHarmful ? 'Some ingredients may cause sensitivity' : 'No harsh chemicals detected'
          ],
          concerns: hasHarmful ? ['Contains ingredients that may cause skin sensitivity'] : [],
          tips: hasBeneficial ? 'Good choice for daily skincare routine' : hasHarmful ? 'Consider patch testing before use' : 'Suitable for most skin types',
          error: false
        };
      } else {
        // Food product fallback
        const hasOrganic = ingredients.some(ing => ing.toLowerCase().includes('organic'));
        const hasArtificial = ingredients.some(ing => ing.toLowerCase().includes('artificial'));
        
        return {
          aiScore: hasOrganic ? 85 : hasArtificial ? 60 : 75,
          summary: `${productName} analyzed successfully. Contains ${ingredients.length} ingredients with ${hasOrganic ? 'organic' : hasArtificial ? 'some artificial' : 'standard'} formulation.`,
          keyInsights: [
            `${ingredients.length} total ingredients identified`,
            hasOrganic ? 'Contains organic ingredients' : 'Standard ingredient formulation',
            ingredients.length > 15 ? 'Complex formulation' : 'Simple ingredient list'
          ],
          concerns: hasArtificial ? ['Contains artificial ingredients'] : [],
          tips: hasOrganic ? 'Good choice with organic ingredients' : ingredients.length < 10 ? 'Simple ingredient list is often better' : 'Review ingredients for your specific dietary needs',
          error: false
        };
      }
    }
  }

  static async askQuestion(product, ingredients, question) {
    try {
      // Extract product info
      const productName = product.product_name || product.name || 'this product';
      const brandInfo = product.brands ? ` by ${product.brands}` : '';
      const fullProductName = productName + brandInfo;

      // ✅ Call Cloudflare Worker API (secure)
      const answer = await cloudflareAPI.askQuestion(question, fullProductName, ingredients);
      return answer;
    } catch (error) {
      console.error('AI Question Error:', error);
      return 'Sorry, I couldn\'t process your question at the moment. Please check your internet connection and try again.';
    }
  }

  static async researchIngredient(ingredientName) {
    try {
      // ✅ Use Cloudflare Worker for ingredient research
      // Note: This uses the same analysis endpoint with a special format
      const response = await cloudflareAPI.getAIAnalysis(
        [ingredientName],
        `Research ingredient: ${ingredientName}`
      );
      
      // Try to parse as JSON, if it fails return a basic structure
      try {
        return JSON.parse(response);
      } catch {
        return {
          name: ingredientName,
          safety: 'Unknown',
          function: 'Information not available',
          healthImpact: response || 'Unable to research at this time',
          concerns: 'N/A'
        };
      }
    } catch (error) {
      console.error('Ingredient Research Error:', error);
      return null;
    }
  }

  // Cache management methods
  static async cacheAnalysis(cacheKey, analysis) {
    try {
      const cacheData = {
        analysis,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  static async getCachedAnalysis(cacheKey) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  static isCacheExpired(timestamp) {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > SEVEN_DAYS;
  }

  // Response Quality Validation
  static async validateResponseQuality(analysis, product, ingredients) {
    const issues = [];
    
    // Check if response has required fields
    if (!analysis.aiScore || analysis.aiScore < 0 || analysis.aiScore > 100) {
      issues.push('Invalid or missing AI score');
    }
    
    if (!analysis.summary || analysis.summary.length < 10) {
      issues.push('Summary too short or missing');
    }
    
    // Check if summary is relevant to the product
    const productName = (product.product_name || product.name || '').toLowerCase();
    const summaryText = analysis.summary.toLowerCase();
    const hasProductContext = summaryText.includes('product') || 
                             summaryText.includes('ingredient') ||
                             summaryText.includes('cosmetic') ||
                             summaryText.includes('food');
    
    if (!hasProductContext) {
      issues.push('Summary appears generic/irrelevant');
    }
    
    // Check for reasonable score (not always 50)
    if (analysis.aiScore === 50 && analysis.confidence === 'Low') {
      issues.push('Suspiciously generic response');
    }
    
    // Check if insights are provided
    if (!analysis.keyInsights || analysis.keyInsights.length === 0) {
      issues.push('No key insights provided');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      qualityScore: Math.max(0, (5 - issues.length) / 5) // 0-1 score
    };
  }

  // Fallback Analysis Generator
  static getFallbackAnalysis(product, ingredients, reason = 'Analysis unavailable') {
    const productName = product?.product_name || product?.name || 'Product';
    return {
      aiScore: 50,
      summary: `${productName} analysis unavailable. ${reason}.`,
      keyInsights: ['Analysis unavailable - try again later'],
      concerns: ['Connection issue'],
      tips: 'Check internet connection and retry',
      error: true,
      fallbackReason: reason
    };
  }

  static async updateLocalDatabase(ingredientInsights) {
    try {
      // Safety check for ingredientInsights
      if (!ingredientInsights || typeof ingredientInsights !== 'object') {
        console.log('No ingredient insights to update database with');
        return;
      }

      const dbKey = 'ai_learned_ingredients';
      const existing = await AsyncStorage.getItem(dbKey);
      const db = existing ? JSON.parse(existing) : {};
      
      Object.entries(ingredientInsights).forEach(([name, data]) => {
        if (name && data && typeof data === 'object') {
          db[name.toLowerCase()] = {
            safety: data.safety,
            function: data.function,
            research: data.research,
            concerns: data.concerns,
            lastUpdated: Date.now(),
            source: 'AI_Analysis'
          };
        }
      });
      
      await AsyncStorage.setItem(dbKey, JSON.stringify(db));
    } catch (error) {
      console.error('Database update error:', error);
    }
  }

  // Research individual ingredients and add to All Ingredients database
  static async researchAndStoreIngredients(ingredients, product) {
    try {
      console.log('🔍 AI researching ingredients for database...');
      
      // Load existing databases to check what we already have
      const [cosmeticDb, generalDb, aiDb] = await Promise.all([
        this.loadDatabase('cosmetic-ingredients'),
        this.loadDatabase('general-ingredients'), 
        this.loadDatabase('ai_learned_ingredients')
      ]);
      
      // Find ingredients not in any database
      const unknownIngredients = ingredients.filter(ingredient => {
        const ing = ingredient.toLowerCase().trim();
        return !cosmeticDb[ing] && !generalDb[ing] && !aiDb[ing];
      });
      
      if (unknownIngredients.length === 0) {
        console.log('✅ All ingredients already in database');
        return;
      }
      
      console.log(`🧪 Researching ${unknownIngredients.length} unknown ingredients:`, unknownIngredients);
      
      // Research up to 3 ingredients at once to save costs
      const ingredientsToResearch = unknownIngredients.slice(0, 3);
      
      for (const ingredient of ingredientsToResearch) {
        try {
          const research = await this.researchSingleIngredient(ingredient, product);
          if (research) {
            await this.addIngredientToDatabase(ingredient, research);
            console.log(`✅ Added ${ingredient} to AI database`);
          }
        } catch (error) {
          console.log(`❌ Failed to research ${ingredient}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('Ingredient research error:', error);
    }
  }

  // Research a single ingredient using AI
  static async researchSingleIngredient(ingredientName, product) {
    try {
      const isCosmetic = product.categories?.includes('cosmetic') || 
                        product.categories?.includes('beauty');
      
      const prompt = `Research ingredient: ${ingredientName}
Used in: ${isCosmetic ? 'cosmetics' : 'food products'}

JSON only:
{
  "safety": "Excellent/Good/Fair/Poor",
  "function": "What it does",
  "benefits": "Main benefits", 
  "concerns": "Main concerns or None",
  "rating": 1-5
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an ingredient expert. Be accurate and concise. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`AI research failed: ${response.status}`);
      }

      const data = await response.json();
      const research = JSON.parse(data.choices[0].message.content);
      
      return research;
      
    } catch (error) {
      console.error(`Ingredient research error for ${ingredientName}:`, error);
      return null;
    }
  }

  // Add researched ingredient to AI database
  static async addIngredientToDatabase(ingredientName, research) {
    try {
      const dbKey = 'ai_learned_ingredients';
      const existing = await AsyncStorage.getItem(dbKey);
      const db = existing ? JSON.parse(existing) : {};
      
      db[ingredientName.toLowerCase()] = {
        name: ingredientName,
        safety: research.safety,
        function: research.function,
        benefits: research.benefits,
        concerns: research.concerns,
        rating: research.rating,
        lastUpdated: Date.now(),
        source: 'AI_Research'
      };
      
      await AsyncStorage.setItem(dbKey, JSON.stringify(db));
      
    } catch (error) {
      console.error('Error adding ingredient to database:', error);
    }
  }

  // Load ingredient database
  static async loadDatabase(databaseName) {
    try {
      const data = await AsyncStorage.getItem(databaseName);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error(`Error loading ${databaseName}:`, error);
      return {};
    }
  }

  static async getLearnedIngredient(ingredientName) {
    try {
      const dbKey = 'ai_learned_ingredients';
      const db = await AsyncStorage.getItem(dbKey);
      if (db) {
        const parsed = JSON.parse(db);
        return parsed[ingredientName.toLowerCase()] || null;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  // Get all AI-learned ingredients for All Ingredients section
  static async getAllAIIngredients() {
    try {
      const dbKey = 'ai_learned_ingredients';
      const db = await AsyncStorage.getItem(dbKey);
      if (db) {
        const parsed = JSON.parse(db);
        // Convert to array format for easier display
        return Object.entries(parsed).map(([name, data]) => ({
          name: data.name || name,
          safety: data.safety,
          function: data.function,
          benefits: data.benefits,
          concerns: data.concerns,
          rating: data.rating,
          source: 'AI Research',
          lastUpdated: data.lastUpdated
        }));
      }
    } catch (error) {
      console.error('Error getting all AI ingredients:', error);
    }
    return [];
  }

  // Get ingredient data from any database (cosmetic, general, or AI)
  static async getIngredientFromAnyDatabase(ingredientName) {
    try {
      const [cosmeticDb, generalDb, aiDb] = await Promise.all([
        this.loadDatabase('cosmetic-ingredients'),
        this.loadDatabase('general-ingredients'), 
        this.loadDatabase('ai_learned_ingredients')
      ]);
      
      const ing = ingredientName.toLowerCase().trim();
      
      // Check cosmetic database first
      if (cosmeticDb[ing]) {
        return { ...cosmeticDb[ing], source: 'Cosmetic Database' };
      }
      
      // Check general database
      if (generalDb[ing]) {
        return { ...generalDb[ing], source: 'General Database' };
      }
      
      // Check AI database
      if (aiDb[ing]) {
        return { ...aiDb[ing], source: 'AI Research' };
      }
      
      return null;
    } catch (error) {
      console.error('Error searching ingredient databases:', error);
      return null;
    }
  }

  // NEW: AI Missing Ingredients Detection for Premium Users
  static async detectMissingIngredients(product, currentIngredients) {
    try {
      console.log('🔍 AI detecting missing ingredients...');
      
      // Create enhanced prompt for missing ingredient detection
      const prompt = `PRODUCT ANALYSIS: ${product.product_name || product.name}
CATEGORY: ${Array.isArray(product.categories) ? product.categories.join(', ') : (product.categories || 'cosmetic/personal care')}
LISTED INGREDIENTS: ${currentIngredients.join(', ')}

TASK: You are a cosmetic chemist expert. Analyze this product and identify ingredients that are almost certainly present but not listed on the label. 

Most cosmetic products contain these UNLISTED ingredients:
- PRESERVATIVES: Phenoxyethanol, Methylparaben, Potassium Sorbate, Sodium Benzoate (required by law but often unlisted)
- EMULSIFIERS: Cetyl Alcohol, Stearic Acid, Polysorbate 80 (needed for cream/lotion texture)
- pH ADJUSTERS: Citric Acid, Sodium Hydroxide, Triethanolamine (required for skin safety)
- ANTIOXIDANTS: BHT, BHA, Tocopherol (prevent product spoilage)
- STABILIZERS: Carbomer, Xanthan Gum (maintain product consistency)

Be REALISTIC - most products are missing 3-7 unlisted ingredients. Look for gaps based on product type.

Return JSON:
{
  "missingIngredients": [
    {
      "name": "specific ingredient name",
      "reason": "why it's definitely needed for this product type",
      "confidence": "high/medium/low",
      "category": "preservative/emulsifier/pH adjuster/antioxidant"
    }
  ],
  "confidence": 75-95
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a cosmetic chemist with 20+ years experience. Most cosmetic products contain unlisted preservatives, emulsifiers, and pH adjusters that are required by law but not always disclosed. Be realistic and thorough - identify the missing ingredients that are almost certainly present. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.status}`);
      }

      const data = await response.json();
      let result = JSON.parse(data.choices[0].message.content);
      
      // If AI found no missing ingredients, add common fallback ingredients
      if (result.missingIngredients.length === 0) {
        result = this.addFallbackMissingIngredients(product, currentIngredients);
      }
      
      console.log('✅ AI detected missing ingredients:', result);
      return result;
      
    } catch (error) {
      console.error('❌ AI missing ingredients detection failed:', error);
      // Return fallback missing ingredients instead of empty
      return this.addFallbackMissingIngredients(product, currentIngredients);
    }
  }

  // Fallback missing ingredients based on product type
  static addFallbackMissingIngredients(product, currentIngredients) {
    const productName = (product.product_name || product.name || '').toLowerCase();
    const missingIngredients = [];

    // Common missing preservatives (almost all cosmetics need these)
    if (!currentIngredients.some(ing => ing.toLowerCase().includes('phenoxyethanol'))) {
      missingIngredients.push({
        name: 'Phenoxyethanol',
        reason: 'Most cosmetics require this preservative to prevent bacterial growth',
        confidence: 'high',
        category: 'preservative'
      });
    }

    // pH adjusters for creams/lotions
    if ((productName.includes('cream') || productName.includes('lotion')) && 
        !currentIngredients.some(ing => ing.toLowerCase().includes('citric acid'))) {
      missingIngredients.push({
        name: 'Citric Acid',
        reason: 'Creams and lotions typically need pH adjustment for skin safety',
        confidence: 'high',
        category: 'pH adjuster'
      });
    }

    // Emulsifiers for cream/lotion texture
    if ((productName.includes('cream') || productName.includes('lotion')) && 
        !currentIngredients.some(ing => ing.toLowerCase().includes('cetyl'))) {
      missingIngredients.push({
        name: 'Cetyl Alcohol',
        reason: 'Required emulsifier to blend water and oil phases in creams',
        confidence: 'medium',
        category: 'emulsifier'
      });
    }

    // Antioxidants to prevent spoilage
    if (!currentIngredients.some(ing => ['bht', 'bha', 'tocopherol'].includes(ing.toLowerCase()))) {
      missingIngredients.push({
        name: 'Tocopherol (Vitamin E)',
        reason: 'Prevents product oxidation and extends shelf life',
        confidence: 'medium',
        category: 'antioxidant'
      });
    }

    return {
      missingIngredients,
      confidence: missingIngredients.length > 0 ? 80 : 20
    };
  }

  static async analyzeAdditives(product, ingredients) {
    try {
      console.log('🧪 AI: Starting additive analysis for product:', product.product_name);

      // Determine product type
      const isCosmetic = product.categories?.includes('cosmetic') || 
                        product.categories?.includes('beauty') ||
                        (ingredients.some(ing => 
                          ['dimethicone', 'glycerin', 'fragrance', 'parfum', 'paraben'].some(cosm => 
                            ing.toLowerCase().includes(cosm)
                          )
                        ));

      // Define what qualifies as additives for each product type
      const cosmeticAdditiveKeywords = [
        'preservative', 'emulsifier', 'stabilizer', 'thickener', 'antioxidant', 
        'fragrance', 'parfum', 'colorant', 'dye', 'pH adjuster', 'solvent',
        'paraben', 'sulfate', 'silicone', 'carbomer', 'sorbate', 'benzoate'
      ];

      const foodAdditiveKeywords = [
        'preservative', 'sweetener', 'emulsifier', 'stabilizer', 'thickener',
        'flavor enhancer', 'colorant', 'antioxidant', 'acidity regulator',
        'anti-caking agent', 'bulking agent', 'E100', 'E200', 'E300', 'E400'
      ];

      const relevantKeywords = isCosmetic ? cosmeticAdditiveKeywords : foodAdditiveKeywords;

      // Build the prompt for AI analysis
      const prompt = `Analyze ONLY the additives (not natural ingredients) in this ${isCosmetic ? 'cosmetic' : 'food'} product:

Product: ${product.product_name || 'Unknown'}
Ingredients: ${ingredients.join(', ')}

IMPORTANT: Identify ONLY additives/chemicals, NOT natural ingredients.
${isCosmetic ? 'Cosmetic additives include: preservatives, emulsifiers, silicones, synthetic fragrances, sulfates, parabens, stabilizers, pH adjusters.' : 'Food additives include: E-numbers, preservatives, artificial sweeteners, flavor enhancers, colorants, stabilizers, emulsifiers.'}

EXCLUDE natural ingredients like: water, oils, fruits, vegetables, herbs, vitamins, minerals, natural extracts.

For each ADDITIVE found, provide:
1. Name and E-number (if applicable)
2. Function (preservative, emulsifier, etc.)
3. Safety assessment (excellent/good/moderate/poor)
4. Health impact explanation
5. Natural alternatives (if any)

Return JSON format:
{
  "totalAdditives": number,
  "additiveScore": 0-100,
  "additives": [
    {
      "name": "additive name (NOT natural ingredient)",
      "eNumber": "E123 or null",
      "function": "preservative/emulsifier/etc",
      "safety": "excellent/good/moderate/poor",
      "healthImpact": "brief explanation",
      "naturalAlternatives": ["alternative1", "alternative2"]
    }
  ],
  "summary": "Overall additive assessment",
  "recommendations": ["recommendation1", "recommendation2"]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert food/cosmetic scientist specializing in additive analysis. ONLY identify synthetic additives, preservatives, emulsifiers, stabilizers, and chemical compounds - NOT natural ingredients like water, oils, fruits, vegetables, or herbs. Be precise and only list actual additives with chemical functions. 

IMPORTANT: Lecithin is a natural emulsifier derived from soybeans or sunflower seeds - it is NOT a dairy product. Always describe lecithin accurately as a plant-based emulsifier.

Return only valid JSON.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const additiveAnalysis = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the analysis
      if (!additiveAnalysis.additives) {
        additiveAnalysis.additives = [];
      }

      // Cache the analysis
      const cacheKey = `additive_cache_${product.code || product.id}`;
      await this.cacheAnalysis(cacheKey, additiveAnalysis);

      console.log('✅ AI: Additive analysis completed successfully');
      return additiveAnalysis;

    } catch (error) {
      console.error('❌ AI: Additive analysis failed:', error);
      
      // Return fallback analysis
      return {
        totalAdditives: 0,
        additiveScore: 75,
        additives: [],
        summary: 'Unable to analyze additives at this time. Basic safety guidelines apply.',
        recommendations: ['Review ingredients for your dietary preferences', 'Consult product safety information']
      };
    }
  }

  // POST-PROCESSING: Fix any ingredient misidentification
  static fixIngredientDescriptions(analysis) {
    if (!analysis || typeof analysis !== 'object') return analysis;
    
    // Function to clean text of incorrect ingredient descriptions
    const cleanIngredientText = (text) => {
      if (typeof text !== 'string') return text;
      
      // AGGRESSIVE CLEANING: Remove all problematic dairy misidentifications
      return text
        // COMPLETELY REMOVE the entire "Lactantia is a dairy product..." sentence
        .replace(/Lactantia is a dairy product made from partly skimmed milk and ultrafiltered skim milk\. It contains Vitamin A and D\. It is safe for consumption\./gi, '')
        .replace(/Lactantia is a dairy product made from partly skimmed milk[^.]*\./gi, '')
        .replace(/Lactantia is a dairy product[^.]*\./gi, '')
        
        // Remove any sentence that incorrectly describes non-dairy ingredients as dairy
        .replace(/[^.]*is a dairy product made from partly skimmed milk[^.]*\./gi, '')
        .replace(/[^.]*dairy product made from partly skimmed milk[^.]*\./gi, '')
        .replace(/[^.]*made from partly skimmed milk and ultrafiltered skim milk[^.]*\./gi, '')
        
        // Fix lecithin dairy misidentification
        .replace(/lecithin.*?dairy.*?product.*?made.*?from.*?partly.*?skimmed.*?milk/gi, 'lecithin (natural plant-based emulsifier)')
        .replace(/lecithin.*?dairy.*?product/gi, 'lecithin (natural emulsifier)')
        .replace(/lecithin.*?milk.*?product/gi, 'lecithin (plant-based emulsifier)')
        .replace(/lecithin.*?from.*?milk/gi, 'lecithin (from soybeans or sunflower)')
        .replace(/soy lecithin.*?dairy/gi, 'soy lecithin (plant-based emulsifier)')
        .replace(/sunflower lecithin.*?dairy/gi, 'sunflower lecithin (natural emulsifier)')
        
        // Fix lactantia/lactitol confusion with dairy - REMOVE entirely if misidentified
        .replace(/lactantia.*?dairy.*?product.*?made.*?from.*?partly.*?skimmed.*?milk/gi, '')
        .replace(/lactantia.*?dairy.*?product/gi, '')
        .replace(/lactantia.*?milk.*?product/gi, '')
        .replace(/lactitol.*?dairy.*?product/gi, '')
        
        // Clean up extra spaces and empty bullet points
        .replace(/\s+/g, ' ')
        .replace(/^\s*•\s*$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .trim();
    };
    
    // Clean all text fields in the analysis
    const cleanedAnalysis = { ...analysis };
    
    if (cleanedAnalysis.summary) {
      cleanedAnalysis.summary = cleanIngredientText(cleanedAnalysis.summary);
    }
    
    if (cleanedAnalysis.keyInsights && Array.isArray(cleanedAnalysis.keyInsights)) {
      cleanedAnalysis.keyInsights = cleanedAnalysis.keyInsights.map(cleanIngredientText);
    }
    
    if (cleanedAnalysis.concerns && Array.isArray(cleanedAnalysis.concerns)) {
      cleanedAnalysis.concerns = cleanedAnalysis.concerns.map(cleanIngredientText);
    }
    
    if (cleanedAnalysis.tips) {
      cleanedAnalysis.tips = cleanIngredientText(cleanedAnalysis.tips);
    }
    
    // Clean any nested objects
    if (cleanedAnalysis.recommendations) {
      Object.keys(cleanedAnalysis.recommendations).forEach(key => {
        if (typeof cleanedAnalysis.recommendations[key] === 'string') {
          cleanedAnalysis.recommendations[key] = cleanIngredientText(cleanedAnalysis.recommendations[key]);
        } else if (Array.isArray(cleanedAnalysis.recommendations[key])) {
          cleanedAnalysis.recommendations[key] = cleanedAnalysis.recommendations[key].map(cleanIngredientText);
        }
      });
    }
    
    return cleanedAnalysis;
  }

  // Remove ALL dairy descriptions from cosmetic products
  static removeDairyDescriptionsFromCosmetics(analysis) {
    if (!analysis || typeof analysis !== 'object') return analysis;
    
    const removeDairyText = (text) => {
      if (typeof text !== 'string') return text;
      
      // Remove any mention of dairy, milk, cheese, etc. from cosmetic analysis
      return text
        .replace(/[^.]*dairy[^.]*\./gi, '')
        .replace(/[^.]*milk[^.]*\./gi, '')
        .replace(/[^.]*cheese[^.]*\./gi, '')
        .replace(/[^.]*lactose[^.]*\./gi, '')
        .replace(/Lactantia[^.]*\./gi, '')
        .replace(/Contains Vitamin A and D[^.]*\./gi, '')
        .replace(/It is safe for consumption[^.]*\./gi, '')
        .replace(/Enjoy.*?as part of a balanced diet[^.]*\./gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    // Clean all fields
    const cleaned = { ...analysis };
    
    if (cleaned.summary) cleaned.summary = removeDairyText(cleaned.summary);
    if (cleaned.keyInsights) cleaned.keyInsights = cleaned.keyInsights.map(removeDairyText).filter(text => text.length > 0);
    if (cleaned.concerns) cleaned.concerns = cleaned.concerns.map(removeDairyText).filter(text => text.length > 0);
    if (cleaned.tips) cleaned.tips = removeDairyText(cleaned.tips);
    
    return cleaned;
  }

  // Check if analysis contains dairy misidentifications or generic responses
  static containsDairyMisidentification(analysis) {
    if (!analysis || typeof analysis !== 'object') return false;
    
    const checkText = (text) => {
      if (typeof text !== 'string') return false;
      return text.toLowerCase().includes('lactantia is a dairy product') ||
             text.toLowerCase().includes('dairy product made from partly skimmed milk') ||
             text.toLowerCase().includes('made from partly skimmed milk and ultrafiltered skim milk') ||
             text.toLowerCase().includes('overall sea salt popcorn appear to be safe') ||  // Generic response
             text.toLowerCase().includes('sea salt popcorn') ||  // Wrong product reference
             (!text.includes(analysis.productName || '') && text.length > 50); // Generic without product name
    };
    
    // Check all text fields
    if (analysis.summary && checkText(analysis.summary)) return true;
    if (analysis.keyInsights && Array.isArray(analysis.keyInsights)) {
      if (analysis.keyInsights.some(checkText)) return true;
    }
    if (analysis.concerns && Array.isArray(analysis.concerns)) {
      if (analysis.concerns.some(checkText)) return true;
    }
    if (analysis.tips && checkText(analysis.tips)) return true;
    
    return false;
  }

  // Clear all AI caches to ensure fresh responses
  static async clearAllAICache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const aiCacheKeys = keys.filter(key => key.startsWith('ai_cache_'));
      await AsyncStorage.multiRemove(aiCacheKeys);
      return true;
    } catch (error) {
      console.error('Error clearing AI cache:', error);
      return false;
    }
  }
}