const termDefinitions = {

};

const axios = require('axios');
const CarrierAdapter = require('./CarrierAdapter');
const { normalizeShipment } = require('../utils/shipmentNormalizer');
const { dhlApiKey, dhlApiSecret, dhlAccountNumber } = require('../config/config');

class DgrAdapter extends CarrierAdapter {
    constructor() {
        // Validate required credentials
        if (!dhlApiKey || !dhlApiSecret) {
            throw new Error(
                'DGR (DHL) API credentials are required. Please set DHL_API_KEY and DHL_API_SECRET environment variables.'
            );
        }

        super({
            baseUrl: 'https://express.api.dhl.com/mydhlapi/test',
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
        // Normalize input first
        const shipment = normalizeShipment(shipmentData);

        // --- TEMP FALLBACK FOR RATES (Preserving existing behavior) ---
        // TODO: Implement actual DGR Rate Request in Phase 3
        return [
            { serviceName: 'DGR Express Worldwide', serviceCode: 'P', carrierCode: 'DGR', totalPrice: 15.000, currency: 'KWD', deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
            { serviceName: 'DGR Express 12:00', serviceCode: 'Y', carrierCode: 'DGR', totalPrice: 22.500, currency: 'KWD', deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        ];
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

        console.log('📦 DGR Adapter Payload:', JSON.stringify(payload, null, 2));
        try {
            require('fs').writeFileSync('debug_last_dgr_payload.json', JSON.stringify(payload, null, 2));
        } catch (e) { console.error('Error writing debug payload', e); }

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
            });

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

            console.error('DGR Adapter Error:', errorData);
            throw new Error(`DGR Error: ${JSON.stringify(errorData.detail || errorData)}`);
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
