const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

require('./src/models/payment.model');
require('./src/models/shipment.model');
const PaymentAllocation = require('./src/models/paymentAllocation.model');
const Shipment = require('./src/models/shipment.model');

async function listEverything() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const orgId = '698273cf57a962a82343dcd3';

        const shipments = await Shipment.find({ organization: orgId }).select('_id trackingNumber paid price');
        const allocations = await PaymentAllocation.find({ organization: orgId });

        const report = {
            orgId,
            shipmentsCount: shipments.length,
            shipments: shipments.map(s => ({
                id: s._id,
                tracking: s.trackingNumber,
                paid: s.paid,
                price: s.price
            })),
            allocationsCount: allocations.length,
            allocations: allocations.map(a => ({
                id: a._id,
                shipmentId: a.shipment,
                amount: a.amount,
                status: a.status,
                createdAt: a.createdAt
            }))
        };

        fs.writeFileSync('full_report.json', JSON.stringify(report, null, 2));
        console.log('Written to full_report.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

listEverything();
