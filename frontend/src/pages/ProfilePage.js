import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First, try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setDisplayName(userData.displayName || '');
        }

        // Then, verify user data with backend
        const response = await axios.get('/api/users/profile');
        setUser(response.data);
        setDisplayName(response.data.displayName || '');
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        console.error('Full error details:', {
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers,
          message: err.message,
          config: {
            method: err.config?.method,
            url: err.config?.url,
            headers: err.config?.headers
          }
        });
        
        setError(err.response?.data?.message || 'Failed to load profile');
        
        // Redirect to login if unauthorized
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
        return;
      }

      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 5MB.');
        return;
      }

      setAvatar(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    // Validate display name
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    const formData = new FormData();
    if (avatar) {
      formData.append('avatar', avatar);
    }
    formData.append('displayName', displayName.trim());

    try {
      const response = await axios.post('/api/users/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: function (status) {
          return (status >= 200 && status < 300) || status === 400 || status === 500;
        }
      });
      
      if (response.data.error) {
        setError(response.data.error);
        console.error('Profile update error:', response.data);
        return;
      }
      
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
      
      if (err.response) {
        setError(err.response.data.error || 'Failed to update profile');
        console.error('Server error details:', err.response.data);
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Error preparing the upload. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
        <Alert severity="error">
          Unable to load user profile. Please log in again.
        </Alert>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h4">Profile</Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Avatar 
              src={user.avatar || '/default-avatar.png'} 
              sx={{ width: 100, height: 100, alignSelf: 'center' }} 
            />
            
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/gif" 
              onChange={handleAvatarChange} 
            />
            
            <TextField
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              variant="outlined"
              required
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
            >
              Update Profile
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default ProfilePage;
