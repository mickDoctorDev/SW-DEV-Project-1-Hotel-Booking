const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    actor: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    target: { type: mongoose.Schema.ObjectId, required: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
