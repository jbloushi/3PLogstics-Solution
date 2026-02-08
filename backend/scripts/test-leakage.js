const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const financeController = require('../src/controllers/finance.controller');
const Payment = require('../src/models/payment.model');
const Organization = require('../src/models/organization.model');

async function testLeakage() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgs = await Organization.find().limit(2);
        const org1 = orgs[0];
        const org2 = orgs[1];

        // 1. Create a payment for Org 1
        const testPayment = await Payment.create({
            organization: org1._id,
            amount: 777,
            reference: 'LEAK-TEST-777',
            status: 'UNAPPLIED'
        });
        console.log(`Created test payment ${testPayment._id} for Org 1 (${org1.name})`);

        // 2. Try to list payments for Org 2
        let resData = null;
        const req = { params: { orgId: org2._id.toString() } };
        const res = {
            status: () => ({ json: (d) => { resData = d; } })
        };
        await financeController.listPayments(req, res);

        const foundLeak = resData.data.find(p => p.reference === 'LEAK-TEST-777');
        if (foundLeak) {
            console.error('FAIL: Payment for Org 1 leaked into Org 2 list!');
        } else {
            console.log('SUCCESS: No leak found in Org 2 list.');
        }

        // 3. Try to list payments for 'none'
        let resNoneData = null;
        const reqNone = { params: { orgId: 'none' } };
        const resNone = {
            status: () => ({ json: (d) => { resNoneData = d; } })
        };
        await financeController.listPayments(reqNone, resNone);

        const foundNoneLeak = resNoneData.data.find(p => p.reference === 'LEAK-TEST-777');
        if (foundNoneLeak) {
            console.error('FAIL: Payment for Org 1 leaked into Solo Shippers list!');
        } else {
            console.log('SUCCESS: No leak found in Solo Shippers list.');
        }

        // Cleanup
        await Payment.deleteOne({ _id: testPayment._id });

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testLeakage();
