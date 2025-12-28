const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    resource: { type: String, required: true }, // e.g., 'Product', 'User'
    resourceId: { type: String },
    details: { type: Object }, // Changed fields or snapshot
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
