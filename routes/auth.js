const express = require('express');
const { register, login, refresh, getMe, logout, createUserByAdmin, deleteMe, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect, authorize } = require("../middleware/auth");
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.get('/logout', logout); // kept for backward compatibility

router.delete('/delete-me', protect, deleteMe);
router.post('/forgotpassword', authLimiter, validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', authLimiter, validateResetPassword, resetPassword);

router.post('/create-user', protect, authorize('admin'), validateRegister, createUserByAdmin); //Admin create user (hotel admin)
module.exports = router;
