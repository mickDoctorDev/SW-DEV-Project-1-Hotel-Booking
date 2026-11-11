// Strict input checks at the trust boundary. Rejects non-string values (blocks NoSQL operator objects).
const isStr = (v) => typeof v === 'string';
const EMAIL = /^[^\s@<>()\[\]\\,;:"]+@[^\s@<>()\[\]\\,;:"]+\.[A-Za-z]{2,}$/;
const TEL = /^[0-9+\-\s]{8,15}$/;

const fail = (res, msg) => res.status(400).json({ success: false, message: msg });

exports.validateRegister = (req, res, next) => {
    const { name, tel, email, password } = req.body || {};
    if (![name, tel, email, password].every(isStr)) return fail(res, 'name, tel, email and password are required strings');
    if (!name.trim() || name.length > 100) return fail(res, 'Invalid name');
    if (!TEL.test(tel)) return fail(res, 'Invalid telephone number');
    if (!EMAIL.test(email) || email.length > 254) return fail(res, 'Invalid email');
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return fail(res, 'Password must be 8-72 characters and contain a letter and a digit');
    next();
};

exports.validateLogin = (req, res, next) => {
    const { email, password } = req.body || {};
    if (!isStr(email) || !isStr(password) || !email || !password) return fail(res, 'Please provide an email and password');
    next();
};
