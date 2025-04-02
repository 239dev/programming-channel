import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Pagination,
  Tabs,
  Tab
} from '@mui/material';
import axios from '../utils/axios';

const SearchPage = () => {
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('content');
  const [sortBy, setSortBy] = useState('relevance');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedChannel, setSelectedChannel] = useState('');

  // Channels
  const [channels, setChannels] = useState([]);

  // Search results
  const [searchResults, setSearchResults] = useState([]);
  const [userStats, setUserStats] = useState({
    mostPosts: [],
    leastPosts: [],
    highestRanked: [],
    lowestRanked: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch channels
  const fetchChannels = async () => {
    try {
      const response = await axios.get('/api/channels', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setChannels(response.data);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setError('Failed to fetch channels');
    }
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const response = await axios.get('/api/users/stats', {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Validate response structure
      const validateStatsArray = (statsArray) => {
        if (!Array.isArray(statsArray)) {
          console.warn('Invalid stats array:', statsArray);
          return [];
        }
        return statsArray.map(user => {
          return {
            displayName: user.displayName || 'Unknown User',
            totalMessages: user.totalMessages ?? 0,
            rootPosts: user.rootPosts ?? 0,
            replies: user.replies ?? 0,
            rating: user.rating ?? 0,
            upvotes: user.upvotes ?? 0,
            downvotes: user.downvotes ?? 0
          };
        });
      };

      // Set user statistics with comprehensive validation
      setUserStats({
        mostPosts: validateStatsArray(response.data.mostPosts),
        leastPosts: validateStatsArray(response.data.leastPosts),
        highestRanked: validateStatsArray(response.data.highestRanked),
        lowestRanked: validateStatsArray(response.data.lowestRanked)
      });

      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to fetch user statistics');
    }
  };

  // Perform search
  const handleSearch = async () => {
    // Validate search query
    if (!searchQuery || searchQuery.trim() === '') {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/search/messages', {
        params: {
          query: searchQuery,
          type: searchType,
          sortBy,
          order,
          page,
          channelId: selectedChannel,
          limit: 10
        },
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Validate response
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid search response structure:', response.data);
        throw new Error('Invalid search response format');
      }

      // Check if messages array is empty
      if (response.data.length === 0) {
        setError('No results found. Try a different search query.');
      }

      setSearchResults(response.data);
      setTotalPages(Math.ceil(response.data.length / 10)); // Basic pagination
    } catch (err) {
      console.error('Search error:', err);
      
      let errorMessage = 'Search failed. Please try again later.';
      
      if (err.response) {
        errorMessage = err.response.data.details || 
                       err.response.data.error || 
                       errorMessage;
      } else if (err.request) {
        errorMessage = 'No response from server. Check your network connection.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Search request timed out. Please try again.';
      }
      
      setError(errorMessage);
      setSearchResults([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchChannels();
    fetchUserStats();
  }, []);

  // Render search results
  const renderSearchResults = () => {
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return <p>No results found.</p>;
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Content</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Ratings (Up/Down)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((result, index) => {
              const upvotes = result.ratings?.up ?? 0;
              const downvotes = result.ratings?.down ?? 0;

              return (
                <TableRow key={result._id || index}>
                  <TableCell>{result.content}</TableCell>
                  <TableCell>{result.channelName || 'Unknown Channel'}</TableCell>
                  <TableCell>
                    {result.displayName || `User ${result.userId.slice(0, 8)}`}
                  </TableCell>
                  <TableCell>
                    {new Date(result.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {upvotes} / {downvotes}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render user statistics
  const renderUserStats = () => {
    // Existing renderUserStats implementation
    if (!userStats || !userStats.highestRanked) {
      return <Typography variant="body1">No user statistics available</Typography>;
    }

    // Existing renderStatsTable implementation
    const renderStatsTable = (title, data, columns) => {
      return (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{user.displayName || 'Unknown User'}</TableCell>
                      {columns.slice(1).map((col) => {
                        const propertyName = col.toLowerCase().replace(/\s/g, '');
                        const value = user[propertyName] ?? 'N/A';
                        return <TableCell key={col}>{value}</TableCell>;
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    };

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Most Active Users', 
            userStats.mostPosts || [], 
            ['Display Name', 'Total Messages', 'Root Posts', 'Replies']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Least Active Users', 
            userStats.leastPosts || [], 
            ['Display Name', 'Total Messages', 'Root Posts', 'Replies']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Highest Ranked Users', 
            userStats.highestRanked || [], 
            ['Display Name', 'Rating', 'Upvotes', 'Downvotes']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Lowest Ranked Users', 
            userStats.lowestRanked || [], 
            ['Display Name', 'Rating', 'Upvotes', 'Downvotes']
          )}
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Search
      </Typography>

      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        centered
        sx={{ mb: 2 }}
      >
        <Tab label="Search Messages" />
        <Tab label="User Statistics" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Search Query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Channel</InputLabel>
                <Select
                  value={selectedChannel}
                  label="Channel"
                  onChange={(e) => setSelectedChannel(e.target.value)}
                >
                  <MenuItem value="">All Channels</MenuItem>
                  {channels.map((channel) => (
                    <MenuItem key={channel._id} value={channel._id}>
                      {channel.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Search Type</InputLabel>
                <Select
                  value={searchType}
                  label="Search Type"
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <MenuItem value="content">Content</MenuItem>
                  <MenuItem value="username">Username</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="newest">Newest</MenuItem>
                  <MenuItem value="oldest">Oldest</MenuItem>
                  <MenuItem value="mostRated">Most Rated</MenuItem>
                  <MenuItem value="leastRated">Least Rated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSearch}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          {searchResults.length > 0 && (
            <>
              {renderSearchResults()}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => {
                    setPage(value);
                    handleSearch();
                  }}
                  color="primary"
                />
              </Box>
            </>
          )}
        </>
      )}

      {activeTab === 1 && renderUserStats()}
    </Box>
  );
};

export default SearchPage;
