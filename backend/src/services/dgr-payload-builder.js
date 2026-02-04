const { normalizeShipment } = require('../utils/shipmentNormalizer');

/**
 * Normalizes a string to contain only digits.
 * @param {string} val 
 * @returns {string}
 */
const normalizeDigits = (val) => (val || '').replace(/\D/g, '');

/**
 * Formatting helper for 3 decimal places
 * @param {number} num 
 * @returns {number}
 */
const formatWeight = (num) => Number(Number(num || 0).toFixed(3));

/**
 * Validates the order data for DGR Invoice requirements (Pre-flight).
 * Returns an array of error strings.
 * @param {Object} order - The normalized order object
 * @returns {string[]} errors
 */
function validateShipmentForDgr(order) {
    const errors = [];
    const { sender, receiver, items, dangerousGoods } = order;

    // Shipper
    if (!sender.company && !sender.contactPerson) errors.push('Shipper: Company or Contact Person is required.');
    if (!sender.streetLines || sender.streetLines.length === 0) errors.push('Shipper: Address Line 1 is required.');
    if (!sender.city) errors.push('Shipper: City is required.');
    if (!sender.countryCode) errors.push('Shipper: Country Code is required.');
    if (!sender.phone) errors.push('Shipper: Phone is required.');

    // Consignee
    if (!receiver.contactPerson) errors.push('Consignee: Contact Person is required.');
    if (!receiver.streetLines || receiver.streetLines.length === 0) errors.push('Consignee: Address Line 1 is required.');
    if (!receiver.city) errors.push('Consignee: City is required.');
    if (!receiver.countryCode) errors.push('Consignee: Country Code is required.');
    if (!receiver.phone) errors.push('Consignee: Phone is required.');

    // Invoice
    if (!order.currency) errors.push('Invoice: Currency is required.');

    // Items
    if (!items || items.length === 0) errors.push('Shipment must have at least one line item.');

    items.forEach((item, index) => {
        const prefix = `Item ${index + 1}:`;
        if (!item.description) errors.push(`${prefix} Description is required.`);
        if (!item.hsCode) errors.push(`${prefix} HS Code is required.`);
        else if (normalizeDigits(item.hsCode).length < 6) errors.push(`${prefix} HS Code must be at least 6 digits.`);

        if (!item.countryOfOrigin) errors.push(`${prefix} Country of Origin is required.`);
        if (!item.quantity || item.quantity <= 0) errors.push(`${prefix} Quantity must be > 0.`);
        if (!item.value || item.value <= 0) errors.push(`${prefix} Unit Value must be > 0.`);
    });

    // DG Validation
    if (dangerousGoods && dangerousGoods.contains) {
        if (!dangerousGoods.code) errors.push('DG: UN Code is required.');
        if (!dangerousGoods.serviceCode) errors.push('DG: Service Code (HE/HV/HK/HC) is required.');
        if (!dangerousGoods.contentId) errors.push('DG: Content ID is required.');

        // Dry Ice Specific
        if (dangerousGoods.code === '1845') {
            if (!dangerousGoods.dryIceWeight || dangerousGoods.dryIceWeight <= 0) {
                errors.push('DG: Dry Ice (UN1845) requires positive dryIceWeight.');
            }
        }
    }

    return errors;
}

/**
 * Composes the line item description, adding DG info if necessary.
 * @param {Object} item 
 * @param {Object} dangerousGoods
 * @returns {string}
 */
function composeItemDescription(item, dangerousGoods) {
    let desc = item.description || 'Item';

    if (dangerousGoods && dangerousGoods.contains) {
        const unCode = (dangerousGoods.code || '').replace('UN', '').replace('ID', '');
        if (unCode === '1266') {
            desc += ', Perfumery products containing alcohol, UN1266, Class 3';
        } else if (unCode === '3481') {
            desc += ', Device with lithium-ion battery contained in equipment (UN3481)';
        } else if (unCode === '8000') {
            desc += ', Consumer commodity (ID8000)';
        } else if (unCode === '1845') {
            desc += `, Packed with Dry Ice UN1845, ${dangerousGoods.dryIceWeight || 0}kg`;
        }
    }

    // Sanitize
    return desc.replace(/[\r\n]+/g, ' ').substring(0, 75); // DGR often has line limits
}

