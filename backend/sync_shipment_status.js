const mongoose = require('mongoose');
const financeLedgerService = require('./src/services/financeLedger.service');
require('dotenv').config({ path: './.env' });

const mongoUri = process.env.MONGO_URI;

const run = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const Shipment = mongoose.model('Shipment');
        const shipments = await Shipment.find().lean();
        console.log(`Checking ${shipments.length} shipments...`);

        let updated = 0;
        for (const s of shipments) {
            const accounting = await financeLedgerService.getShipmentAccounting(s._id);
            const isPaid = accounting.remainingBalance <= 0.001 && accounting.totalCharge > 0;

            if (s.paid !== isPaid) {
                console.log(`Updating ${s.trackingNumber}: paid ${s.paid} -> ${isPaid}`);
                await Shipment.findByIdAndUpdate(s._id, { paid: isPaid });
                updated++;
            }
        }

        console.log(`Sync complete. Updated ${updated} shipments.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
