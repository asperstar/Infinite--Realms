// src/pages/CharactersPage.js - REPLACE your current CharactersPage.js with this
import React, { useState, useEffect, useCallback } from 'react';
import CharacterForm from '../components/characters/CharacterForm';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';

function CharactersPage() {
  const navigate = useNavigate();
  const { currentUser, getAllCharacters, saveOneCharacter, deleteOneCharacter, testStorageConnection } = useStorage();
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const test = await testStorageConnection();
        if (!test.success) {
          if (test.error.includes('not authenticated')) {
            setError('User not authenticated. Please log in to save characters.');
          } else {
            setError(`Unable to connect to storage: ${test.error}`);
          }
        } else {
          setError(null);
        }
      } catch (err) {
        setError(`Failed to connect to storage: ${err.message}`);
      }
    };
    
    if (currentUser) {
      checkStorage();
    }
  }, [testStorageConnection, currentUser]);

  const loadCharacterData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log("Loading characters for user:", currentUser.uid);
      const allCharacters = await getAllCharacters();
      console.log("Loaded characters:", allCharacters);
      setCharacters(allCharacters || []);
      setFilteredCharacters(allCharacters || []);
    } catch (error) {
      console.error("Error loading characters:", error);
      setError("Failed to load characters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getAllCharacters, currentUser]);

  useEffect(() => {
    loadCharacterData();
  }, [loadCharacterData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCharacters(characters);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = characters.filter(char =>
        (char.name && char.name.toLowerCase().includes(query)) ||
        (char.traits && char.traits.toLowerCase().includes(query)) ||
        (char.personality && char.personality.toLowerCase().includes(query))
      );
      setFilteredCharacters(filtered);
    }
  }, [searchQuery, characters]);

  const handleSaveCharacter = async (newCharacter) => {
    try {
      setIsLoading(true);
      setSaveError(null);
      
      // Check if character already exists with similar data to prevent duplicates
      if (!editingCharacter && characters.some(c => c.name === newCharacter.name && !c.isDraft)) {
        setSaveError(`A character named "${newCharacter.name}" already exists. Please use a different name.`);
        setIsLoading(false);
        return;
      }
      
      console.log("Saving character:", newCharacter);
      const savedCharacter = await saveOneCharacter(newCharacter);
      console.log("Character saved successfully:", savedCharacter);
      
      // Update UI state
      if (editingCharacter) {
        setCharacters(prevChars =>
          prevChars.map(char => (char.id === editingCharacter.id ? savedCharacter : char))
        );
      } else {
        setCharacters(prevChars => {
          // Ensure we're not adding a duplicate
          const withoutDrafts = prevChars.filter(c => !(c.isDraft && c.name === savedCharacter.name));
          return [...withoutDrafts, savedCharacter];
        });
      }
      
      // Reset form state
      setEditingCharacter(null);
      setSaveError(null);
      
      // Refresh data from server to ensure we have the latest
      await loadCharacterData();
    } catch (error) {
      console.error("Error saving character:", error);
      setSaveError(`Failed to save character: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const startEditing = (character) => {
    setEditingCharacter(character);
  };

  const cancelEditing = () => {
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = async (characterId) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      try {
        setIsLoading(true);
        setError(null);
        await deleteOneCharacter(characterId);
        setCharacters(prevChars => prevChars.filter(char => char.id !== characterId));
      } catch (error) {
        console.error("Error deleting character:", error);
        setError(`Failed to delete character: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="characters-page">
        <h1>Characters</h1>
        <div className="error-message">
          <p>Please log in to access your characters.</p>
          <Link to="/login">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="characters-page">
      <h1>Characters</h1>
      {error && (
        <div className="error-message" style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>
          {error}
        </div>
      )}
      {saveError && (
        <div className="save-error-message" style={{ backgroundColor: 'orange', color: 'white', padding: '10px' }}>
          {saveError}
        </div>
      )}
      <div className="page-content">
        <div className="form-section">
          <h2>{editingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
          <CharacterForm
            onSave={handleSaveCharacter}
            initialCharacter={editingCharacter}
            onCancel={cancelEditing}
            isEditing={!!editingCharacter}
            isSubmitting={isLoading}
            currentUser={currentUser} 
          />
        </div>
        <div className="characters-list">
          <div className="list-header">
            <h2>Your Characters ({characters.length})</h2>
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {isLoading ? (
            <div>Loading characters...</div>
          ) : filteredCharacters.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No characters found matching "{searchQuery}"</p>
            ) : (
              <p className="no-characters">No characters created yet.</p>
            )
          ) : (
            <ul className="character-cards">
              {filteredCharacters.map(char => (
                <li key={char.id} className="character-card">
                  <div className="card-header">
                    {char.imageUrl ? (
                      <div className="character-image">
                        <img src={char.imageUrl} alt={char.name} />
                      </div>
                    ) : (
                      <div className="character-icon">
                        <span className="icon-text">{char.name ? char.name[0].toUpperCase() : 'C'}</span>
                      </div>
                    )}
                    <h3>{char.name || 'Unnamed Character'}</h3>
                  </div>
                  <div className="card-content">
                    {char.personality && (
                      <p className="personality">
                        <strong>Personality:</strong> {char.personality}
                      </p>
                    )}
                    {char.background && (
                      <p className="background">
                        <strong>Background:</strong>{' '}
                        {char.background.length > 100
                          ? `${char.background.substring(0, 100)}...`
                          : char.background}
                      </p>
                    )}
                  </div>
                  <div className="card-actions">
                    <Link to={`/chat?characterId=${char.id}`}>
                      <button className="chat-button">Chat</button>
                    </Link>
                    <button
                      className="edit-button"
                      onClick={() => startEditing(char)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteCharacter(char.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharactersPage;