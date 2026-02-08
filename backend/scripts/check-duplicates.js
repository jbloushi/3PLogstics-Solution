const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Organization = require('../src/models/organization.model');
const PaymentAllocation = require('../src/models/paymentAllocation.model');
const Payment = require('../src/models/payment.model');
const Shipment = require('../src/models/shipment.model');

async function checkDuplicates() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const org = await Organization.findOne({ name: /Global Trading Co/i });
        if (!org) {
            console.log('Org not found');
        } else {
            const payment = await Payment.findOne({ organization: org._id, reference: 'REF' });
            if (payment) {
                console.log(`\nChecking allocations for payment REF (${payment._id}):`);
                const allocs = await PaymentAllocation.find({ payment: payment._id, status: 'ACTIVE' });
                console.log(`Total active allocations: ${allocs.length}`);
                let total = 0;
                allocs.forEach(a => {
                    total += a.amount;
                    console.log(`- ID: ${a._id}, Shipment: ${a.shipment}, Amount: ${a.amount}, Created: ${a.createdAt}`);
                });
                console.log(`Calculated Total: ${total}`);
            }
        }

        const missingOrgCount = await Shipment.countDocuments({ organization: { $exists: false } });
        const nullOrgCount = await Shipment.countDocuments({ organization: null });
        const explicitlyNoneCount = await Shipment.countDocuments({ organization: 'none' });

        console.log(`\nShipments with missing organization field: ${missingOrgCount}`);
        console.log(`Shipments with null organization field: ${nullOrgCount}`);
        console.log(`Shipments with string 'none' as organization: ${explicitlyNoneCount}`);

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkDuplicates();
