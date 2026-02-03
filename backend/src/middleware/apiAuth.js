const ApiClient = require('../models/ApiClient.model');
const logger = require('../utils/logger');

/**
 * Middleware to validate API Key
 */
const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API Key missing. Please provide x-api-key header.'
            });
        }

        const client = await ApiClient.findOne({ apiKey, isActive: true });

        if (!client) {
            logger.warn(`Invalid API Key attempt: ${apiKey}`);
            return res.status(403).json({
                success: false,
                error: 'Invalid or inactive API Key.'
            });
        }

        // Attach client to request
        req.apiClient = client;
        next();
    } catch (error) {
        logger.error('API Auth Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Authentication Error'
        });
    }
};

module.exports = validateApiKey;
