// api/chat.js - Enhanced version with Anthropic support (FIXED)
const { generateText } = require('ai');
const { createXai } = require('@ai-sdk/xai');

// Initialize Grok model
const grokModel = createXai({ apiKey: process.env.XAI_API_KEY })('grok-3');

// Initialize Anthropic (add this to your package.json: "@anthropic-ai/sdk": "latest")
let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('✅ Anthropic client initialized');
  } catch (error) {
    console.log('❌ Anthropic SDK not available:', error.message);
  }
}

module.exports = async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body (raw):', req.body);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request for:', req.url);
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.status(200).send('Enhanced Worldbuilding Backend is running!');
    return;
  }

  const normalizedUrl = req.url.split('?')[0].replace(/\/$/, '');
  console.log('Raw URL:', req.url);
  console.log('Normalized URL:', normalizedUrl);

  // Health check endpoint
  if (req.method === 'GET' && normalizedUrl === '/health') {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      apis: {
        grok: !!process.env.XAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY && !!anthropicClient,
        replicate: !!process.env.REPLICATE_API_KEY
      }
    };
    
    res.status(200).json(healthStatus);
    return;
  }

  // API status endpoint for debugging
  if (req.method === 'GET' && normalizedUrl === '/api-status') {
    const status = {
      grok: {
        available: !!process.env.XAI_API_KEY,
        model: 'grok-3'
      },
      anthropic: {
        available: !!process.env.ANTHROPIC_API_KEY && !!anthropicClient,
        model: 'claude-3-5-sonnet-20241022'
      },
      replicate: {
        available: !!process.env.REPLICATE_API_KEY
      }
    };
    
    res.status(200).json(status);
    return;
  }

  if (req.method === 'POST' && normalizedUrl === '/chat') {
    console.log('Matched /chat endpoint');
    try {
      const { 
        systemPrompt, 
        userMessage, 
        messages = [], 
        character, 
        useAnthropic = false,
        useGrok3 = true,
        temperature = 0.7 
      } = req.body;

      if (!systemPrompt || !userMessage) {
        res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
        return;
      }

      console.log(`Processing request for character: ${character || 'Unknown'}`);
      console.log(`API selection: ${useAnthropic ? 'Anthropic' : 'Grok'}`);

      let response;
      let apiUsed;

      // Use Anthropic for high-priority interactions
      if (useAnthropic && anthropicClient) {
        console.log('🔥 Using Anthropic API...');
        try {
          // Convert messages to Anthropic format
          const anthropicMessages = [];
          
          // Add conversation history
          messages.forEach(msg => {
            if (msg.role === 'user') {
              anthropicMessages.push({
                role: 'user',
                content: msg.content
              });
            } else if (msg.role === 'assistant') {
              anthropicMessages.push({
                role: 'assistant', 
                content: msg.content
              });
            }
          });
          
          // Add current user message
          anthropicMessages.push({
            role: 'user',
            content: userMessage
          });

          const anthropicResponse = await anthropicClient.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            temperature: temperature,
            system: systemPrompt,
            messages: anthropicMessages
          });

          response = anthropicResponse.content[0].text;
          apiUsed = 'anthropic';
          console.log('✅ Anthropic response received');
          
        } catch (anthropicError) {
          console.error('❌ Anthropic API failed:', anthropicError);
          // Fall back to Grok
          console.log('🔄 Falling back to Grok API...');
          
          const grokResponse = await generateText({
            model: grokModel,
            prompt: `${systemPrompt}\n\nConversation History:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${userMessage}\nAssistant:`,
            maxTokens: 1000,
            temperature: temperature,
          });
          
          response = grokResponse.text;
          apiUsed = 'grok_fallback';
        }
      } else {
        // Use Grok API (default)
        console.log('🤖 Using Grok API...');
        
        // Format the prompt for Grok
        let fullPrompt = systemPrompt;
        
        if (messages.length > 0) {
          fullPrompt += '\n\nConversation History:\n';
          fullPrompt += messages.map(msg => 
            `${msg.role === 'user' ? 'User' : (character || 'Assistant')}: ${msg.content}`
          ).join('\n');
        }
        
        fullPrompt += `\n\nUser: ${userMessage}\n${character || 'Assistant'}:`;

        const grokResponse = await generateText({
          model: grokModel,
          prompt: fullPrompt,
          maxTokens: 1000,
          temperature: temperature,
        });

        response = grokResponse.text;
        apiUsed = 'grok';
        console.log('✅ Grok response received');
      }

      // Clean up the response
      response = response.trim();
      
      // Remove any accidental name prefixes that the AI might add
      if (character && response.startsWith(`${character}:`)) {
        response = response.substring(character.length + 1).trim();
      }
      
      res.status(200).json({ 
        response: response,
        apiUsed: apiUsed,
        character: character
      });

    } catch (error) {
      console.error('Error in /chat endpoint:', { 
        message: error.message, 
        stack: error.stack 
      });
      res.status(500).json({ 
        error: 'Internal server error: Failed to process /chat request',
        details: error.message 
      });
    }
    return;
  }

  if (req.method === 'POST' && normalizedUrl === '/generate-map') {
    console.log('Matched /generate-map endpoint');
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ error: 'Missing prompt' });
        return;
      }

      const replicateApiKey = process.env.REPLICATE_API_KEY;
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff0fc380ae413b026a239',
          input: { 
            prompt: `A detailed fantasy RPG map: ${prompt}`, 
            negative_prompt: 'sexual content' 
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data.output?.[0] || '';
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error('Error in /generate-map endpoint:', { 
        message: error.message, 
        stack: error.stack 
      });
      res.status(500).json({ 
        error: 'Internal server error: Failed to process /generate-map request' 
      });
    }
    return;
  }

  console.log('No matching route found for:', req.url);
  res.status(404).json({ error: 'Not found' });
};