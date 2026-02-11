const config = require('../config/config');
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
const PricingService = require('../services/pricing.service');
const ShipmentDraftService = require('../services/ShipmentDraftService');
const ShipmentBookingService = require('../services/ShipmentBookingService');
const { generateTrackingNumber } = require('../utils/shipmentUtils');

const buildHistoryKey = (event) => {
  const time = event?.timestamp ? new Date(event.timestamp).toISOString() : '';
  const status = event?.status || '';
  const location = event?.location?.formattedAddress || event?.location?.address || event?.location || '';
  return `${status}|${time}|${location}`;
};

const syncCarrierTrackingHistory = async (shipment) => {
  const trackingNumber = shipment?.carrierShipmentId || shipment?.dhlTrackingNumber;
  if (!trackingNumber) return;

  const carrierCode = (shipment?.carrier || shipment?.carrierCode || 'DGR').toUpperCase();
  let carrier;
  try {
    carrier = CarrierFactory.getAdapter(carrierCode);
  } catch (error) {
    logger.warn(`Carrier adapter not available for ${carrierCode}: ${error.message}`);
    return;
  }

  try {
    const tracking = await carrier.getTracking(trackingNumber);
    const events = tracking?.events || [];
    if (events.length === 0) return;

    const existingKeys = new Set(
      shipment.history.map((entry) => buildHistoryKey(entry))
    );

    const fallbackContact = shipment.origin?.contactPerson || 'Carrier';
    const fallbackPhone = shipment.origin?.phone || '0000000';

    let hasUpdates = false;
    events.forEach((event) => {
      const historyEntry = {
        status: event.statusCode || tracking.status || 'in_transit',
        description: event.description || 'Carrier update',
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        location: {
          formattedAddress: event.location || 'Unknown',
          city: event.location || undefined,
          contactPerson: fallbackContact,
          phone: fallbackPhone
        }
      };
      const key = buildHistoryKey(historyEntry);
      if (!existingKeys.has(key)) {
        shipment.history.push(historyEntry);
        existingKeys.add(key);
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      shipment.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      await shipment.save();
    }
  } catch (error) {
    logger.warn(`Failed to sync carrier tracking for ${shipment.trackingNumber}: ${error.message}`);
  }
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

    // Delegate to Service
    const shipment = await ShipmentDraftService.createDraft(req.body, req.user);

    logger.info(`Shipment ${shipment.trackingNumber} created (Draft).`);

    res.status(200).json({
      success: true,
      data: shipment,
      message: 'Shipment created successfully'
    });

  } catch (error) {
    logger.error(`Error creating shipment: ${error.message}`, {
      stack: error.stack,
      body: req.body,
      userId: req.user?._id
    });
    res.status(400).json({ // Using 400 for validation/business errors from service
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get available carriers
exports.getAvailableCarriers = (req, res) => {
  try {
    const carriers = CarrierFactory.getAvailableCarriers();
    res.status(200).json({
      success: true,
      data: carriers
    });
  } catch (error) {
    logger.error('Error fetching carriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carriers'
    });
  }
};



// Get rate quotes from DGR
exports.getQuotes = async (req, res) => {
  try {
    const carrierCode = req.body.carrierCode || 'DGR';
    const carrier = CarrierFactory.getAdapter(carrierCode);
    const rawQuotes = await carrier.getRates(req.body);

    // 3PL Profit Engine Logic (Target User Markup)
    let markup = req.user?.markup;

    // If Admin/Staff is quoting on behalf of a user, fetch that user's markup
    if (['staff', 'admin'].includes(req.user.role) && req.body.userId) {
      try {
        const targetUser = await User.findById(req.body.userId).populate('organization');
        if (targetUser) {
          markup = targetUser.markup;
        }
      } catch (err) {
        logger.warn(`Failed to fetch target user ${req.body.userId} for markup`, err);
      }
    }

    // Default Fallback
    if (!markup) {
      markup = { type: 'PERCENTAGE', percentageValue: 15, flatValue: 0 };
    }

    const markupQuotes = rawQuotes.map(quote => {
      const basePrice = Number(quote.totalPrice);
      const calculation = PricingService.calculateFinalPrice(basePrice, markup);

      return {
        ...quote,
        totalPrice: Number(calculation.finalPrice.toFixed(3)),
        currency: quote.currency || 'KWD',
        // RESTRICTED: Only Admins can see the raw carrier price
        carrierCost: req.user.role === 'admin' ? basePrice : undefined,
        markupAmount: req.user.role === 'admin' ? calculation.markupAmount : undefined
      };
    });

    res.status(200).json({
      success: true,
      data: markupQuotes
    });
  } catch (error) {
    logger.error('Error fetching quotes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Lists all available carriers and their implementation status.
 */
exports.getAvailableCarriers = async (req, res) => {
  try {
    const carriers = CarrierFactory.getAvailableCarriers();
    res.status(200).json({
      success: true,
      data: carriers
    });
  } catch (error) {
    logger.error('Error getting available carriers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get shipment by tracking number
exports.getShipmentByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await Shipment.findOne({ trackingNumber }).populate('user', 'name email role organization');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    // RESTRICTED: Hide sensitive cost data from non-admins
    if (req.user.role !== 'admin') {
      shipment.costPrice = undefined;
      shipment.markup = undefined;
    }

    await syncCarrierTrackingHistory(shipment);

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

// Submit to Carrier (Staff Only)
exports.bookWithCarrier = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrierCode } = req.body;

    // Find shipment
    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    // Call Booking Service
    const result = await ShipmentBookingService.bookShipment(trackingNumber, carrierCode);

    res.status(200).json({
      success: true,
      data: result,
      message: `Shipment successfully booked with ${result.carrierCode}`
    });
  } catch (error) {
    logger.error('Error booking shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

    const {
      status,
      statusIn,
      q,
      sortBy,
      sortOrder,
      limit = 50,
      page = 1,
      organization,
      paid,
      view,
      includeUser,
      includeTotal
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (statusIn) {
      const statuses = String(statusIn)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    if (organization) {
      query.organization = organization === 'none' ? null : organization;
    }

    if (paid !== undefined) {
      const isPaid = paid === 'true' || paid === true;
      query.paid = isPaid ? true : { $ne: true };
    }

    if (q) {
      const escapedQuery = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQuery, 'i');
      query.$or = [
        { trackingNumber: searchRegex },
        { 'customer.name': searchRegex },
        { 'destination.city': searchRegex }
      ];
    }

    if (req.user.role === 'client') {
      query.user = req.user._id;
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const parsedLimit = Number.parseInt(limit, 10) || 50;
    const parsedPage = Number.parseInt(page, 10) || 1;
    const limitValue = Math.min(Math.max(parsedLimit, 1), 100);
    const pageValue = Math.max(parsedPage, 1);
    const skip = (pageValue - 1) * limitValue;

    const isListView = view === 'list';
    const shouldIncludeUser = includeUser === undefined ? !isListView : includeUser === 'true' || includeUser === true;
    const shouldIncludeTotal = includeTotal === undefined ? true : includeTotal === 'true' || includeTotal === true;

    const projection = isListView
      ? 'trackingNumber origin.city destination.city customer.name customer.phone status estimatedDelivery serviceCode carrier labelUrl invoiceUrl costPrice markup createdAt paid'
      : '-__v -history -bookingAttempts -documents';

    const buildFindQuery = () => {
      let findQuery = Shipment.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitValue)
        .select(projection)
        .lean();

      if (shouldIncludeUser) {
        findQuery = findQuery.populate('user', 'name email role organization');
      }

      return findQuery;
    };

    let shipments;
    try {
      const [rows, totalCount] = await Promise.all([
        buildFindQuery(),
        shouldIncludeTotal ? Shipment.countDocuments(query) : Promise.resolve(null)
      ]);
      shipments = rows;

      if (req.user.role !== 'admin') {
        shipments.forEach((shipment) => {
          delete shipment.costPrice;
          delete shipment.markup;
        });
      }

      return res.status(200).json({
        success: true,
        data: shipments,
        pagination: {
          total: totalCount,
          page: pageValue,
          limit: limitValue,
          pages: totalCount === null ? null : Math.ceil(totalCount / limitValue)
        }
      });
    } catch (fetchError) {
      if (
        fetchError.name === 'MongoNetworkError' ||
        fetchError.name === 'MongoTimeoutError' ||
        (fetchError.message && fetchError.message.includes('connection'))
      ) {
        logger.warn('MongoDB fetch error, attempting to reconnect and retry:', fetchError);

        const { connectDB } = require('../config/database');
        await connectDB();

        const [rows, totalCount] = await Promise.all([
          buildFindQuery(),
          shouldIncludeTotal ? Shipment.countDocuments(query) : Promise.resolve(null)
        ]);
        shipments = rows;

        if (req.user.role !== 'admin') {
          shipments.forEach((shipment) => {
            delete shipment.costPrice;
            delete shipment.markup;
          });
        }

        logger.info('Shipments fetched successfully after retry');

        return res.status(200).json({
          success: true,
          data: shipments,
          pagination: {
            total: totalCount,
            page: pageValue,
            limit: limitValue,
            pages: totalCount === null ? null : Math.ceil(totalCount / limitValue)
          }
        });
      }

      throw fetchError;
    }
  } catch (error) {
    logger.error('Error fetching shipments:', error);

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
            Track at: ${config.frontendUrl}
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

    // Delegate to Service
    // Note: ShipmentBookingService handles Idempotency, Transaction, and Ledger
    const result = await ShipmentBookingService.bookShipment(trackingNumber, req.user); // Should we pass req.user? Yes, for ledger.

    logger.info(`Shipment ${trackingNumber} booked via Service.`);

    res.status(200).json({
      success: true,
      data: result.shipment,
      message: result.message || 'Shipment booked successfully'
    });

  } catch (error) {
    logger.error('Error submitting to DHL:', error);

    // Differentiate user errors vs system errors if possible
    const status = error.message.includes('not found') ? 404 :
      error.message.includes('already booked') ? 400 :
        error.message.includes('Pricing data invalid') ? 400 : 500;

    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};
