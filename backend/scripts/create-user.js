#!/usr/bin/env node
/**
 * Production User Creation Script
 * 
 * This script allows you to create users on production without affecting seeding or existing data.
 * 
 * Usage:
 *   node scripts/create-user.js
 *   
 * Interactive mode will prompt for user details, or set environment variables:
 *   USER_NAME="Admin User" USER_EMAIL="admin@demo.com" USER_PASSWORD="password123" USER_ROLE="admin" node scripts/create-user.js
 */

const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const ROLES = ['admin', 'staff', 'client', 'driver'];

async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/target-logistics';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

async function getUserDetails() {
    // Check if details provided via environment variables
    if (process.env.USER_NAME && process.env.USER_EMAIL && process.env.USER_PASSWORD && process.env.USER_ROLE) {
        return {
            name: process.env.USER_NAME,
            email: process.env.USER_EMAIL.toLowerCase(),
            password: process.env.USER_PASSWORD,
            role: process.env.USER_ROLE,
            phone: process.env.USER_PHONE || null
        };
    }

    // Interactive mode
    console.log('\n📝 Create New User');
    console.log('==================\n');

    const name = await question('Enter full name: ');
    const email = (await question('Enter email: ')).toLowerCase();
    const password = await question('Enter password (min 8 characters): ');

    console.log('\nAvailable roles:');
    ROLES.forEach((role, index) => console.log(`  ${index + 1}. ${role}`));
    const roleChoice = await question('Select role (1-4): ');
    const role = ROLES[parseInt(roleChoice) - 1] || 'client';

    const phone = await question('Enter phone (optional, press Enter to skip): ');

    return {
        name: name.trim(),
        email: email.trim(),
        password: password,
        role: role,
        phone: phone.trim() || null
    };
}

async function createUser(userDetails) {
    try {
        // Validate input
        if (!userDetails.name || !userDetails.email || !userDetails.password) {
            throw new Error('Name, email, and password are required');
        }

        if (userDetails.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        if (!ROLES.includes(userDetails.role)) {
            throw new Error(`Invalid role. Must be one of: ${ROLES.join(', ')}`);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: userDetails.email });
        if (existingUser) {
            console.log(`\n⚠️  User with email ${userDetails.email} already exists!`);
            const overwrite = await question('Do you want to update this user? (yes/no): ');

            if (overwrite.toLowerCase() === 'yes' || overwrite.toLowerCase() === 'y') {
                existingUser.name = userDetails.name;
                existingUser.password = userDetails.password;
                existingUser.role = userDetails.role;
                if (userDetails.phone) existingUser.phone = userDetails.phone;

                await existingUser.save();
                console.log('\n✅ User updated successfully!');
                console.log(`   Email: ${existingUser.email}`);
                console.log(`   Role: ${existingUser.role}`);
                return existingUser;
            } else {
                console.log('\n❌ Operation cancelled');
                return null;
            }
        }

        // Create user data object
        const userData = {
            name: userDetails.name,
            email: userDetails.email,
            password: userDetails.password,
            role: userDetails.role
        };

        if (userDetails.phone) {
            userData.phone = userDetails.phone;
        }

        // If creating a client, try to find default organization
        if (userDetails.role === 'client') {
            const defaultOrg = await Organization.findOne({ type: 'internal' });
            if (defaultOrg) {
                userData.organization = defaultOrg._id;
                userData.carrierConfig = {
                    preferredCarrier: 'DHL',
                    traderType: 'business'
                };
            }
        }

        // Create the user
        const newUser = await User.create(userData);

        // If client and organization exists, add to members
        if (userDetails.role === 'client' && userData.organization) {
            const org = await Organization.findById(userData.organization);
            if (org && !org.members.includes(newUser._id)) {
                org.members.push(newUser._id);
                await org.save();
            }
        }

        console.log('\n✅ User created successfully!');
        console.log(`   ID: ${newUser._id}`);
        console.log(`   Name: ${newUser.name}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Role: ${newUser.role}`);
        if (newUser.phone) console.log(`   Phone: ${newUser.phone}`);

        return newUser;
    } catch (error) {
        console.error('\n❌ Error creating user:', error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`   - ${key}: ${error.errors[key].message}`);
            });
        }
        return null;
    }
}

async function main() {
    try {
        await connectDB();

        const userDetails = await getUserDetails();
        await createUser(userDetails);

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB\n');
        process.exit(0);
    }
}

// Run the script
main();
