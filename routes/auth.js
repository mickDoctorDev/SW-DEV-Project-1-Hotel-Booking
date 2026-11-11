const express = require('express');
const { register, login, refresh, getMe, logout, createUserByAdmin } = require('../controllers/auth');
const { protect, authorize } = require("../middleware/auth");
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.get('/logout', logout); // kept for backward compatibility

router.post('/create-user', protect, authorize('admin'), createUserByAdmin); //Admin create user (hotel admin)
module.exports = router;
