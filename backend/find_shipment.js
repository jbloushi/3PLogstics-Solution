const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Shipment = require('./src/models/shipment.model');

async function findShipment() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const ids = ['69870482b6262e5c38704cc4', '6982a32c74e0c3332ed8273f'];

        for (const id of ids) {
            const shipment = await Shipment.findById(id);
            if (shipment) {
                console.log(`--- Shipment ${id} ---`);
                console.log('Tracking Number:', shipment.trackingNumber);
                console.log('Organization:', shipment.organization);
                console.log('Paid:', shipment.paid);
            } else {
                console.log(`Shipment ${id} not found`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

findShipment();
