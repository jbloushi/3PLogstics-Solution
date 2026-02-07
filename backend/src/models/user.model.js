const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        index: true
    },
    name: {
        type: String,
        required: [true, 'Please provide a name']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        enum: ['client', 'staff', 'admin', 'driver'],
        default: 'client'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    // [DEPRECATED] Moved to Organization
    // 3PL Profit Engine
    // 3PL Profit Engine
    markup: {
        type: {
            type: String,
            enum: ['PERCENTAGE', 'FLAT', 'COMBINED', 'FORMULA'],
            default: 'PERCENTAGE'
        },
        // Legacy single value for PERC/FLAT
        value: {
            type: Number,
            default: 15
        },
        // Explicit values for COMBINED support
        percentageValue: {
            type: Number,
            default: 0
        },
        flatValue: {
            type: Number,
            default: 0
        },
        formula: {
            type: String,
            default: null
        }
    },

    // Carrier Configuration
    carrierConfig: {
        preferredCarrier: {
            type: String,
            enum: ['DGR', 'DHL', 'FEDEX', 'UPS', 'MOCK'],
            default: 'DGR'
        },
        // Trade / Tax IDs
        taxId: { type: String, trim: true }, // General Tax ID
        eori: { type: String, trim: true },  // EORI Number (EU)
        vatNo: { type: String, trim: true }, // VAT Number
        traderType: {
            type: String,
            enum: ['business', 'private', 'charity'],
            default: 'business'
        },
        defaultReference: { type: String, trim: true } // Default Shipper Reference pattern
    },

    // Saved Addresses (for Sender selection)
    addresses: [{
        label: {
            type: String,
            default: 'Default'  // "Home", "Office", "Warehouse"
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        company: String,
        contactPerson: String,
        streetLines: [String],
        buildingName: String,
        unitNumber: String,
        area: String,
        landmark: String,
        city: String,
        postalCode: String,
        countryCode: {
            type: String,
            default: 'KW'  // Kuwait default
        },
        phone: String,
        phoneCountryCode: {
            type: String,
            default: '+965'
        },
        email: String,
        additionalEmails: [String],
        additionalPhones: [String],

        // Compliance & Trade Fields
        vatNumber: String,
        eoriNumber: String,
        taxId: String,
        traderType: {
            type: String,
            enum: ['business', 'private', 'charity'],
            default: 'business'
        },
        reference: String
    }],

    apiKey: {
        type: String,
        unique: true,
        sparse: true
    },
    // [DEPRECATED] Moved to Organization
    balance: {
        type: Number,
        default: 0
    },
    // [DEPRECATED] Moved to Organization
    creditLimit: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.generateApiKey = function () {
    const key = crypto.randomBytes(32).toString('hex');
    this.apiKey = key;
    return key;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
