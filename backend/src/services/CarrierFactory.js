const DgrAdapter = require('../adapters/DgrAdapter');

/**
 * Factory class to get the appropriate carrier adapter
 */
class CarrierFactory {
    /**
     * List of carriers that have active implementations.
     */
    static getAvailableCarriers() {
        return [
            { code: 'DGR', name: 'DGR Express', active: true },
            { code: 'FEDEX', name: 'FedEx', active: false },
            { code: 'UPS', name: 'UPS', active: false }
        ];
    }

    /**
     * Get a carrier adapter instance
     * @param {string} carrierCode - 'DGR', 'FEDEX', 'UPS' (Case insensitive)
     * @param {Object} config - Optional configuration overrides
     * @returns {Object} Carrier Adapter Instance
     */
    static getAdapter(carrierCode, config = {}) {
        const code = (carrierCode || 'DGR').toUpperCase();

        switch (code) {
            case 'DGR':
            case 'DHL': // Backward compatibility for any lingering DB refs
                const adapter = new DgrAdapter();
                if (Object.keys(config).length > 0) {
                    adapter.config = { ...adapter.config, ...config };
                }
                return adapter;

            case 'FEDEX':
                throw new Error('FedEx integration not yet implemented');

            case 'UPS':
                throw new Error('UPS integration not yet implemented');

            default:
                throw new Error(`Carrier '${carrierCode}' not supported`);
        }
    }
}

module.exports = CarrierFactory;
