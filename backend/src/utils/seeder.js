const User = require('../models/user.model');
const Shipment = require('../models/shipment.model');
const logger = require('../utils/logger');

const seedUsers = async () => {
    try {
        const users = [
            {
                name: 'Client User',
                email: 'client@demo.com',
                password: 'password123',
                role: 'client',
                markup: { type: 'PERCENTAGE', value: 15 }
            },
            {
                name: 'Staff Operations',
                email: 'staff@demo.com',
                password: 'password123',
                role: 'staff'
            },
            {
                name: 'Admin User',
                email: 'admin@demo.com',
                password: 'password123',
                role: 'admin'
            },
            {
                name: 'Driver User',
                email: 'driver@demo.com',
                password: 'password123',
                role: 'driver'
            }
        ];

        let clientUser;
        for (const user of users) {
            const exists = await User.findOne({ email: user.email });
            if (!exists) {
                const newUser = await User.create(user);
                // logger.info(`Created demo user: ${user.email}`);
                if (user.role === 'client') clientUser = newUser;
            } else {
                if (user.role === 'client') clientUser = exists;
            }
        }


        logger.info('Demo users check completed');
        logger.info('Credentials: client@demo.com / staff@demo.com / admin@demo.com / driver@demo.com (Password: password123)');
    } catch (error) {
        logger.error('Seeding error:', error);
    }
};

module.exports = seedUsers;
