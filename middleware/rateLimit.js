// Rate limiting with an exact sliding window (utils/slidingWindow.js). Counters live in this server's memory.
//
// Two kinds of limiters:
//  - count every request (booking attempts, chat messages, global traffic)
//  - count only some OUTCOMES (failed logins, created accounts): normal use never uses up the allowance,
//    so legitimate users and repeated demo runs are not locked out, while brute force and spam still are.
//
// IPs come from req.ip; server.js only trusts X-Forwarded-For from TRUST_PROXY hops, so it can't be spoofed.

const crypto = require('crypto');
const { createWindow } = require('../utils/slidingWindow');

const MIN = 60 * 1000;
// emails are hashed so the rate-limit store never holds personal data
const emailKey = (req) => {
    const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return crypto.createHash('sha256').update(email).digest('hex').slice(0, 24);
};

const limiter = ({ name, limit, windowMs, key, countWhen, message }) => {
    const win = createWindow({ limit, windowMs });
    return async (req, res, next) => {
        const k = `${name}:${key(req)}`;
        let result;
        try {
            result = countWhen ? await win.peek(k) : await win.hit(k);
        } catch {
            return next(); // never block traffic because the limiter itself failed
        }
        res.set({ 'RateLimit-Limit': String(limit), 'RateLimit-Remaining': String(result.remaining) });
        if (!result.allowed) {
            const seconds = Math.max(Math.ceil(result.retryAfterMs / 1000), 1);
            res.set({ 'Retry-After': String(seconds), 'RateLimit-Reset': String(seconds) });
            return res.status(429).json({ success: false, message });
        }
        if (countWhen) res.on('finish', () => { if (countWhen(res.statusCode)) win.add(k).catch(() => { }); });
        next();
    };
};
exports.limiter = limiter;

const user = (req) => req.user.id;
const ip = (req) => req.ip;

// Requirement (Additional Req 1): at most 5 booking attempts per minute per user. Every attempt counts,
// including rejected ones. Mount AFTER protect so req.user is set.
exports.bookingLimiter = limiter({
    name: 'booking', limit: 5, windowMs: MIN, key: user,
    message: 'Too many booking attempts, please try again in a minute',
});

// Chatbot: every message costs AI-API quota.
exports.chatLimiter = limiter({
    name: 'chat', limit: 10, windowMs: MIN, key: user,
    message: 'Too many chat messages, please wait a minute',
});

// Password guessing on one account: 10 wrong passwords per 15 minutes per IP + email.
exports.loginAccountLimiter = limiter({
    name: 'login-acct', limit: 10, windowMs: 15 * MIN, key: (req) => `${ip(req)}:${emailKey(req)}`,
    countWhen: (status) => status === 401,
    message: 'Too many failed logins for this account, please try again later',
});

// Credential stuffing (many accounts from one IP): 50 wrong passwords per 15 minutes per IP.
exports.loginIpLimiter = limiter({
    name: 'login-ip', limit: 50, windowMs: 15 * MIN, key: ip,
    countWhen: (status) => status === 401,
    message: 'Too many failed logins, please try again later',
});

// Fake-account spam: 20 created accounts per hour per IP (validation errors don't count).
exports.registerLimiter = limiter({
    name: 'register', limit: 20, windowMs: 60 * MIN, key: ip,
    countWhen: (status) => status === 201,
    message: 'Too many accounts created from this network, please try again later',
});

// Password-reset emails: 10 per 15 minutes per IP + email (stops mail-bombing one address).
exports.forgotPasswordLimiter = limiter({
    name: 'forgot', limit: 10, windowMs: 15 * MIN, key: (req) => `${ip(req)}:${emailKey(req)}`,
    message: 'Too many password reset requests, please try again later',
});

// Guessing reset tokens: 20 attempts per 15 minutes per IP.
exports.resetPasswordLimiter = limiter({
    name: 'reset', limit: 20, windowMs: 15 * MIN, key: ip,
    message: 'Too many attempts, please try again later',
});

// Token refresh happens about every 15 minutes per signed-in user, so this is generous (shared NAT, many tabs).
exports.refreshLimiter = limiter({
    name: 'refresh', limit: 120, windowMs: 15 * MIN, key: ip,
    message: 'Too many requests, please try again later',
});

// Global per-IP cap for every route: far above normal browsing (each page makes a few API calls),
// still stops a single client from flooding the API.
exports.globalLimiter = limiter({
    name: 'global', limit: 1000, windowMs: 10 * MIN, key: ip,
    message: 'Too many requests, please try again later',
});
