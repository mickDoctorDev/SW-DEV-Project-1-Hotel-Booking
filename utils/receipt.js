const QRCode = require('qrcode');
const { nights } = require('./booking');
const { sendMail } = require('./mailer');
const { createCheckinToken } = require('./checkinToken');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (d) => new Date(d).toISOString().slice(0, 10);
const baht = (n) => `฿${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// What the hotel scans at check-in: a signed token (utils/checkinToken.js) that cannot be forged; no personal data.
exports.qrPayload = (booking) => createCheckinToken(booking);

exports.qrPng = (booking) => QRCode.toBuffer(exports.qrPayload(booking), { width: 240, margin: 1 });
exports.qrDataUrl = (booking) => QRCode.toDataURL(exports.qrPayload(booking), { width: 240, margin: 1 });

// Receipt as a self-contained HTML page. qrSrc is "cid:qr" in the email, or a data: URL in the browser.
exports.receiptHtml = (booking, user, qrSrc) => {
    const h = booking.hotel;
    const n = nights(booking.checkIn, booking.checkOut);
    const p = booking.payment;
    const row = (k, v) => `<tr><td style="padding:6px 0;color:#666">${k}</td><td style="padding:6px 0;text-align:right">${v}</td></tr>`;
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Receipt ${esc(p.reference)}</title></head>
<body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:8px;padding:28px">
  <h2 style="margin:0 0 4px">Booking confirmed</h2>
  <p style="margin:0 0 20px;color:#666">Thank you, ${esc(user.name)}. Your payment was received.</p>
  <h3 style="margin:0 0 8px">${esc(h.name)}</h3>
  <p style="margin:0;color:#666">${esc(h.address)}<br>Tel. ${esc(h.tel)}</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    ${row('Booking ID', esc(booking._id))}
    ${row('Check-in', day(booking.checkIn))}
    ${row('Check-out', day(booking.checkOut))}
    ${row('Nights', n)}
    ${row('Price per night', baht(h.pricePerNight))}
    ${row('Payment method', { card: 'Credit card', promptpay: 'PromptPay', hotel: 'Paid at the hotel' }[p.method] || p.method)}
    ${row('Reference', esc(p.reference))}
    ${row('Paid at', new Date(p.paidAt).toUTCString())}
    <tr><td style="padding:10px 0;border-top:1px solid #ddd;font-weight:bold">Total paid</td>
        <td style="padding:10px 0;border-top:1px solid #ddd;text-align:right;font-weight:bold">${baht(p.amount)}</td></tr>
  </table>
  <div style="text-align:center">
    <img src="${qrSrc}" width="200" height="200" alt="Check-in QR code">
    <p style="color:#666;font-size:13px">Show this QR code at check-in.</p>
    <p style="color:#999;font-size:11px;font-family:monospace;word-break:break-all">Check-in code: ${esc(exports.qrPayload(booking))}</p>
  </div>
  <p style="color:#999;font-size:12px;margin-top:24px">This is a mock payment for a student project. No real money was charged.</p>
</div></body></html>`;
};

// Confirmation email: receipt in the body, QR code inline, and the receipt attached as a file.
exports.sendBookingConfirmation = async (booking, user) => {
    const png = await exports.qrPng(booking);
    const html = exports.receiptHtml(booking, user, 'cid:qr');
    return sendMail({
        to: user.email,
        subject: `Booking confirmed - ${booking.hotel.name} (${day(booking.checkIn)})`,
        html,
        attachments: [
            { filename: 'checkin-qr.png', content: png, cid: 'qr' },
            { filename: `receipt-${booking.payment.reference}.html`, content: exports.receiptHtml(booking, user, `data:image/png;base64,${png.toString('base64')}`) },
        ],
    });
};
