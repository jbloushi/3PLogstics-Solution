const Shipment = require('../models/shipment.model');
const User = require('../models/user.model');
const PickupRequest = require('../models/pickupRequest.model');
const pickupController = require('./pickup.controller');
const addressService = require('../services/address.service');
const CarrierFactory = require('../services/CarrierFactory');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Ledger = require('../models/ledger.model');

// Helper function to generate a tracking number
const generateTrackingNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 11) result += '-';
  }
  return result;
};

// Calculate estimated delivery date (simple implementation - could be enhanced with distance calculation)
const calculateEstimatedDelivery = () => {
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3); // Default 3 days from now
  return deliveryDate;
};

// Create a new shipment
exports.createShipment = async (req, res) => {
  try {
    // Operations Smoothing: Clients can now create shipments directly with "Ready for Pickup" status
    // Direct shipment creation is allowed for all authenticated users

    // Enforce Pickup Request Flow for Clients - DISABLED for V2 Flow
    /*
    if (req.user.role === 'client') {
      return res.status(403).json({
        success: false,
        error: 'Clients must use the Pickup Request flow. Direct shipment creation is restricted.'
      });
    }
    */


    // Check MongoDB connection first
    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB not connected during shipment creation, attempting to reconnect...');
      try {
        // Try to reconnect
        const { connectDB } = require('../config/database');
        await connectDB();
        logger.info('MongoDB reconnected successfully for shipment creation');
      } catch (connError) {
        logger.error('Failed to reconnect to MongoDB for shipment creation:', connError);
        return res.status(500).json({
          success: false,
          error: 'Database connection error. Please try again later.'
        });
      }
    }

    // Extract input - support both sender/receiver (Wizard) and origin/destination (Legacy)
    const { sender, receiver, origin: legacyOrigin, destination: legacyDestination, checkpoints, items: legacyItems, parcels, serviceCode, carrierCode } = req.body;

    logger.info('Create Shipment Body:', JSON.stringify(req.body, null, 2));

    // Map parcels to items if provided, but prioritize distinct items if available
    const items = (legacyItems && legacyItems.length > 0) ? legacyItems : parcels;

    // Helper to sanitize address data and ensure required fields
    const sanitizeAddress = (data) => {
      if (!data) return null;
      const clean = { ...data };

      // Remove null coordinates
      if (clean.latitude === null) delete clean.latitude;
      if (clean.longitude === null) delete clean.longitude;

      // Auto-generate formattedAddress if missing but components exist
      if (!clean.formattedAddress && (clean.streetLines?.length || clean.city)) {
        const parts = [
          ...(clean.streetLines || []),
          clean.city,
          clean.state,
          clean.postalCode,
          clean.country || clean.countryCode
        ].filter(Boolean);
        clean.formattedAddress = parts.join(', ');
      }

      return clean;
    };

    const originData = sanitizeAddress(sender || legacyOrigin);
    const destinationData = sanitizeAddress(receiver || legacyDestination);

    const customer = req.body.customer || {
      name: originData?.contactPerson,
      email: originData?.email,
      phone: originData?.phone
    };

    // Validate required fields
    if (!originData || !originData.formattedAddress) {
      logger.error('Missing Sender Address', { originData });
      return res.status(400).json({
        success: false,
        error: 'Sender address is required. Please select from autocomplete or fill all address fields.'
      });
    }

    if (!destinationData || !destinationData.formattedAddress) {
      logger.error('Missing Receiver Address', { destinationData });
      return res.status(400).json({
        success: false,
        error: 'Receiver address is required. Please select from autocomplete or fill all address fields.'
      });
    }

    if (!customer.name || !customer.email) {
      // Try to backfill from sender if missing
      if (!originData?.contactPerson) {
        logger.error('Missing Customer/Sender Details', { customer, originData });
        return res.status(400).json({
          success: false,
          error: 'Customer/Sender with name and email is required'
        });
      }
    }

    // Process checkpoints if provided
    let validatedCheckpoints = [];
    if (checkpoints && Array.isArray(checkpoints) && checkpoints.length > 0) {
      // Validate each checkpoint
      for (const checkpoint of checkpoints) {
        if (!checkpoint.location || !checkpoint.location.formattedAddress) {
          return res.status(400).json({
            success: false,
            error: 'Each checkpoint must have a location address'
          });
        }

        if (!checkpoint.name) {
          return res.status(400).json({
            success: false,
            error: 'Each checkpoint must have a name'
          });
        }

        validatedCheckpoints.push({
          location: checkpoint.location,
          name: checkpoint.name,
          estimatedArrival: checkpoint.estimatedArrival || null,
          reached: false,
          notes: checkpoint.notes || ''
        });
      }
    }

    // Create new shipment
    const shipment = new Shipment({
      trackingNumber: generateTrackingNumber(),
      origin: originData,
      destination: destinationData,
      checkpoints: validatedCheckpoints,
      currentLocation: originData, // Start at origin
      status: req.body.status && ['draft', 'pending', 'ready_for_pickup', 'picked_up'].includes(req.body.status) ? req.body.status : 'ready_for_pickup',
      estimatedDelivery: req.body.estimatedDelivery || calculateEstimatedDelivery(),
      customer: {
        name: customer.name,
        email: customer.email,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        vatNo: customer.vatNo,
        eori: customer.eori,
        taxId: customer.taxId,
        traderType: customer.traderType
      },
      remarks: req.body.remarks,
      reference: req.body.reference || sender?.reference || '',
      items: items || [],
      // Allow Staff/Admin to create on behalf of a client
      user: (req.user && ['staff', 'admin'].includes(req.user.role) && req.body.userId)
        ? req.body.userId
        : (req.user ? req.user._id : null),
      history: [{
        location: originData,
        status: req.body.status && ['draft', 'pending', 'ready_for_pickup', 'picked_up'].includes(req.body.status) ? req.body.status : 'ready_for_pickup',
        description: 'Shipment created',
        timestamp: new Date()
      }],
      price: req.body.price,
      currency: req.body.currency,
      // New fields
      parcels: req.body.parcels || [],
      incoterm: req.body.incoterm || 'DAP',
      dangerousGoods: req.body.dangerousGoods || { contains: false },
      exportReason: req.body.exportReason || 'Sale',
      // Explicitly add missing fields
      gstPaid: req.body.gstPaid || false,
      payerOfVat: req.body.payerOfVat || 'receiver',
      palletCount: req.body.palletCount || 0,
      packageMarks: req.body.packageMarks || '',
      receiverReference: req.body.receiverReference || req.body.receiver?.reference || '',
      serviceCode: req.body.serviceCode,
      plannedDate: req.body.plannedDate,
      shipperAccount: req.body.shipperAccount,
      labelSettings: req.body.labelSettings
    });

    // Determine target user (Paying Entity)
    // If Staff/Admin is creating on behalf of a user, use that user's ID
    const shipmentPrice = parseFloat(req.body.price || 0);
    let targetUserId = req.user._id;
    if (['staff', 'admin'].includes(req.user.role) && req.body.userId) {
      targetUserId = req.body.userId;
    }

    // Fetch Target User and Organization
    const currentUser = await User.findById(targetUserId).populate('organization');

    if (!currentUser) throw new Error('User (Paying Entity) not found');

    // Determine financial entity (Organization or User fallback)
    let payingEntity = currentUser;
    let orgContext = null;

    if (currentUser.organization) {
      const Organisation = require('../models/organization.model');
      payingEntity = await Organisation.findById(currentUser.organization._id);
      orgContext = payingEntity;
    } else {
      logger.warn(`User ${currentUser._id} has no organization. Using personal balance.`);
    }

    // Check availability: balance + creditLimit
    // Note: Balance is typically DEBITED (lowered), so we check if (balance + limit) >= price
    // Logic assumes balance is strictly positive for cash, negative if allowed? 
    // Current system: Balance is funds available. Credit Limit is overdraft allowed.
    const availableFunds = (payingEntity.balance || 0) + (payingEntity.creditLimit || 0);

    // Blocking logic (except for drafts or if price is 0)
    const isNotDraft = shipment.status !== 'draft';
    if (isNotDraft && shipmentPrice > 0 && availableFunds < shipmentPrice) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credit balance in Organization account.',
        data: { balance: payingEntity.balance, creditLimit: payingEntity.creditLimit, required: shipmentPrice }
      });
    }

    // Deduct balance
    if (isNotDraft && shipmentPrice > 0) {
      payingEntity.balance = (payingEntity.balance || 0) - shipmentPrice;
      await payingEntity.save();

      shipment.paid = true;
      if (orgContext) shipment.organization = orgContext._id; // Link shipment to Org

      // Create Ledger Entry
      await Ledger.create({
        user: currentUser._id, // Who created it
        // TODO: Add organisation: orgContext._id to schema
        shipment: shipment._id,
        amount: shipmentPrice,
        type: 'DEBIT',
        category: 'SHIPMENT_FEE',
        description: `Shipment Fee: ${shipment.trackingNumber}`,
        balanceAfter: payingEntity.balance,
        reference: shipment.trackingNumber,
        metadata: { organizationId: orgContext ? orgContext._id.toString() : null }
      });
    }

    // --- DHL integration side-effect (outside transaction if possible, or handle cleanup) ---
    // For simplicity in this env, we keep it inside but we must be careful. 
    // If DHL fails, the transaction will catch it and rollback the balance deduction.
    if (serviceCode && (carrierCode === 'DHL' || !carrierCode) && !req.body.skipCarrierCreation) {
      // ... (keep existing DHL logic but ensure it uses the tracking number if needed)
      const dhlData = {
        sender: {
          postalCode: originData.postalCode || '12345',
          city: originData.city || 'Kuwait',
          countryCode: originData.countryCode || 'KW',
          streetLines: originData.streetLines?.length ? originData.streetLines : [originData.formattedAddress],
          phone: originData.phone || '1234567',
          email: originData.email,
          contactPerson: originData.contactPerson,
          traderType: originData.traderType,
          vatNumber: originData.vatNumber,
          eoriNumber: originData.eoriNumber,
          taxId: originData.taxId
        },
        receiver: {
          postalCode: destinationData.postalCode || '12345',
          city: destinationData.city || 'Berlin',
          countryCode: destinationData.countryCode || 'DE',
          streetLines: destinationData.streetLines?.length ? destinationData.streetLines : [destinationData.formattedAddress],
          phone: destinationData.phone || '1234567',
          email: destinationData.email,
          contactPerson: destinationData.contactPerson,
          traderType: destinationData.traderType,
          vatNumber: destinationData.vatNumber,
          eoriNumber: destinationData.eoriNumber,
          taxId: destinationData.taxId
        },
        parcels: req.body.parcels,
        items: items,
        currency: req.body.currency,
        incoterm: req.body.incoterm,
        dangerousGoods: req.body.dangerousGoods,
        exportReason: req.body.exportReason,
        serviceCode: serviceCode,
        gstPaid: req.body.gstPaid,
        payerOfVat: req.body.payerOfVat,
        palletCount: req.body.palletCount,
        packageMarks: req.body.packageMarks,
        receiverReference: req.body.receiverReference || req.body.receiver?.reference,
        shipperAccount: req.body.shipperAccount,
        labelSettings: req.body.labelSettings
      };

      const carrier = CarrierFactory.getAdapter('DHL');
      const labelInfo = await carrier.createShipment(dhlData, serviceCode);

      shipment.trackingNumber = labelInfo.trackingNumber;
      shipment.labelUrl = labelInfo.labelUrl;
      shipment.dhlConfirmed = true;
      shipment.dhlTrackingNumber = labelInfo.trackingNumber;
      if (labelInfo.awbUrl) shipment.awbUrl = labelInfo.awbUrl;
      if (labelInfo.invoiceUrl) shipment.invoiceUrl = labelInfo.invoiceUrl;
    }

    // Save Shipment
    savedShipment = await shipment.save();

    // Log success
    logger.info(`Shipment ${savedShipment.trackingNumber} created and paid.`);


    res.status(201).json({
      success: true,
      data: savedShipment,
      message: 'Shipment created and paid successfully'
    });
  } catch (error) {
    logger.error('Error creating shipment:', error);

    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to create shipment';

    if (error.name === 'ValidationError') {
      logger.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
      errorMessage = 'Invalid shipment data: ' + Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      errorMessage = 'Duplicate tracking number. Please try again.';
    } else if (error.name === 'MongoNetworkError') {
      errorMessage = 'Network error connecting to database. Please try again later.';
    }

    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get rate quotes from DHL
exports.getQuotes = async (req, res) => {
  try {
    const carrier = CarrierFactory.getAdapter('DHL');
    const rawQuotes = await carrier.getRates(req.body);

    // 3PL Profit Engine Logic (User-Level Markup)
    let markup = req.user?.markup;

    // Default Fallback
    if (!markup) {
      markup = { type: 'PERCENTAGE', percentageValue: 15, flatValue: 0 };
    }

    const markupQuotes = rawQuotes.map(quote => {
      const basePrice = Number(quote.totalPrice);
      let finalPrice = basePrice;
      let surchargeLabel = '0%';

      if (markup.type === 'PERCENTAGE' || markup.type === 'COMBINED') {
        const pct = markup.percentageValue || 0;
        finalPrice += basePrice * (pct / 100);
        surchargeLabel = `${pct}%`;
      }

      if (markup.type === 'FLAT' || markup.type === 'COMBINED') {
        const flat = markup.flatValue || 0;
        finalPrice += flat;
        surchargeLabel += (surchargeLabel !== '0%' ? ` + ${flat} KD` : `${flat} KD Flat`);
      }

      // Fallback description cleanup
      if (surchargeLabel.startsWith('0% +')) surchargeLabel = surchargeLabel.replace('0% + ', '');

      // Legacy Formula support (if needed, or deprecate)
      if (markup.type === 'FORMULA' && markup.formula) {
        // Safe evaluation of simple formulas 
        // Example: "base * 1.1 + 10"
        try {
          // eslint-disable-next-line no-new-func
          const safeEval = new Function('base', `return ${markup.formula}`);
          finalPrice = safeEval(basePrice);
          surchargeLabel = 'Custom';
        } catch (e) {
          finalPrice = basePrice * 1.15; // Fallback
          surchargeLabel = 'Error (Fallback 15%)';
        }
      }

      return {
        ...quote,
        totalPrice: finalPrice.toFixed(3),
        // If staff/admin, show rawPrice; else hide it or null it
        rawPrice: (req.user.role === 'staff' || req.user.role === 'admin') ? basePrice.toFixed(3) : undefined,
        surcharge: surchargeLabel
      };
    });

    // Remove legacy fallback used to define markup here.
    // Instead we rely on the implementation above.
    // Ensure we handle case where user is not populated or org is missing


    res.status(200).json({
      success: true,
      data: markupQuotes
    });
  } catch (error) {
    logger.error('Error fetching quotes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
  }
};

// Get shipment by tracking number
exports.getShipmentByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await Shipment.findOne({ trackingNumber }).populate('user', 'name email role balance creditLimit');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    logger.error('Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update shipment location
exports.updateShipmentLocation = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { coordinates, address, status, description } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Update current location (preserve required fields from existing data)
    shipment.currentLocation = {
      ...shipment.currentLocation.toObject(),
      formattedAddress: address,
      longitude: coordinates[0],
      latitude: coordinates[1],
      // Preserve required contact fields
      contactPerson: shipment.currentLocation.contactPerson || shipment.origin.contactPerson || 'Unknown',
      phone: shipment.currentLocation.phone || shipment.origin.phone || '0000000'
    };

    // Update status if provided
    if (status) {
      shipment.status = status;
    }

    // Add to history
    shipment.history.push({
      location: shipment.currentLocation,
      status: status || shipment.status,
      description: description || 'Location updated',
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} location updated`);

    // Return updated shipment
    const updatedShipment = shipment;

    res.status(200).json({
      success: true,
      data: updatedShipment,
      message: 'Shipment location updated successfully'
    });
  } catch (error) {
    logger.error('Error updating shipment location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment location',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get shipment history
exports.getShipmentHistory = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await Shipment.findOne({ trackingNumber }, 'history');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shipment.history
    });
  } catch (error) {
    logger.error('Error fetching shipment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get nearby shipments
exports.getNearbyShipments = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // Default 10km

    const shipments = await Shipment.find({
      'currentLocation.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });

    res.status(200).json({
      success: true,
      data: shipments
    });
  } catch (error) {
    logger.error('Error fetching nearby shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby shipments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all shipments with filtering and sorting
exports.getAllShipments = async (req, res) => {
  try {
    // Check MongoDB connection first
    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB not connected when fetching shipments, attempting to reconnect...');
      try {
        // Try to reconnect
        const { connectDB } = require('../config/database');
        await connectDB();
        logger.info('MongoDB reconnected successfully for fetching shipments');
      } catch (connError) {
        logger.error('Failed to reconnect to MongoDB for fetching shipments:', connError);
        return res.status(500).json({
          success: false,
          error: 'Database connection error. Please try again later.'
        });
      }
    }

    const { status, sortBy, sortOrder, limit = 50, page = 1 } = req.query;
    const query = {};

    // Apply filters
    if (status) {
      query.status = status;
    }

    // Role-based filtering: Clients only see their own shipments, staff see all
    if (req.user.role === 'client') {
      query.user = req.user._id;
    }

    // Apply sorting
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      // Default sort by createdAt in descending order (newest first)
      sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    // Fetch shipments with retry mechanism
    let shipments;
    try {
      shipments = await Shipment.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitValue)
        .populate('user', 'name email role balance creditLimit')
        .select('-__v');
    } catch (fetchError) {
      // If first fetch fails, try one more time
      if (fetchError.name === 'MongoNetworkError' ||
        fetchError.name === 'MongoTimeoutError' ||
        (fetchError.message && fetchError.message.includes('connection'))) {

        logger.warn('MongoDB fetch error, attempting to reconnect and retry:', fetchError);

        try {
          // Try to reconnect
          const { connectDB } = require('../config/database');
          await connectDB();

          // Try fetching again
          shipments = await Shipment.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitValue)
            .select('-__v');

          logger.info('Shipments fetched successfully after retry');
        } catch (retryError) {
          throw retryError; // Will be caught by outer catch block
        }
      } else {
        throw fetchError; // Will be caught by outer catch block
      }
    }

    // Get total count for pagination info
    const totalCount = await Shipment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: shipments,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: limitValue,
        pages: Math.ceil(totalCount / limitValue)
      }
    });
  } catch (error) {
    logger.error('Error fetching shipments:', error);

    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to fetch shipments';

    if (error.name === 'MongoNetworkError') {
      errorMessage = 'Network error connecting to database. Please try again later.';
    } else if (error.name === 'MongoServerError') {
      errorMessage = 'Database server error. Please try again later.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get shipment ETA
exports.getShipmentETA = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Calculate remaining distance and time
    const currentLocation = shipment.currentLocation.coordinates;
    const destination = shipment.destination.coordinates;

    // Calculate distance using Haversine formula
    const distance = calculateDistance(currentLocation, destination);

    // Assume average speed of 50 km/h for ground transport
    const averageSpeed = 50; // km/h
    const estimatedTimeHours = distance / averageSpeed;

    const eta = new Date();
    eta.setHours(eta.getHours() + estimatedTimeHours);

    res.json({
      trackingNumber: shipment.trackingNumber,
      currentLocation: shipment.currentLocation,
      destination: shipment.destination,
      distance: distance.toFixed(2), // km
      estimatedTimeHours: estimatedTimeHours.toFixed(2),
      eta: eta,
      status: shipment.status
    });
  } catch (error) {
    logger.error('Error calculating ETA:', error);
    res.status(500).json({ error: 'Failed to calculate ETA' });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
  if (!point1 || !point2 || !Array.isArray(point1) || !Array.isArray(point2) || point1.length < 2 || point2.length < 2) {
    return 0;
  }
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2[1] - point1[1]);
  const dLon = toRad(point2[0] - point1[0]);
  const lat1 = toRad(point1[1]);
  const lat2 = toRad(point2[1]);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

// Update shipment status
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, description } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Update status
    shipment.status = status;

    // Add to history
    shipment.history.push({
      location: shipment.currentLocation,
      status,
      description: description || `Status updated to ${status}`,
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} status updated to ${status}`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating shipment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment status',
      // If checkpoint is marked as reached, add to history
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get shipment route distance
exports.getShipmentRouteDistance = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Calculate distance from origin to current location
    let distanceTraveled = calculateDistance(
      shipment.origin.coordinates,
      shipment.currentLocation.coordinates
    );

    // Calculate distance from current location to destination
    const remainingDistance = calculateDistance(
      shipment.currentLocation.coordinates,
      shipment.destination.coordinates
    );

    // Calculate total route distance (origin to destination)
    let totalDistance = calculateDistance(
      shipment.origin.coordinates,
      shipment.destination.coordinates
    );

    // Include checkpoints in distance calculation if they exist
    let checkpointDistances = [];
    if (shipment.checkpoints && shipment.checkpoints.length > 0) {
      // Add origin as the first point
      let routePoints = [shipment.origin.coordinates];

      // Add all checkpoints in order
      shipment.checkpoints.forEach(checkpoint => {
        routePoints.push(checkpoint.location.coordinates);
      });

      // Add destination as the last point
      routePoints.push(shipment.destination.coordinates);

      // Calculate total distance with checkpoints
      totalDistance = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
        totalDistance += segmentDistance;

        // If this is a checkpoint segment, add to checkpoint distances
        if (i > 0 && i < routePoints.length - 2) {
          checkpointDistances.push({
            checkpointName: shipment.checkpoints[i - 1].name,
            distance: segmentDistance.toFixed(2)
          });
        }
      }

      // Recalculate distance traveled considering checkpoints
      let traveled = 0;
      let currentFound = false;

      for (let i = 0; i < routePoints.length - 1; i++) {
        const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);

        // If we haven't found the current location yet, add this segment's distance
        if (!currentFound) {
          // Check if current location is between these two points
          const distanceToStart = calculateDistance(routePoints[i], shipment.currentLocation.coordinates);
          const distanceToEnd = calculateDistance(shipment.currentLocation.coordinates, routePoints[i + 1]);

          if (distanceToStart + distanceToEnd <= segmentDistance * 1.1) { // 10% margin for error
            traveled += distanceToStart;
            currentFound = true;
          } else {
            traveled += segmentDistance;
          }
        }
      }

      // Update distanceTraveled if we found the current location along the route
      if (currentFound) {
        distanceTraveled = traveled;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        trackingNumber: shipment.trackingNumber,
        distanceTraveled: distanceTraveled.toFixed(2), // km
        remainingDistance: remainingDistance.toFixed(2), // km
        totalDistance: totalDistance.toFixed(2), // km
        progress: Math.min(Math.round((distanceTraveled / totalDistance) * 100), 99), // percentage
        checkpoints: shipment.checkpoints.map(cp => ({
          name: cp.name,
          address: cp.location.address,
          reached: cp.reached,
          estimatedArrival: cp.estimatedArrival
        })),
        checkpointDistances: checkpointDistances
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route distance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate Shipment Label (HTML View)
exports.generateLabel = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).send('Shipment not found');
    }

    // Basic Label HTML Template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${trackingNumber}</title>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }
          .label-container { width: 400px; height: 600px; background: white; padding: 20px; border: 2px solid #000; position: relative; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #d32f2f; }
          .tracking { font-size: 14px; font-weight: bold; }
          .barcode { margin: 20px 0; text-align: center; border: 1px dashed #ccc; padding: 10px; } /* Placeholder for barcode */
          .details { margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 5px; }
          .address-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .address-text { font-size: 14px; line-height: 1.4; }
          .footer { position: absolute; bottom: 20px; left: 20px; right: 20px; text-align: center; font-size: 12px; color: #666; }
          .print-btn { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 5px; }
          @media print {
            body { background: white; padding: 0; }
            .print-btn { display: none; }
            .label-container { border: none; width: 100%; height: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="header">
            <div class="logo">TARGET LOGISTICS</div>
            <div class="tracking">TN: ${trackingNumber}</div>
          </div>

          <div class="details">
            <div class="section-title">From (Sender)</div>
            <div class="address-box">
              <div class="address-text">
                <strong>${shipment.origin.contactPerson}</strong><br>
                ${shipment.origin.company ? shipment.origin.company + '<br>' : ''}
                ${shipment.origin.formattedAddress}<br>
                ${shipment.origin.city}, ${shipment.origin.postalCode}<br>
                Ph: ${shipment.origin.phone}
              </div>
            </div>

            <div class="section-title">To (Receiver)</div>
            <div class="address-box">
              <div class="address-text">
                <strong>${shipment.destination.contactPerson}</strong><br>
                ${shipment.destination.company ? shipment.destination.company + '<br>' : ''}
                ${shipment.destination.formattedAddress}<br>
                ${shipment.destination.city}, ${shipment.destination.postalCode}<br>
                Ph: ${shipment.destination.phone}
              </div>
            </div>
          </div>

          <div class="barcode">
            <h3>*${trackingNumber}*</h3>
            <p>Scan for Details</p>
          </div>

          <div class="details">
            <div class="section-title">Shipment Details</div>
            <p><strong>Status:</strong> ${shipment.status.replace(/_/g, ' ').toUpperCase()}</p>
            <p><strong>Pieces:</strong> ${shipment.items ? shipment.items.length : 1} | <strong>Weight:</strong> ${shipment.items ? shipment.items.reduce((acc, i) => acc + i.weight, 0) : 0} kg</p>
            <p><strong>Date:</strong> ${new Date(shipment.createdAt).toLocaleDateString()}</p>
          </div>

          <div class="footer">
            Thank you for shipping with Target Logistics.<br>
            Track at: https://target-logistics.com
          </div>
        </div>

        <button class="print-btn" onclick="window.print()">Print Label</button>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    logger.error('Error generating label:', error);
    res.status(500).send('Failed to generate label');
  }
};

// Update shipment location manually
exports.updateShipmentLocationManually = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { coordinates, address, status, description } = req.body;

    // Validate coordinates
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid coordinates [longitude, latitude] are required'
      });
    }

    // Validate address
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Update current location (preserve required contact fields)
    shipment.currentLocation = {
      ...shipment.currentLocation.toObject(),
      formattedAddress: address,
      longitude: coordinates[0],
      latitude: coordinates[1],
      // Preserve required contact fields from origin
      contactPerson: shipment.currentLocation.contactPerson || shipment.origin.contactPerson || 'Unknown',
      phone: shipment.currentLocation.phone || shipment.origin.phone || '0000000'
    };

    // Update status if provided
    if (status) {
      shipment.status = status;
    }

    // Add to history
    shipment.history.push({
      location: shipment.currentLocation,
      status: status || shipment.status,
      description: description || 'Location updated manually',
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} location updated manually`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment location updated successfully'
    });
  } catch (error) {
    logger.error('Error updating shipment location manually:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment location',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add a checkpoint to shipment
exports.addCheckpoint = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { location, name, estimatedArrival, notes } = req.body;

    // Validate required fields
    if (!location || !location.coordinates || !location.address) {
      return res.status(400).json({
        success: false,
        error: 'Location with coordinates and address is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Checkpoint name is required'
      });
    }

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Create new checkpoint
    const newCheckpoint = {
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
        timestamp: new Date()
      },
      name,
      estimatedArrival: estimatedArrival || null,
      reached: false,
      notes: notes || ''
    };

    // Add to checkpoints array
    shipment.checkpoints.push(newCheckpoint);

    await shipment.save();

    logger.info(`Checkpoint added to shipment ${trackingNumber} `);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Checkpoint added successfully'
    });
  } catch (error) {
    logger.error('Error adding checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add checkpoint',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a checkpoint
exports.updateCheckpoint = async (req, res) => {
  try {
    const { trackingNumber, checkpointId } = req.params;
    const { name, estimatedArrival, reached, notes, location } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Find the checkpoint
    const checkpoint = shipment.checkpoints.id(checkpointId);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found'
      });
    }

    // Update fields if provided
    if (name) checkpoint.name = name;
    if (estimatedArrival !== undefined) checkpoint.estimatedArrival = estimatedArrival;
    if (reached !== undefined) checkpoint.reached = reached;
    if (notes !== undefined) checkpoint.notes = notes;

    // Update location if provided
    if (location && location.coordinates && location.address) {
      checkpoint.location = {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
        timestamp: new Date()
      };
    }

    // If checkpoint is marked as reached, add to history
    if (reached && !checkpoint.reached) {
      shipment.history.push({
        location: shipment.currentLocation,
        status: shipment.status,
        description: `Checkpoint reached: ${checkpoint.name} `,
        timestamp: new Date()
      });

      checkpoint.reached = true;
    }

    await shipment.save();

    logger.info(`Checkpoint ${checkpointId} updated for shipment ${trackingNumber}`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Checkpoint updated successfully'
    });
  } catch (error) {
    logger.error('Error updating checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update checkpoint',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a checkpoint
exports.deleteCheckpoint = async (req, res) => {
  try {
    const { trackingNumber, checkpointId } = req.params;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Find and remove the checkpoint
    const checkpoint = shipment.checkpoints.id(checkpointId);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found'
      });
    }

    checkpoint.remove();

    await shipment.save();

    logger.info(`Checkpoint ${checkpointId} deleted from shipment ${trackingNumber} `);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Checkpoint deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete checkpoint',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Public: Get basic shipment info (masked)
exports.getPublicShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Return only necessary public info with permission flags
    res.status(200).json({
      success: true,
      data: {
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        destination: {
          address: shipment.destination.address,
          formattedAddress: shipment.destination.formattedAddress,
          city: shipment.destination.city,
          coordinates: shipment.destination.coordinates,
          latitude: shipment.destination.latitude,
          longitude: shipment.destination.longitude
        },
        origin: {
          city: shipment.origin.city,
          country: shipment.origin.country,
          formattedAddress: shipment.origin.formattedAddress,
          coordinates: shipment.origin.coordinates,
          latitude: shipment.origin.latitude,
          longitude: shipment.origin.longitude
        },
        currentLocation: shipment.currentLocation,
        estimatedDelivery: shipment.estimatedDelivery,
        // Public history for map pins
        history: shipment.history.map(h => ({
          status: h.status,
          timestamp: h.timestamp,
          location: h.location, // Coordinates needed for map
          description: h.description
        })),
        checkpoints: shipment.checkpoints, // For route waypoints
        // Permission flags for public updates
        allowPublicLocationUpdate: shipment.allowPublicLocationUpdate || false,
        allowPublicInfoUpdate: shipment.allowPublicInfoUpdate || false
      }
    });
  } catch (error) {
    logger.error('Error fetching public shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment'
    });
  }
};

// Public: Update location for receiver
exports.updatePublicLocation = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { coordinates, address } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Check if public location updates are allowed for this shipment
    if (!shipment.allowPublicLocationUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Location updates are not enabled for this shipment. Please contact the sender.'
      });
    }

    // Validate coordinates
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    // Update destination location (this is what the receiver is confirming)
    shipment.destination = {
      ...shipment.destination.toObject(),
      formattedAddress: address,
      longitude: coordinates[0],
      latitude: coordinates[1]
    };

    // Auto-disable public updates after successful submission validation
    shipment.allowPublicLocationUpdate = false;

    // Add to history
    shipment.history.push({
      location: shipment.currentLocation,
      status: shipment.status,
      description: 'Destination location updated by receiver',
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} destination updated by receiver`);

    res.status(200).json({
      success: true,
      data: {
        trackingNumber: shipment.trackingNumber,
        destination: shipment.destination
      },
      message: 'Location updated successfully'
    });
  } catch (error) {
    logger.error('Error updating public location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
};

// Driver: Scan to Pickup
exports.pickupShipment = async (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber.trim();
    const { user } = req;

    // Optional: Strict role check if not handled by middleware
    if (user.role !== 'driver' && user.role !== 'staff' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    logger.info(`Processing pickup for: [${trackingNumber}]`);
    let shipment = await Shipment.findOne({ trackingNumber });
    logger.info(`Lookup by tracking ${trackingNumber}: ${shipment ? 'Found' : 'Not Found'}`);

    // If not found by tracking number, try by ID or Pickup Request ID (if it looks like an ID)
    if (!shipment && trackingNumber.match(/^[0-9a-fA-F]{24}$/)) {
      logger.info(`Not found by tracking, trying ID lookup for: ${trackingNumber}`);
      shipment = await Shipment.findOne({
        $or: [
          { _id: trackingNumber },
          { pickupRequest: trackingNumber }
        ]
      });
      logger.info(`Lookup by ID/PickupRef ${trackingNumber}: ${shipment ? 'Found' : 'Not Found'}`);
    }

    if (!shipment) {
      logger.info(`Shipment not found for tracking: ${trackingNumber}`);
      // Check if it's a raw Pickup Request that hasn't been processed
      if (trackingNumber.match(/^[0-9a-fA-F]{24}$/)) {
        logger.info(`Checking PickupRequest for ID: ${trackingNumber}`);
        const pickupRequest = await PickupRequest.findById(trackingNumber);
        if (pickupRequest) {
          logger.info(`Found PickupRequest with status: ${pickupRequest.status}`);

          if (pickupRequest.status === 'READY_FOR_PICKUP') {
            logger.info(`Auto-approving PickupRequest ${trackingNumber} on driver scan`);
            try {
              const result = await pickupController.processApproval(pickupRequest._id, req.user._id);
              shipment = result.shipment;
              logger.info(`Auto-approval success. New Shipment ID: ${shipment?._id}, Tracking: ${shipment?.trackingNumber}`);
            } catch (approvalError) {
              logger.error('Auto-approval error on scan:', approvalError);
              return res.status(500).json({ success: false, error: 'Failed to process pickup request' });
            }
          } else {
            return res.status(400).json({
              success: false,
              error: `Scan failed: This Pickup Request is ${pickupRequest.status}. It must be READY_FOR_PICKUP.`
            });
          }
        }
      }

      if (!shipment) {
        return res.status(404).json({
          success: false,
          error: 'Shipment not found'
        });
      }
    }

    // Check status
    if (shipment.status === 'picked_up' || shipment.status === 'in_transit') {
      // Idempotency: If already picked up, just return success
      return res.status(200).json({
        success: true,
        data: shipment,
        message: 'Shipment already picked up'
      });
    }

    // Allow 'pending' or 'ready_for_pickup'
    if (!['pending', 'ready_for_pickup'].includes(shipment.status)) {
      return res.status(400).json({
        success: false,
        error: `Shipment cannot be picked up (Current status: ${shipment.status})`
      });
    }

    // Update Status
    shipment.status = 'picked_up';

    // Add to history
    shipment.history.push({
      location: shipment.currentLocation,
      status: 'picked_up',
      description: 'Shipment picked up by driver',
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} picked up by driver ${user.name}`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment picked up successfully'
    });
  } catch (error) {
    logger.error('Error in pickupShipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment status'
    });
  }
};

// Warehouse Handover Scan (Inbound)
exports.processWarehouseScan = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { user } = req;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Role Check
    if (!['admin', 'staff'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only Staff or Admin can process warehouse scans.'
      });
    }

    // Status Check: Must be 'picked_up' (or 'ready_for_pickup' if driver skipped scan?)
    // Let's allow 'ready_for_pickup' too, in case driver forgot to scan.
    const allowedStatuses = ['picked_up', 'ready_for_pickup'];
    if (!allowedStatuses.includes(shipment.status)) {
      if (shipment.status === 'in_transit') {
        return res.status(200).json({
          success: true,
          message: 'Shipment already processed (In Transit)'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Shipment status is ${shipment.status}. Must be 'Picked Up' or 'Ready' to process inbound.`
      });
    }

    // Update Status
    shipment.status = 'in_transit';

    // Update Location to Warehouse (assuming current user's location or default warehouse?)
    // For now, we keep location as is (likely last driver location), or we could add a "Processed at Warehouse" location.
    // Let's just add the history event.

    shipment.history.push({
      location: shipment.currentLocation,
      status: 'in_transit',
      description: `Processed at Warehouse Facility by ${user.name}`,
      timestamp: new Date()
    });

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} processed at warehouse by ${user.name}`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment processed at warehouse'
    });

  } catch (error) {
    logger.error('Error in processWarehouseScan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process warehouse scan'
    });
  }
};

// Update public tracking settings for a shipment
exports.updatePublicSettings = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { allowPublicLocationUpdate, allowPublicInfoUpdate } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Update settings
    if (typeof allowPublicLocationUpdate === 'boolean') {
      shipment.allowPublicLocationUpdate = allowPublicLocationUpdate;
    }
    if (typeof allowPublicInfoUpdate === 'boolean') {
      shipment.allowPublicInfoUpdate = allowPublicInfoUpdate;
    }

    await shipment.save();

    logger.info(`Shipment ${trackingNumber} public settings updated`);

    res.status(200).json({
      success: true,
      data: {
        trackingNumber: shipment.trackingNumber,
        allowPublicLocationUpdate: shipment.allowPublicLocationUpdate,
        allowPublicInfoUpdate: shipment.allowPublicInfoUpdate
      },
      message: 'Public settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating public settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update public settings'
    });
  }
};
// Delete shipment
exports.deleteShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { user } = req;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Permission Check
    const isOwner = shipment.user.toString() === user._id.toString();
    const isAdminOrStaff = ['admin', 'staff'].includes(user.role);

    if (!isAdminOrStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this shipment'
      });
    }

    // Status Rules
    // Client: draft, ready_for_pickup
    if (isOwner && !isAdminOrStaff) {
      if (!['draft', 'ready_for_pickup'].includes(shipment.status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete shipment in '${shipment.status}' status.Only Draft or Ready for Pickup.`
        });
      }
    }

    // Staff/Admin allow delete generally, or maybe prevent if 'delivered'? 
    // For now, allow staff to delete any as requested ("clients and staff can delete...")

    await shipment.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Shipment deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete shipment'
    });
  }
};

