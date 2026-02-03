const termDefinitions = {

};

const axios = require('axios');
const CarrierAdapter = require('./CarrierAdapter');
const { normalizeShipment } = require('../utils/shipmentNormalizer');
const { dhlApiKey, dhlApiSecret, dhlAccountNumber } = require('../config/config');

class DhlAdapter extends CarrierAdapter {
    constructor() {
        // Validate required credentials
        if (!dhlApiKey || !dhlApiSecret) {
            throw new Error(
                'DHL API credentials are required. Please set DHL_API_KEY and DHL_API_SECRET environment variables.'
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
        const { validateDhlInvoiceData } = require('../services/dhl-payload-builder');
        return validateDhlInvoiceData(shipment);
    }


    // ... constructor ...

    // ...

    async getRates(shipmentData) {
        // Normalize input first
        const shipment = normalizeShipment(shipmentData);

        // --- TEMP FALLBACK FOR RATES (Preserving existing behavior) ---
        // TODO: Implement actual DHL Rate Request in Phase 3
        return [
            { serviceName: 'DHL Express Worldwide', serviceCode: 'P', carrierCode: 'DHL', totalPrice: 15.000, currency: 'KWD', deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
            { serviceName: 'DHL Express 12:00', serviceCode: 'Y', carrierCode: 'DHL', totalPrice: 22.500, currency: 'KWD', deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        ];
    }

    /**
     * @param {Object} shipmentData - Raw or partial shipment data
     * @param {string} serviceCode
     */
    async createShipment(shipmentData, serviceCode) {
        const shipment = normalizeShipment(shipmentData);

        const isInternational = shipment.sender.countryCode !== shipment.receiver.countryCode;

        // --- Delegate Payload Construction to Builder ---
        const { buildDhlShipmentPayload } = require('../services/dhl-payload-builder');

        let payload;
        try {
            payload = buildDhlShipmentPayload(shipment, {
                accountNumber: this.config.accountNumber
            });
        } catch (error) {
            console.error('❌ Payload Builder Error:', error.message);
            throw error;
        }

        console.log('📦 DHL Adapter Payload:', JSON.stringify(payload, null, 2));
        try {
            require('fs').writeFileSync('debug_last_dhl_payload.json', JSON.stringify(payload, null, 2));
        } catch (e) { console.error('Error writing debug payload', e); }

        try {
            const res = await axios.post(`${this.config.baseUrl}/shipments`, payload, { headers: this.getAuthHeader() });
            console.log('📦 DHL Response:', JSON.stringify(res.data, null, 2));

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
            console.error('DHL Adapter Error:', error.response?.data || error.message);
            throw new Error(`DHL Error: ${JSON.stringify(error.response?.data?.detail || error.message)}`);
        }
    }

    async getTracking(trackingNumber) {
        try {
            const res = await axios.get(`${this.config.baseUrl}/shipments/${trackingNumber}/tracking`, {
                headers: this.getAuthHeader(),
                params: { trackingView: 'all-checkpoints' }
            });
            // DHL API often nested under 'shipments' array
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
            console.error('DHL Tracking Error:', error.response?.data || error.message);
            throw new Error(`DHL Tracking Error: ${error.message}`);
        }
    }
}

module.exports = DhlAdapter;
