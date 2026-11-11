const nodemailer = require('nodemailer');

// SMTP_HOST set  -> real SMTP (e.g. Gmail: smtp.gmail.com, 465, your address + an App Password).
// SMTP_HOST unset -> a free Ethereal test inbox: nothing is delivered, each email gets a preview URL instead.
let transporterPromise;

const getTransporter = () => {
    if (!transporterPromise) {
        transporterPromise = (async () => {
            if (process.env.SMTP_HOST) {
                const port = Number(process.env.SMTP_PORT) || 465;
                return nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port,
                    secure: port === 465,
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
            }
            const account = await nodemailer.createTestAccount();
            return nodemailer.createTransport({
                host: account.smtp.host,
                port: account.smtp.port,
                secure: account.smtp.secure,
                auth: { user: account.user, pass: account.pass },
            });
        })().catch((e) => { transporterPromise = null; throw e; });
    }
    return transporterPromise;
};

// Resolves to { sent, previewUrl?, error? } and never throws: a mail failure must not undo a successful payment.
exports.sendMail = async (message) => {
    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'Hotel Booking <no-reply@hotel-booking.local>',
            ...message,
        });
        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        return { sent: true, previewUrl };
    } catch (e) {
        console.error('email failed:', e.message);
        return { sent: false, error: 'Confirmation email could not be sent' };
    }
};
