const { buildDhlShipmentPayload } = require('../services/dhl-payload-builder');
const assert = require('assert');

// Mock Base Shipment
const baseShipment = {
    sender: {
        company: 'Sender Co', contactPerson: 'Sender', phone: '123', email: 's@test.com',
        streetLines: ['Street 1'], city: 'City', countryCode: 'KW', postalCode: '12345',
        vatNumber: 'VAT123'
    },
    receiver: {
        company: 'Recv Co', contactPerson: 'Recv', phone: '456', email: 'r@test.com',
        streetLines: ['Street 2'], city: 'London', countryCode: 'GB', postalCode: 'SW1',
        reference: 'REF-REC'
    },
    packages: [{ weight: { value: 1 }, dimensions: { length: 10, width: 10, height: 10 } }],
    items: [{ description: 'Item 1', hsCode: '123456', countryOfOrigin: 'KW', quantity: 1, value: 10, netWeight: 1 }],
    serviceCode: 'P',
    currency: 'USD',
    incoterm: 'DAP'
};

function runTest(name, dgData, checks) {
    console.log(`\nRunning Test: ${name}`);
    try {
        const shipment = { ...baseShipment, dangerousGoods: { ...dgData, contains: true } };
        const payload = buildDhlShipmentPayload(shipment, {});

        // Log simplified payload for inspection
        if (payload.valueAddedServices) {
            console.log('VAS Generated:', JSON.stringify(payload.valueAddedServices, null, 2));
        } else {
            console.log('No VAS Generated');
        }

        // Run Checks
        checks(payload);
        console.log('✅ Passed');
    } catch (e) {
        console.error('❌ Failed:', e.message);
        if (e.expected) console.error('Expected:', e.expected, 'Actual:', e.actual);
        process.exit(1);
    }
}

// TEST 1: Perfumes (UN1266)
runTest('Perfumes (UN1266)', {
    code: '1266', serviceCode: 'HE', contentId: '910', properShippingName: 'PERFUMERY PRODUCTS'
}, (payload) => {
    const vas = payload.valueAddedServices[0];
    assert.strictEqual(vas.serviceCode, 'HE');
    assert.strictEqual(vas.dangerousGoods[0].contentId, '910');
    assert.strictEqual(vas.dangerousGoods[0].unCode, 'UN1266');
    assert.ok(!payload.content.packages[0].dangerousGoods, 'Should NOT have dangerousGoods in packages');
});

// TEST 2: Lithium Batteries (UN3481)
runTest('Lithium Batteries (UN3481)', {
    code: '3481', serviceCode: 'HV', contentId: '967', properShippingName: 'Lithium Ion Batteries'
}, (payload) => {
    const vas = payload.valueAddedServices[0];
    assert.strictEqual(vas.serviceCode, 'HV');
    assert.strictEqual(vas.dangerousGoods[0].contentId, '967');
    assert.strictEqual(vas.dangerousGoods[0].unCode, 'UN3481');
});

// TEST 3: Consumer Commodity (ID8000)
runTest('Consumer Commodity (ID8000)', {
    code: '8000', serviceCode: 'HK', contentId: '700', properShippingName: 'Consumer Commodity'
}, (payload) => {
    const vas = payload.valueAddedServices[0];
    assert.strictEqual(vas.serviceCode, 'HK');
    assert.strictEqual(vas.dangerousGoods[0].unCode, 'ID8000'); // Note ID prefix
});

// TEST 4: Dry Ice (UN1845)
runTest('Dry Ice (UN1845)', {
    code: '1845', serviceCode: 'HC', contentId: '901', properShippingName: 'Dry Ice', dryIceWeight: 2.5
}, (payload) => {
    const vas = payload.valueAddedServices[0];
    assert.strictEqual(vas.serviceCode, 'HC');
    // Check for Dry Ice Weight in the Item (Strict REST requirement)
    assert.strictEqual(vas.dangerousGoods[0].dryIceWeight, 2.5);
});

// TEST 5: Extraneous Keys Check
console.log('\nRunning Test: Extraneous Keys Check');
const payload = buildDhlShipmentPayload(baseShipment, {});
assert.strictEqual(payload.valueAddedServices, undefined, 'Should have no VAS for non-DG');
assert.strictEqual(payload.content.packages[0].dangerousGoods, undefined, 'Should have no DG in packages');
console.log('✅ Passed');

console.log('\nALL TESTS PASSED ✨');
