const mongoose = require('mongoose');

const organizationLedgerSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    shipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment'
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    amount: {
        type: Number,
        required: true
    },
    entryType: {
        type: String,
        enum: ['DEBIT', 'CREDIT'],
        required: true
    },
    category: {
        type: String,
        enum: ['SHIPMENT_CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL'],
        default: 'SHIPMENT_CHARGE'
    },
    description: {
        type: String,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    reference: {
        type: String,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

organizationLedgerSchema.index({ organization: 1, createdAt: -1 });

const OrganizationLedger = mongoose.model('OrganizationLedger', organizationLedgerSchema);

module.exports = OrganizationLedger;
