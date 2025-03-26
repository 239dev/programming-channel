import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Paper,
  Button,
  Collapse,
} from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from '../utils/axios';
import MessageRating from './MessageRating';
import { useAuth } from '../contexts/AuthContext';

const MessageList = ({ channelId, onReply, refreshTrigger }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const { currentUser } = useAuth();

  const fetchMessages = async () => {
    if (!channelId) {
      setError('No channel selected');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching messages for channel:', channelId);
      const response = await axios.get(`/api/messages/${channelId}`);
      
      // Log the raw response for debugging
      console.log('Raw messages response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });

      // Validate response data
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected an array');
      }

      // Sanitize messages
      const sanitizedMessages = response.data.map(message => ({
        ...message,
        displayName: message.displayName || `User ${message.userId.slice(0, 8)}`,
        username: message.username || `User ${message.userId.slice(0, 8)}`
      }));

      setMessages(sanitizedMessages);
      setError(null);
    } catch (err) {
      console.error('Detailed error fetching messages:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        }
      });
      
      setError(
        err.response?.data?.error || 
        err.response?.data?.details || 
        err.message || 
        'Could not fetch messages'
      );
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages when channelId or refreshTrigger changes
  useEffect(() => {
    fetchMessages();
  }, [channelId, refreshTrigger]);

  // Set up polling for new messages
  useEffect(() => {
    const interval = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [channelId]);

  const handleReply = (messageId) => {
    if (onReply) {
      onReply(messageId);
    }
  };

  const toggleReplies = (messageId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleRatingUpdate = async (messageId, newRating) => {
    try {
      // Update the rating for the specific message
      const updatedMessages = messages.map(message => 
        message._id === messageId 
          ? { ...message, ratings: newRating }
          : message
      );
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const renderMessage = (message, depth = 0) => {
    const hasReplies = messages.some(m => m.parentId === message._id);
    const replies = messages.filter(m => m.parentId === message._id);
    
    return (
      <Box key={message._id} sx={{ ml: depth * 3, mb: 2 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar>{message.displayName?.[0]?.toUpperCase()}</Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography component="div" variant="subtitle2">
                  {message.displayName}
                </Typography>
                <Typography component="div" variant="caption" color="text.secondary">
                  {new Date(message.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Typography component="div" variant="body1" sx={{ mt: 1 }}>
                {message.content}
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <MessageRating 
                  messageId={message._id}
                  ratings={message.ratings}
                  onRatingUpdate={handleRatingUpdate}
                />
                <Button
                  size="small"
                  startIcon={<ReplyIcon />}
                  onClick={() => handleReply(message._id)}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        {hasReplies && (
          <>
            <Collapse in={expandedReplies[message._id]} timeout="auto">
              <Box sx={{ ml: 4, mt: 1 }}>
                {replies.map(reply => renderMessage(reply, depth + 1))}
              </Box>
            </Collapse>

            <Button
              size="small"
              onClick={() => toggleReplies(message._id)}
              sx={{ ml: 4, mt: 1 }}
              startIcon={expandedReplies[message._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {expandedReplies[message._id] ? 'Hide Replies' : `Show ${replies.length} Replies`}
            </Button>
          </>
        )}
      </Box>
    );
  };

  if (loading && messages.length === 0) {
    return <Box component="div">Loading messages...</Box>;
  }

  if (error) {
    return <Box component="div" color="error">Error: {error}</Box>;
  }

  return (
    <Paper sx={{ p: 2, mb: 2, flexGrow: 1, overflowY: 'auto' }}>
      <List>
        {messages.length === 0 ? (
          <ListItem>
            <ListItemText>
              <Typography component="div">
                No messages in this channel yet.
              </Typography>
            </ListItemText>
          </ListItem>
        ) : (
          messages
            .filter(message => !message.parentId) // Only show root messages
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map(message => renderMessage(message))
        )}
      </List>
    </Paper>
  );
};

export default MessageList;
