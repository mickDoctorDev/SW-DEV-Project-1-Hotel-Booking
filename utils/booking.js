const DAY = 24 * 60 * 60 * 1000;

// Parse "YYYY-MM-DD" (or ISO) to a UTC-midnight Date; null if invalid.
exports.toDay = (v) => {
    const d = new Date(v);
    if (typeof v !== 'string' && !(v instanceof Date) || isNaN(d)) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Returns an error message, or null when the stay is valid (1-3 nights, not in the past).
exports.validateStay = (checkIn, checkOut, now = new Date()) => {
    if (!checkIn || !checkOut) return 'Please provide valid checkIn and checkOut dates';
    const nights = Math.round((checkOut - checkIn) / DAY);
    if (nights < 1 || nights > 3) return 'A booking must be between 1 and 3 nights';
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (checkIn < today) return 'checkIn cannot be in the past';
    return null;
};

exports.nights = (checkIn, checkOut) => Math.round((new Date(checkOut) - new Date(checkIn)) / DAY);

// Price is always computed on the server from the stored booking and hotel, never taken from the client.
exports.stayAmount = (checkIn, checkOut, pricePerNight) => exports.nights(checkIn, checkOut) * pricePerNight;

// Stays [in,out) overlap an existing one when existing.in < out && existing.out > in.
exports.overlapFilter = (checkIn, checkOut) => ({ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
