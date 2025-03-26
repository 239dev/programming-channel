import React, { useContext } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Avatar
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import ChannelIcon from '@mui/icons-material/Forum';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import PersonIcon from '@mui/icons-material/Person';
import AuthContext from '../contexts/AuthContext';

function Navbar({ toggleDarkMode }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    
    setTimeout(() => {
      navigate('/login');
    }, 100);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate('/channels')}
        >
          Programming Chat Tool
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button 
            color="inherit" 
            startIcon={<ChannelIcon />}
            component={Link} 
            to="/channels"
          >
            Channels
          </Button>

          <Button 
            color="inherit" 
            startIcon={<SearchIcon />}
            component={Link} 
            to="/search"
          >
            Search
          </Button>

          <Button 
            color="inherit" 
            startIcon={<PersonIcon />}
            component={Link} 
            to="/profile"
          >
            {user?.displayName || 'Profile'}
          </Button>

          <IconButton color="inherit" onClick={toggleDarkMode}>
            <Brightness4Icon />
          </IconButton>

          {user?.role === 'admin' && (
            <Button 
              color="inherit" 
              component={Link} 
              to="/admin"
            >
              Admin Panel
            </Button>
          )}

          <Button 
            color="inherit" 
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;