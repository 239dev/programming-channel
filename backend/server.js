const express = require('express');
const cors = require('cors');
const nano = require('nano');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { setupViews } = require('./views');
const app = express();
const port = 5000;

// Comprehensive CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        console.log('CORS Origin Check:', {
            origin: origin,
            requestHeaders: arguments[1]?.headers
        });

        // Explicitly allow specific origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5000'
        ];

        // Check if origin is in allowed list or is undefined (for same-origin requests)
        const isAllowedOrigin = !origin || allowedOrigins.includes(origin);
        
        console.log('CORS Check Result:', {
            isAllowedOrigin,
            origin
        });

        callback(null, isAllowedOrigin ? origin : false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Preflight handler for OPTIONS requests
app.options('*', cors(corsOptions));

// Logging middleware for CORS and requests
app.use((req, res, next) => {
    console.log('Incoming Request:', {
        method: req.method,
        path: req.path,
        origin: req.get('origin'),
        headers: req.headers
    });
    next();
});

app.use(express.json());

// Update the upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: ' + allowedTypes.join(', ')));
    }
  }
});

// Add this line after your express setup
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT secret key
const JWT_SECRET = 'your-secret-key-here';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.error('No token provided');
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // Attach user info to request
        req.user = {
            id: user.id || user._id,
            username: user.username,
            role: user.role
        };
        
        console.log('Token authenticated for user:', {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        });
        
        next();
    });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// CouchDB connection with retry logic
const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:admin123@localhost:5984';
const maxRetries = 10;
const retryInterval = 5000; // 5 seconds

