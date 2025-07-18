// src/components/MultiCharacterChat.js
import React, { useState, useEffect, useRef } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { enhanceCharacterAPI } from '../utils/character/enhancedContextProcessor';

function MultiCharacterChat() {
  const { currentUser, getAllCharacters } = useStorage();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [error, setError] = useState(null);
  const [roomName, setRoomName] = useState('Character Chat Room');
  const [autoMode, setAutoMode] = useState(false);
  const [responseDelay, setResponseDelay] = useState(3000); // 3 seconds between auto responses
  const messagesEndRef = useRef(null);
  const autoModeTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!currentUser || !currentUser.uid) {
        setError('User not authenticated. Please log in.');
        return;
      }

      try {
        setIsLoadingCharacters(true);
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);
      } catch (err) {
        setError('Failed to load characters: ' + err.message);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, [currentUser, getAllCharacters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-mode: characters respond to each other
  useEffect(() => {
    if (autoMode && selectedCharacters.length > 1 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only auto-respond if the last message wasn't from a character that just spoke
      if (lastMessage.sender !== 'auto-character') {
        autoModeTimeoutRef.current = setTimeout(() => {
          handleAutoCharacterResponse();
        }, responseDelay);
      }
    }

    return () => {
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
      }
    };
  }, [autoMode, messages, selectedCharacters, responseDelay]);

  const toggleCharacterSelection = (character) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.find(char => char.id === character.id);
      if (isSelected) {
        return prev.filter(char => char.id !== character.id);
      } else {
        return [...prev, character];
      }
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      sender: 'user', 
      senderName: 'You',
      text: input, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // If only one character is selected, respond immediately
    if (selectedCharacters.length === 1) {
      await generateCharacterResponse(selectedCharacters[0], [...messages, userMessage]);
    }
  };

  const handleAutoCharacterResponse = async () => {
    if (selectedCharacters.length === 0 || isGeneratingResponse) return;

    // Choose a character to respond (avoid the one who just spoke)
    const lastMessage = messages[messages.length - 1];
    const availableCharacters = selectedCharacters.filter(char => 
      lastMessage.senderName !== char.name
    );

    if (availableCharacters.length === 0) return;

    // Pick a random character from available ones
    const randomIndex = Math.floor(Math.random() * availableCharacters.length);
    const respondingCharacter = availableCharacters[randomIndex];

    await generateCharacterResponse(respondingCharacter, messages, 'auto-character');
  };

  const generateCharacterResponse = async (character, conversationHistory, senderType = 'character') => {
    setIsGeneratingResponse(true);
    setError(null);

    try {
      // Build context that includes other characters in the room
      const roomContext = selectedCharacters.length > 1 ? 
        `\n\nYou are currently in a chat room called "${roomName}" with other characters: ${
          selectedCharacters
            .filter(char => char.id !== character.id)
            .map(char => char.name)
            .join(', ')
        }. Respond naturally to the conversation, and feel free to interact with other characters present.` : '';

      // Get the last few messages for context
      const lastUserMessage = conversationHistory
        .filter(msg => msg.sender === 'user')
        .slice(-1)[0];

      const contextualInput = lastUserMessage ? 
        lastUserMessage.text + roomContext : 
        'Please introduce yourself to the room.' + roomContext;

      const result = await enhanceCharacterAPI(
        character.id,
        contextualInput,
        conversationHistory.slice(-10), // Last 10 messages for context
        { 
          temperature: 0.8,
          rpMode: 'lax'
        }
      );

      const characterMessage = {
        sender: senderType,
        senderName: character.name,
        characterId: character.id,
        text: result.response,
        timestamp: new Date().toISOString(),
        apiUsed: result.source || 'unknown'
      };

      setMessages(prev => [...prev, characterMessage]);

    } catch (err) {
      setError(`${character.name} failed to respond: ${err.message}`);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleCharacterSpeak = async (character) => {
    if (isGeneratingResponse) return;
    await generateCharacterResponse(character, messages);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getCharacterColor = (characterName) => {
    const colors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#8e44ad'
    ];
    const index = selectedCharacters.findIndex(char => char.name === characterName);
    return colors[index % colors.length];
  };

  return (
    <div className="multi-character-chat">
      <div className="chat-header">
        <div className="room-info">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="room-name-input"
            placeholder="Room Name"
          />
          <span className="character-count">
            {selectedCharacters.length} character(s) selected
          </span>
        </div>
        
        <div className="chat-controls">
          <label className="auto-mode-toggle">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={(e) => setAutoMode(e.target.checked)}
            />
            Auto Mode (Characters respond to each other)
          </label>
          
          {autoMode && (
            <div className="response-delay">
              <label>
                Response Delay: 
                <select 
                  value={responseDelay} 
                  onChange={(e) => setResponseDelay(Number(e.target.value))}
                >
                  <option value={1000}>1 second</option>
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </label>
            </div>
          )}
          
          <button onClick={clearMessages} className="clear-button">
            Clear Chat
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="chat-container">
        {/* Character Selection Panel */}
        <div className="character-selection-panel">
          <h3>Select Characters</h3>
          
          {isLoadingCharacters ? (
            <div>Loading characters...</div>
          ) : characters.length === 0 ? (
            <p>No characters found. Create characters first.</p>
          ) : (
            <div className="character-list">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className={`character-item ${
                    selectedCharacters.find(selected => selected.id === char.id) 
                      ? 'selected' 
                      : ''
                  }`}
                  onClick={() => toggleCharacterSelection(char)}
                >
                  <div className="character-avatar">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {char.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                    )}
                  </div>
                  
                  <div className="character-info">
                    <div className="character-name">{char.name}</div>
                    <div className="character-type">
                      {char.characterType === 'cipher_alpha' && '🔥 Cipher Alpha'}
                      {char.characterType === 'deedee_alpha' && '⚔️ DeeDee Alpha'}
                      {char.characterType === 'oge_relic' && '👼 Oge Relic'}
                      {char.characterType === 'custom' && '⭐ Custom'}
                    </div>
                  </div>
                  
                  {selectedCharacters.find(selected => selected.id === char.id) && !autoMode && (
                    <button
                      className="speak-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCharacterSpeak(char);
                      }}
                      disabled={isGeneratingResponse}
                    >
                      Speak
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {selectedCharacters.length > 0 && (
            <div className="selected-characters-summary">
              <h4>Active Characters:</h4>
              {selectedCharacters.map(char => (
                <div 
                  key={char.id} 
                  className="selected-character"
                  style={{ borderLeft: `4px solid ${getCharacterColor(char.name)}` }}
                >
                  {char.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Messages Area */}
        <div className="chat-messages-area">
          {selectedCharacters.length === 0 ? (
            <div className="no-characters-selected">
              <p>Select at least one character to start chatting!</p>
            </div>
          ) : (
            <>
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-conversation">
                    <p>Start the conversation! 
                      {selectedCharacters.length > 1 
                        ? ' Multiple characters are ready to interact.'
                        : ` ${selectedCharacters[0].name} is ready to chat.`}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message ${msg.sender === 'user' ? 'user-message' : 'character-message'}`}
                      style={msg.sender !== 'user' ? {
                        borderLeft: `4px solid ${getCharacterColor(msg.senderName)}`
                      } : {}}
                    >
                      <div className="message-header">
                        <strong 
                          style={msg.sender !== 'user' ? {
                            color: getCharacterColor(msg.senderName)
                          } : {}}
                        >
                          {msg.senderName}
                        </strong>
                        <span className="timestamp">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        {msg.apiUsed && (
                          <span className="api-badge" title={`Generated using ${msg.apiUsed}`}>
                            {msg.apiUsed === 'anthropic' ? '🔥' : 
                             msg.apiUsed === 'grok' ? '🤖' : '⚡'}
                          </span>
                        )}
                      </div>
                      <div className="message-content">
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {isGeneratingResponse && (
                  <div className="message character-message generating">
                    <div className="message-header">
                      <strong>AI is thinking...</strong>
                    </div>
                    <div className="generating-indicator">
                      <span className="dot-1">●</span>
                      <span className="dot-2">●</span>
                      <span className="dot-3">●</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="chat-input-area">
                <div className="input-container">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedCharacters.length === 1 
                        ? `Type a message to ${selectedCharacters[0].name}...`
                        : `Type a message to the room...`
                    }
                    disabled={isGeneratingResponse}
                    rows="3"
                  />
                  <button 
                    onClick={handleSendMessage} 
                    disabled={isGeneratingResponse || !input.trim()}
                    className="send-button"
                  >
                    Send
                  </button>
                </div>
                
                {selectedCharacters.length > 1 && !autoMode && (
                  <div className="manual-character-controls">
                    <span>Make a character speak:</span>
                    {selectedCharacters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => handleCharacterSpeak(char)}
                        disabled={isGeneratingResponse}
                        className="character-speak-btn"
                        style={{ backgroundColor: getCharacterColor(char.name) }}
                      >
                        {char.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiCharacterChat;