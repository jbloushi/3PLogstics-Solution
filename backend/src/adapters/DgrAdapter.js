const termDefinitions = {

};

const axios = require('axios');
const CarrierAdapter = require('./CarrierAdapter');
const { normalizeShipment } = require('../utils/shipmentNormalizer');
const { dhlApiKey, dhlApiSecret, dhlAccountNumber, dhlApiUrl } = require('../config/config');

class DgrAdapter extends CarrierAdapter {
    constructor() {
        // Validate required credentials
        if (!dhlApiKey || !dhlApiSecret) {
            throw new Error(
                'DGR (DHL) API credentials are required. Please set DHL_API_KEY and DHL_API_SECRET environment variables.'
            );
        }

        super({
            baseUrl: dhlApiUrl, // Uses config value
            apiKey: dhlApiKey,
            apiSecret: dhlApiSecret,
            accountNumber: dhlAccountNumber
        });
    }

    getAuthHeader() {
        return {
            Authorization: `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
            'content-type': 'application/json'
        };
    }



    /**
     * Helper to split address into max 3 lines of 45 chars
     */
    splitAddress(fullAddress) {
        if (!fullAddress) return { addressLine1: '.' };
        const chunks = [];
        let remaining = fullAddress;
        while (remaining.length > 0 && chunks.length < 3) {
            let limit = 45;
            if (remaining.length > limit) {
                // Try to break at last space within limit
                let breakPoint = remaining.lastIndexOf(' ', limit);
                if (breakPoint === -1) breakPoint = limit; // Force break if no space
                chunks.push(remaining.substring(0, breakPoint));
                remaining = remaining.substring(breakPoint).trim();
            } else {
                chunks.push(remaining);
                remaining = '';
            }
        }
        return {
            addressLine1: chunks[0] || '.',
            addressLine2: chunks[1],
            addressLine3: chunks[2]
        };
    }

    /**
     * @param {Object} shipment - Normalized Shipment
     */
    /**
     * @param {Object} shipment - Normalized Shipment
     */
    async validate(shipment) {
        const { validateDgrInvoiceData } = require('../services/dgr-payload-builder');
        return validateDgrInvoiceData(shipment);
    }


    // ... constructor ...

    // ...

    async getRates(shipmentData) {
        const shipment = normalizeShipment(shipmentData);
        const payload = this.buildRatePayload(shipment);

        const res = await axios.post(`${this.config.baseUrl}/rates`, payload, {
            headers: this.getAuthHeader()
        });

        const products = Array.isArray(res.data?.products) ? res.data.products : [];
        if (products.length === 0) {
            throw new Error('No rate products returned from DGR API');
        }

        return products.map((product) => {
            const currency = this.extractCurrency(product, shipment.currency || 'KWD');
            const totalPrice = this.extractTotalPrice(product);
            const optionalServices = this.extractOptionalServices(product, currency);

            return {
                serviceName: product.productName || product.localProductName || `DGR ${product.productCode || 'Service'}`,
                serviceCode: product.productCode || product.localProductCode,
                carrierCode: 'DGR',
                totalPrice,
                currency,
                deliveryDate: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
                optionalServices
            };
        });
    }

    buildRatePayload(shipment) {
        return {
            customerDetails: {
                shipperDetails: {
                    postalCode: shipment.sender?.postalCode,
                    cityName: shipment.sender?.city,
                    countryCode: shipment.sender?.countryCode
                },
                receiverDetails: {
                    postalCode: shipment.receiver?.postalCode,
                    cityName: shipment.receiver?.city,
                    countryCode: shipment.receiver?.countryCode
                }
            },
            accounts: [
                {
                    typeCode: 'shipper',
                    number: this.config.accountNumber
                }
            ],
            plannedShippingDateAndTime: shipment.shipmentDate || new Date().toISOString(),
            unitOfMeasurement: 'metric',
            isCustomsDeclarable: !shipment.isDocument,
            monetaryAmount: [
                {
                    typeCode: 'declaredValue',
                    value: Number(
                        shipment.items?.reduce((sum, item) => sum + (Number(item.value || 0) * Number(item.quantity || 1)), 0) || 0
                    ).toFixed(2),
                    currency: shipment.currency || 'KWD'
                }
            ],
            requestAllValueAddedServices: true,
            returnStandardProductsOnly: false,
            nextBusinessDay: false,
            productCode: shipment.serviceCode,
            packages: (shipment.packages || []).map((pkg) => ({
                weight: Number(pkg.weight?.value || 0),
                dimensions: {
                    length: Number(pkg.dimensions?.length || 0),
                    width: Number(pkg.dimensions?.width || 0),
                    height: Number(pkg.dimensions?.height || 0)
                }
            }))
        };
    }

    toMoneyNumber(value) {
        if (value == null) return 0;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return 0;
        return Number(parsed.toFixed(3));
    }

    extractTotalPrice(product) {
        if (typeof product.totalPrice === 'number' || typeof product.totalPrice === 'string') {
            return this.toMoneyNumber(product.totalPrice);
        }

        if (Array.isArray(product.totalPrice)) {
            const totalPriceEntry = product.totalPrice.find((price) => price?.price != null || price?.amount != null) || product.totalPrice[0];
            return this.toMoneyNumber(totalPriceEntry?.price ?? totalPriceEntry?.amount);
        }

        if (product.price != null) {
            return this.toMoneyNumber(product.price?.amount ?? product.price?.value ?? product.price);
        }

        return 0;
    }

    extractCurrency(product, fallbackCurrency) {
        if (Array.isArray(product.totalPrice) && product.totalPrice[0]?.currencyType) {
            return product.totalPrice[0].currencyType;
        }

        if (product?.price?.currency || product?.price?.currencyType) {
            return product.price.currency || product.price.currencyType;
        }

        if (product.priceCurrency) {
            return product.priceCurrency;
        }

        return fallbackCurrency;
    }

    collectOptionalServiceCandidates(node) {
        if (!node) return [];

        const buckets = [];
        const queue = [node];

        while (queue.length) {
            const current = queue.shift();
            if (!current) continue;

            if (Array.isArray(current)) {
                current.forEach((item) => queue.push(item));
                continue;
            }

            if (typeof current !== 'object') continue;

            const optionalServices = current.optionalServices;
            if (Array.isArray(optionalServices)) {
                buckets.push(...optionalServices);
            } else if (optionalServices && typeof optionalServices === 'object' && Array.isArray(optionalServices.items)) {
                buckets.push(...optionalServices.items);
            }

            Object.keys(current).forEach((key) => {
                const value = current[key];
                if (value && (Array.isArray(value) || typeof value === 'object')) {
                    queue.push(value);
                }
            });
        }

        return buckets;
    }

    extractOptionalServices(product, fallbackCurrency) {
        const orderedSources = [
            { priority: 1, entries: product?.valueAddedServices },
            { priority: 2, entries: product?.productAndServices?.valueAddedServices },
            { priority: 3, entries: product?.outputValueAddedServices },
            { priority: 4, entries: product?.additionalServices },
            { priority: 5, entries: this.collectOptionalServiceCandidates(product) }
        ];

        const normalized = orderedSources
            .filter((source) => Array.isArray(source.entries))
            .flatMap((source) => source.entries.map((service) => ({ ...service, __priority: source.priority })))
            .map((service) => {
                const code = service?.serviceCode || service?.localServiceCode || service?.typeCode || service?.code;
                if (!code) return null;

                const rawPrice =
                    service?.price?.amount ??
                    service?.price?.value ??
                    service?.price ??
                    service?.totalPrice?.[0]?.price ??
                    service?.totalPrice?.[0]?.amount ??
                    service?.totalPrice ??
                    service?.charge ??
                    service?.amount ??
                    0;

                const currency =
                    service?.price?.currency ||
                    service?.price?.currencyType ||
                    service?.totalPrice?.[0]?.currencyType ||
                    service?.totalPrice?.[0]?.currency ||
                    service?.currency ||
                    fallbackCurrency;

                return {
                    serviceCode: String(code).toUpperCase(),
                    serviceName: service?.localServiceName || service?.serviceName || service?.name || String(code).toUpperCase(),
                    totalPrice: this.toMoneyNumber(rawPrice),
                    currency,
                    __priority: service.__priority || 99
                };
            })
            .filter(Boolean);

        const byCode = new Map();
        normalized.forEach((service) => {
            if (!byCode.has(service.serviceCode)) {
                byCode.set(service.serviceCode, service);
                return;
            }

            const current = byCode.get(service.serviceCode);
            const shouldReplace =
                service.__priority < current.__priority ||
                (service.__priority === current.__priority && (current.totalPrice || 0) === 0 && (service.totalPrice || 0) > 0);

            if (shouldReplace) {
                byCode.set(service.serviceCode, service);
            }
        });

        return Array.from(byCode.values()).map(({ __priority, ...service }) => service);
    }

    /**
     * @param {Object} shipmentData - Normalized shipment data
     * @param {string} serviceCode - Carrier service code
     * @returns {Promise<import('../services/dto/CarrierTypes').ShipmentBookingResult>}
     */
    async createShipment(shipmentData, serviceCode) {
        const shipment = normalizeShipment(shipmentData);

        const isInternational = shipment.sender.countryCode !== shipment.receiver.countryCode;

        // --- Delegate Payload Construction to Builder ---
        const { buildDgrShipmentPayload } = require('../services/dgr-payload-builder');

        let payload;
        try {
            payload = buildDgrShipmentPayload(shipment, {
                accountNumber: this.config.accountNumber
            });
        } catch (error) {
            console.error('❌ Payload Builder Error:', error.message);
            throw error;
        }

        // console.log('📦 DGR Adapter Payload:', JSON.stringify(payload, null, 2));
        // DELETED: Manual disk write causing EACCES in docker

        const CarrierLog = require('../models/CarrierLog');
        const startTime = Date.now();
        let responseData = null;
        let responseStatus = 0;
        let errorData = null;

        try {
            const res = await axios.post(`${this.config.baseUrl}/shipments`, payload, { headers: this.getAuthHeader() });

            responseStatus = res.status;
            responseData = res.data;

            // Log Success
            await CarrierLog.create({
                user: shipmentData.user, // Ensure we pass this from service
                shipment: shipmentData._id,
                carrier: 'DGR',
                endpoint: 'createShipment',
                requestPayload: payload,
                responsePayload: res.data,
                statusCode: res.status,
                success: true,
                durationMs: Date.now() - startTime
            }).catch(e => console.error('Failed to save CarrierLog (Success):', e));

            console.log('📦 DGR Response:', JSON.stringify(res.data, null, 2));

            // Extract Documents
            let labelBase64, awbBase64, invoiceBase64;
            if (res.data.documents) {
                res.data.documents.forEach(doc => {
                    if (doc.typeCode === 'label') labelBase64 = doc.content;
                    if (doc.typeCode === 'waybillDoc') awbBase64 = doc.content;
                    if (doc.typeCode === 'invoice') invoiceBase64 = doc.content;
                });
            }

            return {
                trackingNumber: res.data.shipmentTrackingNumber,
                labelUrl: labelBase64 ? `data:application/pdf;base64,${labelBase64}` : null,
                awbUrl: awbBase64 ? `data:application/pdf;base64,${awbBase64}` : null,
                invoiceUrl: invoiceBase64 ? `data:application/pdf;base64,${invoiceBase64}` : null,
                rawResponse: res.data
            };
        } catch (error) {
            responseStatus = error.response?.status || 500;
            errorData = error.response?.data || error.message;

            // Log Failure
            await CarrierLog.create({
                user: shipmentData.user,
                shipment: shipmentData._id,
                carrier: 'DGR',
                endpoint: 'createShipment',
                requestPayload: payload,
                responsePayload: errorData,
                statusCode: responseStatus,
                success: false,
                error: JSON.stringify(errorData),
                durationMs: Date.now() - startTime
            }).catch(e => console.error('Failed to save CarrierLog:', e));

            console.error('DGR Adapter Error:', JSON.stringify(errorData, null, 2));

            // Extract cleaner message if possible
            let parsedData = errorData;
            if (typeof errorData === 'string') {
                try {
                    parsedData = JSON.parse(errorData);
                } catch (e) {
                    // Not valid JSON, stick with original string
                }
            }

            let message = parsedData.detail || parsedData.title;
            if (!message && parsedData.reasons && Array.isArray(parsedData.reasons)) {
                message = parsedData.reasons.map(r => r.msg || r.message).filter(Boolean).join(', ');
            }
            if (!message) message = typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData);

            // Re-throw with structured data
            const providerError = new Error(`DGR Error: ${message}`);
            providerError.statusCode = responseStatus;
            providerError.details = errorData.additionalDetails || errorData.reasons || errorData;
            providerError.isProviderError = true;

            // Ensure properties are enumerable for some environments
            Object.defineProperty(providerError, 'isProviderError', { enumerable: true });
            Object.defineProperty(providerError, 'statusCode', { enumerable: true });
            Object.defineProperty(providerError, 'details', { enumerable: true });

            throw providerError;
        }
    }

    async getTracking(trackingNumber) {
        try {
            const res = await axios.get(`${this.config.baseUrl}/shipments/${trackingNumber}/tracking`, {
                headers: this.getAuthHeader(),
                params: { trackingView: 'all-checkpoints' }
            });
            // DGR (DHL) API often nested under 'shipments' array
            const shipment = res.data.shipments?.[0] || res.data;
            return {
                status: shipment.status?.statusCode,
                description: shipment.status?.description,
                events: (shipment.events || []).map(e => ({
                    statusCode: e.statusCode,
                    description: e.description,
                    timestamp: e.timestamp,
                    location: e.serviceArea?.[0]?.description || 'Unknown'
                }))
            };
        } catch (error) {
            console.error('DGR Tracking Error:', error.response?.data || error.message);
            throw new Error(`DGR Tracking Error: ${error.message}`);
        }
    }
}

module.exports = DgrAdapter;