// Helper to split address into max 3 lines of 45 chars
const splitAddressLines = (streetLines) => {
    const fullAddress = Array.isArray(streetLines) ? streetLines.join(' ') : (streetLines || '');
    const maxLen = 45;
    const lines = [];

    let remaining = fullAddress;
    while (remaining.length > 0 && lines.length < 3) {
        if (remaining.length <= maxLen) {
            lines.push(remaining);
            break;
        }

        let splitIdx = remaining.lastIndexOf(' ', maxLen);
        if (splitIdx === -1) splitIdx = maxLen; // Force split if no space

        lines.push(remaining.substring(0, splitIdx).trim());
        remaining = remaining.substring(splitIdx).trim();
    }

    // Ensure we send at least one line if empty (validation requires it elsewhere)
    if (lines.length === 0) lines.push('.');

    return {
        line1: lines[0],
        line2: lines[1] || undefined,
        line3: lines[2] || undefined
    };
};

/**
 * Builds the Export Declaration (Commercial Invoice) section.
 * @param {Object} order - Normalized order
 * @param {Object} config - Optional config overrides
 */
function buildExportDeclaration(order, config = {}) {
    // Always build Export Declaration for international shipments or when requested
    const isInternational = order.sender.countryCode !== order.receiver.countryCode;
    if (!isInternational && !order.forceInvoice && !order.items.some(i => i.hsCode)) return undefined;
    const { items, sender, receiver } = order;

    // Calculate total physical weight from packages to ensure Invoice Gross Weight matches
    const totalParcelWeight = order.packages?.reduce((sum, p) => sum + (Number(p.weight?.value || p.weight || 0)), 0) || 0;
    const totalItemQty = items.reduce((sum, i) => sum + (Number(i.quantity || 1)), 0);

    const lineItems = items.map((item, idx) => {
        const description = composeItemDescription(item, order.dangerousGoods);
        const commCode = normalizeDigits(item.hsCode);
        const qty = Number(item.quantity || 1);

        // Calculate a proportional share of the gross weight if multiple items exist, 
        // otherwise just use the item's own weight logic.
        // If there's only one line item, it gets the full parcel weight as Gross Weight.
        const itemNetWeight = item.netWeight || item.weight || 0.1;
        const totalLineNet = itemNetWeight * qty;

        // If we have a total parcel weight, we distribute it proportionally by quantity to the Gross Weight field
        const itemGrossWeight = totalParcelWeight > 0
            ? (totalParcelWeight * (qty / totalItemQty))
            : (item.grossWeight || itemNetWeight) * qty;

        return {
            number: idx + 1,
            description: description,
            price: item.value,
            quantity: {
                value: qty,
                unitOfMeasurement: item.unitOfMeasurement || 'PCS'
            },
            commodityCodes: [{
                typeCode: 'outbound',
                value: commCode
            }],
            manufacturerCountry: item.countryOfOrigin || sender.countryCode,
            weight: {
                netValue: formatWeight(totalLineNet),
                grossValue: formatWeight(itemGrossWeight)
            },
            customerReferences: [
                ...(item.sku ? [{ typeCode: 'AFE', value: item.sku }] : [])
            ]
        };
    });

    const invoiceDate = order.invoice?.date || new Date().toISOString().split('T')[0];
    const invoiceNumber = order.invoice?.number || `INV-${order.reference || Date.now()}`;

    const exportDeclaration = {
        lineItems,
        invoice: {
            number: invoiceNumber,
            date: invoiceDate,
            signatureName: order.labelSettings?.signatureName || sender.contactPerson || sender.company || 'Shipper',
            signatureTitle: order.labelSettings?.signatureTitle || 'Sender',
            instructions: [
                [
                    order.remarks,
                    order.gstPaid ? 'GST: Paid' : 'GST: Not Paid',
                    `Payer of GST/VAT: ${order.payerOfVat || 'Receiver'}`,
                    order.palletCount > 0 ? `Total Pallets: ${order.palletCount}` : '',
                    order.packageMarks ? `Package Marks: ${order.packageMarks}` : '',
                    sender.taxId ? `Shipper TaxID: ${sender.taxId}` : '',
                    receiver.taxId ? `Receiver TaxID: ${receiver.taxId}` : ''
                ].filter(Boolean).join(' | ').substring(0, 300) // DGR Limit
            ],
            customerReferences: [
                { typeCode: 'CU', value: order.reference || order.sender?.reference },
                { typeCode: 'ANT', value: order.receiverReference || order.receiver?.reference } // FIXED: AAO -> ANT
            ].filter(r => r.value)
        },
        exportReason: order.exportReason || 'Sale',
        exportReasonType: order.exportReasonType || 'permanent',
        placeOfIncoterm: order.placeOfIncoterm || order.receiver.city // Fallback to Receiver City
    };

    return exportDeclaration;
}

