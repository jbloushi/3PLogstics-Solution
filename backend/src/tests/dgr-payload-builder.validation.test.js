const { buildDgrShipmentPayload } = require('../services/dgr-payload-builder');

const createBaseOrder = () => ({
    sender: {
        company: 'Sender Co',
        contactPerson: 'Alice',
        streetLines: ['Street 1'],
        city: 'Kuwait',
        countryCode: 'KW',
        postalCode: '13001',
        phone: '+96511111111'
    },
    receiver: {
        contactPerson: 'Bob',
        streetLines: ['Street 2'],
        city: 'Dubai',
        countryCode: 'AE',
        postalCode: '00000',
        phone: '+97155555555'
    },
    items: [
        {
            description: 'Perfume',
            hsCode: '330300',
            countryOfOrigin: 'FR',
            quantity: 1,
            value: 10,
            currency: 'USD'
        }
    ],
    packages: [{
        weight: { value: 1 },
        dimensions: { length: 10, width: 10, height: 10 }
    }],
    currency: 'USD',
    serviceCode: 'P',
    dangerousGoods: {
        contains: true,
        code: '1266',
        serviceCode: 'HE',
        contentId: '910',
        properShippingName: 'PERFUMERY PRODUCTS',
        customDescription: 'DANGEROUS GOODS AS PER ASSOCIATED DGD'
    }
});

describe('dgr-payload-builder DG validation', () => {
    test('throws when DG customDescription is missing', () => {
        const order = createBaseOrder();
        delete order.dangerousGoods.customDescription;

        expect(() => buildDgrShipmentPayload(order, { accountNumber: '451012315' })).toThrow(/Custom Description is required/);
    });

    test('throws when dry ice shipment is missing dryIceWeight', () => {
        const order = createBaseOrder();
        order.dangerousGoods = {
            contains: true,
            code: '1845',
            serviceCode: 'HC',
            contentId: '901',
            properShippingName: 'DRY ICE',
            customDescription: 'DRY ICE AS PER ASSOCIATED DGD'
        };

        expect(() => buildDgrShipmentPayload(order, { accountNumber: '451012315' })).toThrow(/dryIceWeight/i);
    });
});
