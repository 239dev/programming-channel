import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  Grid,
  IconButton,
  CardMedia,
  Collapse,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from '../utils/axios';
import MessageRating from '../components/MessageRating';
import MessageList from '../components/MessageList';

function ChannelDetail() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [nestedReplies, setNestedReplies] = useState({});
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await axios.get(`/api/channels/${channelId}`);
        setChannel(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching channel:', error);
        setError(error.response?.data?.message || 'Failed to fetch channel details');
      }
    };

    fetchChannel();
  }, [channelId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file
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

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const response = await axios.post('/api/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      console.log('Upload response:', response.data);

      // Store the file URL for later use
      setSelectedFile({
        url: response.data.fileUrl,
        filename: response.data.filename,
        type: file.type
      });

      setError(null);
    } catch (error) {
      console.error('File Upload Error:', error);
      setError(error.response?.data?.message || error.message);
      setSelectedFile(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachment) return;

    try {
      const formData = new FormData();
      
      // Always append content, even if empty
      formData.append('content', newMessage.trim());
      
      // Append parentId if replying
      if (replyTo) {
        formData.append('parentId', replyTo);
      }

      // Append attachment if present
      if (attachment) {
        // If attachment is a File object
        if (attachment instanceof File) {
          formData.append('attachment', attachment);
        } 
        // If attachment is an object with fileUrl (from previous upload)
        else if (attachment.fileUrl) {
          // For previously uploaded files, we might need to handle differently
          console.log('Existing Attachment:', attachment);
          formData.append('attachment', attachment.fileUrl);
        }
      }

      // Log FormData contents before sending
      for (let [key, value] of formData.entries()) {
        console.log('Send Message FormData:', key, value);
      }

      const response = await axios.post(`/api/messages/${channelId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset form after successful send
      setNewMessage('');
      setReplyTo(null);
      setAttachment(null);
      setSelectedFile(null);

      // Trigger a refresh of messages
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      // Detailed error logging
      console.error('Send message error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: error.config
      });

      // Set a more descriptive error message
      setError(
        error.response?.data?.details?.message || 
        error.response?.data?.error || 
        'Failed to send message. Please try again.'
      );
    }
  };

  const renderAttachment = () => {
    if (!attachment) return null;

    // Determine attachment type based on mimetype
    const isImage = attachment.mimetype.startsWith('image/');
    const isDocument = ['application/pdf', 'application/msword', 'text/plain'].includes(attachment.mimetype);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        {isImage && (
          <img 
            src={attachment.fileUrl} 
            alt={attachment.filename} 
            style={{ maxWidth: 100, maxHeight: 100, marginRight: 10 }} 
          />
        )}
        {isDocument && (
          <Typography variant="body2">
            {attachment.filename}
          </Typography>
        )}
        <IconButton onClick={() => setAttachment(null)} size="small">
          {' '}
        </IconButton>
      </Box>
    );
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReply = (messageId) => {
    setReplyTo(messageId);
  };

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!channel) {
    return <Typography>Loading channel...</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4">{channel.name}</Typography>
        <Typography variant="subtitle1">{channel.description}</Typography>
      </Paper>

      {/* Use MessageList component with onReply handler */}
      <MessageList 
        channelId={channelId} 
        onReply={handleReply} 
        refreshTrigger={refreshTrigger}
      />

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
        {replyTo && (
          <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
            Replying to a message
            <Button 
              size="small" 
              onClick={() => setReplyTo(null)}
              sx={{ ml: 1 }}
            >
              Cancel
            </Button>
          </Typography>
        )}
        {renderAttachment()}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,application/msword,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <IconButton onClick={() => fileInputRef.current.click()}>
            <AttachFileIcon />
          </IconButton>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            sx={{ mr: 1 }}
          />
          <IconButton color="primary" onClick={handleSendMessage}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export default ChannelDetail;