/**
 * Builds Dangerous Goods VAS strictly according to DGR MyDHL API v3.1.2
 * @param {Object} dg 
 * @returns {Array} valueAddedServices
 */
const buildDangerousGoodsValueAddedServices = (dg) => {
    if (!dg || !dg.contains) return [];

    // Safety check for required fields (already checked in validate, but double safety)
    if (!dg.serviceCode || !dg.contentId || !dg.code) {
        return [];
    }

    const unCode = (dg.code && !dg.code.startsWith('UN') && !dg.code.startsWith('ID'))
        ? (dg.code === '8000' ? `ID${dg.code}` : `UN${dg.code}`)
        : dg.code;

    // Strict DG Item construction - ONLY allowed fields
    const dgItem = {
        contentId: dg.contentId,
        unCode: unCode, // e.g. UN1266
        customDescription: (dg.customDescription || dg.properShippingName || 'Dangerous Goods').substring(0, 70)
    };

    const vas = {
        serviceCode: dg.serviceCode, // e.g. HE, HV, HK, HC
        dangerousGoods: [dgItem]
    };

    // SPECIAL HANDLING for Dry Ice (HC)
    if (dg.serviceCode === 'HC') {
        dgItem.dryIceWeight = Number(dg.dryIceWeight || 0.1);
    }

    return [vas];
};

/**
 * Builds the full DGR Shipment Payload.
 * @param {Object} order - Normalized order/shipment data
 * @param {Object} config - Configuration options (account numbers etc)
 */
