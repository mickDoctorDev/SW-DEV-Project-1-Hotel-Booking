const rateLimit = require('express-rate-limit');

const make = (opts) => rateLimit({
    standardHeaders: true, // sends Retry-After / RateLimit-* on 429
    legacyHeaders: false,
    ...opts,
    handler: (req, res) => res.status(429).json({ success: false, message: opts.message })
});

// Req: max 5 booking attempts per minute per user. Mount AFTER protect so req.user is set.
exports.bookingLimiter = make({
    windowMs: 60 * 1000, limit: 5,
    keyGenerator: (req) => `u:${req.user.id}`,
    message: 'Too many booking attempts, please try again in a minute',
});

// Chatbot: every message costs AI-API quota, so cap it per user. Mount AFTER protect.
exports.chatLimiter = make({
    windowMs: 60 * 1000, limit: 10,
    keyGenerator: (req) => `chat:${req.user.id}`,
    message: 'Too many chat messages, please wait a minute',
});

// Dev/demo switch: RELAX_RATE_LIMITS=true skips the auth and global limiters so repeated Newman rehearsals
// are not locked out. Ignored in production. The booking limiter above is a requirement and is never skipped.
const relaxed = () => process.env.RELAX_RATE_LIMITS === 'true' && process.env.NODE_ENV !== 'production';
exports.relaxed = relaxed;

// Brute-force guard on login/register, per IP (trust proxy is set in server.js, so X-Forwarded-For is only trusted from known proxies).
exports.authLimiter = make({
    windowMs: 15 * 60 * 1000, limit: 20,
    skip: relaxed,
    message: 'Too many attempts, please try again later',
});

// Global per-IP limiter for every route.
exports.globalLimiter = make({
    windowMs: 10 * 60 * 1000, limit: 100,
    skip: relaxed,
    message: 'Too many requests, please try again later',
});
