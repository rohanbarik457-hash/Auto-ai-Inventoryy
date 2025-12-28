const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    gstNumber: { type: String },
    address: { type: String },
    ownerId: { type: String, required: true },
    settings: {
        currency: { type: String, default: 'INR' },
        timezone: { type: String, default: 'Asia/Kolkata' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Business', BusinessSchema);
