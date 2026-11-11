// Generates the Postman collection + environment for the presentation demo.
// Usage: npm run postman:generate   (edit this file, never the generated JSON by hand)
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || __dirname;

const lines = (s) => s.trim().split('\n').map((l) => l.replace(/^ {4}/, ''));
const DATE_FN = `
    const d = (n) => { const x = new Date(); x.setUTCHours(0,0,0,0); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0,10); };
    const base = Number(pm.collectionVariables.get('dayBase'));`;

const req = (name, method, url, { body, auth = true, pre, test } = {}) => {
    const item = {
        name,
        request: {
            method,
            header: [
                ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
                ...(auth ? [{ key: 'Authorization', value: 'Bearer {{token}}' }] : []),
            ],
            url: { raw: `{{baseUrl}}${url}`, host: ['{{baseUrl}}'], path: url.split('/').filter(Boolean) },
            ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2) } } : {}),
        },
        event: [],
    };
    if (pre) item.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: lines(pre) } });
    if (test) item.event.push({ listen: 'test', script: { type: 'text/javascript', exec: lines(test) } });
    return item;
};
const folder = (name, item, description) => ({ name, item, ...(description ? { description } : {}) });
const status = (code, label) => `pm.test('${label || 'Status ' + code}', () => pm.response.to.have.status(${code}));`;

