const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'super-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '90d'
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        success: true,
        token,
        data: {
            user
        }
    });
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: role || 'client',
            markup: {
                type: 'PERCENTAGE',
                percentageValue: role === 'client' ? 15 : 0,
                flatValue: 0
            }
        });

        createSendToken(newUser, 201, res);
    } catch (error) {
        logger.error('Signup error:', error);
        let message = error.message;
        if (error.code === 11000) message = 'Email already exists';
        res.status(400).json({ success: false, error: message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            logger.warn(`Login failed: No user found for email ${email}`);
            return res.status(401).json({ success: false, error: 'Incorrect email or password' });
        }

        const isMatch = await user.correctPassword(password, user.password);

        if (!isMatch) {
            logger.warn(`Login failed: Password mismatch for ${email}. Provided length: ${password.length}`);
            return res.status(401).json({ success: false, error: 'Incorrect email or password' });
        }

        // 3) If everything ok, send token to client
        createSendToken(user, 200, res);
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
};

// Placeholder for WABA/OTP login
exports.requestOtp = async (req, res) => {
    // Logic for Chatwoot/WABA integration would go here
    res.status(200).json({ success: true, message: 'OTP sent via WABA (Mocked)' });
};

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, error: 'You are not logged in' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');

        // Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ success: false, error: 'User no longer exists' });
        }

        // Grant access to protected route
        req.user = currentUser;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

exports.generateApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const key = user.generateApiKey();
        await user.save();

        res.status(200).json({
            success: true,
            apiKey: key
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to generate API Key' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'client' });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

// Get clients with their addresses for staff dropdown
exports.getClients = async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' })
            .select('name email phone addresses');
        res.status(200).json({ success: true, data: clients });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch clients' });
    }
};

exports.updateUserSurcharge = async (req, res) => {
    try {
        const { userId, type, percentageValue, flatValue, value } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Build markup object based on schema
        user.markup = {
            type: type || 'PERCENTAGE',
            // Maintain 'value' for legacy code but use explicit fields for new logic
            value: percentageValue || value || 0,
            percentageValue: percentageValue || 0,
            flatValue: flatValue || 0
        };
        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        logger.error('Update markup error:', error);
        res.status(500).json({ success: false, error: 'Failed to update markup' });
    }
};

// TEMPORARY DEBUG ENDPOINT - REMOVE IN PRODUCTION
exports.debugHash = async (req, res) => {
    try {
        const { password } = req.body;
        const hash = await bcrypt.hash(password, 12);
        const match = await bcrypt.compare(password, hash);
        res.status(200).json({ success: true, passwordLength: password.length, match });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        next();
    };
};
