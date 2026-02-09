const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authController = require('../src/controllers/auth.controller');
const shipmentController = require('../src/controllers/shipment.controller');
const ShipmentBookingService = require('../src/services/ShipmentBookingService');
const Shipment = require('../src/models/shipment.model');
const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');

let mongoServer;

async function setup() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to In-Memory DB');
}

async function teardown() {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Disconnected from DB');
}

async function testRestrictTo() {
    console.log('--- Testing restrictTo (Case-Insensitive) ---');
    const middleware = authController.restrictTo('Staff', 'ADMIN');

    const req = { user: { role: 'staff' } };
    const res = { status: (code) => ({ json: (data) => { res.code = code; res.data = data; } }) };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await middleware(req, res, next);
    console.log('Result for "staff" matching "Staff":', nextCalled ? 'Passed' : 'Failed (' + res.code + ')');

    const req2 = { user: { role: 'CLIENT' } };
    let next2Called = false;
    const next2 = () => { next2Called = true; };
    await middleware(req2, res, next2);
    console.log('Result for "CLIENT" not matching ["Staff", "ADMIN"]:', !next2Called && res.code === 403 ? 'Passed' : 'Failed');
}

async function testUpdateShipmentWhitelist() {
    console.log('\n--- Testing updateShipment Whitelist ---');
    const user = await User.create({ name: 'Staff User', email: 'staff@test.com', role: 'staff', password: 'password123' });
    const shipment = await Shipment.create({
        trackingNumber: 'TEST123456',
        user: user._id,
        status: 'ready_for_pickup',
        origin: { contactPerson: 'Sender', phone: '123', formattedAddress: 'Address 1' },
        destination: { contactPerson: 'Receiver', phone: '456', formattedAddress: 'Address 2' },
        currentLocation: { contactPerson: 'Sender', phone: '123', formattedAddress: 'Address 1' },
        customer: { name: 'Receiver', email: 'receiver@test.com' },
        estimatedDelivery: new Date(),
        parcels: []
    });

    const req = {
        params: { trackingNumber: 'TEST123456' },
        user: user,
        body: {
            parcels: [{ description: 'New Parcel', weight: 10 }],
            incoterm: 'DDP',
            currency: 'USD',
            dangerousGoods: { contains: true, code: 'UN1234' }
        }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                res.code = code;
                res.data = data;
                return res;
            }
        })
    };

    await shipmentController.updateShipment(req, res);

    const updated = await Shipment.findOne({ trackingNumber: 'TEST123456' });
    const parcelsMatch = updated.parcels.length === 1 && updated.parcels[0].description === 'New Parcel';
    const otherFieldsMatch = updated.incoterm === 'DDP' && updated.currency === 'USD' && updated.dangerousGoods.contains === true;

    console.log('Parcels updated:', parcelsMatch ? 'Passed' : 'Failed');
    console.log('Incoterm/Currency/DG updated:', otherFieldsMatch ? 'Passed' : 'Failed');
}

async function testStaffBookingOverride() {
    console.log('\n--- Testing bookShipment Staff Override ---');
    // 1. Setup - Client with 0 balance
    const clientUser = await User.create({ name: 'Client User', email: 'client@test.com', role: 'client', password: 'password123' });

    // 2. Setup - Shipment with price and valid snapshot
    const shipment = await Shipment.create({
        trackingNumber: 'BOOK123',
        user: clientUser._id,
        status: 'ready_for_pickup',
        price: 100,
        pricingSnapshot: {
            totalPrice: 100,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
        },
        origin: { contactPerson: 'Sender', phone: '123', formattedAddress: 'Address 1' },
        destination: { contactPerson: 'Receiver', phone: '456', formattedAddress: 'Address 2' },
        currentLocation: { contactPerson: 'Sender', phone: '123', formattedAddress: 'Address 1' },
        customer: { name: 'Receiver', email: 'receiver@test.com' },
        estimatedDelivery: new Date(),
        parcels: [{ weight: 1, length: 1, width: 1, height: 1 }]
    });

    // 3. Mock Carrier Factory to avoid real calls
    const CarrierFactory = require('../src/services/CarrierFactory');
    CarrierFactory.getAdapter = () => ({
        createShipment: async () => ({ trackingNumber: 'CARRIER123', success: true })
    });

    // 4. Test booking as Client (should fail due to 0 credit)
    try {
        await ShipmentBookingService.bookShipment('BOOK123', null, clientUser);
        console.log('Client booking override (unexpected success): Failed');
    } catch (err) {
        console.log('Client booking blocked by credit check:', err.message === 'Insufficient available credit to book shipment.' ? 'Passed' : 'Failed (' + err.message + ')');
    }

    // 5. Test booking as Staff (should pass override)
    const staffUser = await User.create({ name: 'Staff User 2', email: 'staff2@test.com', role: 'staff', password: 'password123' });
    try {
        const result = await ShipmentBookingService.bookShipment('BOOK123', null, staffUser);
        console.log('Staff booking override:', result.success ? 'Passed' : 'Failed');
    } catch (err) {
        console.log('Staff booking override (unexpected error): Failed (' + err.message + ')');
    }
}

async function run() {
    try {
        await setup();
        await testRestrictTo();
        await testUpdateShipmentWhitelist();
        await testStaffBookingOverride();
    } catch (err) {
        console.error('Verification script crashed:', err);
    } finally {
        await teardown();
    }
}

run();
