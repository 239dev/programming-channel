const nano = require('nano');

const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:admin123@localhost:5984';
const db = nano(couchdbUrl);

const messagesView = {
  map: function(doc) {
    if (doc.type === 'message') {
      emit([doc.channelId, doc.parentId || null, doc.createdAt], {
        content: doc.content,
        userId: doc.userId,
        username: doc.username,
        displayName: doc.displayName,
        createdAt: doc.createdAt,
        depth: doc.depth || 0,
        ratings: doc.ratings || { up: 0, down: 0 },
        userRatings: doc.userRatings || {},
        attachment: doc.attachment
      });
    }
  }
};

async function setupViews() {
    try {
        // Users views
        await db.use('users').insert({
            _id: '_design/users',
            views: {
                byUsername: {
                    map: function(doc) {
                        if (doc.type === 'user') {
                            emit(doc.username, {
                                displayName: doc.displayName,
                                role: doc.role,
                                createdAt: doc.createdAt
                            });
                        }
                    }
                }
            }
        });

        // Channels views
        await db.use('channels').insert({
            _id: '_design/channels',
            views: {
                byName: {
                    map: function(doc) {
                        if (doc.type === 'channel') {
                            emit(doc.name, {
                                description: doc.description,
                                createdBy: doc.createdBy,
                                createdAt: doc.createdAt
                            });
                        }
                    }
                }
            }
        });

        // Messages views
        await db.use('messages').insert({
            _id: '_design/messages',
            views: {
                byChannel: messagesView,
                byParent: {
                    map: function(doc) {
                        if (doc.type === 'message' && doc.parentId) {
                            emit(doc.parentId, {
                                content: doc.content,
                                userId: doc.userId,
                                username: doc.username,
                                displayName: doc.displayName,
                                createdAt: doc.createdAt,
                                depth: doc.depth || 0,
                                rootId: doc.rootId,
                                ratings: doc.ratings || { up: 0, down: 0 },
                                userRatings: doc.userRatings || {}
                            });
                        }
                    }
                },
                byRoot: {
                    map: function(doc) {
                        if (doc.type === 'message') {
                            emit(doc.rootId || doc._id, {
                                content: doc.content,
                                userId: doc.userId,
                                username: doc.username,
                                displayName: doc.displayName,
                                createdAt: doc.createdAt,
                                parentId: doc.parentId,
                                depth: doc.depth || 0,
                                rootId: doc.rootId,
                                ratings: doc.ratings || { up: 0, down: 0 },
                                userRatings: doc.userRatings || {}
                            });
                        }
                    }
                }
            }
        });

        console.log('Views set up successfully');
    } catch (error) {
        if (error.statusCode === 409) {
            console.log('Views already exist');
        } else {
            console.error('Error setting up views:', error);
            throw error;
        }
    }
}

module.exports = { setupViews };