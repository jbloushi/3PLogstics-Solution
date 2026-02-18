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
     * @param {string|null} overrideCarrierCode
     * @returns {Object} { success, shipment, message }
     */
    async bookShipment(trackingNumber, overrideCarrierCode = null, optionalServiceCodes = []) {
        const shipment = await Shipment.findOne({ trackingNumber });
        if (!shipment) throw new Error('Shipment not found');

        const carrierCode = String(overrideCarrierCode || shipment.carrierCode || shipment.carrier || 'DGR').toUpperCase();

        const payingUser = await User.findById(shipment.user).populate('organization');
        if (!payingUser) {
            throw new Error('Shipment owner not found');
        }

        const organizationId = shipment.organization || payingUser?.organization?._id || null;
        const organization = organizationId ? await Organization.findById(organizationId) : null;

        this.ensureCarrierAllowed({ carrierCode, organization, payingUser });

        const normalizedOptionalCodes = Array.isArray(optionalServiceCodes)
            ? optionalServiceCodes.map((code) => String(code).toUpperCase()).filter(Boolean)
            : [];

        const existingOptionalCodes = (shipment.pricingSnapshot?.optionalServices || [])
            .map((service) => String(service.serviceCode || '').toUpperCase())
            .filter(Boolean);

        const optionalCodesChanged = normalizedOptionalCodes.length > 0 && (
            normalizedOptionalCodes.length !== existingOptionalCodes.length ||
            normalizedOptionalCodes.some((code) => !existingOptionalCodes.includes(code))
        );

        // Validate or refresh pricing snapshot for booking safety
        if (!PricingService.validateSnapshot(shipment.pricingSnapshot) || optionalCodesChanged) {
            await this.refreshPricingSnapshotForBooking({
                shipment,
                carrierCode,
                payingUser,
                organization,
                selectedOptionalServiceCodes: normalizedOptionalCodes
            });
        }

        const price = shipment.pricingSnapshot?.totalPrice ?? shipment.price ?? 0;

        logger.debug(`Booking Shipment ${trackingNumber}: Organization=${organizationId}, User=${shipment.user}`);

        if (organizationId) {
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
        }

        const activeAttempt = shipment.bookingAttempts.find((a) =>
            a.status === 'succeeded' ||
            (a.status === 'pending' && new Date() - a.createdAt < 60000)
        );

        if (activeAttempt) {
            if (activeAttempt.status === 'succeeded') {
                return { success: true, shipment, message: 'Shipment already booked.' };
            }
            throw new Error('A booking request is already in progress. Please wait.');
        }

        const attemptId = crypto.randomUUID();
        shipment.bookingAttempts.push({
            attemptId,
            status: 'pending'
        });
        await shipment.save();

        let carrierResult;
        try {
            const adapter = CarrierFactory.getAdapter(carrierCode);
            carrierResult = await adapter.createShipment(this.mapToCarrierPayload(shipment), shipment.serviceCode);
        } catch (error) {
            await this.handleBookingFailure(shipment._id, attemptId, error.message);
            throw error;
        }

        try {
            const freshShipment = await Shipment.findById(shipment._id);
            const attempt = freshShipment.bookingAttempts.find((a) => a.attemptId === attemptId);
            if (!attempt) throw new Error('Booking attempt record lost');

            freshShipment.dhlConfirmed = true;
            freshShipment.carrierShipmentId = carrierResult.carrierShipmentId || carrierResult.trackingNumber;
            freshShipment.dhlTrackingNumber = carrierResult.trackingNumber;
            freshShipment.status = 'created';
            freshShipment.organization = organizationId;

            attempt.status = 'succeeded';
            attempt.carrierShipmentId = carrierResult.trackingNumber;
            attempt.updatedAt = new Date();

            if (carrierResult.labelUrl) {
                const doc = await CarrierDocumentService.uploadDocument('label', carrierResult.labelUrl, 'pdf');
                freshShipment.documents.push(doc);
                freshShipment.labelUrl = doc.url;
            }
            if (carrierResult.invoiceUrl) {
                const doc = await CarrierDocumentService.uploadDocument('invoice', carrierResult.invoiceUrl, 'pdf');
                freshShipment.documents.push(doc);
                freshShipment.invoiceUrl = doc.url;
            }

            const finalPrice = freshShipment.pricingSnapshot?.totalPrice ?? freshShipment.price ?? 0;
            if (finalPrice > 0 && organizationId) {
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

            await freshShipment.save();

            return { success: true, shipment: freshShipment };
        } catch (commitError) {
            logger.error('Booking Commit Failed:', commitError);
            await this.handleBookingFailure(shipment._id, attemptId, `Commit Failed: ${commitError.message}`);
            throw new Error(`System Error: Booking succeeded at carrier but failed to save. Error: ${commitError.message}`);
        }
    }

    ensureCarrierAllowed({ carrierCode, organization, payingUser }) {
        const orgAllowed = Array.isArray(organization?.allowedCarriers) && organization.allowedCarriers.length > 0
            ? organization.allowedCarriers.map((c) => String(c).toUpperCase())
            : CarrierFactory.getAvailableCarriers().map((c) => c.code.toUpperCase());

        const agentAllowed = Array.isArray(payingUser?.agentPolicy?.allowedCarriers) && payingUser.agentPolicy.allowedCarriers.length > 0
            ? payingUser.agentPolicy.allowedCarriers.map((c) => String(c).toUpperCase())
            : orgAllowed;

        const effectiveAllowed = orgAllowed.filter((code) => agentAllowed.includes(code));
        if (!effectiveAllowed.includes(carrierCode)) {
            const err = new Error(`Carrier ${carrierCode} is not allowed for this account`);
            err.statusCode = 403;
            throw err;
        }
    }

    resolveMarkup({ payingUser, organization, carrierCode }) {
        let markup = payingUser?.markup || { type: 'PERCENTAGE', percentageValue: 15, flatValue: 0 };

        const orgCarrierMarkup = organization?.markup?.byCarrier?.[carrierCode];
        if (orgCarrierMarkup?.type) {
            markup = orgCarrierMarkup;
        } else if (organization?.markup?.type) {
            markup = organization.markup;
        }

        if (payingUser?.agentPolicy?.markupOverride?.type) {
            markup = payingUser.agentPolicy.markupOverride;
        }

        return markup;
    }

    async refreshPricingSnapshotForBooking({ shipment, carrierCode, payingUser, organization, selectedOptionalServiceCodes = [] }) {
        try {
            const adapter = CarrierFactory.getAdapter(carrierCode);
            const payload = this.mapToCarrierPayload(shipment);
            const quotes = await adapter.getRates({ ...payload, carrierCode });

            if (!Array.isArray(quotes) || quotes.length === 0) {
                throw new Error('No rates returned from carrier while refreshing pricing snapshot');
            }

            const selectedQuote = quotes.find((quote) => quote.serviceCode === shipment.serviceCode) || quotes[0];
            const carrierRate = Number(selectedQuote.totalPrice || 0);
            const markupConfig = this.resolveMarkup({ payingUser, organization, carrierCode });
            const calculation = PricingService.calculateFinalPrice(carrierRate, markupConfig);

            const selectedCodesSet = new Set((selectedOptionalServiceCodes || []).map((code) => String(code).toUpperCase()));
            const quoteOptionalServices = Array.isArray(selectedQuote.optionalServices) ? selectedQuote.optionalServices : [];

            const optionalServices = selectedCodesSet.size === 0
                ? []
                : quoteOptionalServices
                    .filter((service) => selectedCodesSet.has(String(service.serviceCode || '').toUpperCase()))
                    .map((service) => ({
                        serviceCode: service.serviceCode,
                        serviceName: service.serviceName,
                        totalPrice: Number(Number(service.totalPrice || 0).toFixed(3)),
                        currency: service.currency || selectedQuote.currency || shipment.currency || 'KWD'
                    }));

            if (selectedCodesSet.size > 0 && optionalServices.length !== selectedCodesSet.size) {
                const missingCodes = Array.from(selectedCodesSet).filter(
                    (code) => !optionalServices.some((service) => String(service.serviceCode || '').toUpperCase() === code)
                );
                const err = new Error(`Invalid optional service codes for carrier quote: ${missingCodes.join(', ')}`);
                err.statusCode = 400;
                throw err;
            }

            const optionalServicesTotal = Number(
                optionalServices.reduce((sum, service) => sum + Number(service.totalPrice || 0), 0).toFixed(3)
            );

            shipment.pricingSnapshot = {
                carrierRate,
                markup: Number((calculation.finalPrice - carrierRate).toFixed(3)),
                estimatedShipmentCost: Number(calculation.finalPrice.toFixed(3)),
                optionalServices,
                optionalServicesTotal,
                totalPrice: Number((calculation.finalPrice + optionalServicesTotal).toFixed(3)),
                currency: selectedQuote.currency || shipment.currency || 'KWD',
                rateHash: PricingService.createSnapshot(carrierRate, markupConfig, selectedQuote.currency || 'KWD').rateHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                rulesVersion: 'v1',
                policySource: 'booking_refresh'
            };

            shipment.price = shipment.pricingSnapshot.totalPrice;
            await shipment.save();
            logger.info(`Pricing snapshot refreshed during booking for ${shipment.trackingNumber}`);
        } catch (error) {
            logger.error('Failed to refresh pricing snapshot before booking:', error);
            const refreshError = new Error(`Pricing data invalid or expired and refresh failed: ${error.message}`);
            refreshError.statusCode = 400;
            throw refreshError;
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

    mapToCarrierPayload(shipment) {
        const data = shipment.toObject();
        return {
            ...data,
            sender: data.origin,
            receiver: data.destination,
            user: data.user
        };
    }
}

module.exports = new ShipmentBookingService();
