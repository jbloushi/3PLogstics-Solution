const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const financeController = require('../src/controllers/finance.controller');
const Payment = require('../src/models/payment.model');
const Organization = require('../src/models/organization.model');

async function testListPaymentsScoping() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgs = await Organization.find().limit(2);
        if (orgs.length < 2) {
            console.log('Need at least 2 orgs for this test');
            return;
        }

        const org1 = orgs[0];
        const org2 = orgs[1];

        console.log(`\n--- Testing Scoping ---`);

        // Mock req/res for Org 1
        let res1Data = null;
        const req1 = { params: { orgId: org1._id.toString() } };
        const res1 = {
            status: () => ({ json: (d) => { res1Data = d; } })
        };
        await financeController.listPayments(req1, res1);
        console.log(`Org 1 (${org1.name}): Found ${res1Data.data.length} payments`);
        const org1Leaks = res1Data.data.filter(p => p.organization && p.organization.toString() !== org1._id.toString());
        console.log(`Org 1 Leaks: ${org1Leaks.length}`);

        // Mock req/res for Org 2
        let res2Data = null;
        const req2 = { params: { orgId: org2._id.toString() } };
        const res2 = {
            status: () => ({ json: (d) => { res2Data = d; } })
        };
        await financeController.listPayments(req2, res2);
        console.log(`Org 2 (${org2.name}): Found ${res2Data.data.length} payments`);
        const org2Leaks = res2Data.data.filter(p => p.organization && p.organization.toString() !== org2._id.toString());
        console.log(`Org 2 Leaks: ${org2Leaks.length}`);

        // Mock req/res for 'none'
        let resNoneData = null;
        const reqNone = { params: { orgId: 'none' } };
        const resNone = {
            status: () => ({ json: (d) => { resNoneData = d; } })
        };
        await financeController.listPayments(reqNone, resNone);
        console.log(`Solo Shippers (none): Found ${resNoneData.data.length} payments`);
        const noneLeaks = resNoneData.data.filter(p => p.organization !== null);
        console.log(`Solo Leaks: ${noneLeaks.length}`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testListPaymentsScoping();
