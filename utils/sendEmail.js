// Thin wrapper kept for the auth emails (password reset). It uses the shared mailer, so all email goes through
// one SMTP configuration (SMTP_HOST / SMTP_USER / SMTP_PASS / EMAIL_FROM) and falls back to an Ethereal test
// inbox in development, where the preview URL is logged instead of printing the message.
const { sendMail } = require('./mailer');

const sendEmail = async ({ email, subject, message, html }) => {
    const result = await sendMail({
        to: email,
        subject,
        text: message,
        html: html || message.replace(/\n/g, '<br>'),
    });
    if (!result.sent) throw new Error(result.error);
    if (result.previewUrl) console.log(`Email preview (${subject}): ${result.previewUrl}`);
};

module.exports = sendEmail;
