const crypto = require('crypto');
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

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
