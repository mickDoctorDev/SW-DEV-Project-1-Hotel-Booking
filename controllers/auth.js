const crypto = require('crypto');
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
    try {
        const userId = req.user.id;

        // 1. Delete associated refresh tokens
        await RefreshToken.deleteMany({ user: userId });

        // 2. Delete user's bookings
        await Booking.deleteMany({ user: userId });

        // 3. Delete user
        await User.findByIdAndDelete(userId);

        // 4. Clear cookies
        res.clearCookie('token', cookieBase());
        res.clearCookie('refreshToken', { ...cookieBase(), path: '/api/v1/auth' });

        res.status(200).json({
            success: true,
            message: 'User account and associated data deleted successfully',
            data: {}
        });
    } catch {
        res.status(500).json({ success: false, message: 'Cannot delete user account' });
    }
};

// @desc    Forgot Password - request reset token & send email
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const clientOrigin = process.env.CLIENT_ORIGIN || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${clientOrigin}/resetpassword/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) requested a password reset.\n\nPlease reset your password by submitting a PUT request with your new password to:\n\n${resetUrl}\n\nThis link is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message
            });

            res.status(200).json({
                success: true,
                message: 'Password reset email sent',
                resetToken,
                resetUrl
            });
        } catch (emailErr) {
            console.error('Email error:', emailErr);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
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