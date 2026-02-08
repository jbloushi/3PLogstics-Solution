const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const logger = require('../utils/logger');
const financeLedgerService = require('./financeLedger.service');

// Load env vars
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const seedDemoData = async () => {
    try {
        // If not connected, we skip assuming caller handles it, or we check state
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
            console.log('Connected to DB for seeding...');
        }

        // 1. Create Default Organization
        const orgName = 'Target Logistics Org';
        let org = await Organization.findOne({ name: orgName });

        if (!org) {
            org = await Organization.create({
                name: orgName,
                type: 'internal',
                creditLimit: 5000,
                currency: 'KWD',
                markup: { type: 'PERCENTAGE', percentageValue: 15 },
                addresses: [
                    {
                        label: 'Main Warehouse',
                        company: 'Target Logistics',
                        contactPerson: 'Operations Manager',
                        phone: '96500000000',
                        email: 'ops@targetlogistics.com',
                        streetLines: ['Industrial Area, Block 4'],
                        city: 'Kuwait City',
                        countryCode: 'KW',
                        isDefault: true
                    }
                ]
            });
            console.log(`Created Default Organization: ${orgName}`);
        } else {
            console.log(`Organization exists: ${orgName}`);
            org.creditLimit = 5000;
            org.type = 'internal';
            await org.save();
            console.log(`Organization financial defaults updated.`);
        }

        const seedBalance = 1000;
        const existingBalance = await financeLedgerService.getOrganizationBalance(org._id);
        if (existingBalance === 0 && seedBalance > 0) {
            await financeLedgerService.createLedgerEntry(org._id, {
                sourceRepo: 'Adjustment',
                sourceId: org._id,
                amount: seedBalance,
                entryType: 'CREDIT',
                category: 'ADJUSTMENT',
                description: 'Seed funding credit'
            });
        }

        // 2. Define Default Users
        const defaultUsers = [
            {
                name: 'System Admin',
                email: 'admin@demo.com',
                password: 'password123',
                role: 'admin',
                phone: '96511111111'
            },
            {
                name: 'Operations Staff',
                email: 'staff@demo.com',
                password: 'password123',
                role: 'staff',
                phone: '96522222222'
            },
            {
                name: 'Default Client',
                email: 'client@demo.com',
                password: 'password123',
                role: 'client',
                organization: org._id,
                phone: '96533333333',
                carrierConfig: { preferredCarrier: 'DHL', traderType: 'business' }
            },
            {
                name: 'Delivery Driver',
                email: 'driver@demo.com',
                password: 'password123',
                role: 'driver',
                phone: '96544444444'
            }
        ];

        for (const u of defaultUsers) {
            let existing = await User.findOne({ email: u.email });
            if (!existing) {
                const created = await User.create(u);
                if (u.organization) {
                    if (!org.members.includes(created._id)) {
                        org.members.push(created._id);
                    }
                }
                console.log(`Created Default User: ${u.email} (${u.role})`);
            } else {
                console.log(`User exists: ${u.email}. Resetting role and password.`);
                existing.password = u.password;
                existing.role = u.role;
                if (u.organization && !existing.organization) {
                    existing.organization = u.organization;
                    if (!org.members.includes(existing._id)) {
                        org.members.push(existing._id);
                    }
                }
                await existing.save();
            }
        }
        await org.save();

        console.log('Seeding completed successfully');
        return true;
    } catch (error) {
        console.error('Seeding failed:', error);
        return false;
    }
};

module.exports = seedDemoData;
