const DhlAdapter = require('../adapters/DhlAdapter');

/**
 * Factory class to get the appropriate carrier adapter
 */
class CarrierFactory {

    /**
     * Get a carrier adapter instance
     * @param {string} carrierCode - 'DHL', 'FEDEX', 'UPS' (Case insensitive)
     * @param {Object} config - Optional configuration overrides
     * @returns {Object} Carrier Adapter Instance
     */
    static getAdapter(carrierCode, config = {}) {
        const code = (carrierCode || 'DHL').toUpperCase();

        switch (code) {
            case 'DHL':
                // In Phase 1, we reuse the existing DhlAdapter.
                // Note: DhlService is a singleton wrapper around DhlAdapter.
                // For proper factory pattern, we should instantiate DhlAdapter directly 
                // but ensure it has the right config.
                // For now, let's return a new instance of DhlAdapter to allow per-request config if needed.
                const adapter = new DhlAdapter();
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
