const mongoose = require('mongoose');
const Shipment = require('./src/models/shipment.model');
const OrganizationLedger = require('./src/models/organizationLedger.model');
const { connectDB } = require('./src/config/database');
require('dotenv').config();

async function diagnose() {
    await connectDB();
    const trackingNumber = 'DGR-SEU6JFVJ';

    console.log(`Diagnosing shipment: ${trackingNumber}`);

    const shipment = await Shipment.findOne({ trackingNumber }).populate('organization');
    if (!shipment) {
        console.log('Shipment not found');
        process.exit(1);
    }

    console.log('--- Shipment Data ---');
    console.log(`ID: ${shipment._id}`);
    console.log(`Organization: ${shipment.organization}`);
    console.log(`Paid: ${shipment.paid}`);

    const ledgerEntries = await OrganizationLedger.find({ shipment: shipment._id }).populate('organization');
    console.log('\n--- Ledger Entries ---');
    if (ledgerEntries.length === 0) {
        console.log('No ledger entries found for this shipment');
    } else {
        ledgerEntries.forEach(entry => {
            console.log(`- Org: ${entry.organization ? entry.organization.name : 'NONE'} | Type: ${entry.entryType} | Amount: ${entry.amount} | Date: ${entry.createdAt}`);
        });
    }

    process.exit(0);
}

diagnose();
