const mongoose = require('mongoose');
const OrganizationLedger = require('../models/organizationLedger.model');
const Payment = require('../models/payment.model');
const PaymentAllocation = require('../models/paymentAllocation.model');
const Shipment = require('../models/shipment.model');
const Organization = require('../models/organization.model');
const User = require('../models/user.model');

const normalizeAmount = (value) => Number.parseFloat(value || 0);

const getShipmentChargeAmount = (shipment) => {
    if (!shipment) return 0;
    if (shipment.pricingSnapshot?.totalPrice !== undefined && shipment.pricingSnapshot?.totalPrice !== null) {
        return normalizeAmount(shipment.pricingSnapshot.totalPrice);
    }
    if (shipment.price !== undefined && shipment.price !== null) {
        return normalizeAmount(shipment.price);
    }
    return 0;
};

const getOrganizationBalance = async (organizationId) => {
    const matchId = organizationId ? (organizationId instanceof mongoose.Types.ObjectId ? organizationId : new mongoose.Types.ObjectId(organizationId)) : null;
    const summary = await OrganizationLedger.aggregate([
        { $match: { organization: matchId } },
        {
            $group: {
                _id: '$organization',
                totalDebits: {
                    $sum: {
                        $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amount', 0]
                    }
                },
                totalCredits: {
                    $sum: {
                        $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amount', 0]
                    }
                }
            }
        }
    ]);

    if (!summary.length) return 0;

    return normalizeAmount(summary[0].totalDebits) - normalizeAmount(summary[0].totalCredits);
};

const getLatestBalance = async (organizationId) => {
    const lastEntry = await OrganizationLedger.findOne({ organization: organizationId })
        .sort({ createdAt: -1 })
        .select('balanceAfter');

    return normalizeAmount(lastEntry?.balanceAfter || 0);
};

const createLedgerEntry = async (organizationId, entry, session = null) => {
    const amount = normalizeAmount(entry.amount);
    const multiplier = entry.entryType === 'DEBIT' ? 1 : -1;

    let balanceAfter = 0;

    if (organizationId) {
        // Update the organization balance atomically
        const org = await Organization.findOneAndUpdate(
            { _id: organizationId },
            { $inc: { balance: amount * multiplier } },
            { new: true, session }
        );

        if (!org) throw new Error('Organization not found for ledger entry');
        balanceAfter = org.balance;
    } else {
        // For Solo Shippers, we still maintain a "global" solo balance in the ledger
        const lastEntry = await OrganizationLedger.findOne({ organization: null })
            .sort({ createdAt: -1 })
            .select('balanceAfter');

        const currentBalance = normalizeAmount(lastEntry?.balanceAfter || 0);
        balanceAfter = currentBalance + (amount * multiplier);
    }

    // Create the immutable ledger record
    const [ledgerRecord] = await OrganizationLedger.create([{
        organization: organizationId,
        ...entry,
        amount,
        balanceAfter: normalizeAmount(balanceAfter)
    }], { session });

    return ledgerRecord;
};

/**
 * High-performance balance retrieval
 * Returns the "Credit" (cash on hand) available to the organization.
 */
const getAccountCredit = async (organizationId) => {
    const org = await Organization.findById(organizationId).select('unappliedBalance');
    return normalizeAmount(org?.unappliedBalance || 0);
};

const getAllocationTotal = async ({ organizationId, shipmentId, paymentId }) => {
    const match = { status: 'ACTIVE' };
    if (organizationId !== undefined) {
        match.organization = (organizationId === null) ? null : (organizationId instanceof mongoose.Types.ObjectId ? organizationId : new mongoose.Types.ObjectId(organizationId));
    }
    if (shipmentId) match.shipment = shipmentId instanceof mongoose.Types.ObjectId ? shipmentId : new mongoose.Types.ObjectId(shipmentId);
    if (paymentId) match.payment = paymentId instanceof mongoose.Types.ObjectId ? paymentId : new mongoose.Types.ObjectId(paymentId);

    const allocations = await PaymentAllocation.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return normalizeAmount(allocations[0]?.total || 0);
};

