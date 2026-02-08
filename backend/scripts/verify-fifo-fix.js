const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const financeLedgerService = require('../src/services/financeLedger.service');
const Organization = require('../src/models/organization.model');
const Payment = require('../src/models/payment.model');
const Shipment = require('../src/models/shipment.model');

async function verifyFifoAndUnapplied() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        // 1. Test getUnappliedCash for null (Solo Shippers)
        console.log('\n--- Testing Unapplied Cash (Solo Shippers) ---');
        const soloUnapplied = await financeLedgerService.getUnappliedCash(null);
        console.log(`Solo Shippers Unapplied Cash: ${soloUnapplied} KD`);

        // 2. Test FIFO for Solo Shippers
        console.log('\n--- Testing FIFO Allocation (Solo Shippers) ---');
        const soloAllocations = await financeLedgerService.allocatePaymentsFifo({
            organizationId: null,
            createdBy: new mongoose.Types.ObjectId()
        });
        console.log(`Solo Shippers FIFO Allocations Created: ${soloAllocations.length}`);

        // 3. Test for a real organization
        const org = await Organization.findOne();
        if (org) {
            console.log(`\n--- Testing Organization: ${org.name} ---`);
            const orgUnapplied = await financeLedgerService.getUnappliedCash(org._id);
            console.log(`Org Unapplied Cash (Cached): ${orgUnapplied} KD`);

            const orgAllocations = await financeLedgerService.allocatePaymentsFifo({
                organizationId: org._id,
                createdBy: new mongoose.Types.ObjectId()
            });
            console.log(`Org FIFO Allocations Created: ${orgAllocations.length}`);

            const orgUnappliedAfter = await financeLedgerService.getUnappliedCash(org._id);
            console.log(`Org Unapplied Cash (After FIFO): ${orgUnappliedAfter} KD`);
        }

        console.log('\n>>> SUCCESS: Verification completed without errors.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

verifyFifoAndUnapplied();