async function connectWithRetry(retries = maxRetries) {
    try {
        const db = nano(couchdbUrl);
        await db.db.list(); // Test the connection
        console.log('Successfully connected to CouchDB');
        return db;
    } catch (error) {
        if (retries > 0) {
            console.log(`Failed to connect to CouchDB. Retrying in ${retryInterval/1000} seconds... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            return connectWithRetry(retries - 1);
        }
        throw error;
    }
}

// Database names
const channelsDbName = 'channels';
const messagesDbName = 'messages';
const usersDbName = 'users';

// Create databases if they don't exist
async function setupDatabases(db) {
    try {
        await db.db.create(channelsDbName);
        await db.db.create(messagesDbName);
        await db.db.create(usersDbName);
        console.log('Databases created successfully');
    } catch (err) {
        if (err.statusCode === 412) {
            console.log('Databases already exist');
        } else {
            console.error('Error creating databases:', err);
            throw err;
        }
    }
}

// Initialize the application
async function initialize() {
    try {
        const db = await connectWithRetry();
        await setupDatabases(db);
        await setupViews(); // Set up views after databases are created

        const channelsDb = db.use(channelsDbName);
        const messagesDb = db.use(messagesDbName);
        const usersDb = db.use(usersDbName);

        // Create admin user if it doesn't exist
        try {
            await usersDb.get('admin');
        } catch (error) {
            if (error.statusCode === 404) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await usersDb.insert({
                    _id: 'admin',
                    username: 'admin',
                    email: 'admin@example.com',
                    password: hashedPassword,
                    displayName: 'System Administrator',
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    type: 'user'
                });
                console.log('Admin user created');
            }
        }

        // User routes
        app.post('/api/auth/register', async (req, res) => {
            try {
                const { username, email, password, displayName } = req.body;

                if (!username || !email || !password || !displayName) {
                    return res.status(400).json({ error: 'All fields are required' });
                }

                // Check if username exists
                const existingUser = await usersDb.view('users', 'byUsername', { key: username });
                if (existingUser.rows.length > 0) {
                    return res.status(400).json({ error: 'Username already exists' });
                }

                // Check if email exists
                const existingEmail = await usersDb.view('users', 'byEmail', { key: email });
                if (existingEmail.rows.length > 0) {
                    return res.status(400).json({ error: 'Email already exists' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const user = {
                    username,
                    email,
                    password: hashedPassword,
                    displayName,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    type: 'user'
                };

                const result = await usersDb.insert(user);
                res.json({ success: true, id: result.id });
            } catch (error) {
                console.error('Registration error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.post('/api/auth/login', async (req, res) => {
            try {
                console.log('Login Request:', req.body); // Log the incoming request
                const { username, password } = req.body;
        
                const result = await usersDb.view('users', 'byUsername', { key: username });
                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
        
                const user = await usersDb.get(result.rows[0].id);
                const validPassword = await bcrypt.compare(password, user.password);
        
                if (!validPassword) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
        
                const token = jwt.sign(
                    { id: user._id, username: user.username, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
        
                res.json({
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        displayName: user.displayName,
                        role: user.role
                    }
                });
            } catch (error) {
                console.error('Login Error:', error); // Log the error
                res.status(500).json({ error: error.message });
            }
        });

        // Token verification endpoint
        app.get('/api/auth/verify', authenticateToken, async (req, res) => {
            try {
                console.log('Token verification request:', {
                    userId: req.user.id,
                    username: req.user.username
                });
                
                // Get the full user document
                const user = await usersDb.get(req.user.id);
                
                // Prepare user response - use the same format as login endpoint
                const userResponse = {
                    id: user._id,
                    username: user.username,
                    displayName: user.displayName || user.username,
                    email: user.email || null,
                    role: user.role || 'user',
                    avatar: user.avatar || null,
                    type: user.type || 'user'
                };
                
                // Log successful verification
                console.log('Token verification successful:', {
                    userId: user._id,
                    username: user.username
                });
                
                res.json({
                    message: 'Valid token',
                    user: userResponse
                });
            } catch (error) {
                console.error('Token verification error:', {
                    userId: req.user?.id,
                    error: error.message,
                    stack: error.stack
                });
                
                res.status(401).json({
                    error: 'Invalid token',
                    details: error.message
                });
            }
        });

        // Update user profile
        app.post('/api/users/update', authenticateToken, upload.single('avatar'), async (req, res) => {
            try {
                const userId = req.user.id;
                const { displayName } = req.body;

                // Find the user in the database
                const user = await usersDb.get(userId);

                // Update user fields
                if (displayName) {
                    user.displayName = displayName;
                }

                // If an avatar is uploaded, update the avatar path
                if (req.file) {
                    // Construct the full URL for the uploaded file
                    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                    user.avatar = fileUrl;
                }

                // Save the updated user
                await usersDb.insert(user);

                res.json({
                    id: user._id,
                    displayName: user.displayName,
                    avatar: user.avatar
                });
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).json({
                    error: 'Failed to update user profile',
                    details: error.message
                });
            }
        });

        // Get user profile
        app.get('/api/users/profile', authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;

                // Find the user in the database
                const user = await usersDb.get(userId);

                // Return user profile information
                res.json({
                    id: user._id,
                    username: user.username,
                    displayName: user.displayName,
                    role: user.role,
                    email: user.email
                });
            } catch (error) {
                console.error('Profile retrieval error:', error);
                res.status(500).json({ error: 'Failed to retrieve profile' });
            }
        });

        // Admin routes
        app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
            try {
                const result = await usersDb.view('users', 'byUsername');
                const users = result.rows.map(row => ({
                    id: row.id,
                    username: row.key,
                    displayName: row.value.displayName,
                    role: row.value.role,
                    createdAt: row.value.createdAt
                }));
                res.json(users);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/admin/channels', authenticateToken, isAdmin, async (req, res) => {
            try {
                const result = await channelsDb.view('channels', 'byName');
                const channels = result.rows.map(row => row.value);
                res.json(channels);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/admin/messages', authenticateToken, isAdmin, async (req, res) => {
            try {
                const result = await messagesDb.view('messages', 'byChannel', {
                    include_docs: true
                });
                const messages = result.rows.map(row => ({
                    _id: row.doc._id,
                    content: row.doc.content,
                    userId: row.doc.userId,
                    channelId: row.doc.channelId,
                    createdAt: row.doc.createdAt,
                    parentId: row.doc.parentId
                }));
                res.json(messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.delete('/api/admin/users/:userId', authenticateToken, isAdmin, async (req, res) => {
            try {
                const { userId } = req.params;
                const user = await usersDb.get(userId);
                if (user.role === 'admin') {
                    return res.status(400).json({ error: 'Cannot delete admin user' });
                }
                await usersDb.destroy(userId, user._rev);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.delete('/api/admin/channels/:channelId', authenticateToken, isAdmin, async (req, res) => {
            try {
                const channelId = req.params.channelId;
                
                // Get the channel document
                let channel;
                try {
                    channel = await channelsDb.get(channelId);
                } catch (error) {
                    if (error.statusCode === 404) {
                        return res.status(404).json({ error: 'Channel not found' });
                    }
                    throw error;
                }
                
                // Delete all messages in the channel
                const messages = await messagesDb.view('messages', 'byChannel', { key: channelId });
                for (const message of messages.rows) {
                    try {
                        await messagesDb.destroy(message.id, message.value._rev);
                    } catch (error) {
                        console.error(`Error deleting message ${message.id}:`, error);
                        // Continue with other deletions even if one fails
                    }
                }

                // Delete the channel
                await channelsDb.destroy(channelId, channel._rev);
                res.json({ success: true });
            } catch (error) {
                console.error('Error deleting channel:', error);
                res.status(500).json({ 
                    error: 'Failed to delete channel',
                    details: error.message 
                });
            }
        });

        app.delete('/api/admin/messages/:messageId', authenticateToken, isAdmin, async (req, res) => {
            try {
                const messageId = req.params.messageId;
                
                // Get the message document
                let message;
                try {
                    message = await messagesDb.get(messageId);
                } catch (error) {
                    if (error.statusCode === 404) {
                        return res.status(404).json({ error: 'Message not found' });
                    }
                    throw error;
                }
                
                // Delete all replies to this message
                const replies = await messagesDb.view('messages', 'byParent', { key: messageId });
                for (const reply of replies.rows) {
                    try {
                        await messagesDb.destroy(reply.id, reply.value._rev);
                    } catch (error) {
                        console.error(`Error deleting reply ${reply.id}:`, error);
                        // Continue with other deletions even if one fails
                    }
                }

                // Delete the message
                await messagesDb.destroy(messageId, message._rev);
                res.json({ success: true });
            } catch (error) {
                console.error('Error deleting message:', error);
                res.status(500).json({ 
                    error: 'Failed to delete message',
                    details: error.message 
                });
            }
        });

        // Channel routes
        app.get('/api/channels', authenticateToken, async (req, res) => {
            try {
                const result = await channelsDb.view('channels', 'byName');
                const channels = result.rows.map(row => row.value);
                res.json(channels);
            } catch (error) {
                console.error('Error fetching channels:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/channels/:channelId', authenticateToken, async (req, res) => {
            try {
                const channel = await channelsDb.get(req.params.channelId);
                res.json(channel);
            } catch (error) {
                if (error.statusCode === 404) {
                    res.status(404).json({ error: 'Channel not found' });
                } else {
                    console.error('Error fetching channel:', error);
                    res.status(500).json({ error: error.message });
                }
            }
        });

        app.post('/api/channels', authenticateToken, async (req, res) => {
            try {
                const { name, description } = req.body;
                const channel = {
                    name,
                    description,
                    createdBy: req.user.id,
                    createdAt: new Date().toISOString(),
                    type: 'channel'
                };
                const result = await channelsDb.insert(channel);
                res.json({ id: result.id, ...channel });
            } catch (error) {
                console.error('Error creating channel:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Comprehensive message creation route
        app.post('/api/messages/:channelId', authenticateToken, upload.single('attachment'), async (req, res) => {
            try {
                const { channelId } = req.params;
                const { content, parentId } = req.body;
                const userId = req.user.id;
            
                // Create message object
                const message = {
                  content: content || '',
                  userId,
                  channelId,
                  createdAt: new Date().toISOString(),
                  type: 'message'
                };
            
                // Add file information if present
                if (req.file) {
                  message.attachment = {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    path: `/uploads/${req.file.filename}`
                  };
                }
            
                // Add parent info if replying
                if (parentId) {
                  message.parentId = parentId;
                }
            
                const result = await messagesDb.insert(message);
                res.status(201).json(result);
            
              } catch (error) {
                console.error('Message creation error:', error);
                res.status(500).json({ 
                  error: 'Failed to create message',
                  details: error.message 
                });
              }
            });

        app.get('/api/messages/:channelId', authenticateToken, async (req, res) => {
            try {
                const result = await messagesDb.view('messages', 'byChannel', { 
                    key: req.params.channelId, 
                    include_docs: true 
                });

                // Fetch user information for each message
                const messages = await Promise.all(result.rows.map(async (row) => {
                    try {
                        const user = await usersDb.get(row.doc.userId);
                        return {
                            _id: row.doc._id,
                            content: row.doc.content,
                            userId: row.doc.userId,
                            username: user.username,
                            displayName: user.displayName,
                            channelId: row.doc.channelId,
                            createdAt: row.doc.createdAt,
                            parentId: row.doc.parentId,
                            depth: row.doc.depth || 0,
                            rootId: row.doc.rootId,
                            ratings: row.doc.ratings || { up: 0, down: 0 },
                            userRatings: row.doc.userRatings || {},
                            attachment: row.doc.attachment
                        };
                    } catch (error) {
                        console.error(`Error fetching user for message ${row.doc._id}:`, error);
                        return {
                            _id: row.doc._id,
                            content: row.doc.content,
                            userId: row.doc.userId,
                            username: 'Unknown User',
                            displayName: 'Unknown User',
                            channelId: row.doc.channelId,
                            createdAt: row.doc.createdAt,
                            parentId: row.doc.parentId,
                            depth: row.doc.depth || 0,
                            rootId: row.doc.rootId,
                            ratings: row.doc.ratings || { up: 0, down: 0 },
                            userRatings: row.doc.userRatings || {},
                            attachment: row.doc.attachment
                        };
                    }
                }));

                // Sort messages by depth and creation time
                messages.sort((a, b) => {
                    if (a.depth !== b.depth) {
                        return a.depth - b.depth;
                    }
                    return new Date(a.createdAt) - new Date(b.createdAt);
                });

                res.json(messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                res.status(500).json({ 
                    error: 'Failed to fetch messages',
                    details: error.message 
                });
            }
        });

        // Get replies for a message
        app.get('/api/messages/:messageId/replies', authenticateToken, async (req, res) => {
            try {
                const result = await messagesDb.view('messages', 'byParent', {
                    key: req.params.messageId,
                    include_docs: true
                });
                
                // Fetch user information for each reply
                const replies = await Promise.all(result.rows.map(async (row) => {
                    const user = await usersDb.get(row.doc.userId);
                    return {
                        _id: row.doc._id,
                        content: row.doc.content,
                        userId: row.doc.userId,
                        username: user.username,
                        displayName: user.displayName,
                        channelId: row.doc.channelId,
                        createdAt: row.doc.createdAt,
                        parentId: row.doc.parentId,
                        ratings: row.doc.ratings || { up: 0, down: 0 },
                        userRatings: row.doc.userRatings || {}
                    };
                }));
                res.json(replies);
            } catch (error) {
                console.error('Error fetching replies:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Message rating route
        app.post('/api/messages/:messageId/rate', authenticateToken, async (req, res) => {
            try {
                const { messageId } = req.params;
                const { rating } = req.body;
                const userId = req.user.id;

                // Validate rating
                if (rating !== 1 && rating !== -1) {
                    return res.status(400).json({ error: 'Invalid rating value' });
                }

                // Get the message
                let message;
                try {
                    message = await messagesDb.get(messageId);
                } catch (error) {
                    if (error.statusCode === 404) {
                        return res.status(404).json({ error: 'Message not found' });
                    }
                    throw error;
                }

                // Initialize ratings if they don't exist
                if (!message.ratings) {
                    message.ratings = { up: 0, down: 0 };
                }
                if (!message.userRatings) {
                    message.userRatings = {};
                }

                // Remove previous rating if it exists
                const previousRating = message.userRatings[userId];
                if (previousRating) {
                    if (previousRating === 1) {
                        message.ratings.up = Math.max(0, message.ratings.up - 1);
                    } else if (previousRating === -1) {
                        message.ratings.down = Math.max(0, message.ratings.down - 1);
                    }
                }

                // Add new rating
                message.userRatings[userId] = rating;
                if (rating === 1) {
                    message.ratings.up++;
                } else {
                    message.ratings.down++;
                }

                // Save the updated message
                await messagesDb.insert(message);

                res.json({
                    ratings: message.ratings,
                    userRating: rating
                });
            } catch (error) {
                console.error('Error rating message:', error);
                res.status(500).json({ 
                    error: 'Failed to rate message',
                    details: error.message 
                });
            }
        });

        // Search messages by content
        app.get('/api/search/messages', authenticateToken, async (req, res) => {
            try {
                const { query, userId, sortBy } = req.query;

                // Build the search query
                const searchOptions = {
                    selector: {},
                    fields: ['_id', 'content', 'userId', 'displayName', 'channelId', 'createdAt', 'ratings', 'depth'],
                    limit: 100
                };

                // Filter by content if query is provided
                if (query) {
                    searchOptions.selector.content = { $regex: new RegExp(query, 'i') };
                }

                // Filter by user if userId is provided
                if (userId) {
                    searchOptions.selector.userId = userId;
                }

                // Perform the search
                const result = await messagesDb.find(searchOptions);

                // Process search results
                const searchResults = await Promise.all(result.docs.map(async (message) => {
                    try {
                        const user = await usersDb.get(message.userId);
                        return {
                            _id: message._id,
                            content: message.content,
                            userId: message.userId,
                            displayName: user.displayName,
                            channelId: message.channelId,
                            createdAt: message.createdAt,
                            ratings: message.ratings,
                            depth: message.depth
                        };
                    } catch (userError) {
                        console.error(`Error fetching user for message ${message._id}:`, userError);
                        return message;
                    }
                }));

                // Sort results if requested
                if (sortBy) {
                    switch (sortBy) {
                        case 'mostRated':
                            searchResults.sort((a, b) => 
                                (b.ratings.up - b.ratings.down) - (a.ratings.up - a.ratings.down)
                            );
                            break;
                        case 'leastRated':
                            searchResults.sort((a, b) => 
                                (a.ratings.up - a.ratings.down) - (b.ratings.up - b.ratings.down)
                            );
                            break;
                        case 'newest':
                            searchResults.sort((a, b) => 
                                new Date(b.createdAt) - new Date(a.createdAt)
                            );
                            break;
                        case 'oldest':
                            searchResults.sort((a, b) => 
                                new Date(a.createdAt) - new Date(b.createdAt)
                            );
                            break;
                    }
                }

                res.json(searchResults);
            } catch (error) {
                console.error('Error searching messages:', error);
                res.status(500).json({ 
                    error: 'Failed to search messages',
                    details: error.message 
                });
            }
        });

        // User statistics route
        app.get('/api/search/user-stats', authenticateToken, async (req, res) => {
            try {
                // Get all messages
                const result = await messagesDb.list({ include_docs: true });

                // Aggregate user statistics
                const userStats = result.rows.reduce((stats, row) => {
                    const message = row.doc;
                    
                    if (!stats[message.userId]) {
                        stats[message.userId] = {
                            userId: message.userId,
                            displayName: message.displayName,
                            totalPosts: 0,
                            totalRootPosts: 0,
                            totalReplies: 0,
                            totalUpvotes: 0,
                            totalDownvotes: 0
                        };
                    }

                    const userStat = stats[message.userId];
                    userStat.totalPosts++;
                    
                    // Distinguish root posts and replies
                    if (message.depth === 0) {
                        userStat.totalRootPosts++;
                    } else {
                        userStat.totalReplies++;
                    }

                    // Aggregate ratings
                    userStat.totalUpvotes += message.ratings?.up || 0;
                    userStat.totalDownvotes += message.ratings?.down || 0;

                    return stats;
                }, {});

                // Convert to array and sort
                const sortedStats = Object.values(userStats).sort((a, b) => 
                    b.totalPosts - a.totalPosts
                );

                res.json(sortedStats);
            } catch (error) {
                console.error('Error fetching user statistics:', error);
                res.status(500).json({ 
                    error: 'Failed to fetch user statistics',
                    details: error.message 
                });
            }
        });

        // Get message suggestions based on query
        app.get('/api/search/suggestions', authenticateToken, async (req, res) => {
            try {
                const { query } = req.query;

                // Build the search query
                const searchOptions = {
                    selector: {},
                    fields: ['_id', 'content'],
                    limit: 10
                };

                // Filter by content if query is provided
                if (query) {
                    searchOptions.selector.content = { $regex: new RegExp(query, 'i') };
                }

                // Perform the search
                const result = await messagesDb.find(searchOptions);

                // Process search results
                const suggestions = result.docs.map(message => message.content);

                res.json(suggestions);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
                res.status(500).json({ 
                    error: 'Failed to fetch suggestions',
                    details: error.message 
                });
            }
        });

        // Dedicated file upload route with comprehensive logging
        app.post('/api/messages/upload', authenticateToken, upload.single('file'), async (req, res) => {
            try {
                console.log('File Upload Request:', {
                    headers: req.headers,
                    file: req.file,
                    body: req.body
                });

                if (!req.file) {
                    console.error('No file uploaded');
                    return res.status(400).json({ error: 'No file uploaded' });
                }

                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                console.log('File uploaded successfully:', fileUrl);

                res.json({
                    success: true,
                    fileUrl: fileUrl,
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype
                });
            } catch (error) {
                console.error('File Upload Error:', error);
                res.status(500).json({
                    error: 'File upload failed',
                    details: error.message
                });
            }
        });

        // Basic route
        app.get('/', (req, res) => {
            res.send('Backend is running');
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error('Initialization error:', error);
        process.exit(1);
    }
}

// Add this after your routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer Error:', err);
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

initialize();