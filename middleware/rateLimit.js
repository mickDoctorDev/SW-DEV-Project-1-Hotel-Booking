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

// Brute-force guard on login/register, per IP (trust proxy is set in server.js, so X-Forwarded-For is only trusted from known proxies).
exports.authLimiter = make({
    windowMs: 15 * 60 * 1000, limit: 20,
    message: 'Too many attempts, please try again later',
});
