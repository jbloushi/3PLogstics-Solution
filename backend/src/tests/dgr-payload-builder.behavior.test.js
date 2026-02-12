const { buildDgrShipmentPayload } = require('../services/dgr-payload-builder');

const buildBaseShipment = () => ({
    sender: {
        company: 'Sender Co',
        contactPerson: 'Sender Person',
        phone: '+96512345678',
        email: 'sender@example.com',
        streetLines: ['Street 1'],
        city: 'Kuwait City',
        countryCode: 'KW',
        postalCode: '12345'
    },
    receiver: {
        company: 'Receiver Co',
        contactPerson: 'Receiver Person',
        phone: '+447911123456',
        email: 'receiver@example.com',
        streetLines: ['Street 2'],
        city: 'London',
        countryCode: 'GB',
        postalCode: 'SW1A1AA'
    },
    packages: [{ weight: { value: 2 }, dimensions: { length: 20, width: 20, height: 20 }, description: 'Box' }],
    items: [{
        description: 'Contents: Perfume creed 100ml / 2package DANGEROUS GOODS AS PER ASSOCIATED DGD',
        hsCode: '330300',
        countryOfOrigin: 'KW',
        quantity: 1,
        value: 10,
        netWeight: 1,
        currency: 'USD'
    }],
    dangerousGoods: {
        contains: true,
        code: '8000',
        serviceCode: 'HK',
        contentId: '700',
        properShippingName: 'Consumer Commodity'
    },
    currency: 'USD',
    serviceCode: 'P'
});

describe('dgr-payload-builder behavior', () => {
    test('does not append hardcoded Consumer commodity text to line item descriptions', () => {
        const payload = buildDgrShipmentPayload(buildBaseShipment(), { accountNumber: '123456789' });
        expect(payload.content.exportDeclaration.lineItems[0].description)
            .toBe('Contents: Perfume creed 100ml / 2package DANGEROUS GOODS AS PER ASSOCIATED DGD');
    });

    test('keeps long package description content instead of cutting to legacy short limit', () => {
        const shipment = buildBaseShipment();
        shipment.packages[0].description = 'Contents: Perfume creed 100ml / 2package DANGEROUS GOODS AS PER ASSOCIATED DGD';
        const payload = buildDgrShipmentPayload(shipment, { accountNumber: '123456789' });
        expect(payload.content.packages[0].description)
            .toContain('DANGEROUS GOODS AS PER ASSOCIATED DGD');
    });
});
