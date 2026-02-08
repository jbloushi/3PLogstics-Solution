const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const OrganizationLedger = require('../src/models/organizationLedger.model');
require('../src/models/shipment.model'); // Ensure ref is registered
require('../src/models/payment.model');  // Ensure ref is registered

async function testLedgerRetrieval() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const trackingNumber = 'DGR-M7DROV2Y';

        // Find the ledger entry that SHOULD have this shipment info
        // We know it was created with sourceRepo: 'Shipment'
        const ledgerEntries = await OrganizationLedger.find({ sourceRepo: 'Shipment' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({
                path: 'sourceId',
                select: 'trackingNumber status amount'
            });

        console.log('\n--- Ledger Retrieval Test ---');
        ledgerEntries.forEach(entry => {
            const doc = entry.toObject();
            if (doc.sourceRepo === 'Shipment') doc.shipment = doc.sourceId;

            console.log(`Entry ID: ${doc._id}`);
            console.log(`  Source: ${doc.sourceRepo}`);
            console.log(`  Shipment Info:`, doc.shipment);
            if (doc.shipment && doc.shipment.trackingNumber === trackingNumber) {
                console.log(`  >>> SUCCESS: Found and populated target shipment!`);
            }
        });

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testLedgerRetrieval();
