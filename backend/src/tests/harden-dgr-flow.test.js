const { validateShipmentForDgr } = require('../services/dgr-payload-builder');
const DgrAdapter = require('../adapters/DgrAdapter');
const CarrierLog = require('../models/CarrierLog');
const axios = require('axios');

jest.mock('axios');
jest.mock('../models/CarrierLog');
jest.mock('../config/config', () => ({
    dhlApiKey: 'test-key',
    dhlApiSecret: 'test-secret',
    dhlAccountNumber: '123456789',
    dhlApiUrl: 'https://api.mock.dhl.com/rest/v1'
}));

describe('DGR Flow Hardening Verification', () => {
    const validShipment = {
        sender: {
            company: 'Sender Co', contactPerson: 'Sender', phone: '123', email: 's@test.com',
            streetLines: ['Street 1'], city: 'City', countryCode: 'KW', postalCode: '12345'
        },
        receiver: {
            company: 'Recv Co', contactPerson: 'Recv', phone: '456', email: 'r@test.com',
            streetLines: ['Street 2'], city: 'London', countryCode: 'GB', postalCode: 'SW1'
        },
        packages: [{ weight: { value: 1 }, dimensions: { length: 10, width: 10, height: 10 } }],
        items: [{ description: 'Item 1', hsCode: '123456', countryOfOrigin: 'KW', quantity: 1, value: 10, netWeight: 1 }],
        serviceCode: 'P',
        currency: 'USD',
        incoterm: 'DAP'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('validateShipmentForDgr should require postalCode', () => {
        const shipmentNoPostal = JSON.parse(JSON.stringify(validShipment));
        delete shipmentNoPostal.sender.postalCode;
        delete shipmentNoPostal.receiver.postalCode;

        const errors = validateShipmentForDgr(shipmentNoPostal);
        expect(errors).toContain('Shipper: Postal Code is required.');
        expect(errors).toContain('Consignee: Postal Code is required.');
    });

    test('DgrAdapter should handle 422 errors and surface details', async () => {
        const adapter = new DgrAdapter();
        const errorResponse = {
            response: {
                status: 422,
                data: {
                    title: 'Validation Error',
                    detail: 'Invalid address',
                    additionalDetails: [
                        { field: 'postalCode', message: 'Missing postal code' }
                    ]
                }
            }
        };
        axios.post.mockRejectedValue(errorResponse);
        CarrierLog.create.mockResolvedValue({});

        try {
            await adapter.createShipment(validShipment, 'P');
        } catch (error) {
            expect(error.isProviderError).toBe(true);
            expect(error.statusCode).toBe(422);
            expect(error.details).toBeDefined();
            expect(error.message).toContain('Invalid address');
        }
    });

    test('DgrAdapter should succeed even if CarrierLog fails (robust logging)', async () => {
        const adapter = new DgrAdapter();
        axios.post.mockResolvedValue({
            status: 201,
            data: { shipmentTrackingNumber: 'TRACK123', documents: [] }
        });

        // Mock CarrierLog.create to FAIL
        CarrierLog.create.mockRejectedValue(new Error('DB Error'));

        const result = await adapter.createShipment(validShipment, 'P');
        expect(result.trackingNumber).toBe('TRACK123');
        // The error should be caught and logged but not crash the flow
        expect(CarrierLog.create).toHaveBeenCalled();
    });

    test('CarrierLog should be created with null user if user is missing', async () => {
        const adapter = new DgrAdapter();
        axios.post.mockResolvedValue({
            status: 201,
            data: { shipmentTrackingNumber: 'TRACK456', documents: [] }
        });
        CarrierLog.create.mockResolvedValue({});

        const shipmentNoUser = { ...validShipment };
        delete shipmentNoUser.user;

        await adapter.createShipment(shipmentNoUser, 'P');

        expect(CarrierLog.create).toHaveBeenCalledWith(expect.objectContaining({
            user: undefined,
            carrier: 'DGR',
            success: true
        }));
    });
});
