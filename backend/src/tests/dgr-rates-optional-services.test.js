const axios = require('axios');

jest.mock('axios');
jest.mock('../config/config', () => ({
    dhlApiKey: 'test-key',
    dhlApiSecret: 'test-secret',
    dhlAccountNumber: '123456',
    dhlApiUrl: 'https://api.mock.dhl.com/rest/v1'
}));

const DgrAdapter = require('../adapters/DgrAdapter');

describe('DgrAdapter.getRates optional services parsing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('parses valueAddedServices with price.amount format', async () => {
        const adapter = new DgrAdapter();

        axios.post.mockResolvedValue({
            data: {
                products: [
                    {
                        productCode: 'P',
                        productName: 'Express Worldwide',
                        totalPrice: [{ price: 12.5, currencyType: 'KWD' }],
                        valueAddedServices: [
                            {
                                serviceCode: 'II',
                                localServiceName: 'Shipment Insurance',
                                price: { amount: 3.25, currency: 'KWD' }
                            }
                        ]
                    }
                ]
            }
        });

        const quotes = await adapter.getRates({
            sender: { city: 'Kuwait', countryCode: 'KW', postalCode: '13001' },
            receiver: { city: 'Riyadh', countryCode: 'SA', postalCode: '11411' },
            serviceCode: 'P',
            parcels: [{ weight: 1, dimensions: { length: 10, width: 10, height: 10 } }]
        });

        expect(quotes[0].optionalServices).toEqual([
            {
                serviceCode: 'II',
                serviceName: 'Shipment Insurance',
                totalPrice: 3.25,
                currency: 'KWD'
            }
        ]);
    });

    test('parses alternative nested optional services and deduplicates codes', async () => {
        const adapter = new DgrAdapter();

        axios.post.mockResolvedValue({
            data: {
                products: [
                    {
                        productCode: 'Y',
                        productName: 'Express 12:00',
                        totalPrice: [{ price: 20, currencyType: 'KWD' }],
                        productAndServices: {
                            valueAddedServices: [
                                {
                                    localServiceCode: 'WY',
                                    serviceName: 'Non-Standard Pickup',
                                    price: { value: 1.5, currencyType: 'KWD' }
                                }
                            ]
                        },
                        additionalServices: [
                            {
                                code: 'WY',
                                name: 'Non-Standard Pickup Duplicate',
                                totalPrice: [{ price: 1.5, currencyType: 'KWD' }]
                            },
                            {
                                typeCode: 'NN',
                                name: 'Saturday Delivery',
                                totalPrice: 4
                            }
                        ]
                    }
                ]
            }
        });

        const quotes = await adapter.getRates({
            sender: { city: 'Kuwait', countryCode: 'KW', postalCode: '13001' },
            receiver: { city: 'Riyadh', countryCode: 'SA', postalCode: '11411' },
            serviceCode: 'Y',
            parcels: [{ weight: 1, dimensions: { length: 10, width: 10, height: 10 } }]
        });

        expect(quotes[0].optionalServices).toEqual([
            {
                serviceCode: 'WY',
                serviceName: 'Non-Standard Pickup',
                totalPrice: 1.5,
                currency: 'KWD'
            },
            {
                serviceCode: 'NN',
                serviceName: 'Saturday Delivery',
                totalPrice: 4,
                currency: 'KWD'
            }
        ]);
    });

    test('parses optional services from nested optionalServices containers with string prices', async () => {
        const adapter = new DgrAdapter();

        axios.post.mockResolvedValue({
            data: {
                products: [
                    {
                        productCode: 'P',
                        productName: 'Express Worldwide',
                        totalPrice: [{ price: '18.75', currencyType: 'KWD' }],
                        productAndServices: {
                            optionalServices: {
                                items: [
                                    {
                                        serviceCode: 'IB',
                                        serviceName: 'Insurance Basic',
                                        amount: '2.500',
                                        currency: 'KWD'
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        });

        const quotes = await adapter.getRates({
            sender: { city: 'Kuwait', countryCode: 'KW', postalCode: '13001' },
            receiver: { city: 'Riyadh', countryCode: 'SA', postalCode: '11411' },
            serviceCode: 'P',
            parcels: [{ weight: 1, dimensions: { length: 10, width: 10, height: 10 } }]
        });

        expect(quotes[0].optionalServices).toEqual([
            {
                serviceCode: 'IB',
                serviceName: 'Insurance Basic',
                totalPrice: 2.5,
                currency: 'KWD'
            }
        ]);
    });

});
