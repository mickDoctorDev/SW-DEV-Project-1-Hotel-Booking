// Usage: node seed.js   — idempotent: inserts mock hotels/users/bookings only if missing (never deletes).
require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const Hotel = require('./models/Hotel');
const User = require('./models/User');
const Booking = require('./models/Booking');

const hotels = [
    { name: 'Siam Grand Hotel', address: '99 Rama I Rd, Pathumwan, Bangkok 10330', tel: '02-111-2222', totalRooms: 20 },
    { name: 'Chao Phraya Riverside', address: '88 Charoen Krung Rd, Bang Rak, Bangkok 10500', tel: '02-333-4444', totalRooms: 12 },
    { name: 'Chiang Mai Hillview', address: '12 Nimmanhaemin Rd, Chiang Mai 50200', tel: '053-555-666', totalRooms: 8 },
    { name: 'Phuket Beach Resort', address: '45 Patong Beach Rd, Phuket 83150', tel: '076-777-888', totalRooms: 2 },
    { name: 'Pattaya Bay Inn', address: '7 Beach Rd, Pattaya, Chonburi 20150', tel: '038-999-000', totalRooms: 15 },
];
// Test-only accounts for local/dev use.
const users = [
    { name: 'Test Admin', tel: '0810000001', email: 'admin@test.com', password: 'Admin1234', role: 'admin' },
    { name: 'Test User', tel: '0810000002', email: 'user@test.com', password: 'User12345', role: 'user' },
];
const day = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const H = [];
    for (const h of hotels) H.push(await Hotel.findOneAndUpdate({ name: h.name }, { $setOnInsert: h }, { upsert: true, returnDocument: 'after' }));
    const U = [];
    for (const u of users) U.push((await User.findOne({ email: u.email })) || (await User.create(u)));
    const user = U[1];
    if (!(await Booking.exists({ user: user._id }))) {
        await Booking.create([
            { user: user._id, hotel: H[0]._id, checkIn: day(7), checkOut: day(9) },
            { user: user._id, hotel: H[2]._id, checkIn: day(20), checkOut: day(23) },
        ]);
    }
    console.log(`hotels: ${await Hotel.countDocuments()}, users: ${await User.countDocuments()}, bookings: ${await Booking.countDocuments()}`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