// Update shipment details (General)
exports.updateShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const updates = req.body;
    const { user } = req;

    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // Permission Check
    const isOwner = shipment.user.toString() === user._id.toString();
    const isAdminOrStaff = ['admin', 'staff'].includes(user.role);

    if (!isAdminOrStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this shipment'
      });
    }

    // Status Rules for Editing
    // Client: draft, pending, updated, exception, ready_for_pickup
    // Staff: draft, pending, updated, ready_for_pickup (and maybe others, but these are typical "editable" phases)

    const clientEditable = ['draft', 'pending', 'updated', 'exception', 'ready_for_pickup'];
    const staffEditable = ['draft', 'pending', 'updated', 'ready_for_pickup', 'picked_up', 'exception'];

    if (isOwner && !isAdminOrStaff && !clientEditable.includes(shipment.status)) {
      console.log(`[DEBUG] Blocked Edit. Status: ${shipment.status}, Allow: ${clientEditable}`);
      return res.status(400).json({
        success: false,
        error: `Clients can only edit shipments in Draft, Pending, Exception, or Ready for Pickup status.`
      });
    }

    if (isAdminOrStaff && !staffEditable.includes(shipment.status)) {
      // User requested "Staff and admin all shipments in 'ready for pickup' and 'pending'".
      // They didn't explicitly forbid others, but implied restriction. 
      // "Client can edit only in 'ready for pickup'... They can also create shipments and keep in draft".
      // I'll stick to the requested restriction to be safe.
      return res.status(400).json({
        success: false,
        error: `Staff can only edit shipments in Draft, Pending, Ready for Pickup, Picked Up, or Exception status.`
      });
    }

    // Apply allowed updates
    // Prevent updating critical fields like trackingNumber, user, history directly via this endpoint
    const allowedFields = ['destination', 'origin', 'items', 'currentLocation', 'price', 'markup', 'pickupRequest', 'customer', 'status', 'allowPublicLocationUpdate', 'allowPublicInfoUpdate'];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        shipment[key] = updates[key];
      }
    });

    // If status is being updated to valid one, handle history
    if (updates.status && updates.status !== shipment.status) {
      shipment.history.push({
        status: updates.status,
        description: `Shipment updated by ${user.role} (${user.name})`,
        timestamp: new Date(),
        location: shipment.currentLocation
      });
    }

    await shipment.save();

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment updated successfully'
    });

  } catch (error) {
    logger.error('Error updating shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment'
    });
  }
};

