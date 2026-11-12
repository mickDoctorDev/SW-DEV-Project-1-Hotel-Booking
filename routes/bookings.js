const express = require('express');
const { getBookings, getBooking, addBooking, updateBooking, deleteBooking, payBooking, getReceipt, setBookingStatus, checkIn } = require('../controllers/bookings');
const { protect, authorize } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimit');

const router = express.Router({ mergeParams: true });

// Ownership (user) vs admin is enforced in the controller; authorize() only fixes the allowed roles.
router.use(protect, authorize('user', 'admin'));
router.route('/').get(getBookings).post(bookingLimiter, addBooking);
// hotel staff verify the QR code at check-in (declared before /:id so 'checkin' is not read as an id)
router.post('/checkin', authorize('admin'), checkIn);
router.route('/:id').get(getBooking).put(bookingLimiter, updateBooking).delete(deleteBooking);
router.post('/:id/pay', payBooking);
router.get('/:id/receipt', getReceipt);
router.patch('/:id/status', authorize('admin'), setBookingStatus);
module.exports = router;
