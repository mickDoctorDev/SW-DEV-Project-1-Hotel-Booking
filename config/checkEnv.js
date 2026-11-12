// Fail fast on a missing or unsafe configuration instead of failing on the first request.
module.exports = () => {
    const env = process.env;
    const prod = env.NODE_ENV === 'production';
    const problems = [];

    for (const key of ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRE']) if (!env[key]) problems.push(`${key} is not set`);
    if (prod) {
        if ((env.JWT_SECRET || '').length < 32) problems.push('JWT_SECRET must be at least 32 characters in production');
        if (!env.CLIENT_ORIGIN) problems.push('CLIENT_ORIGIN must be set in production (the deployed frontend URL)');
        if (!env.SMTP_HOST) problems.push('SMTP_HOST must be set in production (Ethereal test mail does not deliver)');
        if (!env.REDIS_URL) problems.push('REDIS_URL must be set in production (rate limits must be shared by every server)');
        if ((env.CHECKIN_TOKEN_SECRET || '').length < 32) problems.push('CHECKIN_TOKEN_SECRET must be at least 32 characters in production');
    }
    if (problems.length) {
        console.error('Invalid configuration (config/config.env or host environment):\n - ' + problems.join('\n - '));
        process.exit(1);
    }
};
