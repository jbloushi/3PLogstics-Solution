const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');

// Protect all routes
router.use(authController.protect);

// Get users (Staff/Admin only for listing clients)
router.get('/', authController.restrictTo('staff', 'admin'), userController.getUsers);

// Get current user profile
router.get('/me', userController.getMe);
router.patch('/profile', userController.updateProfile);

// Admin Only Routes
router.patch('/:id', authController.restrictTo('admin'), userController.updateUser);
router.delete('/:id', authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;
