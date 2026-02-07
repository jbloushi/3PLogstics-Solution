const OrganizationLedger = require('../models/organizationLedger.model');
const Payment = require('../models/payment.model');
const PaymentAllocation = require('../models/paymentAllocation.model');
const Shipment = require('../models/shipment.model');

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
    const summary = await OrganizationLedger.aggregate([
        { $match: { organization: organizationId } },
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

const createLedgerEntry = async (organizationId, entry) => {
    const currentBalance = await getLatestBalance(organizationId);
    const amount = normalizeAmount(entry.amount);
    const balanceAfter = entry.entryType === 'DEBIT'
        ? currentBalance + amount
        : currentBalance - amount;

    return OrganizationLedger.create({
        organization: organizationId,
        ...entry,
        amount,
        balanceAfter
    });
};

const getAllocationTotal = async ({ organizationId, shipmentId, paymentId }) => {
    const match = { status: 'ACTIVE' };
    if (organizationId) match.organization = organizationId;
    if (shipmentId) match.shipment = shipmentId;
    if (paymentId) match.payment = paymentId;

    const allocations = await PaymentAllocation.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return normalizeAmount(allocations[0]?.total || 0);
};

const getUnappliedCash = async (organizationId) => {
    const payments = await Payment.find({ organization: organizationId });
    const allocations = await PaymentAllocation.aggregate([
        { $match: { organization: organizationId, status: 'ACTIVE' } },
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

const getOrganizationOverview = async (organizationId, creditLimit = 0) => {
    const balance = await getOrganizationBalance(organizationId);
    const unappliedCash = await getUnappliedCash(organizationId);

    const shipments = await Shipment.find({ organization: organizationId });
    let totalUnpaid = 0;
    const buckets = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
    };

    for (const shipment of shipments) {
        const totalCharge = getShipmentChargeAmount(shipment);
        if (totalCharge <= 0) continue;
        const allocated = await getAllocationTotal({ shipmentId: shipment._id });
        const remaining = totalCharge - allocated;
        if (remaining <= 0) continue;

        totalUnpaid += remaining;
        const daysOutstanding = Math.floor((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOutstanding <= 30) buckets['0-30'] += remaining;
        else if (daysOutstanding <= 60) buckets['31-60'] += remaining;
        else if (daysOutstanding <= 90) buckets['61-90'] += remaining;
        else buckets['90+'] += remaining;
    }

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

const allocatePayment = async ({ organizationId, paymentId, shipmentId, amount, createdBy }) => {
    const allocation = await PaymentAllocation.create({
        organization: organizationId,
        payment: paymentId,
        shipment: shipmentId,
        amount: normalizeAmount(amount),
        createdBy
    });

    await updatePaymentStatus(paymentId);
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

    return allocation;
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
                createdBy
            });
            allocations.push(allocation);
            remainingPayment -= allocationAmount;
        }
    }

    return allocations;
};

module.exports = {
    getOrganizationBalance,
    createLedgerEntry,
    getOrganizationOverview,
    getShipmentAccounting,
    getUnappliedCash,
    allocatePayment,
    allocatePaymentsFifo,
    reverseAllocation,
    updatePaymentStatus
};
