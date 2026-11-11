const express = require('express');
const { getBookings, getBooking, addBooking, updateBooking, deleteBooking, payBooking, getReceipt } = require('../controllers/bookings');
const { protect, authorize } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimit');

const router = express.Router({ mergeParams: true });

// Ownership (user) vs admin is enforced in the controller; authorize() only fixes the allowed roles.
router.use(protect, authorize('user', 'admin'));
router.route('/').get(getBookings).post(bookingLimiter, addBooking);
router.route('/:id').get(getBooking).put(bookingLimiter, updateBooking).delete(deleteBooking);
router.post('/:id/pay', payBooking);
router.get('/:id/receipt', getReceipt);
module.exports = router;
