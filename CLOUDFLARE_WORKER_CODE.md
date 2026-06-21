# 🔧 Complete Cloudflare Worker Code

Copy and paste this ENTIRE code into your Cloudflare Worker editor:

\`\`\`javascript
export default {
  async fetch(request, env) {
    // Enable CORS for your React Native app
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      // Route: /api/health-check
      if (url.pathname === '/api/health-check') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          service: 'HealthyScan API',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        });
      }

      // Route: /api/ai-analysis (for product analysis)
      if (url.pathname === '/api/ai-analysis' && request.method === 'POST') {
        const { ingredients, productName } = await request.json();
        
        // Call OpenAI API with your secret key
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a health expert analyzing product ingredients for the HealthyScan app. 
                Provide clear, concise analysis focusing on:
                1. Key health insights
                2. Potential concerns
                3. Overall assessment
                Keep responses professional and avoid excessive emojis.
                
                IMPORTANT: Lecithin = plant-based emulsifier (NOT dairy).
                
                Return JSON format:
                {
                  "aiScore": 0-100,
                  "summary": "Brief analysis - 1-2 sentences max",
                  "keyInsights": ["1-2 key points about ingredients"],
                  "concerns": ["any concerns, if applicable"],
                  "tips": "Short usage tip"
                }`
              },
              {
                role: 'user',
                content: `Analyze: "${productName}"\n\nIngredients: ${ingredients.join(', ')}`
              }
            ],
            max_tokens: 300,
            temperature: 0.3
          })
        });

        const data = await aiResponse.json();
        
        // Extract the AI response
        const analysis = data.choices?.[0]?.message?.content || 'Analysis unavailable';
        
        return new Response(JSON.stringify({ 
          success: true, 
          analysis 
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        });
      }

      // Route: /api/ask-question (for chatbot)
      if (url.pathname === '/api/ask-question' && request.method === 'POST') {
        const { question, productName, ingredients } = await request.json();
        
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a concise ingredient expert. Keep answers short and specific to the product. Lecithin = plant-based (NOT dairy). Be informative but brief.'
              },
              {
                role: 'user',
                content: `Product: "${productName}"\nIngredients: ${ingredients.join(', ')}\n\nQuestion: ${question}`
              }
            ],
            max_tokens: 150,
            temperature: 0.3
          })
        });

        const data = await aiResponse.json();
        const answer = data.choices?.[0]?.message?.content || 'Unable to answer at this time.';
        
        return new Response(JSON.stringify({ 
          success: true, 
          answer 
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ 
        error: 'Route not found',
        availableRoutes: ['/api/health-check', '/api/ai-analysis', '/api/ask-question']
      }), { 
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: error.message 
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }
  }
};
\`\`\`

## 📋 Update Instructions:
1. Go to your Cloudflare Worker
2. Click "Edit code"
3. **DELETE ALL** existing code
4. **PASTE** the code above
5. Click "Save and deploy"
6. Your worker is now ready! ✅