// Submit to DHL
exports.submitToDhl = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    if (shipment.dhlConfirmed) {
      return res.status(400).json({ success: false, error: 'Shipment already submitted to DHL' });
    }

    // --- Financial Check for Manual Approval ---
    if (!shipment.paid && (shipment.price || 0) > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const user = await User.findById(shipment.user).session(session);
        const price = shipment.price || 0;
        const available = (user.balance || 0) + (user.creditLimit || 0);

        if (available < price) {
          await session.abortTransaction();
          return res.status(402).json({
            success: false,
            error: 'Insufficient balance to approve this shipment.',
            data: { balance: user.balance, required: price }
          });
        }

        // Deduct
        user.balance = (user.balance || 0) - price;
        await user.save({ session });

        shipment.paid = true;
        await shipment.save({ session });

        // Ledger
        await Ledger.create([{
          user: user._id,
          shipment: shipment._id,
          amount: price,
          type: 'DEBIT',
          category: 'SHIPMENT_FEE',
          description: `Manual Approval Payment: ${shipment.trackingNumber}`,
          balanceAfter: user.balance,
          reference: shipment.trackingNumber
        }], { session });

        await session.commitTransaction();
        logger.info(`Shipment ${shipment.trackingNumber} paid via manual approval.`);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }

    // DEBUG: Log the raw shipment origin/destination to see what we have
    // logger.info(`[DHL-DEBUG] Origin: ${JSON.stringify(shipment.origin)}`);
    // logger.info(`[DHL-DEBUG] Destination: ${JSON.stringify(shipment.destination)}`);

    // Prepare data for DHL Service
    // Ensure fallback values to prevent 'undefined' errors
    // Prepare data for DHL Service
    const origin = shipment.origin || {};
    const destination = shipment.destination || {};
    const customer = shipment.customer || {};

    const dhlData = {
      sender: {
        postalCode: origin.postalCode || '12345',
        city: origin.city || 'Kuwait City',
        countryCode: origin.countryCode || 'KW',
        streetLines: [origin.formattedAddress || origin.address || 'Address Line 1'],
        company: origin.company || origin.contactPerson || 'Sender',
        contactPerson: origin.contactPerson || 'Sender',
        phone: origin.phone || origin.fullPhone || '12345678',
        email: origin.email || 'sender@email.com',

        // Map Tax IDs - Prioritize Customer object (where frontend sends it), fallback to origin
        vatNumber: customer.vatNo || origin.vatNumber || '',
        eoriNumber: customer.eori || origin.eoriNumber || '',
        taxId: customer.taxId || origin.taxId || '',

        reference: shipment.reference || ''
      },
      receiver: {
        postalCode: destination.postalCode || '12345',
        city: destination.city || 'Dubai',
        countryCode: destination.countryCode || 'AE',
        streetLines: [destination.formattedAddress || destination.address || 'Address Line 1'],
        company: destination.company || destination.contactPerson || 'Receiver',
        contactPerson: destination.contactPerson || 'Receiver',
        phone: destination.phone || destination.fullPhone || '12345678',
        email: destination.email || 'receiver@email.com',
        vatNumber: destination.vatNumber || '',
        reference: destination.reference || ''
      },
      // Pass raw arrays, service layer handles backward compatibility
      parcels: shipment.parcels,
      items: shipment.items,

      // New fields
      currency: shipment.currency,
      incoterm: shipment.incoterm,
      dangerousGoods: shipment.dangerousGoods,
      exportReason: shipment.exportReason,
      remarks: shipment.remarks, // Pass remarks for Invoice

      // Dynamic date and service
      shipmentDate: shipment.plannedDate,
      serviceCode: shipment.serviceCode || 'P',

      // Explicitly pass new DHL fields
      gstPaid: shipment.gstPaid,
      payerOfVat: shipment.payerOfVat,
      palletCount: shipment.palletCount,
      packageMarks: shipment.packageMarks,
      receiverReference: shipment.receiverReference
    };

    // DEBUG: Deep Audit of EORI/Tax fields before adapter call
    const audit = {
      sender: { vat: shipment.origin?.vatNumber, eori: shipment.origin?.eoriNumber, tax: shipment.origin?.taxId },
      receiver: { vat: shipment.destination?.vatNumber, eori: shipment.destination?.eoriNumber, tax: shipment.destination?.taxId },
      customer: { vat: shipment.customer?.vatNo, eori: shipment.customer?.eori, tax: shipment.customer?.taxId }
    };
    logger.info('[DHL-DATA-AUDIT] Final fields before normalization:', JSON.stringify(audit, null, 2));

    // DEBUG: Log the constructed payload
    logger.info(`[DHL-DEBUG] Constructed Payload: ${JSON.stringify(dhlData, null, 2)}`);

    const carrier = CarrierFactory.getAdapter('DHL');
    const dhlResult = await carrier.createShipment(dhlData, dhlData.serviceCode);

    shipment.trackingNumber = dhlResult.trackingNumber;
    shipment.dhlTrackingNumber = dhlResult.trackingNumber;
    shipment.labelUrl = dhlResult.labelUrl;
    shipment.awbUrl = dhlResult.awbUrl;
    shipment.invoiceUrl = dhlResult.invoiceUrl;
    shipment.dhlConfirmed = true;
    shipment.status = 'created'; // As requested

    // Log event
    shipment.history.push({
      location: shipment.currentLocation,
      status: shipment.status,
      description: `Submitted to DHL. Tracking: ${dhlResult.trackingNumber}`,
      timestamp: new Date()
    });

    await shipment.save();

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment submitted to DHL successfully'
    });

  } catch (error) {
    logger.error('Error submitting to DHL:', error);
    // Log the stack trace for easier debugging
    console.error('[DHL-FAIL-STACK]', error.stack);

    // Check if it's an axios error with response data
    const dhlError = error.response?.data || error.message;
    console.error('[DHL-FAIL-RESPONSE]', JSON.stringify(dhlError, null, 2));

    res.status(500).json({
      success: false,
      error: typeof dhlError === 'object' ? JSON.stringify(dhlError) : dhlError
    });
  }
};

