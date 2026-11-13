const test = require('node:test');
const assert = require('node:assert');
const { createCheckinToken, verifyCheckinToken } = require('../utils/checkinToken');
const { MemoryStore } = require('../utils/slidingWindow');

process.env.CHECKIN_TOKEN_SECRET = 'test-secret-that-is-long-enough-123456';
const booking = { _id: '6af4389bf3bc4694b27cd845', payment: { reference: 'PAY-F7AC07D225AB' } };

test('check-in token round-trips', () => {
    const token = createCheckinToken(booking);
    assert.match(token, /^HB1\.6af4389bf3bc4694b27cd845\.PAY-F7AC07D225AB\.[A-Za-z0-9_-]{43}$/);
    assert.deepStrictEqual(verifyCheckinToken(token), { bookingId: booking._id, reference: 'PAY-F7AC07D225AB' });
});

test('altered or forged check-in tokens are rejected', () => {
    const token = createCheckinToken(booking);
    const [p, id, ref, sig] = token.split('.');
    const otherId = '6af4389bf3bc4694b27cd846';
    assert.strictEqual(verifyCheckinToken(`${p}.${otherId}.${ref}.${sig}`), null);              // another booking
    assert.strictEqual(verifyCheckinToken(`${p}.${id}.PAY-000000000000.${sig}`), null);         // another payment
    assert.strictEqual(verifyCheckinToken(`${p}.${id}.${ref}.${sig.slice(0, -1)}A`), null);     // edited signature
    assert.strictEqual(verifyCheckinToken('HOTELBOOKING|x|y'), null);
    assert.strictEqual(verifyCheckinToken({ $ne: '' }), null);
    process.env.CHECKIN_TOKEN_SECRET = 'a-different-secret-on-another-server-xx';
    assert.strictEqual(verifyCheckinToken(token), null);                                       // signed with another key
    process.env.CHECKIN_TOKEN_SECRET = 'test-secret-that-is-long-enough-123456';
});

test('sliding window allows exactly N hits in any window', () => {
    const s = new MemoryStore();
    const run = (mode, t) => s.run('k', 5, 60000, mode, t);
    for (let i = 0; i < 5; i++) assert.strictEqual(run('hit', 1000 + i).allowed, true);
    const blocked = run('hit', 30000);
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.retryAfterMs, 1000 + 60000 - 30000); // until the oldest hit leaves the window
    assert.strictEqual(run('hit', 61000).allowed, true);             // oldest (t=1000) left the window at 61000
    assert.strictEqual(run('hit', 61000).allowed, false);            // t=1001..1004 + 61000 = 5 inside again
});

test('peek does not count; add counts even when over the limit', () => {
    const s = new MemoryStore();
    for (let i = 0; i < 3; i++) assert.strictEqual(s.run('k', 3, 1000, 'peek', 10).allowed, true);
    for (let i = 0; i < 3; i++) s.run('k', 3, 1000, 'add', 10 + i);
    assert.strictEqual(s.run('k', 3, 1000, 'peek', 20).allowed, false);
    assert.strictEqual(s.run('k', 3, 1000, 'peek', 1011).allowed, true);
});
