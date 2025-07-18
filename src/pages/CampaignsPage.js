// src/pages/CampaignsPage.js - REPLACE your current CampaignsPage.js with this
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createCampaignModel } from '../models/CampaignModel';
import { useStorage } from '../contexts/StorageContext';

function CampaignsPage() {
  const { worldId } = useParams();
  const { currentUser, getWorlds, getWorldById, getWorldCampaigns, updateCampaign, deleteCampaignById, getAllCharacters } = useStorage();
  const [world, setWorld] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: ''
  });
  const [isSelectingCharacters, setIsSelectingCharacters] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        setError(null);

        // Load world
        const foundWorld = await getWorldById(worldId);
        setWorld(foundWorld);

        // Load campaigns for this world
        if (foundWorld) {
          const worldCampaigns = await getWorldCampaigns(worldId);
          setCampaigns(worldCampaigns || []);
        }

        // Load characters
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again.');
        setIsLoading(false);
      }
    };

    loadData();
  }, [worldId, currentUser, getWorldById, getWorldCampaigns, getAllCharacters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCharacterSelection = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setSelectedCampaignId(campaignId);
      setSelectedCharacters(campaign.participantIds || []);
      setIsSelectingCharacters(true);
    }
  };

  const toggleCharacterSelection = (characterId) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const saveCharacterSelections = async () => {
    if (!selectedCampaignId) return;

    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (campaign) {
      const updatedCampaign = {
        ...campaign,
        participantIds: selectedCharacters
      };

      try {
        setIsSaving(true);
        await updateCampaign(updatedCampaign);
        setCampaigns(campaigns.map(c =>
          c.id === selectedCampaignId ? updatedCampaign : c
        ));
        setIsSelectingCharacters(false);
        setSelectedCampaignId(null);
        setIsSaving(false);
      } catch (error) {
        console.error('Error saving character selections:', error);
        setError('Failed to save character selections.');
        setIsSaving(false);
      }
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      await deleteCampaignById(campaignId);
      setCampaigns(prevCampaigns => prevCampaigns.filter(c => c.id !== campaignId));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setError('Failed to delete campaign. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createCampaign = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    
    try {
      const parsedWorldId = parseInt(worldId);

      const campaignData = isCreating ?
        {
          name: newCampaign.name || `New Campaign in ${world?.name || 'World'}`,
          description: newCampaign.description || ''
        } :
        {
          name: `New Campaign in ${world?.name || 'World'}`
        };

      const campaignToSave = createCampaignModel(parsedWorldId, campaignData);

      await updateCampaign(campaignToSave);
      setCampaigns([...campaigns, campaignToSave]);
      setNewCampaign({ name: '', description: '' });
      setIsCreating(false);
      setIsSaving(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError(`Failed to create campaign: ${error.message}`);
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="campaigns-page">
        <h1>Campaigns</h1>
        <div className="error-message">
          <p>Please log in to access campaigns.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="campaigns-page">
        <h1>Campaigns in {world?.name || 'World'}</h1>
        <div className="loading">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <h1>Campaigns in {world?.name || 'World'}</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="page-content">
        <div className="campaign-controls">
          {isCreating ? (
            <div className="campaign-form">
              <h2>Create New Campaign</h2>
              <div className="form-group">
                <label>Campaign Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newCampaign.name}
                  onChange={handleInputChange}
                  placeholder={`New Campaign in ${world?.name || 'World'}`}
                  disabled={isSaving}
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={newCampaign.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe your campaign..."
                  disabled={isSaving}
                />
              </div>
              <div className="form-buttons">
                <button 
                  className="submit-button" 
                  onClick={createCampaign}
                  disabled={isSaving}
                >
                  {isSaving ? 'Creating...' : 'Create Campaign'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={() => {
                    setIsCreating(false);
                    setNewCampaign({ name: '', description: '' });
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="create-campaign-button"
              onClick={() => setIsCreating(true)}
              disabled={loading || isSaving}
            >
              Create New Campaign
            </button>
          )}
        </div>
        <div className="campaigns-list">
          <h2>Available Campaigns</h2>
          {!world ? (
            <div className="loading-world">
              <p>Loading world data...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-campaigns">
              <p>No campaigns yet in this world. Create your first campaign to get started!</p>
              <div className="campaign-tips">
                <h3>Getting Started</h3>
                <ol>
                  <li>Click the "Create New Campaign" button above</li>
                  <li>Give your campaign a name and description</li>
                  <li>After creation, you can add characters and create scenes</li>
                  <li>Start the campaign session to begin roleplaying</li>
                </ol>
              </div>
            </div>
          ) : (
            <ul className="campaign-cards">
              {campaigns.map(campaign => (
                <li key={campaign.id} className="campaign-card">
                  <div className="card-content">
                    <h3>{campaign.name}</h3>
                    {campaign.description && <p className="description">{campaign.description}</p>}
                    <div className="campaign-stats">
                      <span>{campaign.scenes?.length || 0} Scene{(campaign.scenes?.length || 0) !== 1 ? 's' : ''}</span>
                      <span>{campaign.participantIds?.length || 0} Character{(campaign.participantIds?.length || 0) !== 1 ? 's' : ''}</span>
                      <span>Created: {new Date(campaign.created).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => openCharacterSelection(campaign.id)}
                      className="characters-button"
                      disabled={isSaving}
                    >
                      Manage Characters
                    </button>
                    <Link
                      to={`/campaigns/${campaign.id}/session`}
                      className="session-button"
                    >
                      Open Campaign
                    </Link>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="delete-button"
                      disabled={isSaving}
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
      <div className="back-link">
        <Link to="/worlds">← Back to Worlds</Link>
      </div>
      {isSelectingCharacters && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select Characters for Campaign</h2>
            <div className="character-selection-list">
              {characters.length === 0 ? (
                <p>No characters available. Go create some characters first!</p>
              ) : (
                <ul>
                  {characters.map(character => (
                    <li key={character.id} className="character-selection-item">
                      <label className="character-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCharacters.includes(character.id)}
                          onChange={() => toggleCharacterSelection(character.id)}
                          disabled={isSaving}
                        />
                        <div className="character-chat-header">
                          <h2>{character.name}</h2>
                        </div>
                        <div className="character-info">
                          {character.imageUrl ? (
                            <img
                              src={character.imageUrl}
                              alt={character.name}
                              className="character-thumbnail"
                            />
                          ) : (
                            <div className="character-initial">
                              {character.name ? character.name[0].toUpperCase() : '?'}
                            </div>
                          )}
                          <span>{character.name}</span>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={saveCharacterSelections}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Characters'}
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setIsSelectingCharacters(false);
                  setSelectedCampaignId(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;