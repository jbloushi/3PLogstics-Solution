const mongoose = require('mongoose');
const Shipment = require('../models/shipment.model');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const CarrierFactory = require('./CarrierFactory');
const PricingService = require('./pricing.service');
const CarrierDocumentService = require('./CarrierDocumentService');
const logger = require('../utils/logger');
const crypto = require('crypto');
const financeLedgerService = require('./financeLedger.service');

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

        const price = shipment.pricingSnapshot?.totalPrice ?? shipment.price ?? 0;
        const payingUser = await User.findById(shipment.user).populate('organization');
        const organizationId = shipment.organization || payingUser?.organization?._id;

        logger.debug(`Booking Shipment ${trackingNumber}: Organization=${organizationId}, User=${shipment.user}`);

        const organization = await Organization.findById(organizationId);
        const orgBalance = await financeLedgerService.getOrganizationBalance(organizationId);
        const availableCredit = (organization?.creditLimit || 0) - orgBalance;

        if (price > 0 && availableCredit < price) {
            shipment.financeHold = {
                status: true,
                reason: 'Insufficient available credit',
                checkedAt: new Date(),
                availableCredit,
                requiredAmount: price
            };
            await shipment.save();
            throw new Error('Insufficient available credit to book shipment.');
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
            // Save detailed error to DB but rethrow specific message
            await this.handleBookingFailure(shipment._id, attemptId, error.message);
            throw error; // Re-throw to controller so it can send 400 with specific message
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
            freshShipment.organization = organizationId;

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
            const finalPrice = freshShipment.pricingSnapshot?.totalPrice ?? freshShipment.price ?? 0;
            if (finalPrice > 0) {
                await financeLedgerService.createLedgerEntry(organizationId, {
                    sourceRepo: 'Shipment',
                    sourceId: freshShipment._id,
                    amount: finalPrice,
                    entryType: 'DEBIT',
                    category: 'SHIPMENT_CHARGE',
                    description: `Shipment charge: ${freshShipment.trackingNumber}`,
                    reference: freshShipment.trackingNumber,
                    createdBy: payingUser?._id,
                    metadata: { attemptId }
                });
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
