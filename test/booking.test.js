const test = require('node:test');
const assert = require('node:assert');
const { toDay, validateStay } = require('../utils/booking');

const now = new Date('2026-01-10T12:00:00Z');
const stay = (a, b) => validateStay(toDay(a), toDay(b), now);

test('1-3 nights ok', () => {
    assert.strictEqual(stay('2026-01-11', '2026-01-12'), null);
    assert.strictEqual(stay('2026-01-11', '2026-01-14'), null);
});
test('0 and 4 nights rejected', () => {
    assert.ok(stay('2026-01-11', '2026-01-11'));
    assert.ok(stay('2026-01-11', '2026-01-15'));
    assert.ok(stay('2026-01-12', '2026-01-11'));
});
test('past and invalid rejected', () => {
    assert.ok(stay('2026-01-09', '2026-01-10'));
    assert.ok(stay('garbage', '2026-01-10'));
    assert.strictEqual(toDay(12345), null);
});
