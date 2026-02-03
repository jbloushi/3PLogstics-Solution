const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const authController = require('../controllers/auth.controller');

// Protect all routes
router.use(authController.protect);

// Admin only routes for management
router.use(authController.restrictTo('admin', 'staff'));

router
    .route('/')
    .get(organizationController.getAllOrganizations)
    .post(authController.restrictTo('admin'), organizationController.createOrganization);

router
    .route('/:id')
    .get(organizationController.getOrganization)
    .patch(authController.restrictTo('admin'), organizationController.updateOrganization);

// Member Management
router.post('/:id/members', authController.restrictTo('admin'), organizationController.addMember);
router.delete('/:id/members/:userId', authController.restrictTo('admin'), organizationController.removeMember);

module.exports = router;