const getUnappliedCash = async (organizationId) => {
    if (!organizationId) {
        // For Solo Shippers, we aggregate payments directly as there's no Organization record
        const payments = await Payment.find({ organization: null });
        const allocations = await PaymentAllocation.aggregate([
            { $match: { organization: null, status: 'ACTIVE' } },
            { $group: { _id: '$payment', total: { $sum: '$amount' } } }
        ]);

        const allocationMap = allocations.reduce((acc, item) => {
            acc[item._id.toString()] = normalizeAmount(item.total);
            return acc;
        }, {});

        return payments.reduce((sum, payment) => {
            const allocated = allocationMap[payment._id.toString()] || 0;
            return sum + (normalizeAmount(payment.amount) - allocated);
        }, 0);
    }

    const org = await Organization.findById(organizationId).select('unappliedBalance');
    return normalizeAmount(org?.unappliedBalance || 0);
};

const getShipmentAccounting = async (shipmentId) => {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return null;

    const totalCharge = getShipmentChargeAmount(shipment);
    const allocated = await getAllocationTotal({ shipmentId });
    const remaining = totalCharge - allocated;
    const daysOutstanding = Math.floor((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    let status = 'unpaid';
    if (allocated > 0 && remaining > 0) status = 'partial';
    if (remaining <= 0 && totalCharge > 0) status = 'paid';
    if (remaining > 0 && daysOutstanding > 30) status = 'overdue';

    return {
        shipment,
        totalCharge,
        totalPaid: allocated,
        remainingBalance: remaining,
        status,
        daysOutstanding
    };
};

const getAgingReport = async (organizationId) => {
    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    const agingData = await Shipment.aggregate([
        { $match: { organization: organizationId ? (organizationId instanceof mongoose.Types.ObjectId ? organizationId : new mongoose.Types.ObjectId(organizationId)) : null } },
        {
            $lookup: {
                from: 'paymentallocations',
                localField: '_id',
                foreignField: 'shipment',
                as: 'allocations'
            }
        },
        {
            $addFields: {
                totalAllocated: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$allocations',
                                    as: 'a',
                                    cond: { $eq: ['$$a.status', 'ACTIVE'] }
                                }
                            },
                            as: 'f',
                            in: '$$f.amount'
                        }
                    }
                },
                totalCharge: { $ifNull: ['$pricingSnapshot.totalPrice', '$price'] }
            }
        },
        {
            $addFields: {
                remaining: { $subtract: ['$totalCharge', '$totalAllocated'] },
                daysOld: {
                    $divide: [
                        { $subtract: [now, '$createdAt'] },
                        1000 * 60 * 60 * 24
                    ]
                }
            }
        },
        { $match: { remaining: { $gt: 0.001 } } }
    ]);

    let totalUnpaid = 0;
    for (const item of agingData) {
        totalUnpaid += item.remaining;
        if (item.daysOld <= 30) buckets['0-30'] += item.remaining;
        else if (item.daysOld <= 60) buckets['31-60'] += item.remaining;
        else if (item.daysOld <= 90) buckets['61-90'] += item.remaining;
        else buckets['90+'] += item.remaining;
    }

    return { totalUnpaid, buckets };
};

const getOrganizationOverview = async (organizationId, creditLimit = 0) => {
    const balance = await getOrganizationBalance(organizationId);
    const unappliedCash = await getUnappliedCash(organizationId);

    // Re-sync shipment financial fields to ensure UI reflects correct statuses (for legacy data)
    await syncOrganizationShipmentFinancials(organizationId);

    // Standardized AR Aging
    const { totalUnpaid, buckets } = await getAgingReport(organizationId);

    const availableCredit = normalizeAmount(creditLimit) - balance;

    return {
        balance,
        creditLimit: normalizeAmount(creditLimit),
        availableCredit,
        unappliedCash,
        totalUnpaid,
        agingBuckets: buckets
    };
};

