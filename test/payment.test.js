const test = require('node:test');
const assert = require('node:assert');
const { stayAmount, nights } = require('../utils/booking');
const { receiptHtml, qrPayload } = require('../utils/receipt');

test('amount = nights x price per night', () => {
    assert.strictEqual(nights('2026-12-01', '2026-12-04'), 3);
    assert.strictEqual(stayAmount('2026-12-01', '2026-12-03', 1500), 3000);
});

const booking = {
    _id: 'b1', checkIn: new Date('2026-12-01'), checkOut: new Date('2026-12-03'),
    hotel: { name: 'Siam <Grand>', address: 'Bangkok', tel: '02-111-2222', pricePerNight: 1500 },
    payment: { amount: 3000, method: 'card', reference: 'PAY-ABC', paidAt: new Date('2026-11-20T10:00:00Z') },
};

test('receipt shows total and escapes user-supplied text', () => {
    const html = receiptHtml(booking, { name: '<script>x</script>' }, 'cid:qr');
    assert.ok(html.includes('฿3,000.00'));
    assert.ok(html.includes('Siam &lt;Grand&gt;'));
    assert.ok(!html.includes('<script>x</script>'));
});

test('QR payload is the signed check-in token (booking + payment only, no personal data)', () => {
    assert.match(qrPayload(booking), /^HB1\.b1\.PAY-ABC\.[A-Za-z0-9_-]{43}$/);
});
