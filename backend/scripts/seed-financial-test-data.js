const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');
const Shipment = require('../src/models/shipment.model');
const Payment = require('../src/models/payment.model');
const PaymentAllocation = require('../src/models/paymentAllocation.model');
const OrganizationLedger = require('../src/models/organizationLedger.model');

async function seedTestData() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        // 1. Create Organization
        const orgName = 'Test Financial Org ' + Date.now();
        const organization = await Organization.create({
            name: orgName,
            type: 'BUSINESS',
            currency: 'KWD',
            markup: {
                type: 'PERCENTAGE',
                percentageValue: 15
            }
        });
        console.log(`Created Organization: ${organization.name} (${organization._id})`);

        // 2. Create Users
        const adminEmail = `admin-${Date.now()}@test.com`;
        const clientEmail = `client-${Date.now()}@test.com`;

        const adminUser = await User.create({
            name: 'Test Admin',
            email: adminEmail,
            password: 'password123',
            role: 'admin'
        });

        const orgUser = await User.create({
            name: 'Test Client',
            email: clientEmail,
            password: 'password123',
            role: 'client',
            organization: organization._id
        });

        organization.members.push(orgUser._id);
        await organization.save();

        console.log(`Created Users: Admin (${adminUser.email}), Client (${orgUser.email})`);

        // 3. Create Shipments
        const shipmentData = [
            { trackingNumber: 'SHIP-S1-' + Date.now(), price: 10, paid: false },
            { trackingNumber: 'SHIP-S2-' + Date.now(), price: 20, paid: false },
            { trackingNumber: 'SHIP-S3-' + Date.now(), price: 30, paid: false },
            { trackingNumber: 'SHIP-S4-' + Date.now(), price: 40, paid: false },
            { trackingNumber: 'SHIP-S5-' + Date.now(), price: 50, paid: false }
        ];

        const dummyAddress = {
            company: 'Test Co',
            contactPerson: 'John Doe',
            streetLines: ['123 Test St'],
            city: 'Kuwait City',
            countryCode: 'KW',
            phone: '12345678',
            email: 'test@test.com'
        };

        const financeLedgerService = require('../src/services/financeLedger.service');

        const shipments = [];
        for (const data of shipmentData) {
            const shipment = await Shipment.create({
                trackingNumber: data.trackingNumber,
                organization: organization._id,
                user: orgUser._id,
                origin: dummyAddress,
                destination: dummyAddress,
                currentLocation: dummyAddress,
                status: 'delivered',
                estimatedDelivery: new Date(),
                price: data.price,
                paid: data.paid,
                pricingSnapshot: {
                    totalPrice: data.price,
                    currency: 'KWD'
                },
                customer: {
                    name: 'Test Customer',
                    email: 'cust@test.com'
                }
            });

            // Use SERVICE for atomic debit and ledger entry
            await financeLedgerService.createLedgerEntry(organization._id, {
                sourceRepo: 'Shipment',
                sourceId: shipment._id,
                amount: data.price,
                entryType: 'DEBIT',
                category: 'SHIPMENT_CHARGE',
                description: `Charge for shipment ${data.trackingNumber}`,
                createdBy: adminUser._id
            });

            shipments.push(shipment);
        }
        console.log(`Created ${shipments.length} Shipments with atomic ledger entries`);

        // 4. Create Payments
        const paymentData = [
            { amount: 10, reference: 'PAY-FULL' },
            { amount: 15, reference: 'PAY-PARTIAL' },
            { amount: 100, reference: 'PAY-OVER' }
        ];

        const payments = [];
        for (const data of paymentData) {
            const payment = await Payment.create({
                organization: organization._id,
                amount: data.amount,
                reference: data.reference,
                status: 'UNAPPLIED',
                createdBy: adminUser._id
            });

            // Use SERVICE for atomic credit and ledger entry
            await financeLedgerService.createLedgerEntry(organization._id, {
                sourceRepo: 'Payment',
                sourceId: payment._id,
                amount: data.amount,
                entryType: 'CREDIT',
                category: 'PAYMENT',
                description: `Payment receive - ${data.reference}`,
                reference: data.reference,
                createdBy: adminUser._id
            });

            // Explicitly update unappliedBalance (since the service only handles balance)
            await Organization.findByIdAndUpdate(organization._id, {
                $inc: { unappliedBalance: data.amount }
            });

            payments.push(payment);
        }
        console.log(`Created ${payments.length} Payments with atomic credit and unapplied balance`);

        // 5. Create Allocations
        // Scenario A: Full Allocation (SHIP-S1 with PAY-FULL)
        await financeLedgerService.allocatePayment({
            organizationId: organization._id,
            paymentId: payments[0]._id,
            shipmentId: shipments[0]._id,
            amount: 10,
            createdBy: adminUser._id
        });

        // Scenario B: Partial Allocation (SHIP-S2 with PAY-PARTIAL)
        // Price is 20, Paying 15.
        await financeLedgerService.allocatePayment({
            organizationId: organization._id,
            paymentId: payments[1]._id,
            shipmentId: shipments[1]._id,
            amount: 15,
            createdBy: adminUser._id
        });

        // Scenario C: Over-allocation (SHIP-S3 with PAY-OVER)
        // Price is 30, Paying 30 from PAY-OVER (100 total)
        await financeLedgerService.allocatePayment({
            organizationId: organization._id,
            paymentId: payments[2]._id,
            shipmentId: shipments[2]._id,
            amount: 30,
            createdBy: adminUser._id
        });

        console.log('Created Allocations and updated statuses via SERVICE');

        console.log('\n--- SEEDING COMPLETE ---');
        console.log('Organization Name:', orgName);
        console.log('Admin Email:', adminUser.email);
        console.log('Client Email:', orgUser.email);
        console.log('Password: password123');
        console.log('------------------------\n');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedTestData();
