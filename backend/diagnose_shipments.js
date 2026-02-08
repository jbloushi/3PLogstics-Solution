const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const mongoUri = process.env.MONGO_URI;

const run = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const Shipment = mongoose.model('Shipment', new mongoose.Schema({
            organization: mongoose.Schema.ObjectId,
            paid: Boolean,
            trackingNumber: String
        }));

        const Organization = mongoose.model('Organization', new mongoose.Schema({
            name: String
        }));

        const shipments = await Shipment.find().lean();
        console.log(`Total Shipments: ${shipments.length}`);

        const orgCounts = {};
        let nullOrgCount = 0;
        let unpaidCount = 0;

        for (const s of shipments) {
            if (!s.paid) unpaidCount++;
            if (s.organization) {
                const orgId = s.organization.toString();
                orgCounts[orgId] = (orgCounts[orgId] || 0) + 1;
            } else {
                nullOrgCount++;
            }
        }

        console.log(`Unpaid Shipments: ${unpaidCount}`);
        console.log(`Shipments with no organization (Solo): ${nullOrgCount}`);

        for (const [orgId, count] of Object.entries(orgCounts)) {
            const org = await Organization.findById(orgId);
            console.log(`Org: ${org ? org.name : 'Unknown'} (${orgId}): ${count} shipments`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
