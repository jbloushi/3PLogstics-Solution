const mongoose = require('mongoose');
const Shipment = require('../models/shipment.model');
const User = require('../models/user.model');
const Ledger = require('../models/ledger.model');
const CarrierFactory = require('./CarrierFactory');
const PricingService = require('./pricing.service');
const CarrierDocumentService = require('./CarrierDocumentService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ShipmentBookingService {

    /**
     * Orchestrates the secure booking of a shipment.
     * @param {string} trackingNumber 
     * @param {Object} user - The requesting user
     * @returns {Object} { success, shipment, message }
     */
    async bookShipment(trackingNumber, overrideCarrierCode = null) {
        // --- STEP 0: Safety Checks ---
        const shipment = await Shipment.findOne({ trackingNumber });
        if (!shipment) throw new Error('Shipment not found');

        const carrierCode = overrideCarrierCode || shipment.carrierCode || 'DGR';

        // 2. Validate Pricing Snapshot
        if (!PricingService.validateSnapshot(shipment.pricingSnapshot)) {
            throw new Error('Pricing data invalid or expired. Please re-edit/save the shipment to refresh rates.');
        }

        // 3. Idempotency Check (Duplicate Prevention)
        // Check if there is already a successful or pending attempt
        const activeAttempt = shipment.bookingAttempts.find(a =>
            a.status === 'succeeded' ||
            (a.status === 'pending' && new Date() - a.createdAt < 60000) // 1 min timeout for pending
        );

        if (activeAttempt) {
            if (activeAttempt.status === 'succeeded') {
                return { success: true, shipment, message: 'Shipment already booked.' };
            }
            throw new Error('A booking request is already in progress. Please wait.');
        }

        // --- STEP A: Atomic Placeholder (Pending) ---
        const attemptId = crypto.randomUUID();
        shipment.bookingAttempts.push({
            attemptId,
            status: 'pending'
        });
        await shipment.save();


        // --- STEP B: External Carrier Call (No Transaction) ---
        let carrierResult;
        try {
            const adapter = CarrierFactory.getAdapter(carrierCode);
            carrierResult = await adapter.createShipment(this.mapToCarrierPayload(shipment), shipment.serviceCode);
        } catch (error) {
            // Handle Failure
            await this.handleBookingFailure(shipment._id, attemptId, error.message);
            throw error; // Re-throw to controller
        }

        // --- STEP C: Atomic Commit (Transaction) ---
        // NOTE: Transactions removed because Dev environment is Standalone MongoDB.
        // In Production (Replica Set), uncomment session logic for atomicity.
        try {
            // Refetch shipment to ensure we have latest version
            const freshShipment = await Shipment.findById(shipment._id); // Removed session
            const attempt = freshShipment.bookingAttempts.find(a => a.attemptId === attemptId);
            if (!attempt) throw new Error('Booking attempt record lost');

            // Update Shipment with Carrier Data
            freshShipment.dhlConfirmed = true; // Legacy flag
            freshShipment.carrierShipmentId = carrierResult.carrierShipmentId || carrierResult.trackingNumber;
            freshShipment.dhlTrackingNumber = carrierResult.trackingNumber; // Legacy
            freshShipment.status = 'created';

            // Update Attempt
            attempt.status = 'succeeded';
            attempt.carrierShipmentId = carrierResult.trackingNumber;
            attempt.updatedAt = new Date();

            // Process Documents (Store & Link)
            if (carrierResult.labelUrl) {
                const doc = await CarrierDocumentService.uploadDocument('label', carrierResult.labelUrl, 'pdf');
                freshShipment.documents.push(doc);
                freshShipment.labelUrl = doc.url; // Legacy Compat
            }
            if (carrierResult.invoiceUrl) {
                const doc = await CarrierDocumentService.uploadDocument('invoice', carrierResult.invoiceUrl, 'pdf');
                freshShipment.documents.push(doc);
                freshShipment.invoiceUrl = doc.url; // Legacy Compat
            }

            // Financial Deduction
            const price = freshShipment.pricingSnapshot.totalPrice;
            if (price > 0 && !freshShipment.paid) {
                const payingUser = await User.findById(freshShipment.user); // Removed session

                // Deduct
                payingUser.balance = (payingUser.balance || 0) - price;
                await payingUser.save(); // Removed session

                freshShipment.paid = true;

                // Ledger
                await Ledger.create([{
                    user: payingUser._id,
                    shipment: freshShipment._id,
                    amount: price,
                    type: 'DEBIT',
                    category: 'SHIPMENT_FEE',
                    description: `Shipment Fee: ${freshShipment.trackingNumber}`,
                    balanceAfter: payingUser.balance,
                    reference: freshShipment.trackingNumber,
                    metadata: { attemptId }
                }]); // Removed session
            }

            await freshShipment.save(); // Removed session
            // await session.commitTransaction();

            return { success: true, shipment: freshShipment };

        } catch (commitError) {
            // await session.abortTransaction();
            logger.error('Booking Commit Failed:', commitError);
            // Attempt to mark as failed (best effort)
            await this.handleBookingFailure(shipment._id, attemptId, 'Commit Failed: ' + commitError.message);
            throw new Error(`System Error: Booking succeeded at carrier but failed to save. Error: ${commitError.message}`);
        } finally {
            // session.endSession();
        }
    }

    async handleBookingFailure(shipmentId, attemptId, reason) {
        try {
            await Shipment.updateOne(
                { _id: shipmentId, 'bookingAttempts.attemptId': attemptId },
                {
                    $set: {
                        'bookingAttempts.$.status': 'failed',
                        'bookingAttempts.$.error': reason,
                        'bookingAttempts.$.updatedAt': new Date()
                    }
                }
            );
        } catch (e) {
            logger.error('Failed to update booking status to failed:', e);
        }
    }

    // Helper to map DB model to what Adapter expects
    // Currently Adapter expects semi-raw data. Ideally we clean this up.
    mapToCarrierPayload(shipment) {
        // Create a plain object and merge legacy + new fields
        const data = shipment.toObject();
        return {
            ...data,
            // Ensure nested objects are present
            sender: data.origin,
            receiver: data.destination,
            // Add mapped fields if adapter needs them specifically
            user: data.user // Ensure User ID is passed for logging
        };
    }
}

module.exports = new ShipmentBookingService();
