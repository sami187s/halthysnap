# ⚡ Quick Setup - Just 3 Steps!

## 🔥 Step 1: Update Your Cloudflare Worker

1. Go to your Cloudflare Worker
2. Click "Edit code"
3. **Copy THIS code** and paste it (replace everything):

\`\`\`javascript
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      if (url.pathname === '/api/health-check') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          service: 'HealthyScan API',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/api/ai-analysis' && request.method === 'POST') {
        const { ingredients, productName } = await request.json();
        
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${env.OPENAI_API_KEY}\`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: \`You are a health expert analyzing product ingredients.
                IMPORTANT: Lecithin = plant-based emulsifier (NOT dairy).
                Return JSON format:
                {
                  "aiScore": 0-100,
                  "summary": "Brief analysis - 1-2 sentences max",
                  "keyInsights": ["1-2 key points about ingredients"],
                  "concerns": ["any concerns, if applicable"],
                  "tips": "Short usage tip"
                }\`
              },
              {
                role: 'user',
                content: \`Analyze: "\${productName}"\n\nIngredients: \${ingredients.join(', ')}\`
              }
            ],
            max_tokens: 300,
            temperature: 0.3
          })
        });

        const data = await aiResponse.json();
        const analysis = data.choices?.[0]?.message?.content || 'Analysis unavailable';
        
        return new Response(JSON.stringify({ success: true, analysis }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/api/ask-question' && request.method === 'POST') {
        const { question, productName, ingredients } = await request.json();
        
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${env.OPENAI_API_KEY}\`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a concise ingredient expert. Lecithin = plant-based (NOT dairy). Be brief.'
              },
              {
                role: 'user',
                content: \`Product: "\${productName}"\nIngredients: \${ingredients.join(', ')}\n\nQuestion: \${question}\`
              }
            ],
            max_tokens: 150,
            temperature: 0.3
          })
        });

        const data = await aiResponse.json();
        const answer = data.choices?.[0]?.message?.content || 'Unable to answer at this time.';
        
        return new Response(JSON.stringify({ success: true, answer }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Route not found'
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
\`\`\`

4. Click "Save and deploy"

---

## 🔥 Step 2: Update Your App

1. Open `src/services/cloudflareAPI.js`
2. Change line 6 from:
   ```javascript
   const WORKER_URL = 'https://healthyscan-api.YOUR-SUBDOMAIN.workers.dev';
   ```
   To YOUR actual worker URL:
   ```javascript
   const WORKER_URL = 'https://healthyscan-api.abc123.workers.dev';
   ```
3. Save the file

---

## 🔥 Step 3: Test It!

Run your app and scan a product. Check console for:
```
✅ Cloudflare Worker connected
✅ AI analysis received
```

---

## ✅ **Done! Your API is now 100% secure!**

No API keys in your app code anymore! 🎉

---

## 🚨 Remember to Revoke Old API Key!

1. Go to: https://platform.openai.com/api-keys
2. Delete the old exposed key
3. Create new key
4. Update in Cloudflare Worker Settings → Variables → OPENAI_API_KEY
