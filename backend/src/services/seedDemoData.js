const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const logger = require('../utils/logger');

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

        // 1. Create Demo Organization
        const orgName = 'Global Trading Co.';
        let org = await Organization.findOne({ name: orgName });

        if (!org) {
            org = await Organization.create({
                name: orgName,
                type: 'client',
                creditLimit: 5000,
                markup: { type: 'PERCENTAGE', percentageValue: 12 },
                addresses: [
                    {
                        label: 'HQ',
                        company: 'Global Trading Co.',
                        contactPerson: 'Manager',
                        phone: '9655551234',
                        email: 'info@globaltrading.com',
                        streetLines: ['Al Hamra Tower, Floor 50'],
                        city: 'Kuwait City',
                        countryCode: 'KW',
                        isDefault: true
                    }
                ]
            });
            console.log(`Created Organization: ${orgName}`);
        } else {
            console.log(`Organization exists: ${orgName}`);
        }

        // 2. Create Demo Client User linked to Org
        const clientEmail = 'client@globaltrading.com';
        let client = await User.findOne({ email: clientEmail });

        if (!client) {
            client = await User.create({
                name: 'John Trader',
                email: clientEmail,
                password: 'password123',
                role: 'client',
                organization: org._id,
                phone: '96590001111',
                carrierConfig: {
                    preferredCarrier: 'DHL',
                    taxId: 'TRrade123',
                    traderType: 'business'
                }
            });

            // Add to Org members
            if (!org.members.includes(client._id)) {
                org.members.push(client._id);
                await org.save();
            }

            console.log(`Created Client linked to Org: ${clientEmail}`);
        } else {
            console.log(`Client exists: ${clientEmail}`);
            // Ensure link
            if (!client.organization) {
                client.organization = org._id;
                await client.save();
                console.log(`Linked existing client to Org`);
            }
        }

        // 3. Create Demo Admin User
        const adminEmail = 'admin@targetlogistics.com';
        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: 'admin123',
                role: 'admin',
                phone: '96500000000'
            });
            console.log(`Created Admin User: ${adminEmail}`);
        } else {
            console.log(`Admin exists: ${adminEmail}`);
            admin.password = 'admin123';
            await admin.save();
            console.log(`Admin password updated.`);
        }

        // 4. Create @demo.com users
        const demoUsers = [
            { name: 'Demo Admin', email: 'admin@demo.com', password: 'password123', role: 'admin' },
            { name: 'Demo Staff', email: 'staff@demo.com', password: 'password123', role: 'staff' },
            { name: 'Demo Client', email: 'client@demo.com', password: 'password123', role: 'client', organization: org._id },
            { name: 'Demo Driver', email: 'driver@demo.com', password: 'password123', role: 'driver' }
        ];

        for (const u of demoUsers) {
            let existing = await User.findOne({ email: u.email });
            if (!existing) {
                const created = await User.create(u);
                if (u.organization) {
                    if (!org.members.includes(created._id)) {
                        org.members.push(created._id);
                    }
                }
                console.log(`Created Demo User: ${u.email}`);
            } else {
                console.log(`Demo User exists: ${u.email}`);
                existing.password = u.password;
                if (u.organization && !existing.organization) {
                    existing.organization = u.organization;
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
