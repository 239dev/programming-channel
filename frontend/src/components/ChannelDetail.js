import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import axios from '../utils/axios';
import MessageList from './MessageList';

const ChannelDetail = ({ channelId }) => {
  const [channel, setChannel] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await axios.get(`/api/channels/${channelId}`);
        setChannel(response.data);
      } catch (err) {
        console.error('Error fetching channel:', err);
        setError(err.response?.data?.error || err.message || 'Could not fetch channel');
        setShowError(true);
      }
    };

    if (channelId) {
      fetchChannel();
    }
  }, [channelId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload an image or PDF.');
        }

        if (file.size > maxSize) {
            throw new Error('File is too large. Maximum size is 5MB.');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/api/messages/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        console.log('Upload response:', response.data);
        setSelectedFile({
            url: response.data.fileUrl,
            filename: response.data.filename,
            type: file.type
        });
        setError(null);
    } catch (error) {
        console.error('File Upload Error:', error);
        setError(error.response?.data?.error || error.message);
        setSelectedFile(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add content to form data
    formData.append('content', newMessage);
    
    // Add file if selected
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }
    
    // Add parent ID if replying
    if (replyingTo) {
      formData.append('parentId', replyingTo);
    }

    try {
      // Comprehensive request logging
      console.log('Message Send Request Details:', {
        url: `/api/messages/${channelId}`,
        content: newMessage,
        hasFile: !!selectedFile,
        fileDetails: selectedFile ? {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size
        } : null,
        replyingTo,
        tokenPresent: !!token
      });

      const response = await axios.post(`/api/messages/${channelId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` // Add token to headers
        }
      });

      // Clear form
      setNewMessage('');
      setSelectedFile(null);
      setReplyingTo(null);
      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      // Detailed error logging
      console.error('Full error object:', err);
      
      // Extract most informative error message
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Failed to send message';
      
      // Log specific error details
      console.error('Detailed error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMessage,
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers
      });

      // Set error state with more informative message
      setError(errorMessage);
      
      // Optional: show a more detailed toast or alert
      alert(`Message Send Error: ${errorMessage}`);
    }
  };

  const handleReply = (messageId) => {
    setReplyingTo(messageId);
  };

  const handleCloseError = () => {
    setShowError(false);
    setError(null);
  };

  if (!channel) {
    return <Typography>Loading channel...</Typography>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          {channel.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {channel.description}
        </Typography>
      </Paper>

      <MessageList 
        channelId={channelId} 
        onReply={handleReply} 
        refreshTrigger={refreshTrigger}
      />

      <Paper sx={{ p: 2, mt: 'auto' }}>
        <form onSubmit={handleSendMessage}>
          {replyingTo && (
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Replying to a message
              </Typography>
              <Button
                size="small"
                onClick={() => setReplyingTo(null)}
                sx={{ ml: 'auto' }}
              >
                Cancel
              </Button>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              variant="outlined"
              size="small"
            />
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
            />
            <label htmlFor="file-upload">
              <IconButton component="span" color="primary">
                <AttachFileIcon />
              </IconButton>
            </label>
            <IconButton
              type="submit"
              color="primary"
              disabled={!newMessage.trim() && !selectedFile}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </form>
      </Paper>

      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChannelDetail;