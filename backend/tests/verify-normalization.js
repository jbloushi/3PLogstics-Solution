const { buildDgrShipmentPayload } = require('../src/services/dgr-payload-builder');
const assert = require('assert');

const baseShipment = {
    sender: {
        company: 'Sender Co', contactPerson: 'Sender', phone: '90001234', phoneCountryCode: '+965', email: 's@test.com',
        streetLines: ['Street 1'], city: 'Kuwait City', countryCode: 'KW', postalCode: '70050',
        traderType: 'business',
        buildingName: 'Logistics Tower', unitNumber: 'Office 10', area: 'Shuwaikh'
    },
    receiver: {
        company: 'Recv Co', contactPerson: 'Recv', phone: '447700900000', email: 'r@test.com',
        streetLines: ['Street 2'], city: 'London', countryCode: 'GB', postalCode: 'SW1A 1AA',
        traderType: 'business',
        landmark: 'Near Big Ben'
    },
    packages: [{ weight: { value: 1 }, dimensions: { length: 10, width: 10, height: 10 } }],
    items: [{ description: 'Item 1', hsCode: '123456', countryOfOrigin: 'KW', quantity: 1, value: 10, weight: 1 }],
    serviceCode: 'P',
    currency: 'USD',
    incoterm: 'DAP'
};

console.log('Running Expanded Normalization Verification...');

const payload = buildDgrShipmentPayload(baseShipment);

// 1. City Normalization
console.log(`City: ${payload.customerDetails.shipperDetails.postalAddress.cityName}`);
assert.strictEqual(payload.customerDetails.shipperDetails.postalAddress.cityName, 'KUWAIT');

// 2. Phone Normalization (should add +)
console.log(`Sender Phone: ${payload.customerDetails.shipperDetails.contactInformation.phone}`);
assert.strictEqual(payload.customerDetails.shipperDetails.contactInformation.phone, '+90001234');

console.log(`Receiver Phone: ${payload.customerDetails.receiverDetails.contactInformation.phone}`);
assert.strictEqual(payload.customerDetails.receiverDetails.contactInformation.phone, '+447700900000');

// 3. Address Splitting (should include building/unit/area somewhere in the lines)
const shipperAddr = payload.customerDetails.shipperDetails.postalAddress;
const allShipperLines = [shipperAddr.addressLine1, shipperAddr.addressLine2, shipperAddr.addressLine3].filter(Boolean).join(' ');
console.log(`All Shipper Lines: ${allShipperLines}`);

assert.ok(allShipperLines.includes('Street 1'));
assert.ok(allShipperLines.includes('Logistics Tower'));
assert.ok(allShipperLines.includes('Office 10'));
assert.ok(allShipperLines.includes('Shuwaikh'));

// 4. Receiver Landmark
const receiverAddr = payload.customerDetails.receiverDetails.postalAddress;
const allReceiverLines = [receiverAddr.addressLine1, receiverAddr.addressLine2, receiverAddr.addressLine3].filter(Boolean).join(' ');
console.log(`All Receiver Lines: ${allReceiverLines}`);
assert.ok(allReceiverLines.includes('Near Big Ben'));

console.log('\n✅ Expanded Normalization Verification Passed!');
