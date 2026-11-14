// Sliding-window-log rate limiting: a key may make at most `limit` hits in ANY `windowMs` period.
// Unlike a fixed window (which allows up to 2x the limit around a window boundary), this is exact, which is
// what "maximum 5 booking attempts per minute" requires.
//
// Counters live in this server's memory: fine for one server, reset on restart.
// shortcut: per-process counters, move to a shared store (e.g. Redis) when running several servers.
//
// Operations (both return { allowed, remaining, retryAfterMs }):
//  - hit(key)  : record a hit if under the limit (allowed=false and nothing recorded when over)
//  - peek(key) : only check, record nothing (used by "count only failures" limiters before the request runs)
//  - add(key)  : record a hit unconditionally (used after the response, e.g. a failed login)

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

exports.createWindow = ({ limit, windowMs }) => {
    const run = async (key, mode) => memory.run(key, limit, windowMs, mode);
    return { hit: (k) => run(k, 'hit'), peek: (k) => run(k, 'peek'), add: (k) => run(k, 'add'), limit, windowMs };
};

exports.MemoryStore = MemoryStore;
