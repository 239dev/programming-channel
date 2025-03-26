import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import axios from '../utils/axios';

const MessageRating = ({ messageId, ratings: initialRatings, userRating: initialUserRating }) => {
  const [ratings, setRatings] = useState(initialRatings || { up: 0, down: 0 });
  const [userRating, setUserRating] = useState(initialUserRating || null);

  const handleRate = async (rating) => {
    try {
      const response = await axios.post(`/api/messages/${messageId}/rate`, {
        rating: rating === userRating ? 0 : rating
      });

      setRatings(response.data.ratings);
      setUserRating(rating === userRating ? null : rating);
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Like">
        <Badge badgeContent={ratings.up} color="primary">
          <IconButton
            size="small"
            onClick={() => handleRate(1)}
            color={userRating === 1 ? 'primary' : 'default'}
          >
            <ThumbUpIcon />
          </IconButton>
        </Badge>
      </Tooltip>

      <Tooltip title="Dislike">
        <Badge badgeContent={ratings.down} color="error">
          <IconButton
            size="small"
            onClick={() => handleRate(-1)}
            color={userRating === -1 ? 'error' : 'default'}
          >
            <ThumbDownIcon />
          </IconButton>
        </Badge>
      </Tooltip>
    </Box>
  );
};

export default MessageRating;