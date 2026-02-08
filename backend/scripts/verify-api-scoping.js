const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const financeController = require('../src/controllers/finance.controller');
const Payment = require('../src/models/payment.model');
const Organization = require('../src/models/organization.model');

// Mock for Response
class MockResponse {
    constructor() {
        this.statusCode = 200;
        this.data = null;
    }
    status(code) {
        this.statusCode = code;
        return this;
    }
    json(data) {
        this.data = data;
        return this;
    }
}

async function verifyAPI() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgs = await Organization.find().limit(3);
        const orgIds = orgs.map(o => ({ id: o._id.toString(), name: o.name }));
        orgIds.push({ id: 'none', name: 'Solo Shippers' });

        for (const target of orgIds) {
            console.log(`\nGET /payments for: ${target.name} (${target.id})`);
            const req = { params: { orgId: target.id } };
            const res = new MockResponse();

            await financeController.listPayments(req, res);

            const payments = res.data.data;
            console.log(`-> Received ${payments.length} payments`);

            const crossOrgTotal = payments.filter(p => {
                const pOrg = p.organization ? p.organization.toString() : 'none';
                return pOrg !== target.id;
            }).length;

            if (crossOrgTotal > 0) {
                console.error(`!!! LEAK DETECTED: ${crossOrgTotal} payments belong to other orgs`);
                payments.forEach(p => {
                    const pOrg = p.organization ? p.organization.toString() : 'none';
                    if (pOrg !== target.id) console.log(`   - Payment ${p._id} belongs to ${pOrg}`);
                });
            } else {
                console.log(`-> SUCCESS: All payments correctly scoped.`);
            }
        }

    } catch (error) {
        console.error('Verify failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

verifyAPI();
