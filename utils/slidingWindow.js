// Sliding-window-log rate limiting: a key may make at most `limit` hits in ANY `windowMs` period.
// Unlike a fixed window (which allows up to 2x the limit around a window boundary), this is exact, which is
// what "maximum 5 booking attempts per minute" requires.
//
// Two stores with the same behaviour:
//  - Redis (shared by every server, survives restarts): one sorted set per key, updated atomically in Lua
//  - memory (fallback when Redis is not configured or is down)
//
// Operations (both return { allowed, remaining, retryAfterMs }):
//  - hit(key)  : record a hit if under the limit (allowed=false and nothing recorded when over)
//  - peek(key) : only check, record nothing (used by "count only failures" limiters before the request runs)
//  - add(key)  : record a hit unconditionally (used after the response, e.g. a failed login)

const crypto = require('crypto');

// KEYS[1] = key; ARGV = limit, windowMs, mode (hit | peek | add). Time comes from the Redis server, so several
// API servers with slightly different clocks still agree.
const LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local mode = ARGV[3]
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
local allowed = 1
if mode == 'peek' then
  if count >= limit then allowed = 0 end
elseif mode == 'hit' and count >= limit then
  allowed = 0
else
  redis.call('ZADD', key, now, now .. '-' .. ARGV[4])
  count = count + 1
  redis.call('PEXPIRE', key, window)
end
local retry = 0
if allowed == 0 then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  retry = tonumber(oldest[2]) + window - now
end
return { allowed, limit - count, retry }
`;

class MemoryStore {
    constructor() { this.hits = new Map(); }

    run(key, limit, windowMs, mode, now = Date.now()) {
        const list = (this.hits.get(key) || []).filter((ts) => ts > now - windowMs);
        let allowed = true;
        if (mode === 'peek') allowed = list.length < limit;
        else if (mode === 'hit' && list.length >= limit) allowed = false;
        else list.push(now);
        if (list.length) this.hits.set(key, list); else this.hits.delete(key);
        // drop idle keys now and then so memory stays bounded
        if (this.hits.size > 10000) for (const [k, v] of this.hits) if (!v.some((ts) => ts > now - windowMs)) this.hits.delete(k);
        return {
            allowed,
            remaining: Math.max(limit - list.length, 0),
            retryAfterMs: allowed ? 0 : Math.max(list[0] + windowMs - now, 0),
        };
    }
}

const memory = new MemoryStore();

const runRedis = async (client, key, limit, windowMs, mode) => {
    const [allowed, remaining, retry] = await client.eval(LUA, {
        keys: [key],
        arguments: [String(limit), String(windowMs), mode, crypto.randomBytes(6).toString('hex')],
    });
    return { allowed: allowed === 1, remaining: Math.max(Number(remaining), 0), retryAfterMs: Math.max(Number(retry), 0) };
};

// getRedis: () => client | null. Redis errors fall back to the memory store for that call.
exports.createWindow = ({ limit, windowMs, getRedis }) => {
    const run = async (key, mode) => {
        const client = getRedis && getRedis();
        if (client) {
            try { return await runRedis(client, `rl:${key}`, limit, windowMs, mode); } catch { /* fall through to memory */ }
        }
        return memory.run(key, limit, windowMs, mode);
    };
    return { hit: (k) => run(k, 'hit'), peek: (k) => run(k, 'peek'), add: (k) => run(k, 'add'), limit, windowMs };
};

exports.MemoryStore = MemoryStore;
exports.LUA = LUA;
