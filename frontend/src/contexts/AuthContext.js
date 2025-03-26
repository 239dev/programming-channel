import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from '../utils/axios';

// Create the AuthContext
const AuthContext = createContext({
  currentUser: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  loading: true,
  error: null
});

// AuthProvider component to wrap the app and provide authentication state
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on component mount
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      console.log('Verifying token...');
      
      // Verify token with backend
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Token verification response:', {
        status: response.status,
        hasUser: !!response.data.user
      });

      if (!response.data.user) {
        throw new Error('Invalid response: Missing user data');
      }
      
      // Normalize user object from verification response
      const user = response.data.user;
      const normalizedUser = {
        _id: user.id || user._id,
        id: user.id || user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role || 'user',
        email: user.email || null,
        avatar: user.avatar || null,
        type: user.type || 'user'
      };
      
      // Store normalized user object in localStorage and state
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setCurrentUser(normalizedUser);
      setError(null);
      
      console.log('Token verified successfully, user:', normalizedUser);
    } catch (error) {
      console.error('Authentication verification failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Token is invalid or expired, clear it
      localStorage.removeItem('token');
      setCurrentUser(null);
      setError('Session expired. Please log in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Login request payload:', { username, password: '******' });
      
      const response = await axios.post('/api/auth/login', { username, password });
      
      console.log('Login response:', {
        status: response.status,
        data: response.data ? 'RECEIVED' : 'EMPTY'
      });
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response: Missing token');
      }
      
      if (!response.data.user) {
        throw new Error('Invalid response: Missing user data');
      }
      
      // Normalize user object - backend returns 'id' but we use '_id' in frontend
      const user = response.data.user;
      const normalizedUser = {
        _id: user.id || user._id,
        id: user.id || user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role || 'user',
        email: user.email || null,
        avatar: user.avatar || null,
        type: user.type || 'user'
      };
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Set current user
      setCurrentUser(normalizedUser);
      setError(null);
      
      console.log('Login successful, normalized user:', normalizedUser);
      
      // IMPORTANT: Return the normalized user AFTER state has been updated
      return normalizedUser;
    } catch (error) {
      console.error('Login failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (error.response?.status === 404) {
        errorMessage = 'Server error: Authentication endpoint not found';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      setCurrentUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setError(null);
  };

  // Context value to be provided
  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    loading,
    error,
    refreshAuth: checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Default export for backwards compatibility
export default AuthContext;
