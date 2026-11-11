const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');

const FIELDS = ['name', 'address', 'tel', 'totalRooms', 'createdAt'];
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
const csv = (v) => (typeof v === 'string' ? v.split(',').filter(f => FIELDS.includes(f.replace(/^-/, ''))) : []);

exports.getHotels = async (req, res) => {
    try {
        // only whitelisted exact-match string filters; anything else (operators, objects) is dropped
        const filter = {};
        for (const k of ['name', 'tel']) if (typeof req.query[k] === 'string') filter[k] = req.query[k];

        let query = Hotel.find(filter);
        const select = csv(req.query.select);
        if (select.length) query = query.select(select.join(' '));
        const sort = csv(req.query.sort);
        query = query.sort(sort.length ? sort.join(' ') : '-createdAt');

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
        const total = await Hotel.countDocuments(filter);
        const hotels = await query.skip((page - 1) * limit).limit(limit);

        const pagination = {};
        if (page * limit < total) pagination.next = { page: page + 1, limit };
        if (page > 1) pagination.prev = { page: page - 1, limit };
        res.status(200).json({ success: true, count: hotels.length, total, pagination, data: hotels });
    } catch {
        res.status(400).json({ success: false });
    }
}

exports.getHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        res.status(200).json({ success: true, data: hotel });
    } catch {
        res.status(404).json({ success: false, message: 'Hotel not found' });
    }
}

exports.createHotel = async (req, res) => {
    try {
        const hotel = await Hotel.create(pick(req.body, ['name', 'address', 'tel', 'totalRooms']));
        res.status(201).json({ success: true, data: hotel });
    } catch (error) {
        res.status(400).json({ success: false, message: error.code === 11000 ? 'Hotel name already exists' : error.message });
    }
}

exports.updateHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findByIdAndUpdate(req.params.id, pick(req.body, ['name', 'address', 'tel', 'totalRooms']), {
            returnDocument: 'after', runValidators: true
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        res.status(200).json({ success: true, data: hotel });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

exports.deleteHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findByIdAndDelete(req.params.id);
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        await Booking.updateMany({ hotel: hotel._id, deletedAt: null }, { deletedAt: new Date() });
        res.status(200).json({ success: true, data: {} });
    } catch {
        res.status(400).json({ success: false });
    }
}
