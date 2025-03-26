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

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      // Increase timeout and add more robust error handling
      const response = await axios.get('/api/users/stats', {
        timeout: 15000, // Increased timeout to 15 seconds
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Extensive logging of response
      console.log('=== USER STATS RESPONSE ===');
      console.log('Full Response:', response);
      console.log('Response Data:', response.data);

      // Validate response structure
      const validateStatsArray = (statsArray) => {
        if (!Array.isArray(statsArray)) {
          console.warn('Invalid stats array:', statsArray);
          return [];
        }
        return statsArray.map(user => {
          // Ensure all expected properties exist
          return {
            displayName: user.displayName || 'Unknown User',
            totalMessages: user.totalMessages ?? 0,
            rootPosts: user.rootPosts ?? 0,
            replies: user.replies ?? 0,
            classification: user.classification || 'UNCLASSIFIED'
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
      // Comprehensive error handling
      console.error('=== USER STATS FETCH ERROR ===');
      console.error('Full Error Object:', error);
      
      // Check for specific error types
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server Response Error:', error.response.data);
        setError(`Server Error: ${error.response.status} - ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No Response Received:', error.request);
        setError('No response received from server. Please check your network connection.');
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        console.error('Request Timeout');
        setError('Request timed out. The server might be experiencing high load.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Unexpected Error:', error.message);
        setError(`Unexpected error: ${error.message}`);
      }

      // Set default empty statistics to prevent rendering errors
      setUserStats({
        mostPosts: [],
        leastPosts: [],
        highestRanked: [],
        lowestRanked: []
      });
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
      console.log('Searching with parameters:', {
        query: searchQuery,
        type: searchType,
        sortBy,
        order,
        page,
        limit: 10
      });

      const response = await axios.get('/api/search/messages', {
        params: {
          query: searchQuery,
          type: searchType,
          sortBy,
          order,
          page,
          limit: 10  // Consistent with backend
        },
        // Add timeout to prevent hanging requests
        timeout: 10000
      });

      // Validate response
      if (!response.data || !Array.isArray(response.data.messages)) {
        console.error('Invalid search response structure:', response.data);
        throw new Error('Invalid search response format');
      }

      // Log search results for debugging
      console.log('Search Results:', response.data);

      // Check if messages array is empty
      if (response.data.messages.length === 0) {
        setError('No results found. Try a different search query.');
      }

      setSearchResults(response.data.messages);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      // Log full error details
      console.error('Full Error Object:', err);
      console.error('Error Response:', err.response);
      
      // More detailed error handling
      let errorMessage = 'Search failed. Please try again later.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        errorMessage = err.response.data.details || 
                       err.response.data.error || 
                       errorMessage;
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Check your network connection.';
      } else if (err.code === 'ECONNABORTED') {
        // Request timeout
        errorMessage = 'Search request timed out. Please try again.';
      }
      
      // Log specific error details
      console.error('Detailed Error Message:', errorMessage);
      
      setError(errorMessage);
      setSearchResults([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and stats fetch
  useEffect(() => {
    fetchUserStats();
  }, []);

  // Render search results with robust error handling
  const renderSearchResults = () => {
    // Ensure searchResults is an array and not empty
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return <p>No results found.</p>;
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Content</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Ratings (Up/Down)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((result, index) => {
              // Robust handling of ratings
              const upvotes = result.ratings?.up ?? 0;
              const downvotes = result.ratings?.down ?? 0;

              return (
                <TableRow key={result._id || index}>
                  <TableCell>{result.content}</TableCell>
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

  // Render user statistics with robust error handling
  const renderUserStats = () => {
    // Ensure userStats exists and has the required properties
    if (!userStats || !userStats.highestRanked) {
      return <Typography variant="body1">No user statistics available</Typography>;
    }

    // Helper function to render a user stats table
    const renderStatsTable = (title, data, columns) => {
      // Log data for debugging
      console.log(`${title} Data:`, data);

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
                  data.map((user, index) => {
                    // Log each user for debugging
                    console.log(`User ${index}:`, user);

                    return (
                      <TableRow key={index}>
                        <TableCell>{user.displayName || 'Unknown User'}</TableCell>
                        {columns.slice(1).map((col) => {
                          // Robust handling of different column types
                          const normalizedCol = col.toLowerCase().replace(/\s/g, '');
                          const value = user[normalizedCol] ?? user[col] ?? 'N/A';
                          
                          // Additional logging for problematic columns
                          if (value === 'N/A') {
                            console.warn(`Undefined value for column ${col} in user:`, user);
                          }

                          return <TableCell key={col}>{value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })
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
            ['Display Name', 'Total Messages', 'Root Posts', 'Replies', 'Classification']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Least Active Users', 
            userStats.leastPosts || [], 
            ['Display Name', 'Total Messages', 'Root Posts', 'Replies', 'Classification']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Highest Ranked Users', 
            userStats.highestRanked || [], 
            ['Display Name', 'Net Rating', 'Upvotes', 'Downvotes', 'Classification']
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderStatsTable('Lowest Ranked Users', 
            userStats.lowestRanked || [], 
            ['Display Name', 'Net Rating', 'Upvotes', 'Downvotes', 'Classification']
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
            <Grid item xs={12} sm={4}>
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
                  <MenuItem value="relevance">Relevance</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="rating">Rating</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={order}
                  label="Order"
                  onChange={(e) => setOrder(e.target.value)}
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
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
