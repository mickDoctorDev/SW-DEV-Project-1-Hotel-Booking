const AuditLog = require('../models/AuditLog');

// Fire-and-forget: a failed audit write must not break the admin action.
exports.audit = (actor, action, target, before, after) =>
    AuditLog.create({ actor, action, target, before, after }).catch((e) => console.error('audit failed:', e.message));
