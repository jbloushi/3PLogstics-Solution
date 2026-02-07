const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'KWD'
    },
    status: {
        type: String,
        enum: ['UNAPPLIED', 'PARTIALLY_APPLIED', 'APPLIED'],
        default: 'UNAPPLIED'
    },
    method: {
        type: String,
        default: 'manual'
    },
    reference: {
        type: String,
        index: true
    },
    notes: String,
    postedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ledgerEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationLedger'
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

paymentSchema.index({ organization: 1, postedAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
