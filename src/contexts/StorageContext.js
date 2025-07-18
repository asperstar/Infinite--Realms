// src/contexts/StorageContext.js - REPLACE your current StorageContext.js with this
import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import * as storage from '../services/storage';

const StorageContext = createContext();

export function useStorage() {
  return useContext(StorageContext);
}

export function StorageProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Helper function to get better error messages
  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use by another account.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return errorCode ? errorCode : 'An error occurred during authentication.';
    }
  };

  // Helper function to wrap storage operations with error handling
  const withErrorHandling = (operation, context) => async (...args) => {
    try {
      setError(null);
      return await operation(...args);
    } catch (err) {
      const message = `Failed to ${context}: ${err.message}`;
      setError(message);
      throw new Error(message);
    }
  };

  // Authentication functions
  const login = async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError(getAuthErrorMessage(err.code));
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message);
      return false;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      setError(getAuthErrorMessage(err.code));
      return false;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      console.error("Password reset error:", err);
      setError(getAuthErrorMessage(err.code));
      return false;
    }
  };

  const contextValue = {
    // Auth state
    currentUser,
    loading,
    error,
    
    // Auth functions
    login,
    logout,
    signup,
    resetPassword,
    
    // Character functions (using new storage service)
    getAllCharacters: withErrorHandling(storage.characters.getAll, 'load characters'),
    getCharacters: withErrorHandling(storage.characters.getAll, 'load characters'), // Alias for compatibility
    getCharacterById: withErrorHandling(storage.characters.getById, 'load character'),
    saveOneCharacter: withErrorHandling(storage.characters.save, 'save character'),
    deleteOneCharacter: withErrorHandling(storage.characters.delete, 'delete character'),
    
    // World functions
    getWorlds: withErrorHandling(storage.worlds.getAll, 'load worlds'),
    getWorldById: withErrorHandling(storage.worlds.getById, 'load world'),
    saveOneWorld: withErrorHandling(storage.worlds.save, 'save world'),
    deleteOneWorld: withErrorHandling(storage.worlds.delete, 'delete world'),
    
    // Environment functions
    getAllEnvironments: withErrorHandling(storage.environments.getAll, 'load environments'),
    getEnvironmentById: async (environmentId) => {
      try {
        const environments = await storage.environments.getAll();
        return environments.find(env => env.id === environmentId) || null;
      } catch (err) {
        setError(`Failed to load environment: ${err.message}`);
        return null;
      }
    },
    saveOneEnvironment: withErrorHandling(storage.environments.save, 'save environment'),
    deleteOneEnvironment: withErrorHandling(storage.environments.delete, 'delete environment'),
    
    // Campaign functions
    getWorldCampaigns: withErrorHandling(storage.campaigns.getByWorldId, 'load campaigns'),
    getCampaign: withErrorHandling(storage.campaigns.getById, 'load campaign'),
    getCampaignById: withErrorHandling(storage.campaigns.getById, 'load campaign'), // Alias
    updateCampaign: withErrorHandling(storage.campaigns.save, 'save campaign'),
    deleteCampaignById: withErrorHandling(storage.campaigns.delete, 'delete campaign'),
    
    // Simplified functions (these features will be added later)
    updateCampaignSessionMessages: async () => {
      console.warn('Campaign session messages not implemented yet');
      return false;
    },
    loadMapData: async () => ({ nodes: [], edges: [] }),
    saveMap: async () => false,
    loadTimelineData: async () => ({ events: [], sequences: ['Main Timeline'] }),
    saveTimeline: async () => false,
    getProfile: async () => null,
    updateProfile: async () => false,
    exportData: async () => ({}),
    importData: async () => false,
    testStorageConnection: withErrorHandling(storage.testConnection, 'test connection'),
    
    // Forum functions (not implemented yet)
    getForumPosts: async () => [],
    getForumPost: async () => null,
    addForumPost: async () => null,
    updateForumPost: async () => null,
    deleteForumPost: async () => false,
    likeForumPost: async () => ({ liked: false, likes: 0 }),
    unlikeForumPost: async () => ({ liked: false, likes: 0 }),
    getPostReplies: async () => [],
    addReplyToPost: async () => null,
    updateReply: async () => null,
    deleteReply: async () => false,
    likeReply: async () => ({ liked: false, likes: 0 }),
    unlikeReply: async () => ({ liked: false, likes: 0 })
  };

  return (
    <StorageContext.Provider value={contextValue}>
      {!loading && children}
    </StorageContext.Provider>
  );
}