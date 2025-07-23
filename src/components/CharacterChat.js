// src/components/CharacterChat.js
import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../utils/apiClient';
import './CharacterChat.css';

function CharacterChat({ character, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start conversation with a greeting
    if (character && messages.length === 0) {
      setMessages([{
        role: 'character',
        content: `Hello! I'm ${character.name}. ${character.description ? character.description.substring(0, 100) + '...' : 'Nice to meet you!'} What would you like to talk about?`,
        timestamp: new Date()
      }]);
    }
  }, [character]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const result = await apiClient.chatWithCharacter(
        character,
        inputMessage,
        conversationHistory
      );

      const characterMessage = {
        role: 'character',
        content: result.response,
        timestamp: new Date(),
        success: result.success
      };

      setMessages(prev => [...prev, characterMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'character',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        success: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!character) {
    return <div className="chat-error">No character selected</div>;
  }

  return (
    <div className="character-chat">
      <div className="chat-header">
        <div className="character-info">
          <h2>{character.name}</h2>
          <p className="character-subtitle">{character.personality || 'Engaging conversationalist'}</p>
        </div>
        <button className="close-chat" onClick={onClose}>×</button>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'character-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message character-message">
            <div className="message-content typing">
              {character.name} is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Talk to ${character.name}...`}
          disabled={isLoading}
          rows="2"
        />
        <button 
          onClick={handleSendMessage} 
          disabled={!inputMessage.trim() || isLoading}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default CharacterChat;