const getRevenueSnapshot = async ({ startDate, endDate, orgId }) => {
    const match = {
        sourceRepo: 'Shipment'
    };
    if (orgId) match.organization = orgId instanceof mongoose.Types.ObjectId ? orgId : new mongoose.Types.ObjectId(orgId);
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const snapshot = await OrganizationLedger.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    organization: '$organization'
                },
                totalRevenue: { $sum: { $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amount', { $subtract: [0, '$amount'] }] } },
                shipmentCount: { $sum: { $cond: [{ $eq: ['$entryType', 'DEBIT'] }, 1, 0] } }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    return snapshot;
};

const updatePaymentStatus = async (paymentId) => {
    const payment = await Payment.findById(paymentId);
    if (!payment) return null;

    const allocated = await getAllocationTotal({ paymentId });
    const remaining = normalizeAmount(payment.amount) - allocated;

    if (remaining <= 0) payment.status = 'APPLIED';
    else if (allocated > 0) payment.status = 'PARTIALLY_APPLIED';
    else payment.status = 'UNAPPLIED';

    await payment.save();
    return payment;
};

const updateShipmentPaidStatus = async (shipmentId) => {
    const id = typeof shipmentId === 'string' ? new mongoose.Types.ObjectId(shipmentId) : shipmentId;
    const accounting = await getShipmentAccounting(id);
    if (!accounting) return;

    // A shipment is paid if remaining balance is zero (or very close).
    // If it has no price yet (totalCharge: 0), we treat it as paid/cleared for allocation purposes.
    const isPaid = accounting.remainingBalance <= 0.001;
    await Shipment.findByIdAndUpdate(shipmentId, {
        paid: isPaid,
        totalPaid: accounting.totalPaid,
        remainingBalance: accounting.remainingBalance
    });
};

const allocatePayment = async ({ organizationId, paymentId, shipmentId, amount, createdBy, isFifo = false }) => {
    const allocation = await PaymentAllocation.create({
        organization: organizationId,
        payment: paymentId,
        shipment: shipmentId,
        amount: normalizeAmount(amount),
        createdBy,
        isFifo
    });

    const p = await Payment.findById(paymentId);
    const s = await Shipment.findById(shipmentId);
    const u = createdBy ? await User.findById(createdBy).select('name') : null;

    // Create a 0-amount audit entry in the ledger for visibility
    await createLedgerEntry(organizationId, {
        sourceRepo: 'Payment',
        sourceId: paymentId,
        amount: 0,
        entryType: 'CREDIT',
        category: 'ALLOCATION',
        description: `${isFifo ? '[FIFO] ' : ''}Allocation: ${p?.reference || 'Payment'} applied to ${s?.trackingNumber || 'Shipment'} by ${u?.name || 'System'}`,
        createdBy
    });

    // Update statuses
    await updatePaymentStatus(paymentId);
    await updateShipmentPaidStatus(shipmentId);

    // Atomically decrement the unapplied balance
    if (organizationId) {
        await Organization.findByIdAndUpdate(organizationId, {
            $inc: { unappliedBalance: -normalizeAmount(amount) }
        });
    }

    return allocation;
};

const reverseAllocation = async ({ allocationId, reversedBy, reason }) => {
    const allocation = await PaymentAllocation.findById(allocationId);
    if (!allocation) return null;

    allocation.status = 'REVERSED';
    allocation.reversedAt = new Date();
    allocation.reversalReason = reason || 'Reversal requested';
    allocation.reversedBy = reversedBy;
    await allocation.save();

    await updatePaymentStatus(allocation.payment);
    await updateShipmentPaidStatus(allocation.shipment);

    // Atomically increment the unapplied balance back
    if (allocation.organization) {
        await Organization.findByIdAndUpdate(allocation.organization, {
            $inc: { unappliedBalance: normalizeAmount(allocation.amount) }
        });
    }

    return allocation;
};

/**
 * Audit-Hardened Reversal: Creates an offsetting record for a specific ledger entry.
 * Ensures the ledger remains immutable and append-only.
 */
const reverseLedgerEntry = async (entryId, reversedBy, reason) => {
    const originalEntry = await OrganizationLedger.findById(entryId);
    if (!originalEntry) throw new Error('Original ledger entry not found');

    const amount = normalizeAmount(originalEntry.amount);
    // Reverse the entry type: DEBIT -> CREDIT, CREDIT -> DEBIT
    const entryType = originalEntry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT';
    const description = `REVERSAL: ${originalEntry.description} (Reason: ${reason || 'Manual reversal'})`;

    // Create the offsetting entry using atomic service
    const reversalEntry = await createLedgerEntry(originalEntry.organization, {
        sourceRepo: 'Reversal',
        sourceId: originalEntry.sourceId,
        parentEntryId: originalEntry._id,
        amount,
        entryType,
        category: 'REVERSAL',
        description,
        reference: originalEntry.reference,
        createdBy: reversedBy
    });

    // Special Case: If we reverse a Payment Credit, we must decrement the Unapplied Balance
    if (originalEntry.category === 'PAYMENT') {
        const unappliedMultiplier = entryType === 'DEBIT' ? -1 : 1;
        await Organization.findByIdAndUpdate(originalEntry.organization, {
            $inc: { unappliedBalance: amount * unappliedMultiplier }
        });
    }

    return reversalEntry;
};

const allocatePaymentsFifo = async ({ organizationId, createdBy }) => {
    const payments = await Payment.find({ organization: organizationId }).sort({ postedAt: 1 });
    const shipments = await Shipment.find({ organization: organizationId }).sort({ createdAt: 1 });

    const allocations = [];

    for (const payment of payments) {
        const allocatedTotal = await getAllocationTotal({ paymentId: payment._id });
        let remainingPayment = normalizeAmount(payment.amount) - allocatedTotal;
        if (remainingPayment <= 0) continue;

        for (const shipment of shipments) {
            if (remainingPayment <= 0) break;
            const totalCharge = getShipmentChargeAmount(shipment);
            if (totalCharge <= 0) continue;

            const shipmentAllocated = await getAllocationTotal({ shipmentId: shipment._id });
            const remainingShipment = totalCharge - shipmentAllocated;
            if (remainingShipment <= 0) continue;

            const allocationAmount = Math.min(remainingPayment, remainingShipment);
            const allocation = await allocatePayment({
                organizationId,
                paymentId: payment._id,
                shipmentId: shipment._id,
                amount: allocationAmount,
                createdBy,
                isFifo: true
            });
            allocations.push(allocation);
            remainingPayment -= allocationAmount;
        }
    }

    return allocations;
};

const syncOrganizationShipmentFinancials = async (organizationId) => {
    const orgQuery = organizationId === 'none' ? null : organizationId;
    const shipments = await Shipment.find({ organization: orgQuery });
    for (const shipment of shipments) {
        await updateShipmentPaidStatus(shipment._id);
    }
};

module.exports = {
    normalizeAmount,
    getShipmentChargeAmount,
    getOrganizationBalance,
    getLatestBalance,
    createLedgerEntry,
    getAccountCredit,
    getUnappliedCash,
    getShipmentAccounting,
    getAgingReport,
    getOrganizationOverview,
    getRevenueSnapshot,
    updatePaymentStatus,
    updateShipmentPaidStatus,
    syncOrganizationShipmentFinancials,
    allocatePayment,
    reverseAllocation,
    reverseLedgerEntry,
    allocatePaymentsFifo
};
