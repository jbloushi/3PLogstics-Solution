const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/debug-hash', authController.debugHash);
router.post('/request-otp', authController.requestOtp);
router.post('/api-key', authController.protect, authController.generateApiKey);

// Staff management
router.get('/users', authController.protect, authController.restrictTo('staff', 'admin'), authController.getAllUsers);
router.get('/clients', authController.protect, authController.restrictTo('staff', 'admin'), authController.getClients);
router.patch('/surcharge', authController.protect, authController.restrictTo('staff', 'admin'), authController.updateUserSurcharge);

module.exports = router;
