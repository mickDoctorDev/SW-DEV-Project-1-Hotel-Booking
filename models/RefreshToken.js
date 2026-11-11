const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, expires: 0 } // TTL: mongo deletes at expiresAt
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
