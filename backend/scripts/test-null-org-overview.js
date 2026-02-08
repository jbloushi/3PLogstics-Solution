const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const financeLedgerService = require('../src/services/financeLedger.service');

async function testNullOrgOverview() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        console.log('Testing getOrganizationOverview with orgId: null (Solo Shippers)...');
        const overview = await financeLedgerService.getOrganizationOverview(null, 0);

        console.log('\n--- Overview for Solo Shippers ---');
        console.log(JSON.stringify(overview, null, 2));
        console.log('>>> SUCCESS: Overview loaded without crashing!');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testNullOrgOverview();
