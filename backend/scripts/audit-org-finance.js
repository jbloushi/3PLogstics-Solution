const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Organization = require('../src/models/organization.model');
const Payment = require('../src/models/payment.model');
const Shipment = require('../src/models/shipment.model');
const PaymentAllocation = require('../src/models/paymentAllocation.model');

async function auditOrgFinance() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const org = await Organization.findOne({ name: /Global Trading Co/i });
        if (!org) {
            console.log('Organization not found');
            return;
        }

        console.log(`\n--- Audit for: ${org.name} (${org._id}) ---`);
        console.log(`Balance: ${org.balance}`);
        console.log(`Unapplied Balance (field): ${org.unappliedBalance}`);

        const payments = await Payment.find({ organization: org._id });
        console.log(`\nPayments found: ${payments.length}`);
        for (const p of payments) {
            const allocs = await PaymentAllocation.find({ payment: p._id, status: 'ACTIVE' });
            const totalAllocated = allocs.reduce((sum, a) => sum + a.amount, 0);
            console.log(`- Ref: ${p.reference || p._id}, Amount: ${p.amount}, Calculated Allocated: ${totalAllocated}, Status: ${p.status}`);
        }

        const shipments = await Shipment.find({ organization: org._id });
        console.log(`\nShipments found: ${shipments.length}`);
        for (const s of shipments) {
            const allocs = await PaymentAllocation.find({ shipment: s._id, status: 'ACTIVE' });
            const totalAllocated = allocs.reduce((sum, a) => sum + a.amount, 0);
            const price = s.pricingSnapshot?.totalPrice || s.price || 0;
            console.log(`- Tracking: ${s.trackingNumber}, Price: ${price}, Allocated: ${totalAllocated}, Paid: ${s.paid}, Status: ${s.status}`);
        }

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

auditOrgFinance();
