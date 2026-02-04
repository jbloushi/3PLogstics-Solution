const mongoose = require('mongoose');
const Shipment = require('../models/shipment.model');
require('../config/config');

async function fixShipment() {
    const trackingNumber = '6JYN-KQPQ-3A0P';
    console.log(`🔧 Patching Shipment: ${trackingNumber}`);

    if (mongoose.connection.readyState === 0) {
        await require('../config/database').connectDB();
    }

    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
        console.error('❌ Shipment not found');
        process.exit(1);
    }

    if (!shipment.pricingSnapshot) {
        console.error('❌ Snapshot missing entirely. Cannot patch.');
        process.exit(1);
    }

    // Force update expiry to tomorrow
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log(`Old Expiry: ${shipment.pricingSnapshot.expiresAt}`);

    shipment.pricingSnapshot.expiresAt = newExpiry;
    // Mark modified because it's a mixed type or nested object often not watched
    shipment.markModified('pricingSnapshot');

    await shipment.save();

    console.log(`✅ New Expiry: ${newExpiry}`);
    console.log('✅ Shipment patched successfully.');

    process.exit(0);
}

fixShipment().catch(e => {
    console.error(e);
    process.exit(1);
});
