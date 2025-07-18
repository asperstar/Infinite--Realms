// src/pages/AuthPage.js - REPLACE your current AuthPage.js with this
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { login, signup, error, currentUser, testStorageConnection } = useStorage();
  
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let success;
      
      if (isLogin) {
        success = await login(email, password);
      } else {
        success = await signup(email, password);
      }
      
      if (success) {
        // Test storage connection
        const testResult = await testStorageConnection();
        console.log('Storage connection test:', testResult);
        
        if (!testResult.success) {
          console.warn('Storage connection issue:', testResult);
        }
        
        navigate('/');
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{isLogin ? 'Sign In' : 'Create Account'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              name="username"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              name="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="auth-toggle">
          <p>
            {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            <button 
              type="button"
              className="toggle-button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;