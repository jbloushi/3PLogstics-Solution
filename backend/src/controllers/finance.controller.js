const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const OrganizationLedger = require('../models/organizationLedger.model');
const Payment = require('../models/payment.model');
const PaymentAllocation = require('../models/paymentAllocation.model');
const logger = require('../utils/logger');
const financeLedgerService = require('../services/financeLedger.service');

/**
 * Get current user balance
 */
exports.getBalance = async (req, res) => {
    try {
        // Fetch User and populate Organization
        const user = await User.findById(req.user._id).populate('organization');
        const org = user.organization;

        if (!org) {
            return res.status(404).json({ success: false, error: 'User is not linked to an organization' });
        }

        const balance = await financeLedgerService.getOrganizationBalance(org._id);
        const availableCredit = (org.creditLimit || 0) - balance;
        const unappliedCash = await financeLedgerService.getUnappliedCash(org._id);

        res.status(200).json({
            success: true,
            data: {
                balance,
                creditLimit: org.creditLimit || 0,
                availableCredit,
                unappliedCash,
                currency: org.currency || 'KWD'
            }
        });
    } catch (error) {
        logger.error('Error getting balance:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve balance' });
    }
};

/**
 * Get transaction history (Ledger)
 */
exports.getLedger = async (req, res) => {
    try {
        const { page = 1, limit = 20, orgId } = req.query;

        const query = {};

        const currentUser = await User.findById(req.user._id);

        if (req.user.role === 'client') {
            if (!currentUser.organization) {
                return res.status(404).json({ success: false, error: 'User is not linked to an organization' });
            }
            query.organization = currentUser.organization;
        } else if (orgId) {
            query.organization = orgId;
        }

        const skip = (page - 1) * limit;

        const transactions = await OrganizationLedger.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('shipment', 'trackingNumber status')
            .populate('payment', 'reference amount');

        const total = await OrganizationLedger.countDocuments(query);

        res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error getting ledger:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve transaction history' });
    }
};

/**
 * Manual Balance Adjustment (Admin Only)
 */
exports.adjustBalance = async (req, res) => {
    try {
        const { organizationId, amount, type, category, description } = req.body;

        if (!organizationId || !amount || !type) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        const adjustment = parseFloat(amount);
        const entry = await financeLedgerService.createLedgerEntry(organization._id, {
            amount: adjustment,
            entryType: type,
            category: category || 'ADJUSTMENT',
            description: description || `Manual ${type.toLowerCase()} by admin`,
            createdBy: req.user._id,
            metadata: { adminId: req.user._id.toString() }
        });

        logger.info(`Balance adjusted for Org ${organization._id} by admin ${req.user._id}: ${type} ${amount}`);

        res.status(200).json({
            success: true,
            message: 'Balance adjusted successfully',
            data: { newBalance: entry.balanceAfter }
        });
    } catch (error) {
        logger.error('Error adjusting balance:', error);
        res.status(500).json({ success: false, error: 'Failed to adjust balance' });
    }
};

exports.getOrganizationOverview = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.orgId);
        if (!organization) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        const overview = await financeLedgerService.getOrganizationOverview(organization._id, organization.creditLimit);

        res.status(200).json({ success: true, data: overview });
    } catch (error) {
        logger.error('Error getting organization overview:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve organization overview' });
    }
};

exports.getShipmentAccounting = async (req, res) => {
    try {
        const accounting = await financeLedgerService.getShipmentAccounting(req.params.shipmentId);
        if (!accounting) {
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        const allocations = await PaymentAllocation.find({ shipment: req.params.shipmentId })
            .populate('payment', 'reference amount postedAt')
            .sort({ allocatedAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                ...accounting,
                allocations
            }
        });
    } catch (error) {
        logger.error('Error getting shipment accounting:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve shipment accounting' });
    }
};

exports.listPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ organization: req.params.orgId })
            .sort({ postedAt: -1 })
            .populate('ledgerEntry', 'entryType amount');
        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        logger.error('Error listing payments:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve payments' });
    }
};

exports.postPayment = async (req, res) => {
    try {
        const { amount, method, reference, notes } = req.body;
        const organization = await Organization.findById(req.params.orgId);
        if (!organization) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        const ledgerEntry = await financeLedgerService.createLedgerEntry(organization._id, {
            amount,
            entryType: 'CREDIT',
            category: 'PAYMENT',
            description: `Payment posted${reference ? ` (${reference})` : ''}`,
            reference,
            createdBy: req.user._id
        });

        const payment = await Payment.create({
            organization: organization._id,
            amount,
            method,
            reference,
            notes,
            createdBy: req.user._id,
            ledgerEntry: ledgerEntry._id
        });

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        logger.error('Error posting payment:', error);
        res.status(500).json({ success: false, error: 'Failed to post payment' });
    }
};

exports.allocatePaymentManual = async (req, res) => {
    try {
        const { paymentId, shipmentId, amount } = req.body;
        if (!paymentId || !shipmentId || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const allocation = await financeLedgerService.allocatePayment({
            organizationId: req.params.orgId,
            paymentId,
            shipmentId,
            amount,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: allocation });
    } catch (error) {
        logger.error('Error allocating payment:', error);
        res.status(500).json({ success: false, error: 'Failed to allocate payment' });
    }
};

exports.allocatePaymentsFifo = async (req, res) => {
    try {
        const allocations = await financeLedgerService.allocatePaymentsFifo({
            organizationId: req.params.orgId,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: allocations });
    } catch (error) {
        logger.error('Error allocating payments FIFO:', error);
        res.status(500).json({ success: false, error: 'Failed to allocate payments' });
    }
};

exports.reverseAllocation = async (req, res) => {
    try {
        const allocation = await financeLedgerService.reverseAllocation({
            allocationId: req.params.allocationId,
            reversedBy: req.user._id,
            reason: req.body?.reason
        });
        if (!allocation) {
            return res.status(404).json({ success: false, error: 'Allocation not found' });
        }

        res.status(200).json({ success: true, data: allocation });
    } catch (error) {
        logger.error('Error reversing allocation:', error);
        res.status(500).json({ success: false, error: 'Failed to reverse allocation' });
    }
};
