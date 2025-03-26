import React, { useState, useCallback, useContext, useEffect } from 'react';
import { 
  Button, 
  TextField, 
  Container, 
  Typography, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';

function Login() {
  const { login, isAuthenticated, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Memoized navigation function to prevent multiple calls
  const safeNavigate = useCallback((path) => {
    if (!hasNavigated) {
      setHasNavigated(true);
      console.log('Navigating to:', path);
      navigate(path);
    }
  }, [hasNavigated, navigate]);

  // Check if already authenticated when the component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
      console.log('User already logged in:', {
        username: user.username,
        role: user.role
      });
      safeNavigate('/channels');
    }
  }, [safeNavigate]);

  // Redirect if authenticated through context
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      safeNavigate('/channels');
    }
  }, [isAuthenticated, currentUser, safeNavigate]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate inputs
      if (!formData.username || !formData.password) {
        setError('Please enter both username and password');
        setIsLoading(false);
        return;
      }

      console.log('Attempting login with:', formData.username);
      
      // Wait for login to complete and get user data
      const user = await login(formData.username, formData.password);
      
      console.log('Login successful, user:', user);
      
      if (!user) {
        setError('Login failed: No user data received');
        return;
      }
      
      // Check for user ID (could be in id or _id field)
      if (!user.id && !user._id) {
        console.error('Login failed: User ID is missing from response', user);
        setError('Invalid user data received from server');
        return;
      }
      
      // Navigate to channels page on successful login
      // Set a short timeout to ensure state updates are processed
      setTimeout(() => safeNavigate('/channels'), 100);
    } catch (err) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (err.response?.status === 404) {
        errorMessage = 'Server error: Authentication endpoint not found';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box 
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={formData.username}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Button 
                color="primary" 
                onClick={() => navigate('/register')} 
                sx={{ ml: 1, textTransform: 'none', p: 0 }}
              >
                Register here
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;