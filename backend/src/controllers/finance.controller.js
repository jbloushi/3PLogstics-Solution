const User = require('../models/user.model');
const Ledger = require('../models/ledger.model');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

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

        res.status(200).json({
            success: true,
            data: {
                balance: org.balance || 0,
                creditLimit: org.creditLimit || 0,
                // Total spending power
                totalAvailable: (org.balance || 0) + (org.creditLimit || 0),
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
        const { page = 1, limit = 20, userId } = req.query;

        // Clients can only see their own organization's ledger
        // Staff/Admin can see specific user/org or all
        const query = {};

        // Populate org for current user
        const currentUser = await User.findById(req.user._id);

        if (req.user.role === 'client') {
            if (currentUser.organization) {
                // Future-proof: Ledger should have 'organization' field.
                // For immediate Phase 2 with existing Ledger schema:
                // We query Ledgers belonging to ANY user in the organization OR look for org-based logic
                // Since we haven't updated Ledger schema to have 'organization' ref yet, we rely on user IDs.

                const orgMembers = await User.find({ organization: currentUser.organization }).select('_id');
                const memberIds = orgMembers.map(u => u._id);
                query.user = { $in: memberIds };
            } else {
                query.user = req.user._id; // Fallback
            }
        } else if (userId) {
            query.user = userId;
        }

        const skip = (page - 1) * limit;

        const transactions = await Ledger.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('shipment', 'trackingNumber status');

        const total = await Ledger.countDocuments(query);

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
        const { userId, amount, type, category, description } = req.body;

        if (!userId || !amount || !type) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const user = await User.findById(userId).populate('organization');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        let targetEntity = user;

        // If Organization exists, we credit/debit the Org.
        if (user.organization) {
            const Organisation = require('../models/organization.model');
            targetEntity = await Organisation.findById(user.organization._id);
        } else {
            logger.warn(`Adjusting balance for independent User ${user._id} (No Org found)`);
        }

        const adjustment = parseFloat(amount);
        const oldBalance = targetEntity.balance || 0;
        let newBalance = oldBalance;

        if (type === 'CREDIT') {
            newBalance += adjustment;
        } else {
            newBalance -= adjustment;
        }

        targetEntity.balance = newBalance;
        await targetEntity.save();

        // Prepare metadata safely
        const metadata = {
            adminId: req.user._id.toString()
        };
        if (user.organization) {
            metadata.organizationId = user.organization._id.toString();
        }

        // Record in Ledger
        await Ledger.create({
            user: userId,
            amount: adjustment,
            type: type,
            category: category || 'ADJUSTMENT',
            description: description || `Manual ${type.toLowerCase()} by admin (Org Adjustment)`,
            balanceAfter: newBalance,
            metadata: metadata
        });

        logger.info(`Balance adjusted for Org ${targetEntity._id} (via User ${userId}) by admin ${req.user._id}: ${type} ${amount}`);

        res.status(200).json({
            success: true,
            message: 'Balance adjusted successfully',
            data: { newBalance }
        });
    } catch (error) {
        logger.error('Error adjusting balance:', error);
        res.status(500).json({ success: false, error: 'Failed to adjust balance' });
    }
};
