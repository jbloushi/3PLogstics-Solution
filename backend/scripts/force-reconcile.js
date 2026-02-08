const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Organization = require('../src/models/organization.model');
const Payment = require('../src/models/payment.model');
const Shipment = require('../src/models/shipment.model');
const OrganizationLedger = require('../src/models/organizationLedger.model');
const PaymentAllocation = require('../src/models/paymentAllocation.model');

const normalizeAmount = (value) => Number.parseFloat(value || 0).toFixed(3) * 1;

async function reconcileAll() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgs = await Organization.find();
        orgs.push({ _id: null, name: 'Solo Shippers' });

        for (const org of orgs) {
            const orgId = org._id;
            console.log(`\nReconciling: ${org.name} (${orgId || 'null'})`);

            // 1. Recalculate Balance from Ledger
            const ledgerEntries = await OrganizationLedger.find({ organization: orgId }).sort({ createdAt: 1 });
            let runningBalance = 0;
            for (const entry of ledgerEntries) {
                const amount = normalizeAmount(entry.amount);
                if (entry.entryType === 'DEBIT') {
                    runningBalance += amount;
                } else {
                    runningBalance -= amount;
                }
                // Fix entry's balanceAfter if it drifted
                if (normalizeAmount(entry.balanceAfter) !== normalizeAmount(runningBalance)) {
                    await OrganizationLedger.updateOne({ _id: entry._id }, { balanceAfter: normalizeAmount(runningBalance) });
                }
            }
            console.log(`- Final Ledger Balance: ${normalizeAmount(runningBalance)}`);

            if (orgId) {
                await Organization.updateOne({ _id: orgId }, { balance: normalizeAmount(runningBalance) });
            }

            // 2. Recalculate Unapplied Cash
            const payments = await Payment.find({ organization: orgId });
            let totalUnapplied = 0;
            for (const p of payments) {
                const allocs = await PaymentAllocation.find({ payment: p._id, status: 'ACTIVE' });
                const allocated = allocs.reduce((sum, a) => sum + normalizeAmount(a.amount), 0);
                const unapplied = normalizeAmount(p.amount) - normalizeAmount(allocated);
                totalUnapplied += Math.max(0, unapplied);

                // Sync payment status
                let status = 'UNAPPLIED';
                if (unapplied <= 0) status = 'APPLIED';
                else if (allocated > 0) status = 'PARTIALLY_APPLIED';
                await Payment.updateOne({ _id: p._id }, { status });
            }
            console.log(`- Total Unapplied Cash: ${normalizeAmount(totalUnapplied)}`);

            if (orgId) {
                await Organization.updateOne({ _id: orgId }, { unappliedBalance: normalizeAmount(totalUnapplied) });
            }

            // 3. Sync Shipment Paid Status
            const shipments = await Shipment.find({ organization: orgId });
            for (const s of shipments) {
                const allocs = await PaymentAllocation.find({ shipment: s._id, status: 'ACTIVE' });
                const allocated = allocs.reduce((sum, a) => sum + normalizeAmount(a.amount), 0);
                const price = s.pricingSnapshot?.totalPrice || s.price || 0;
                const paid = normalizeAmount(allocated) >= normalizeAmount(price) && normalizeAmount(price) > 0;
                await Shipment.updateOne({ _id: s._id }, { paid });
            }
        }

        console.log('\n>>> SUCCESS: Full reconciliation complete.');

    } catch (error) {
        console.error('Reconciliation failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

reconcileAll();
