const express = require('express');
const { chat } = require('../controllers/chat');
const { protect, authorize } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Registered users only (Additional Req 3). The conversation history is larger than other request bodies,
// so this route parses JSON itself with a 32kb cap (server.js skips the global 10kb parser for /api/v1/chat).
// Auth and rate limit run first, so anonymous or flooding clients are rejected before their body is parsed.
router.post('/', protect, authorize('user', 'admin'), chatLimiter, express.json({ limit: '32kb' }), chat);

module.exports = router;