const demo = folder('Demo (Steps 1-12)', [
    folder('1 User Registration + Validation Check', [
        req('1.1 Register new user (valid)', 'POST', '/auth/register', {
            auth: false,
            body: { name: 'Demo User', tel: '0812345678', email: 'demo{{runId}}@test.com', password: 'Demo12345' },
            pre: `
    // unique email per run so the collection can be re-run
    pm.collectionVariables.set('runId', Date.now());
    // random date window far in the future so repeated runs don't fill the hotel
    pm.collectionVariables.set('dayBase', 30 + Math.floor(Math.random() * 300));`,
            test: `
    ${status(201, 'Registered (201)')}
    const b = pm.response.json();
    pm.test('Response has name, tel, email and role=user', () => {
        pm.expect(b.name).to.eql('Demo User');
        pm.expect(b.tel).to.eql('0812345678');
        pm.expect(b.role).to.eql('user');
    });
    pm.collectionVariables.set('userId', b._id);
    pm.collectionVariables.set('userEmail', b.email);`,
        }),
        req('1.2 Register without telephone -> 400', 'POST', '/auth/register', {
            auth: false, body: { name: 'No Tel', email: 'notel{{runId}}@test.com', password: 'Demo12345' },
            test: status(400, 'Rejected: missing tel (400)'),
        }),
        req('1.3 Register invalid email -> 400', 'POST', '/auth/register', {
            auth: false, body: { name: 'Bad Email', tel: '0812345678', email: 'not-an-email', password: 'Demo12345' },
            test: status(400, 'Rejected: invalid email (400)'),
        }),
        req('1.4 Register weak password -> 400', 'POST', '/auth/register', {
            auth: false, body: { name: 'Weak Pass', tel: '0812345678', email: 'weak{{runId}}@test.com', password: '123' },
            test: status(400, 'Rejected: weak password (400)'),
        }),
        req('1.5 Register duplicate email -> 400', 'POST', '/auth/register', {
            auth: false, body: { name: 'Dup', tel: '0812345678', email: 'demo{{runId}}@test.com', password: 'Demo12345' },
            test: status(400, 'Rejected: email already registered (400)'),
        }),
    ]),
    folder('2 User Log-in', [
        req('2.1 Login wrong password -> 401', 'POST', '/auth/login', {
            auth: false, body: { email: '{{userEmail}}', password: 'Wrong12345' },
            test: status(401, 'Rejected: wrong password (401)'),
        }),
        req('2.2 Login user', 'POST', '/auth/login', {
            auth: false, body: { email: '{{userEmail}}', password: 'Demo12345' },
            test: `
    ${status(200, 'Logged in (200)')}
    const b = pm.response.json();
    pm.test('Got token, role=user', () => { pm.expect(b.token).to.be.a('string'); pm.expect(b.role).to.eql('user'); });
    pm.collectionVariables.set('token', b.token);`,
        }),
    ]),
    folder('3 User View Product (Hotels)', [
        req('3.1 List hotels', 'GET', '/hotels', {
            test: `
    ${status(200)}
    const b = pm.response.json();
    pm.test('Hotels have name, address and tel', () => {
        pm.expect(b.data.length).to.be.above(0);
        b.data.forEach((h) => pm.expect(h).to.include.keys('name', 'address', 'tel'));
    });
    pm.collectionVariables.set('hotelId', b.data[0]._id);`,
        }),
        req('3.2 View one hotel', 'GET', '/hotels/{{hotelId}}', {
            test: `${status(200)}
    pm.test('Same hotel returned', () => pm.expect(pm.response.json().data._id).to.eql(pm.collectionVariables.get('hotelId')));`,
        }),
    ]),
    // Steps 4-6 use exactly 5 booking attempts = the 5/min booking limit. Do not add more here.
    folder('4 User Create Booking + Check Create Condition', [
        req('4.1 Create booking 2 nights', 'POST', '/hotels/{{hotelId}}/bookings', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base)); pm.variables.set('checkOut', d(base + 2));`,
            test: `
    ${status(201, 'Booking created (201)')}
    const b = pm.response.json().data;
    pm.test('Booking belongs to the logged-in user', () => pm.expect(b.user).to.eql(pm.collectionVariables.get('userId')));
    pm.collectionVariables.set('bookingId', b._id);`,
        }),
        req('4.2 Create booking 3 nights (max)', 'POST', '/hotels/{{hotelId}}/bookings', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base + 10)); pm.variables.set('checkOut', d(base + 13));`,
            test: `
    ${status(201, '3 nights allowed (201)')}
    pm.collectionVariables.set('bookingId2', pm.response.json().data._id);`,
        }),
        req('4.3 Create booking 4 nights -> 400', 'POST', '/hotels/{{hotelId}}/bookings', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base + 20)); pm.variables.set('checkOut', d(base + 24));`,
            test: `${status(400, 'Rejected: more than 3 nights (400)')}`,
        }),
        req('4.4 Create booking in the past -> 400', 'POST', '/hotels/{{hotelId}}/bookings', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(-3)); pm.variables.set('checkOut', d(-1));`,
            test: `${status(400, 'Rejected: check-in in the past (400)')}`,
        }),
    ]),
    folder('5 User View Own Booking', [
        req('5.1 List my bookings', 'GET', '/bookings', {
            test: `
    ${status(200)}
    const list = pm.response.json().data;
    const me = pm.collectionVariables.get('userId');
    pm.test('Only my own bookings are returned', () => list.forEach((x) => pm.expect(x.user).to.eql(me)));
    pm.test('Contains the booking just created, with hotel info', () => {
        const mine = list.find((x) => x._id === pm.collectionVariables.get('bookingId'));
        pm.expect(mine).to.be.an('object');
        pm.expect(mine.hotel).to.include.keys('name', 'address', 'tel');
    });`,
        }),
    ]),
    folder('6 User Edit Own Booking', [
        req('6.1 Change dates to 1 night', 'PUT', '/bookings/{{bookingId}}', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base + 1)); pm.variables.set('checkOut', d(base + 2));`,
            test: `
    ${status(200, 'Updated (200)')}
    pm.test('New check-in saved', () => pm.expect(pm.response.json().data.checkIn).to.contain(pm.variables.get('checkIn')));`,
        }),
    ]),
    folder('7 User Delete Own Booking', [
        req('7.1 Delete my booking', 'DELETE', '/bookings/{{bookingId}}', { test: status(200, 'Deleted (200)') }),
        req('7.2 Deleted booking is gone -> 404', 'GET', '/bookings/{{bookingId}}', { test: status(404, 'Not found after delete (404)') }),
    ]),
    folder('8 User Log-out', [
        req('8.1 Logout', 'POST', '/auth/logout', {
            test: `${status(200, 'Logged out (200)')}
    pm.collectionVariables.unset('token');`,
        }),
        req('8.2 After logout, protected route -> 401', 'GET', '/auth/me', {
            auth: false, test: status(401, 'No access after logout (401)'),
        }),
    ]),
    folder('9 Admin Log-in', [
        req('9.1 Login admin', 'POST', '/auth/login', {
            auth: false, body: { email: '{{adminEmail}}', password: '{{adminPassword}}' },
            test: `
    ${status(200, 'Admin logged in (200)')}
    const b = pm.response.json();
    pm.test('role=admin', () => pm.expect(b.role).to.eql('admin'));
    pm.collectionVariables.set('token', b.token);`,
        }),
    ]),
    folder('10 Admin View Any Booking', [
        req('10.1 List all bookings', 'GET', '/bookings', {
            test: `
    ${status(200)}
    const list = pm.response.json().data;
    pm.test("Admin sees the demo user's booking", () => pm.expect(list.map((x) => x._id)).to.include(pm.collectionVariables.get('bookingId2')));
    pm.test('Admin sees bookings of more than one user', () => pm.expect(new Set(list.map((x) => x.user)).size).to.be.above(1));`,
        }),
    ]),
    folder('11 Admin Edit Any Booking', [
        req("11.1 Edit the user's booking", 'PUT', '/bookings/{{bookingId2}}', {
            body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
            pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base + 11)); pm.variables.set('checkOut', d(base + 13));`,
            test: `${status(200, 'Admin updated (200)')}`,
        }),
    ]),
    folder('12 Admin Delete Any Booking', [
        req("12.1 Delete the user's booking", 'DELETE', '/bookings/{{bookingId2}}', { test: status(200, 'Admin deleted (200)') }),
        req('12.2 Admin logout', 'POST', '/auth/logout', {
            test: `${status(200)}
    pm.collectionVariables.unset('token');`,
        }),
    ]),
]);

