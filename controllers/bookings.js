const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const { toDay, validateStay, overlapFilter } = require('../utils/booking');
const { audit } = require('../utils/audit');

const POPULATE = { path: 'hotel', select: 'name address tel' };

class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

// Non-admins only ever match their own bookings, so another user's id looks like "not found" (no IDOR / no existence leak).
const scope = (req) => ({ _id: req.params.id, deletedAt: null, ...(req.user.role === 'admin' ? {} : { user: req.user.id }) });

const sendError = (res, error, fallback) => {
    if (error instanceof HttpError) return res.status(error.status).json({ success: false, message: error.message });
    if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Not found' });
    console.error(error.stack);
    res.status(500).json({ success: false, message: fallback });
};

// Runs fn inside a transaction that first bumps the hotel's lockVersion: two concurrent bookings for the
// same hotel write the same doc, so one aborts/retries and the room count below is never stale.
// Needs MongoDB as a replica set (Atlas or `--replSet`).
const withHotelLock = async (hotelId, fn) => {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(async () => {
            const hotel = await Hotel.findByIdAndUpdate(hotelId, { $inc: { lockVersion: 1 } }, { session, returnDocument: 'after' });
            if (!hotel) throw new HttpError(404, `No hotel with the id of ${hotelId}`);
            return fn(hotel, session);
        });
    } finally {
        await session.endSession();
    }
};

const assertRoomFree = async (hotel, checkIn, checkOut, session, excludeId) => {
    const taken = await Booking.countDocuments({
        hotel: hotel._id, deletedAt: null, ...(excludeId ? { _id: { $ne: excludeId } } : {}), ...overlapFilter(checkIn, checkOut),
    }).session(session);
    if (taken >= hotel.totalRooms) throw new HttpError(409, 'No rooms available for the selected dates');
};

const parseStay = (body) => {
    const checkIn = toDay(body && body.checkIn), checkOut = toDay(body && body.checkOut);
    const err = validateStay(checkIn, checkOut);
    if (err) throw new HttpError(400, err);
    return { checkIn, checkOut };
};

//@route GET /api/v1/bookings
exports.getBookings = async (req, res) => {
    try {
        const filter = { deletedAt: null, ...(req.user.role === 'admin' ? {} : { user: req.user.id }) };
        const bookings = await Booking.find(filter).populate(POPULATE).sort('-createdAt');
        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        sendError(res, error, 'Cannot find Bookings');
    }
}

//@route GET /api/v1/bookings/:id
exports.getBooking = async (req, res) => {
    try {
        const booking = await Booking.findOne(scope(req)).populate(POPULATE);
        if (!booking) throw new HttpError(404, `No booking with the id of ${req.params.id}`);
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        sendError(res, error, 'Cannot find Booking');
    }
}

//@route POST /api/v1/hotels/:hotelId/bookings
exports.addBooking = async (req, res) => {
    try {
        const { checkIn, checkOut } = parseStay(req.body);
        // user/hotel come from the session and URL only, never from the body
        const booking = await withHotelLock(req.params.hotelId, async (hotel, session) => {
            await assertRoomFree(hotel, checkIn, checkOut, session);
            const [created] = await Booking.create([{ checkIn, checkOut, user: req.user.id, hotel: hotel._id }], { session });
            return created;
        });
        res.status(201).json({ success: true, data: booking });
    } catch (error) {
        sendError(res, error, 'Cannot create Booking');
    }
}

//@route PUT /api/v1/bookings/:id   (only dates are editable)
exports.updateBooking = async (req, res) => {
    try {
        const { checkIn, checkOut } = parseStay(req.body);
        const existing = await Booking.findOne(scope(req));
        if (!existing) throw new HttpError(404, `No booking with the id of ${req.params.id}`);

        const updated = await withHotelLock(existing.hotel, async (hotel, session) => {
            await assertRoomFree(hotel, checkIn, checkOut, session, existing._id);
            return Booking.findOneAndUpdate({ _id: existing._id, deletedAt: null }, { checkIn, checkOut }, { returnDocument: 'after', session });
        });
        if (!updated) throw new HttpError(404, `No booking with the id of ${req.params.id}`);
        if (existing.user.toString() !== req.user.id) {
            audit(req.user._id, 'booking.update', existing._id, { checkIn: existing.checkIn, checkOut: existing.checkOut }, { checkIn, checkOut });
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        sendError(res, error, 'Cannot update Booking');
    }
}

//@route DELETE /api/v1/bookings/:id   (soft delete)
exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findOneAndUpdate(scope(req), { deletedAt: new Date() }, { returnDocument: 'before' });
        if (!booking) throw new HttpError(404, `No booking with the id of ${req.params.id}`);
        if (booking.user.toString() !== req.user.id) audit(req.user._id, 'booking.delete', booking._id, booking.toObject());
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        sendError(res, error, 'Cannot delete Booking');
    }
}