function buildDgrShipmentPayload(order, config = {}) {
    // 1. Validate (Pre-flight)
    const errors = validateShipmentForDgr(order);
    if (errors.length > 0) {
        throw new Error(`DGR Validation Failed: ${errors.join('; ')}`);
    }

    const { sender, receiver, packages } = order;

    // Calculate total declared value and validate currency consistency
    const currencies = new Set(order.items.map(i => i.currency || 'KWD'));
    if (currencies.size > 1) {
        throw new Error(`DGR Invoice requires a single currency. Mixed currencies found: ${Array.from(currencies).join(', ')}`);
    }
    const detectedCurrency = currencies.values().next().value || 'KWD';

    const totalDeclaredValue = order.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);

    // 2. Prepare Addresses
    const shipperAddress = splitAddressLines(sender.streetLines);
    const receiverAddress = splitAddressLines(receiver.streetLines);

    // 3. Export Declaration
    const exportDeclaration = buildExportDeclaration(order, config);

    // 4. Construct Payload
    // Format date: ISO-8601 with Offset (Standard +00:00 instead of Z to avoid legacy parsing issues)
    // Sample: '2010-02-11T17:10:09 GMT+01:00' requested by user error.
    // We will use standard ISO with offset: 2026-02-02T12:00:00+00:00
    const cleanDate = order.shipmentDate ? new Date(order.shipmentDate) : new Date();
    const dateObj = isNaN(cleanDate.getTime()) ? new Date() : cleanDate;

    // Manual construction to ensure YYYY-MM-DDTHH:MM:SS GMT+00:00 format
    // This strictly matches the sample error: "2010-02-11T17:10:09 GMT+01:00"
    const timestamp = dateObj.toISOString().split('.')[0] + ' GMT+00:00';

    // 5. Build Dangerous Goods VAS
    const valueAddedServices = buildDangerousGoodsValueAddedServices(order.dangerousGoods);

    // Account Number Strategy: Order Overrides > Config > Default
    const shipperAccountNumber = order.shipperAccount || config.accountNumber || '451012315';

    // Label Format Mapping
    // Frontend: 'pdf', 'zpl'
    // DGR API: 'pdf', 'zpl', 'lp2', 'epl'
    const labelFormat = order.labelSettings?.format || 'pdf';

    const payload = {
        plannedShippingDateAndTime: timestamp,
        pickup: { isRequested: false },
        productCode: order.serviceCode || 'P',
        localProductCode: order.serviceCode || 'P',
        getRateEstimates: false,
        accounts: [
            {
                typeCode: 'shipper',
                number: shipperAccountNumber
            },
            // If Incoterm is DDP or payerOfVat is explicitly shipper, add duties-taxes account
            ...((order.incoterm === 'DDP' || order.payerOfVat === 'shipper') ? [{
                typeCode: 'duties-taxes',
                number: config.accountNumber || '451012315'
            }] : [])
        ],

        // VAS: DG Only (No 'dryIce' root key)
        valueAddedServices: valueAddedServices.length > 0 ? valueAddedServices : undefined,

        outputImageProperties: {
            encodingFormat: labelFormat.toLowerCase(),
            imageOptions: [
                { typeCode: 'label', isRequested: true },
                { typeCode: 'waybillDoc', isRequested: true },
                { typeCode: 'invoice', isRequested: true }
            ]
        },

        customerDetails: {
            shipperDetails: {
                postalAddress: {
                    postalCode: sender.postalCode,
                    cityName: sender.city,
                    countryCode: sender.countryCode,
                    addressLine1: shipperAddress.line1,
                    addressLine2: shipperAddress.line2,
                    addressLine3: shipperAddress.line3
                },
                contactInformation: {
                    companyName: sender.company || sender.contactPerson,
                    fullName: sender.contactPerson,
                    phone: sender.phone,
                    email: sender.email
                },
                typeCode: sender.traderType || 'business',
                registrationNumbers: []
            },
            receiverDetails: {
                postalAddress: {
                    postalCode: receiver.postalCode,
                    cityName: receiver.city,
                    countryCode: receiver.countryCode,
                    addressLine1: receiverAddress.line1,
                    addressLine2: receiverAddress.line2,
                    addressLine3: receiverAddress.line3
                },
                contactInformation: {
                    companyName: receiver.company || receiver.contactPerson,
                    fullName: receiver.contactPerson,
                    phone: receiver.phone,
                    email: receiver.email
                },
                typeCode: receiver.traderType || 'business',
                registrationNumbers: []
            }
        },

        content: {
            packages: packages.map((p, i) => ({
                weight: p.weight.value,
                dimensions: {
                    length: p.dimensions.length,
                    width: p.dimensions.width,
                    height: p.dimensions.height
                },
                customerReferences: [
                    { value: order.reference || order.sender?.reference || p.reference || `PKG-${i + 1}`, typeCode: 'CU' }
                ],
                description: `${p.description || 'Box'}${order.packageMarks ? ' - ' + order.packageMarks : ''}`.substring(0, 70)
                // NO dangerousGoods here.
            })),
            isCustomsDeclarable: true, // Always true for our goods flow
            description: (order.palletCount > 0 ? `Pallets: ${order.palletCount}. ` : '') + (order.remarks || order.items?.[0]?.description || 'Export Goods'),
            incoterm: order.incoterm || 'DAP',
            unitOfMeasurement: 'metric',
            declaredValue: totalDeclaredValue,
            declaredValueCurrency: detectedCurrency || order.currency || 'USD',
            exportDeclaration: exportDeclaration // Mandatory for invoice
        }
    };

    // Populate Registration Numbers (VAT/EORI Only)
    const addRegParams = (targetArr, party) => {
        if (party.vatNumber) {
            targetArr.push({ typeCode: 'VAT', number: party.vatNumber, issuerCountryCode: party.countryCode });
        }
        if (party.eoriNumber) {
            targetArr.push({ typeCode: 'EOR', number: party.eoriNumber, issuerCountryCode: party.countryCode });
        }
        // TaxID intentionally omitted here (Moved to Invoice Instructions to avoid 'STN' error)
    };

    addRegParams(payload.customerDetails.shipperDetails.registrationNumbers, sender);
    addRegParams(payload.customerDetails.receiverDetails.registrationNumbers, receiver);

    // Clean empty registration arrays
    if (payload.customerDetails.shipperDetails.registrationNumbers.length === 0) {
        delete payload.customerDetails.shipperDetails.registrationNumbers;
    }
    if (payload.customerDetails.receiverDetails.registrationNumbers.length === 0) {
        delete payload.customerDetails.receiverDetails.registrationNumbers;
    }

    return payload;
}

module.exports = {
    buildDgrShipmentPayload,
    buildExportDeclaration,
    validateShipmentForDgr,
    validateDgrInvoiceData: validateShipmentForDgr // Alias for compatibility
};
