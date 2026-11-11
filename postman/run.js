// Usage: node postman/run.js <demo|payment|ratelimit>
// Runs one folder of the collection with Newman. Test-account credentials and the API port are read from
// config/config.env, so no password is stored in the committed Postman files.
const path = require('path');
const newman = require('newman');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', 'config.env'), quiet: true });

const FOLDERS = {
    demo: 'Demo (Steps 1-12)',
    payment: 'Extra - Payment, QR code and email receipt',
    ratelimit: 'Extra - Rate limit 5 booking attempts per minute',
};
const which = process.argv[2] || 'demo';
if (!FOLDERS[which]) {
    console.error(`Unknown folder "${which}". Use one of: ${Object.keys(FOLDERS).join(', ')}`);
    process.exit(1);
}

const env = process.env;
const missing = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_USER_EMAIL', 'SEED_USER_PASSWORD'].filter((k) => !env[k]);
if (missing.length) {
    console.error(`Set ${missing.join(', ')} in config/config.env (and run "npm run seed") first.`);
    process.exit(1);
}

const reporters = ['cli'];
const reporter = {};
if (which === 'demo') {
    reporters.push('htmlextra');
    reporter.htmlextra = { export: path.join(__dirname, 'report.html') };
}

newman.run({
    collection: require('./hotel-booking.postman_collection.json'),
    environment: require('./local.postman_environment.json'),
    folder: FOLDERS[which],
    envVar: [
        { key: 'baseUrl', value: env.API_BASE_URL || `http://localhost:${env.PORT || 5001}/api/v1` },
        { key: 'adminEmail', value: env.SEED_ADMIN_EMAIL },
        { key: 'adminPassword', value: env.SEED_ADMIN_PASSWORD },
        { key: 'seedUserEmail', value: env.SEED_USER_EMAIL },
        { key: 'seedUserPassword', value: env.SEED_USER_PASSWORD },
    ],
    reporters,
    reporter,
}, (err, summary) => {
    if (err) { console.error(err.message); process.exit(1); }
    process.exit(summary.run.failures.length ? 1 : 0);
});