// Additional Req 1 demo. Run separately, at least 1 minute after the main demo.
const rate = folder('Extra - Rate limit 5 booking attempts per minute', [
    req('Login user', 'POST', '/auth/login', {
        auth: false, body: { email: '{{seedUserEmail}}', password: '{{seedUserPassword}}' },
        test: `${status(200)}
    pm.collectionVariables.set('token', pm.response.json().token);
    pm.collectionVariables.set('attempt', 0);`,
    }),
    req('Booking attempt (repeats 6x)', 'POST', '/hotels/{{hotelId}}/bookings', {
        body: { checkIn: 'invalid', checkOut: 'invalid' },
        pre: `
    if (!pm.collectionVariables.get('hotelId')) {
        pm.sendRequest(pm.environment.get('baseUrl') + '/hotels', (e, r) => pm.collectionVariables.set('hotelId', r.json().data[0]._id));
    }`,
        test: `
    const n = Number(pm.collectionVariables.get('attempt')) + 1;
    pm.collectionVariables.set('attempt', n);
    if (n <= 5) {
        pm.test('Attempt ' + n + ' accepted by limiter (not 429)', () => pm.expect(pm.response.code).to.not.eql(429));
        postman.setNextRequest('Booking attempt (repeats 6x)');
    } else {
        pm.test('Attempt 6 blocked (429)', () => pm.response.to.have.status(429));
        pm.test('Retry-After header present', () => pm.response.to.have.header('Retry-After'));
        postman.setNextRequest(null);
    }`,
    }),
]);

