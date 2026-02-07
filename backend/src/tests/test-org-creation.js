const mongoose = require('mongoose');
const Organization = require('../models/organization.model');
require('dotenv').config();

async function testValidation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Test with a valid BUSINESS type (previously would have failed if only client/partner/internal were allowed)
        console.log('\nTesting valid BUSINESS type...');
        const org1 = new Organization({
            name: 'Test Business Org',
            type: 'BUSINESS',
            taxId: 'TAX123',
            balance: 100
        });
        await org1.validate();
        console.log('✅ BUSINESS type validation passed');

        // Test with INDIVIDUAL
        console.log('\nTesting valid INDIVIDUAL type...');
        const org2 = new Organization({
            name: 'Test Individual Org',
            type: 'INDIVIDUAL'
        });
        await org2.validate();
        console.log('✅ INDIVIDUAL type validation passed');

        // Test with invalid type
        console.log('\nTesting invalid type...');
        try {
            const org3 = new Organization({
                name: 'Invalid Org',
                type: 'INVALID_TYPE'
            });
            await org3.validate();
            console.log('❌ Validation should have failed for INVALID_TYPE');
        } catch (error) {
            console.log('✅ Correctly failed for INVALID_TYPE:', error.message);
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testValidation();
