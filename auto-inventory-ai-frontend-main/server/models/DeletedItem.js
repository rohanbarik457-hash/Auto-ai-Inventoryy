const mongoose = require('mongoose');

const DeletedItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // ID of the deletion record
    originalId: { type: String, required: true }, // ID of the original document
    collectionName: { type: String, required: true }, // e.g., 'Product', 'User'
    document: { type: Object, required: true }, // Full snapshot of data
    deletedBy: { type: String, default: 'unknown' }, // User ID who deleted it
    deletedAt: { type: Date, default: Date.now }
});

// Create TTL index on deletedAt field (expire after 30 days)
// 30 days * 24 hours * 60 minutes * 60 seconds = 2592000 seconds
DeletedItemSchema.index({ "deletedAt": 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('DeletedItem', DeletedItemSchema);
