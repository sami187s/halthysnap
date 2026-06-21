// Cloudflare Worker API Service
// This service proxies all AI requests through your Cloudflare Worker
// to keep your API keys secure and hidden from the app

// ✅ Your Cloudflare Worker URL
const WORKER_URL = 'https://sparkling-haze-9896.primedialoguetechnologies.workers.dev';

export const cloudflareAPI = {
  /**
   * Test connection to Cloudflare Worker
   * @returns {Promise<Object>} Health check response
   */
  async testConnection() {
    try {
      console.log('Testing Cloudflare Worker connection...');
      const response = await fetch(`${WORKER_URL}/api/health-check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Cloudflare Worker connected:', data);
      return data;
    } catch (error) {
      console.error('❌ Cloudflare Worker connection error:', error);
      throw new Error(`Failed to connect to API: ${error.message}`);
    }
  },

  /**
   * Get AI analysis for product ingredients
   * @param {Array<string>} ingredients - Array of ingredient names
   * @param {string} productName - Name of the product
   * @returns {Promise<string>} AI analysis text
   */
  async getAIAnalysis(ingredients, productName) {
    try {
      console.log(`Requesting AI analysis for: ${productName}`);
      
      const response = await fetch(`${WORKER_URL}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: Array.isArray(ingredients) ? ingredients : [],
          productName: productName || 'Unknown Product'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      console.log('✅ AI analysis received');
      return data.analysis;
    } catch (error) {
      console.error('❌ AI Analysis error:', error);
      
      // Return graceful fallback
      return `AI analysis temporarily unavailable. Please try again later.\n\nError: ${error.message}`;
    }
  },

  /**
   * Ask AI a question about the product (chatbot)
   * @param {string} question - User's question
   * @param {string} productName - Name of the product
   * @param {Array<string>} ingredients - Array of ingredient names
   * @returns {Promise<string>} AI answer
   */
  async askQuestion(question, productName, ingredients) {
    try {
      console.log(`Asking AI: ${question}`);
      
      const response = await fetch(`${WORKER_URL}/api/ask-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question || 'Tell me about this product',
          productName: productName || 'Unknown Product',
          ingredients: Array.isArray(ingredients) ? ingredients : []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Question failed');
      }

      console.log('✅ AI answer received');
      return data.answer;
    } catch (error) {
      console.error('❌ AI Question error:', error);
      return 'Sorry, I couldn\'t process your question at the moment. Please check your internet connection and try again.';
    }
  },

  /**
   * Get the current worker URL (for debugging)
   * @returns {string} Worker URL
   */
  getWorkerURL() {
    return WORKER_URL;
  },

  /**
   * Check if worker URL is configured
   * @returns {boolean} True if URL is set
   */
  isConfigured() {
    return !WORKER_URL.includes('YOUR-SUBDOMAIN');
  },

  /**
   * General nutrition chatbot (for AI Nutritionist screen)
   * @param {string} message - User's message/question
   * @returns {Promise<string>} AI response
   */
  async chatbot(message) {
    try {
      console.log(`AI Nutritionist chat: ${message.substring(0, 50)}...`);
      
      // Use the nutrition chat endpoint with proper system prompt
      const response = await fetch(`${WORKER_URL}/api/nutrition-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          systemPrompt: 'You are a friendly, knowledgeable AI Nutritionist. Answer questions about nutrition, diet, healthy eating, meal planning, vitamins, minerals, macronutrients, weight management, and food health. Be conversational, supportive, and provide practical advice. Keep responses concise (2-4 sentences) unless asked for detail.'
        })
      });

      if (!response.ok) {
        // Fallback: try the ask-question endpoint if nutrition-chat doesn't exist
        console.log('⚠️ Nutrition chat endpoint not available, using fallback...');
        const fallbackResponse = await fetch(`${WORKER_URL}/api/ask-question`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: `As a nutritionist, please answer this question in a friendly, conversational way: ${message}`,
            productName: 'General Nutrition Consultation',
            ingredients: []
          })
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`API Error: ${fallbackResponse.status}`);
        }
        
        const fallbackData = await fallbackResponse.json();
        if (!fallbackData.success) {
          throw new Error(fallbackData.error || 'Chat failed');
        }
        console.log('✅ AI chatbot response received (fallback)');
        return fallbackData.answer;
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Chat failed');
      }

      console.log('✅ AI chatbot response received');
      return data.response || data.answer;
    } catch (error) {
      console.error('❌ AI Chatbot error:', error);
      return 'Sorry, I couldn\'t process your message at the moment. Please check your internet connection and try again.';
    }
  },

  /**
   * Analyze food image with optional text prompt
   * @param {string} imageUri - Local image URI
   * @param {string} prompt - Optional text prompt/question about the image
   * @returns {Promise<string>} AI analysis of the image
   */
  async analyzeImage(imageUri, prompt = '') {
    try {
      console.log(`Analyzing image with prompt: ${prompt || 'No prompt'}`);
      
      // Convert image to base64
      const base64 = await fetch(imageUri)
        .then(res => res.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      const response = await fetch(`${WORKER_URL}/api/ask-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: prompt || 'Analyze the nutritional content of this food image',
          productName: 'Food Image Analysis',
          ingredients: [],
          image: base64
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Image analysis failed');
      }

      console.log('✅ Image analysis received');
      return data.answer;
    } catch (error) {
      console.error('❌ Image analysis error:', error);
      return 'Sorry, I couldn\'t analyze the image at the moment. Please try uploading a clear photo of food or nutrition labels.';
    }
  }
};

export default cloudflareAPI;
