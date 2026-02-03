const axios = require('axios');
jest.mock('axios'); // Hoisted, but let's be explicit

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const ApiClient = require('../src/models/ApiClient.model');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let apiKey;

beforeAll(async () => {
    // Setup in-memory DB for integration test
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Disconnect existing if any (from server.js startup)
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    apiKey = ApiClient.generateKey();
    await ApiClient.create({
        name: 'Integration Test Client',
        apiKey: apiKey,
        allowedCarriers: ['DHL']
    });
});

beforeEach(() => {
    // Default Mock Response for DHL Create Shipment
    axios.post.mockResolvedValue({
        data: {
            shipmentTrackingNumber: '1234567890',
            documents: [
                { typeCode: 'label', content: 'base64label' },
                { typeCode: 'invoice', content: 'base64invoice' }
            ]
        }
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Public API v1', () => {

    test('POST /api/v1/shipments - Returns 401 without Key', async () => {
        const res = await request(app)
            .post('/api/v1/shipments')
            .send({});
        expect(res.statusCode).toBe(401);
    });

    test('POST /api/v1/shipments - Returns 403 with Invalid Key', async () => {
        const res = await request(app)
            .post('/api/v1/shipments')
            .set('x-api-key', 'invalid_key')
            .send({});
        expect(res.statusCode).toBe(403);
    });

    test('POST /api/v1/shipments - Validates Shipment Data', async () => {
        // Missing required fields
        const res = await request(app)
            .post('/api/v1/shipments')
            .set('x-api-key', apiKey)
            .send({
                sender: { company: 'Test' } // Incomplete
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe('Validation Failed');
    });

    test('POST /api/v1/shipments - Successful Creation Stub', async () => {
        // Mock payload
        const payload = {
            sender: {
                company: 'Sender Co',
                contactPerson: 'Adnan',
                streetLines: ['Street 1'],
                city: 'Kuwait City',
                postalCode: '12345',
                countryCode: 'KW',
                phone: '96512345678',
                email: 'sender@test.com'
            },
            receiver: {
                company: 'Receiver Co',
                contactPerson: 'Hans',
                streetLines: ['Street 2'],
                city: 'Berlin',
                postalCode: '10115',
                countryCode: 'DE',
                phone: '4912345678',
                email: 'receiver@test.com'
            },
            items: [{
                description: 'Shirt',
                hsCode: '610910',
                quantity: 1,
                value: 10,
                netWeight: 0.1,
                countryOfOrigin: 'KW'
            }],
            packages: [{
                weight: { value: 1, unit: 'kg' },
                dimensions: { length: 10, width: 10, height: 10, unit: 'cm' },
                description: 'Box'
            }],
            currency: 'USD',
            serviceCode: 'P'
        };

        const res = await request(app)
            .post('/api/v1/shipments')
            .set('x-api-key', apiKey)
            .send(payload);

        // Note: Unless we mock axios in DhlAdapter, this might fail or hit real sandbox.
        // For integration test stability, we should probably mock the Adapter or DhlService.
        // However, DhlAdapter currently hits a test URL.

        if (res.statusCode === 201) {
            expect(res.body.success).toBe(true);
            expect(res.body.data.trackingNumber).toBeDefined();
        } else {
            // If it fails due to network or validation, valid behavior for now 
            // as long as it's not 401/403 or 500/Internal Auth Error
            expect(res.statusCode).not.toBe(401);
            expect(res.statusCode).not.toBe(403);
            expect(res.statusCode).toBe(201); // Fail explicitly
        }
    });

});
