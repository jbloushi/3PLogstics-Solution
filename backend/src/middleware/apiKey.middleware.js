const User = require('../models/user.model');
const logger = require('../utils/logger');

exports.validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ success: false, error: 'API Key missing. Please provide x-api-key header.' });
        }

        // Find user with this API key
        // Note: In real prod, this should be cached (Redis) to avoid DB hit on every request
        // For Phase 1, DB query is acceptable
        const user = await User.findOne({ apiKey, active: true });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid API Key' });
        }

        // Attach user to request
        req.user = user;
        req.isExternalApi = true; // Flag for controllers to know context

        // Simple Rate Limiting (Placeholder)
        // could implement using rate-limit-redis later

        next();
    } catch (error) {
        logger.error('API Key Validation Error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
