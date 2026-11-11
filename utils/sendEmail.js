const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Fallback logging for development if SMTP credentials are not yet configured
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.log('--------------------------------------------------');
        console.log('[Dev Email Service] No SMTP credentials configured in config.env');
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message:\n${options.message}`);
        console.log('--------------------------------------------------');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT == 465,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Hotel Booking'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message.replace(/\n/g, '<br>'),
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent: %s', info.messageId);
};

module.exports = sendEmail;

