const PricingService = require('../services/pricing.service');
const assert = require('assert');

// Simple test runner since we don't have a full test suite setup
async function runTests() {
    console.log('🧪 Testing PricingService...');

    try {
        // Test 1: Create Snapshot
        const rate = 100;
        const markup = 10;
        const snapshot = PricingService.createSnapshot(rate, markup, 'KWD');

        assert.strictEqual(snapshot.carrierRate, 100, 'Carrier Rate mismatch');
        assert.strictEqual(snapshot.markup, 10, 'Markup amount mismatch');
        assert.strictEqual(snapshot.totalPrice, 110, 'Total Price mismatch');
        assert.ok(snapshot.rateHash, 'Hash missing');
        assert.ok(snapshot.expiresAt > new Date(), 'Expiry invalid');
        console.log('✅ Snapshot Creation Passed');

        // Test 2: Validation
        const valid = PricingService.validateSnapshot(snapshot);
        assert.strictEqual(valid, true, 'Validation failed for fresh snapshot');
        console.log('✅ Validation Passed');

        // Test 3: Expiry
        const expiredSnapshot = { ...snapshot, expiresAt: new Date(Date.now() - 1000) };
        const invalid = PricingService.validateSnapshot(expiredSnapshot);
        assert.strictEqual(invalid, false, 'Expired snapshot should fail');
        console.log('✅ Expiry Check Passed');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

runTests();
