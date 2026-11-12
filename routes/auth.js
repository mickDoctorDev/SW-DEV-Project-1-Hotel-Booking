const express = require('express');
const { register, login, refresh, getMe, logout, createUserByAdmin, deleteMe, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect, authorize } = require("../middleware/auth");
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../middleware/validate');
const { loginAccountLimiter, loginIpLimiter, registerLimiter, refreshLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginIpLimiter, loginAccountLimiter, validateLogin, login);
router.post('/refresh', refreshLimiter, refresh);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.get('/logout', logout); // kept for backward compatibility

router.delete('/delete-me', protect, deleteMe);
router.post('/forgotpassword', forgotPasswordLimiter, validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordLimiter, validateResetPassword, resetPassword);

router.post('/create-user', protect, authorize('admin'), validateRegister, createUserByAdmin); //Admin create user (hotel admin)
module.exports = router;
