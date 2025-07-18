// src/pages/EnvironmentsPage.js - REPLACE your current EnvironmentsPage.js with this
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { useNavigate } from 'react-router-dom';

const EnvironmentForm = lazy(() => import('../components/environments/EnvironmentForm'));

function EnvironmentsPage() {
  const navigate = useNavigate();
  const { currentUser, getAllEnvironments, getWorlds, saveOneEnvironment, deleteOneEnvironment } = useStorage();
  const [environments, setEnvironments] = useState([]);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [worlds, setWorlds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('User not authenticated. Please log in.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [fetchedEnvironments, fetchedWorlds] = await Promise.all([
          getAllEnvironments(),
          getWorlds()
        ]);

        setEnvironments(fetchedEnvironments || []);
        setWorlds(fetchedWorlds || []);
      } catch (err) {
        console.error("Error loading data:", err);
        if (err.message.includes('not authenticated') || err.message.includes('Missing or insufficient permissions')) {
          setError('Authentication error. Please log in again.');
          navigate('/login');
        } else {
          setError('Failed to load environments and worlds. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, getAllEnvironments, getWorlds, navigate]);

  const saveEnvironment = async (newEnvironment) => {
    try {
      setIsLoading(true);
      setSaveError(null);

      // Check for duplicates (excluding drafts)
      if (!editingEnvironment && environments.some(env => env.name === newEnvironment.name && !env.isDraft)) {
        setSaveError(`An environment named "${newEnvironment.name}" already exists. Please use a different name.`);
        setIsLoading(false);
        return;
      }

      const savedEnvironment = await saveOneEnvironment(newEnvironment);

      // Update the environments list
      if (editingEnvironment) {
        setEnvironments(prev => prev.map(env => env.id === savedEnvironment.id ? savedEnvironment : env));
        setEditingEnvironment(null);
      } else {
        setEnvironments(prev => {
          // Check if it already exists to avoid duplicates
          if (prev.some(env => env.id === savedEnvironment.id)) {
            return prev;
          }
          return [...prev, savedEnvironment];
        });
      }

      // Refresh environments list to ensure we have the latest data
      const updatedEnvironments = await getAllEnvironments();
      setEnvironments(updatedEnvironments || []);
    } catch (error) {
      console.error("Error saving environment:", error);
      setSaveError(`Failed to save environment: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (environment) => {
    setEditingEnvironment(environment);
  };

  const cancelEditing = () => {
    setEditingEnvironment(null);
  };

  const handleDeleteEnvironment = async (environmentId) => {
    if (window.confirm('Are you sure you want to delete this environment?')) {
      try {
        setIsLoading(true);
        setError(null);
        await deleteOneEnvironment(environmentId);
        setEnvironments(prevEnvs => prevEnvs.filter(env => env.id !== environmentId));
        
        // Force refresh after deletion
        const updatedEnvironments = await getAllEnvironments();
        setEnvironments(updatedEnvironments || []);
      } catch (error) {
        console.error("Error deleting environment:", error);
        setError(`Failed to delete environment: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="environments-page">
        <h1>Environments</h1>
        <div className="error-message">
          <p>Please log in to access your environments.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="environments-page">
        <h1>Environments</h1>
        <div className="loading">Loading environments...</div>
      </div>
    );
  }

  return (
    <div className="environments-page">
      <h1>Environments</h1>
      {error && <div className="error-message">{error}</div>}
      {saveError && (
        <div className="save-error-message" style={{ backgroundColor: 'orange', color: 'white', padding: '10px' }}>
          {saveError}
        </div>
      )}
      <div className="page-content">
        <div className="form-section">
          <h2>{editingEnvironment ? 'Edit Environment' : 'Create New Environment'}</h2>
          <Suspense fallback={<div>Loading form...</div>}>
            <EnvironmentForm
              onSave={saveEnvironment}
              initialEnvironment={editingEnvironment}
              onCancel={cancelEditing}
              isEditing={!!editingEnvironment}
              worlds={worlds}
            />
          </Suspense>
        </div>
        <div className="environments-list">
          <h2>Your Environments ({environments.length})</h2>
          {environments.length === 0 ? (
            <p>No environments created yet.</p>
          ) : (
            <ul className="environment-cards">
              {environments.map(env => (
                <li key={env.id} className="environment-card">
                  <h3>{env.name || 'Unnamed Environment'}</h3>
                  {env.description && <p>{env.description}</p>}
                  {env.projectId && worlds.length > 0 && (
                    <p>World: {worlds.find(w => w.id === env.projectId)?.name || 'Unknown World'}</p>
                  )}
                  {env.imageUrl && <img src={env.imageUrl} alt={env.name} style={{ maxWidth: '100px' }} />}
                  <button onClick={() => startEditing(env)}>Edit</button>
                  <button onClick={() => handleDeleteEnvironment(env.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnvironmentsPage;