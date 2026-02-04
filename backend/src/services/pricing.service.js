const logger = require('../utils/logger');

class PricingService {

    /**
     * Calculate Final Price based on Markup Rules
     * @param {number} basePrice - Raw Carrier Rate
     * @param {Object} markupConfig - User or Org Markup Configuration
     * @returns {Object} { finalPrice, surchargeLabel, appliedMarkup }
     */
    static calculateFinalPrice(basePrice, markupConfig) {
        let finalPrice = Number(basePrice);
        let surchargeLabel = '0%';

        // Default Fallback
        const markup = markupConfig || { type: 'PERCENTAGE', percentageValue: 15, flatValue: 0 };

        try {
            if (markup.type === 'PERCENTAGE' || markup.type === 'COMBINED') {
                const pct = Number(markup.percentageValue || markup.value || 0);
                finalPrice += basePrice * (pct / 100);
                surchargeLabel = `${pct}%`;
            }

            if (markup.type === 'FLAT' || markup.type === 'COMBINED') {
                const flat = Number(markup.flatValue || markup.value || 0);
                finalPrice += flat;
                surchargeLabel += (surchargeLabel !== '0%' ? ` + ${flat} KD` : `${flat} KD Flat`);
            }

            // Fallback description cleanup
            if (surchargeLabel.startsWith('0% +')) surchargeLabel = surchargeLabel.replace('0% + ', '');

            // Legacy Formula support
            if (markup.type === 'FORMULA' && markup.formula) {
                try {
                    // eslint-disable-next-line no-new-func
                    const safeEval = new Function('base', `return ${markup.formula}`);
                    const calculated = safeEval(basePrice);
                    if (isNaN(calculated)) throw new Error('NaN result');
                    finalPrice = calculated;
                    surchargeLabel = 'Custom Formula';
                } catch (e) {
                    logger.error(`Markup Formula Error for ${markup.formula}:`, e.message);
                    finalPrice = basePrice * 1.15; // Fallback 15%
                    surchargeLabel = 'Error (Fallback 15%)';
                }
            }
        } catch (error) {
            logger.error('Pricing Calculation Critical Error:', error);
            // Safety Fallback
            finalPrice = basePrice * 1.15;
            surchargeLabel = 'System Fallback';
        }

        return {
            finalPrice: Number(finalPrice.toFixed(3)), // Standardize to 3 decimals
            surchargeLabel,
            markupUsed: markup
        };
    }

    /**
     * Validate Client Price against Server Price with Tolerance
     * @param {number} clientPrice - Price submitted by frontend
     * @param {number} serverPrice - Price calculated by backend
     * @param {number} tolerancePercent - Allowable difference (default 0.5%)
     * @returns {boolean} isValid
     */
    static validatePrice(clientPrice, serverPrice, tolerancePercent = 0.5) {
        const client = Number(clientPrice);
        const server = Number(serverPrice);

        if (isNaN(client) || isNaN(server)) return false;

        // Exact match
        if (client === server) return true;

        const diff = Math.abs(client - server);
        const toleranceAmount = server * (tolerancePercent / 100);

        // Debug logging for audit
        if (diff > toleranceAmount) {
            logger.warn(`Price Validation Failed. Client: ${client}, Server: ${server}, Diff: ${diff}, MaxDiff: ${toleranceAmount}`);
            return false;
        }

        return true;
    }
    /**
     * Creates a secure pricing snapshot for a shipment.
     * @param {number} carrierRate - The raw rate from the carrier
     * @param {number} markupPercent - The user's markup percentage (e.g., 10 for 10%)
     * @param {string} currency - Currency code
     * @returns {Object} PricingSnapshot
     */
    static createSnapshot(carrierRate, markupPercent, currency = 'KWD') {
        // Handle simplified markup input (number) -> Config Object
        const markupConfig = typeof markupPercent === 'number'
            ? { type: 'PERCENTAGE', value: markupPercent }
            : markupPercent;

        const { finalPrice } = this.calculateFinalPrice(carrierRate, markupConfig);

        // Calculate amount explicitly
        const markupAmount = Number((finalPrice - carrierRate).toFixed(3));

        const crypto = require('crypto');

        // Create a hash to detect tampering
        const rateHash = crypto
            .createHash('sha256')
            .update(`${carrierRate}-${markupAmount}-${finalPrice}-${currency}`)
            .digest('hex');

        return {
            carrierRate: Number(carrierRate),
            markup: Number(markupAmount),
            totalPrice: Number(finalPrice),
            currency: currency,
            rateHash: rateHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours (was 15 mins)
            rulesVersion: 'v1'
        };
    }

    /**
     * Validates a pricing snapshot against current data.
     * @param {Object} snapshot 
     * @returns {boolean}
     */
    static validateSnapshot(snapshot) {
        if (!snapshot || !snapshot.expiresAt) return false;
        return new Date() < new Date(snapshot.expiresAt);
    }
}

module.exports = PricingService;
