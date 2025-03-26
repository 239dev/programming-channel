import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ForumIcon from '@mui/icons-material/Forum';

function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <CodeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Welcome to Programming Issues
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph align="center" sx={{ mb: 4 }}>
          A platform for developers to discuss programming challenges and share solutions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<ForumIcon />}
            onClick={() => navigate('/channels')}
          >
            Browse Channels
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Home; 