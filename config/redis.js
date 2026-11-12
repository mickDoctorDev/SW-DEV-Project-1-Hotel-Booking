// Shared Redis client for the rate limiter (REDIS_URL, e.g. redis://127.0.0.1:6379 from `npm run redis`).
// Commands fail fast while Redis is unreachable (no offline queue), so the limiter can fall back to memory
// instead of making every request wait.
const { createClient } = require('redis');

let client = null;
let ready = false;
let lastError = 0;

const logOnce = (msg) => {
    if (Date.now() - lastError > 60000) console.error(msg);
    lastError = Date.now();
};

exports.connectRedis = async () => {
    if (!process.env.REDIS_URL) {
        console.log('REDIS_URL not set: rate limits are kept in memory (single server only)');
        return null;
    }
    client = createClient({
        url: process.env.REDIS_URL,
        disableOfflineQueue: true,
        socket: { connectTimeout: 3000, reconnectStrategy: (retries) => Math.min(retries * 500, 5000) },
    });
    client.on('ready', () => { ready = true; console.log('Redis connected: rate limits are shared and survive restarts'); });
    client.on('end', () => { ready = false; });
    client.on('error', (e) => { ready = false; logOnce(`Redis unavailable (${e.code || e.message}): rate limits fall back to memory`); });
    client.connect().catch(() => { /* reported by the error handler; reconnects in the background */ });
    return client;
};

// The client when it can take commands right now, otherwise null.
exports.redis = () => (ready && client && client.isReady ? client : null);

exports.disconnectRedis = async () => { if (client) await client.quit().catch(() => { }); };
