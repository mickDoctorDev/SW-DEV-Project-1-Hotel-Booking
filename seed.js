// Usage: npm run seed — idempotent: inserts mock hotels/users/bookings only if missing (never deletes).
// Test-account credentials come from config/config.env (SEED_*), never from source code.
// In production (NODE_ENV=production) only hotels are seeded: no test accounts or sample bookings.
require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/dns')();
const Hotel = require('./models/Hotel');
const User = require('./models/User');
const Booking = require('./models/Booking');

const hotels = [
    { name: 'Siam Grand Hotel', address: '99 Rama I Rd, Pathumwan, Bangkok 10330', tel: '02-111-2222', totalRooms: 20, pricePerNight: 3200 },
    { name: 'Chao Phraya Riverside', address: '88 Charoen Krung Rd, Bang Rak, Bangkok 10500', tel: '02-333-4444', totalRooms: 12, pricePerNight: 2800 },
    { name: 'Chiang Mai Hillview', address: '12 Nimmanhaemin Rd, Chiang Mai 50200', tel: '053-555-666', totalRooms: 8, pricePerNight: 1900 },
    { name: 'Phuket Beach Resort', address: '45 Patong Beach Rd, Phuket 83150', tel: '076-777-888', totalRooms: 2, pricePerNight: 4500 },
    { name: 'Pattaya Bay Inn', address: '7 Beach Rd, Pattaya, Chonburi 20150', tel: '038-999-000', totalRooms: 15, pricePerNight: 1500 },
];
const env = process.env;
const users = [
    { name: 'Test Admin', tel: '0810000001', email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, role: 'admin' },
    { name: 'Test User', tel: '0810000002', email: env.SEED_USER_EMAIL, password: env.SEED_USER_PASSWORD, role: 'user' },
];
const day = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };

// Creates the account, or resets its password/role to the configured values (so changing SEED_* rotates them).
const upsertUser = async (u) => {
    const existing = await User.findOne({ email: u.email.toLowerCase() }).select('+password');
    if (!existing) return User.create(u);
    if (!(await existing.matchPassword(u.password)) || existing.role !== u.role) {
        existing.password = u.password;
        existing.role = u.role;
        await existing.save();
    }
    return existing;
};

(async () => {
    await mongoose.connect(env.MONGO_URI);
    const H = [];
    for (const h of hotels) H.push(await Hotel.findOneAndUpdate({ name: h.name }, { $setOnInsert: (({ pricePerNight, ...rest }) => rest)(h), $set: { pricePerNight: h.pricePerNight } }, { upsert: true, returnDocument: 'after' }));

    if (env.NODE_ENV === 'production') {
        console.log('NODE_ENV=production: skipped test accounts and sample bookings');
    } else if (users.some((u) => !u.email || !u.password)) {
        console.log('SEED_ADMIN_EMAIL/PASSWORD or SEED_USER_EMAIL/PASSWORD not set in config/config.env: skipped test accounts');
    } else {
        const [, user] = [await upsertUser(users[0]), await upsertUser(users[1])];
        if (!(await Booking.exists({ user: user._id }))) {
            await Booking.create([
                { user: user._id, hotel: H[0]._id, checkIn: day(7), checkOut: day(9) },
                { user: user._id, hotel: H[2]._id, checkIn: day(20), checkOut: day(23) },
            ]);
        }
    }
    console.log(`hotels: ${await Hotel.countDocuments()}, users: ${await User.countDocuments()}, bookings: ${await Booking.countDocuments()}`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
