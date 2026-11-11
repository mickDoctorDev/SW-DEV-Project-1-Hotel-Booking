const jwt = require("jsonwebtoken");
const User = require("../models/User");

const unauthorized = (res) => res.status(401).json({ success: false, message: 'Not authorized to access this route' });

exports.protect = async (req, res, next) => {
    let token = req.cookies && req.cookies.token;
    // Bearer fallback kept so the existing frontend keeps working
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token || token === 'null') return unauthorized(res);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return unauthorized(res);
        req.user = user;
        next();
    } catch {
        unauthorized(res);
    }
}

exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You are not allowed to access this route' });
    }
    next();
}
