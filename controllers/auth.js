const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DAY = 24 * 60 * 60 * 1000;
const refreshDays = () => Number(process.env.JWT_REFRESH_DAYS) || 7;
const cookieBase = () => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
});

const issueTokens = async (user, res) => {
    const accessToken = user.getSignedJwtToken();
    const refresh = crypto.randomBytes(48).toString('hex');
    await RefreshToken.create({
        user: user._id,
        tokenHash: sha(refresh),
        expiresAt: new Date(Date.now() + refreshDays() * DAY),
    });
    res.cookie('token', accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
    // refresh cookie is only sent to the auth routes
    res.cookie('refreshToken', refresh, { ...cookieBase(), path: '/api/v1/auth', maxAge: refreshDays() * DAY });
    return accessToken;
};

const sendTokenResponse = async (user, statusCode, res) => {
    const token = await issueTokens(user, res);
    res.status(statusCode).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        tel: user.tel,
        role: user.role,
        token,
    });
};

// @route POST /api/v1/auth/register   (role is never read from the body)
exports.register = async (req, res) => {
    try {
        const { name, tel, email, password } = req.body;
        const user = await User.create({ name, tel, email, password, role: 'user' });
        await sendTokenResponse(user, 201, res);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered' });
        if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
        res.status(500).json({ success: false, message: 'Cannot register user' });
    }
}

// @route POST /api/v1/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        // same answer for unknown email and wrong password
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        await sendTokenResponse(user, 200, res);
    } catch {
        res.status(500).json({ success: false, message: 'Cannot log in' });
    }
}

// @route POST /api/v1/auth/refresh  — rotates the refresh token; reuse of a revoked one kills all sessions
exports.refresh = async (req, res) => {
    const presented = req.cookies && req.cookies.refreshToken;
    if (typeof presented !== 'string') return res.status(401).json({ success: false, message: 'No refresh token' });
    try {
        const record = await RefreshToken.findOne({ tokenHash: sha(presented) });
        if (!record || record.expiresAt < new Date()) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        if (record.revokedAt) {
            await RefreshToken.updateMany({ user: record.user, revokedAt: null }, { revokedAt: new Date() });
            return res.status(401).json({ success: false, message: 'Refresh token reuse detected, please log in again' });
        }
        // atomic claim: only one concurrent request can rotate this token
        const claimed = await RefreshToken.findOneAndUpdate({ _id: record._id, revokedAt: null }, { revokedAt: new Date() });
        if (!claimed) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        const user = await User.findById(record.user);
        if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        await sendTokenResponse(user, 200, res);
    } catch {
        res.status(500).json({ success: false, message: 'Cannot refresh token' });
    }
}

exports.getMe = async (req, res) => {
    res.status(200).json({ success: true, data: req.user });
}

// @route POST /api/v1/auth/logout
exports.logout = async (req, res) => {
    const presented = req.cookies && req.cookies.refreshToken;
    if (typeof presented === 'string') {
        await RefreshToken.updateOne({ tokenHash: sha(presented), revokedAt: null }, { revokedAt: new Date() }).catch(() => { });
    }
    res.clearCookie('token', cookieBase());
    res.clearCookie('refreshToken', { ...cookieBase(), path: '/api/v1/auth' });
    res.status(200).json({ success: true, data: {} });
}

// @desc    Admin creates a user (can specify role: 'admin' or 'user')
// @route   POST /api/v1/auth/create-user
// @access  Private/Admin
exports.createUserByAdmin = async (req, res) => {
    try {
        const { name, tel, email, password, role } = req.body;
        if (role !== undefined && role !== 'user' && role !== 'admin') {
            return res.status(400).json({ success: false, message: "role must be 'user' or 'admin'" });
        }

        const user = await User.create({
            name,
            tel,
            email,
            password,
            role: role || 'user'
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                tel: user.tel,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered' });
        if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
        res.status(500).json({ success: false, message: 'Cannot create user' });
    }
};

// @desc    Delete own user account
// @route   DELETE /api/v1/auth/delete-me
// @access  Private
exports.deleteMe = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const userId = req.user.id;

        // Paid upcoming stays are a financial record the hotel still has to honour: refuse instead of deleting them.
        const activePaid = await Booking.exists({ user: userId, deletedAt: null, status: 'paid', checkOut: { $gt: new Date() } });
        if (activePaid) {
            return res.status(409).json({ success: false, message: 'You have paid upcoming bookings. Please contact support before deleting your account.' });
        }

        // All-or-nothing: bookings are soft-deleted (kept for records, like every other booking delete),
        // sessions are revoked and the user is removed.
        await session.withTransaction(async () => {
            await Booking.updateMany({ user: userId, deletedAt: null }, { deletedAt: new Date() }, { session });
            await RefreshToken.deleteMany({ user: userId }, { session });
            await User.findByIdAndDelete(userId, { session });
        });

        // Clear cookies
        res.clearCookie('token', cookieBase());
        res.clearCookie('refreshToken', { ...cookieBase(), path: '/api/v1/auth' });

        res.status(200).json({
            success: true,
            message: 'User account and associated data deleted successfully',
            data: {}
        });
    } catch {
        res.status(500).json({ success: false, message: 'Cannot delete user account' });
    } finally {
        await session.endSession();
    }
};

// @desc    Forgot Password - request reset token & send email
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
// Security: the reset token is delivered ONLY by email (returning it would let anyone who knows an address
// take over that account), and the answer is identical whether or not the email is registered (no account enumeration).
const FORGOT_RESPONSE = { success: true, message: 'If that email is registered, a password reset link has been sent' };

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(200).json(FORGOT_RESPONSE);

        // Get reset token (only its SHA-256 hash is stored)
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // The frontend page that asks for the new password and then calls PUT /auth/resetpassword/:token
        const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password/${resetToken}`;
        const message = `You are receiving this email because you (or someone else) requested a password reset.\n\nChoose a new password here:\n\n${resetUrl}\n\nThis link is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;

        // Answer first and send the email in the background: waiting for SMTP would make real addresses
        // noticeably slower than unknown ones, which leaks the same information as a 404 would.
        res.status(200).json(FORGOT_RESPONSE);
        sendEmail({ email: user.email, subject: 'Password Reset Request', message }).catch(async (emailErr) => {
            console.error('Password reset email failed:', emailErr.message);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false }).catch(() => { });
        });
    } catch {
        res.status(500).json({ success: false, message: 'Cannot process forgot password request' });
    }
};

// @desc    Reset Password using token
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Invalidate previous refresh tokens for security
        await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });

        // Issue new tokens and log in automatically
        await sendTokenResponse(user, 200, res);
    } catch {
        res.status(500).json({ success: false, message: 'Cannot reset password' });
    }
};