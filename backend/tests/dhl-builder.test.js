const { buildDhlShipmentPayload, validateDhlInvoiceData } = require('../src/services/dhl-payload-builder');

// Mock Data Builders
const createBaseOrder = () => ({
    sender: {
        company: 'Sender Co',
        contactPerson: 'Adnan',
        streetLines: ['Block 1', 'Street 2'],
        city: 'Kuwait City',
        postalCode: '12345',
        countryCode: 'KW',
        phone: '96512345678',
        email: 'sender@test.com'
    },
    receiver: {
        company: 'Receiver GmbH',
        contactPerson: 'Hans',
        streetLines: ['Berliner Str 1'],
        city: 'Berlin',
        postalCode: '10115',
        countryCode: 'DE',
        phone: '49123456789',
        email: 'receiver@test.com'
    },
    items: [
        {
            description: 'T-Shirt',
            hsCode: '610910',
            quantity: 10,
            value: 5.00,
            netWeight: 0.2,
            countryOfOrigin: 'KW'
        }
    ],
    packages: [
        {
            weight: { value: 2.5, unit: 'kg' },
            dimensions: { length: 30, width: 20, height: 10, unit: 'cm' },
            description: 'Box 1'
        }
    ],
    currency: 'USD',
    incoterm: 'DAP',
    shipmentDate: '2023-10-25T10:00:00Z'
});

