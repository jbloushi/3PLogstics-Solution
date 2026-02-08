const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

require('./src/models/payment.model');
require('./src/models/shipment.model');
const PaymentAllocation = require('./src/models/paymentAllocation.model');

async function listAllocations() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgId = '698273cf57a962a82343dcd3';
        const allocations = await PaymentAllocation.find({ organization: orgId }).populate('payment shipment');

        console.log(`Found ${allocations.length} allocations for organization ${orgId}`);
        for (const a of allocations) {
            console.log(`Allocation ${a._id}: Amount ${a.amount}, Status ${a.status}`);
            console.log(`  Shipment ID: ${a.shipment?._id || a.shipment} (Tracking: ${a.shipment?.trackingNumber || 'N/A'})`);
            console.log(`  Payment ID: ${a.payment?._id || a.payment}`);
            console.log(`  Created At: ${a.createdAt}`);
            console.log(`  Shipment Details found? : ${!!a.shipment && typeof a.shipment === 'object' && a.shipment.trackingNumber ? 'YES' : 'NO'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

listAllocations();
