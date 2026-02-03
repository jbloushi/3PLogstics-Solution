const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickup.controller');
const { protect, restrictTo } = require('../controllers/auth.controller');

router.use(protect); // All routes require login

router.route('/')
    .post(pickupController.createRequest)
    .get(pickupController.getAllRequests);

router.route('/:id')
    .get(pickupController.getRequest)
    .patch(pickupController.updateRequest) // Client can edit draft
    .delete(pickupController.deleteRequest); // Client can delete draft

// Staff/Admin only routes
router.post('/:id/approve', restrictTo('staff', 'admin'), pickupController.approveRequest);
router.post('/:id/reject', restrictTo('staff', 'admin'), pickupController.rejectRequest);

module.exports = router;
