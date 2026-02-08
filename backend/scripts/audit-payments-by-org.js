const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payment = require('../src/models/payment.model');
const Organization = require('../src/models/organization.model');

async function auditPaymentsByOrg() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const allPayments = await Payment.find();
        console.log(`Total Payments: ${allPayments.length}`);

        const orgMap = {};
        const orgNames = {};

        const orgDocs = await Organization.find();
        orgDocs.forEach(o => orgNames[o._id.toString()] = o.name);
        orgNames['null'] = 'Solo Shippers';

        for (const p of allPayments) {
            const orgKey = p.organization ? p.organization.toString() : 'null';
            if (!orgMap[orgKey]) orgMap[orgKey] = [];
            orgMap[orgKey].push({
                id: p._id,
                ref: p.reference,
                amount: p.amount,
                status: p.status
            });
        }

        console.log('\n--- Payments Distribution ---');
        for (const [orgId, payments] of Object.entries(orgMap)) {
            console.log(`\nOrganization: ${orgNames[orgId] || orgId}`);
            console.log(`Count: ${payments.length}`);
            payments.slice(0, 5).forEach(p => {
                console.log(`  - Ref: ${p.ref}, Amt: ${p.amount}, Status: ${p.status}`);
            });
            if (payments.length > 5) console.log('    ...');
        }

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

auditPaymentsByOrg();
