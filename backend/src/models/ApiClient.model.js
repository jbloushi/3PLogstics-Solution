const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    apiKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    allowedCarriers: [{
        type: String,
        enum: ['DGR', 'DHL', 'FEDEX', 'UPS'],
        default: ['DGR']
    }],
    webhookUrl: {
        type: String,
        trim: true
    },
    rateLimit: {
        type: Number,
        default: 100 // requests per minute
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Helper to generate a new API Key
ApiClientSchema.statics.generateKey = function () {
    return 'sk_live_' + crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('ApiClient', ApiClientSchema);
