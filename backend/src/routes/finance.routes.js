const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const authController = require('../controllers/auth.controller');

// All finance routes require authentication
router.use(authController.protect);
// Restrict all finance routes to Staff/Admin per user request
router.use(authController.restrictTo('staff', 'admin'));

// User Routes
router.get('/balance', financeController.getBalance);
router.get('/ledger', financeController.getLedger);

// Admin/Staff Routes
router.post('/adjust', authController.restrictTo('admin', 'staff'), financeController.adjustBalance);

module.exports = router;