// Additional Req 2 demo: mock payment -> QR code + receipt + confirmation email. Uses 2 booking attempts.
const pay = folder('Extra - Payment, QR code and email receipt', [
    req('Login user', 'POST', '/auth/login', {
        auth: false, body: { email: '{{seedUserEmail}}', password: '{{seedUserPassword}}' },
        test: `${status(200)}
    pm.collectionVariables.set('token', pm.response.json().token);`,
    }),
    req('List hotels (pick one, note its price)', 'GET', '/hotels', {
        test: `${status(200)}
    const h = pm.response.json().data[0];
    pm.test('Hotel has a price per night', () => pm.expect(h.pricePerNight).to.be.a('number'));
    pm.collectionVariables.set('hotelId', h._id);
    pm.collectionVariables.set('price', h.pricePerNight);`,
    }),
    req('Create booking 2 nights (status pending)', 'POST', '/hotels/{{hotelId}}/bookings', {
        body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
        pre: `
    pm.collectionVariables.set('dayBase', 30 + Math.floor(Math.random() * 300));${DATE_FN}
    pm.variables.set('checkIn', d(base)); pm.variables.set('checkOut', d(base + 2));`,
        test: `${status(201)}
    const b = pm.response.json().data;
    pm.test('New booking is pending payment', () => pm.expect(b.status).to.eql('pending'));
    pm.collectionVariables.set('payBookingId', b._id);`,
    }),
    req('Pay with a declined card -> 402', 'POST', '/bookings/{{payBookingId}}/pay', {
        body: { method: 'card', cardNumber: '4111 1111 1111 0000' },
        test: status(402, 'Declined card is rejected (402)'),
    }),
    req('Pay with a valid card', 'POST', '/bookings/{{payBookingId}}/pay', {
        body: { method: 'card', cardNumber: '4111 1111 1111 1111' },
        test: `${status(200, 'Payment accepted (200)')}
    const r = pm.response.json();
    pm.test('Booking is now paid', () => pm.expect(r.data.status).to.eql('paid'));
    pm.test('Amount = 2 nights x price per night (computed by the server)', () =>
        pm.expect(r.data.payment.amount).to.eql(2 * Number(pm.collectionVariables.get('price'))));
    pm.test('Confirmation email sent', () => pm.expect(r.email.sent).to.eql(true));
    if (r.email.previewUrl) console.log('Open the email (QR code + receipt): ' + r.email.previewUrl);`,
    }),
    req('Pay again -> 409', 'POST', '/bookings/{{payBookingId}}/pay', {
        body: { method: 'promptpay' },
        test: status(409, 'Cannot pay twice (409)'),
    }),
    req('User cannot change dates of a paid booking -> 409', 'PUT', '/bookings/{{payBookingId}}', {
        body: { checkIn: '{{checkIn}}', checkOut: '{{checkOut}}' },
        pre: `${DATE_FN}
    pm.variables.set('checkIn', d(base + 1)); pm.variables.set('checkOut', d(base + 2));`,
        test: status(409, 'Paid booking is locked (409)'),
    }),
    req('Receipt page (HTML with QR code)', 'GET', '/bookings/{{payBookingId}}/receipt', {
        test: `${status(200)}
    pm.test('Receipt is HTML with QR image', () => {
        pm.expect(pm.response.headers.get('Content-Type')).to.include('text/html');
        pm.expect(pm.response.text()).to.include('data:image/png;base64');
    });`,
    }),
    req('Clean up: delete the paid booking', 'DELETE', '/bookings/{{payBookingId}}', { test: status(200) }),
]);

const collection = {
    info: {
        name: 'Hotel Booking - Presentation Demo',
        description: 'Steps 1-12 of the presentation sheet. Run with Newman (see package.json "demo" script). Requires `node seed.js` first.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [demo, pay, rate],
    variable: [{ key: 'runId', value: '' }, { key: 'dayBase', value: '60' }],
};
const environment = {
    name: 'Hotel Booking - local',
    values: [
        { key: 'baseUrl', value: 'http://localhost:5001/api/v1', enabled: true },
        // Credentials are intentionally empty. `npm run demo*` fills them from config/config.env (SEED_*).
        // In the Postman app, type them into the "Current value" column (that column is never exported/synced).
        { key: 'adminEmail', value: '', enabled: true },
        { key: 'adminPassword', value: '', type: 'secret', enabled: true },
        { key: 'seedUserEmail', value: '', enabled: true },
        { key: 'seedUserPassword', value: '', type: 'secret', enabled: true },
    ],
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'hotel-booking.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'local.postman_environment.json'), JSON.stringify(environment, null, 2) + '\n');
console.log('written to', out);
