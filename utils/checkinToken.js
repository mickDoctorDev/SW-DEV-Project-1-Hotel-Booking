// Check-in verification token carried by the QR code in the confirmation email and receipt.
//
//   HB1.<bookingId>.<paymentReference>.<signature>
//   signature = HMAC-SHA256(CHECKIN_TOKEN_SECRET, "HB1.<bookingId>.<paymentReference>"), base64url
//
// Only the server knows the secret, so a guest (or anyone) cannot create or alter a valid code: changing the
// booking id or reference breaks the signature. The reference ties the code to the CURRENT payment, so undoing
// a payment (new/no reference) invalidates every code issued for it. No personal data is inside the token.

const crypto = require('crypto');

const PREFIX = 'HB1';
const ID = /^[a-f0-9]{24}$/;
const REF = /^[A-Z]{3}-[A-F0-9]{12}$/;

// A dedicated secret is required in production (config/checkEnv.js); in development it is derived from JWT_SECRET.
const secret = () => process.env.CHECKIN_TOKEN_SECRET
    || crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-only').update('checkin-token').digest();

const sign = (id, ref) => crypto.createHmac('sha256', secret()).update(`${PREFIX}.${id}.${ref}`).digest('base64url');

exports.createCheckinToken = (booking) => {
    const id = String(booking._id);
    const ref = booking.payment.reference;
    return `${PREFIX}.${id}.${ref}.${sign(id, ref)}`;
};

// Returns { bookingId, reference } for a genuine token, otherwise null.
exports.verifyCheckinToken = (token) => {
    if (typeof token !== 'string' || token.length > 200) return null;
    const parts = token.trim().split('.');
    if (parts.length !== 4 || parts[0] !== PREFIX) return null;
    const [, id, ref, sig] = parts;
    if (!ID.test(id) || !REF.test(ref)) return null;
    const expected = Buffer.from(sign(id, ref));
    const given = Buffer.from(sig);
    // constant-time comparison so the signature can't be guessed byte by byte from response times
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    return { bookingId: id, reference: ref };
};
