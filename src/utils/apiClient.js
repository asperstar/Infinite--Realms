// src/utils/apiClient.js - FIXED FOR VERCEL
import { Anthropic } from '@anthropic-ai/sdk';

class APIClient {
  constructor() {
    this.anthropic = null;
    this.initializeAnthropic();
  }

  initializeAnthropic() {
    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // For prototype only
      });
    } else {
      console.warn('REACT_APP_ANTHROPIC_API_KEY not found');
    }
  }

  async chatWithCharacter(characterData, message, conversationHistory = []) {
    if (!this.anthropic) {
      return {
        response: 'AI service not configured. Please add your API key.',
        success: false
      };
    }

    try {
      const systemPrompt = this.buildCharacterPrompt(characterData);
      
      // Format conversation history for Claude
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role === 'character' ? 'assistant' : 'user',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      console.log('Sending chat request...');
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      });

      return {
        response: response.content[0].text,
        success: true
      };
    } catch (error) {
      console.error('Chat error:', error);
      return {
        response: `Error: ${error.message}`,
        success: false,
        error: error.message
      };
    }
  }

  buildCharacterPrompt(character) {
    return `You are ${character.name || 'a character'}, engaging in a one-on-one conversation.

Background: ${character.description || 'A mysterious character with an unknown past.'}

Personality: ${character.personality || 'Friendly and thoughtful.'}

Goals: ${character.goals || 'To have meaningful conversations.'}

Speaking Style: ${character.speakingStyle || 'Natural and conversational.'}

Instructions:
- Stay in character consistently
- Respond naturally as if having a real conversation
- Keep responses conversational (1-3 paragraphs)
- Show personality through your responses
- Remember what was discussed earlier
- Be engaging and ask questions when appropriate`;
  }
}

export default new APIClient();