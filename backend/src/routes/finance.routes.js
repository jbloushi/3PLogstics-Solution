const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const authController = require('../controllers/auth.controller');

// All finance routes require authentication
router.use(authController.protect);

// User Routes
router.get('/balance', financeController.getBalance);
router.get('/ledger', financeController.getLedger);
router.get('/organizations/:orgId/overview', authController.restrictTo('staff', 'admin', 'accounting'), financeController.getOrganizationOverview);
router.get('/organizations/:orgId/payments', authController.restrictTo('staff', 'admin', 'accounting'), financeController.listPayments);
router.post('/organizations/:orgId/payments', authController.restrictTo('staff', 'admin', 'accounting'), financeController.postPayment);
router.post('/organizations/:orgId/allocations', authController.restrictTo('staff', 'admin', 'accounting'), financeController.allocatePaymentManual);
router.post('/organizations/:orgId/allocations/fifo', authController.restrictTo('staff', 'admin', 'accounting'), financeController.allocatePaymentsFifo);
router.get('/shipments/:shipmentId/accounting', authController.restrictTo('staff', 'admin', 'accounting'), financeController.getShipmentAccounting);
router.post('/allocations/:allocationId/reverse', authController.restrictTo('staff', 'admin', 'accounting'), financeController.reverseAllocation);

// Admin/Staff Routes


module.exports = router;