describe('DHL Payload Builder', () => {

    test('Scenario 1: KW -> DE (Normal Goods)', () => {
        const order = createBaseOrder();
        // Add specific VAT/EORI (Normalized field is 'taxId')
        order.receiver.taxId = 'DE123456789';

        const payload = buildDhlShipmentPayload(order, { accountNumber: '123456' });

        // Assertions
        expect(payload.customerDetails.receiverDetails.postalAddress.countryCode).toBe('DE');
        expect(payload.content.isCustomsDeclarable).toBe(true);

        // Check Export Declaration
        const exportDecl = payload.content.exportDeclaration;
        expect(exportDecl).toBeDefined();
        expect(exportDecl.invoice.number).toContain('INV-');
        expect(exportDecl.lineItems[0].commodityCodes[0].value).toBe('610910');
        expect(exportDecl.lineItems[0].quantity.value).toBe(10);

        // Check Receiver VAT
        const regNums = payload.customerDetails.receiverDetails.registrationNumbers;
        expect(regNums).toEqual(expect.arrayContaining([
            expect.objectContaining({ typeCode: 'VAT', number: 'DE123456789' })
        ]));
    });

    test('Scenario 2: KW -> GB (Lithium Batteries UN3481, contentId 967)', () => {
        const order = createBaseOrder();
        order.receiver.countryCode = 'GB';
        order.dangerousGoods = {
            contains: true,
            code: '3481',
            serviceCode: 'HV',
            contentId: '967',
            customDescription: 'LITHIUM ION BATTERIES CONTAINED IN EQUIPMENT'
        };

        const payload = buildDhlShipmentPayload(order);
        const lineItemDesc = payload.content.exportDeclaration.lineItems[0].description;
        const vas = payload.valueAddedServices[0];

        expect(lineItemDesc).toContain('UN3481');
        expect(vas.serviceCode).toBe('HV');
        expect(vas.dangerousGoods[0].contentId).toBe('967');
        expect(vas.dangerousGoods[0].unCode).toBe('UN3481');
    });

    test('Scenario 3: KW -> FR (Perfume UN1266, contentId 910)', () => {
        const order = createBaseOrder();
        order.receiver.countryCode = 'FR';
        order.dangerousGoods = {
            contains: true,
            code: '1266',
            serviceCode: 'HE',
            contentId: '910',
            packingGroup: 'II'
        };

        const payload = buildDhlShipmentPayload(order);
        const lineItemDesc = payload.content.exportDeclaration.lineItems[0].description;
        const vas = payload.valueAddedServices[0];

        expect(lineItemDesc).toContain('UN1266');
        expect(vas.serviceCode).toBe('HE');
        expect(vas.dangerousGoods[0].contentId).toBe('910');
    });

    test('Scenario 4: KW -> US (Consumer Commodity ID8000, contentId 700)', () => {
        const order = createBaseOrder();
        order.receiver.countryCode = 'US';
        order.dangerousGoods = {
            contains: true,
            code: '8000',
            serviceCode: 'HK',
            contentId: '700'
        };

        const payload = buildDhlShipmentPayload(order);
        const lineItemDesc = payload.content.exportDeclaration.lineItems[0].description;
        const vas = payload.valueAddedServices[0];

        expect(lineItemDesc).toContain('ID8000');
        expect(vas.serviceCode).toBe('HK');
        expect(vas.dangerousGoods[0].contentId).toBe('700');
        expect(vas.dangerousGoods[0].unCode).toBe('ID8000');
    });

    test('Scenario 5: KW -> DE (Dry Ice UN1845, service HC)', () => {
        const order = createBaseOrder();
        order.dangerousGoods = {
            contains: true,
            code: '1845',
            serviceCode: 'HC',
            contentId: '901',
            dryIceWeight: 2.5
        };

        const payload = buildDhlShipmentPayload(order);
        const lineItemDesc = payload.content.exportDeclaration.lineItems[0].description;
        const vas = payload.valueAddedServices[0];

        expect(lineItemDesc).toContain('Dry Ice UN1845');
        expect(lineItemDesc).toContain('2.5kg');
        expect(vas.serviceCode).toBe('HC');
        expect(vas.value).toBe(2.5);
    });

    test('Scenario 6: DDP with Pallet Count and Trader Type', () => {
        const order = createBaseOrder();
        order.incoterm = 'DDP';
        order.payerOfVat = 'shipper';
        order.palletCount = 2;
        order.packageMarks = 'FRAGILE';
        order.receiverReference = 'REC-REF-789';
        order.sender.traderType = 'business';
        order.receiver.traderType = 'private';

        const payload = buildDhlShipmentPayload(order);

        // Verify Accounts (Shipper + Duties-Taxes for DDP)
        expect(payload.accounts).toHaveLength(2);
        expect(payload.accounts[1].typeCode).toBe('duties-taxes');

        // Verify Trader Types
        expect(payload.customerDetails.shipperDetails.typeCode).toBe('business');
        expect(payload.customerDetails.receiverDetails.typeCode).toBe('private');

        // Verify Pallet Count and Marks in description
        expect(payload.content.description).toContain('Pallets: 2');
        expect(payload.content.packages[0].description).toBe('Box 1 - FRAGILE');

        // Verify Receiver Reference
        const invoiceRefs = payload.content.exportDeclaration.invoice.customerReferences;
        expect(invoiceRefs.find(r => r.typeCode === 'CU').value).toBe('REC-REF-789');
    });

    test('Validation: Fails on missing HS Code', () => {
        const order = createBaseOrder();
        delete order.items[0].hsCode;

        const errors = validateDhlInvoiceData(order);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('HS Code is required');

        expect(() => buildDhlShipmentPayload(order)).toThrow();
    });

    test('Validation: Fails on missing Shipper Phone', () => {
        const order = createBaseOrder();
        delete order.sender.phone;

        const errors = validateDhlInvoiceData(order);
        expect(errors).toEqual(expect.arrayContaining([
            expect.stringContaining('Shipper: Phone is required')
        ]));
    });

    test('Normalization: HS Code handling', () => {
        const order = createBaseOrder();
        order.items[0].hsCode = '6109.10.00'; // formatting

        const payload = buildDhlShipmentPayload(order);
        expect(payload.content.exportDeclaration.lineItems[0].commodityCodes[0].value).toBe('61091000');
    });

    test('Data Mapping: Explicit EORI and VAT', () => {
        const order = createBaseOrder();
        order.receiver.vatNumber = 'DE999';
        order.receiver.eoriNumber = 'DE111';
        // Note: taxId might be set by normalizer, but builder should prioritize mapped fields

        const payload = buildDhlShipmentPayload(order, { accountNumber: '123456' });
        const regNums = payload.customerDetails.receiverDetails.registrationNumbers;

        expect(regNums).toEqual(expect.arrayContaining([
            expect.objectContaining({ typeCode: 'VAT', number: 'DE999' }),
            expect.objectContaining({ typeCode: 'EOR', number: 'DE111' })
        ]));
    });

});
