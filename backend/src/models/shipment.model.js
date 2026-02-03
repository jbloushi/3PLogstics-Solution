const mongoose = require('mongoose');

const addressSchema = require('./addressSchema');

const checkpointSchema = new mongoose.Schema({
  location: {
    type: addressSchema,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  estimatedArrival: {
    type: Date
  },
  reached: {
    type: Boolean,
    default: false
  },
  notes: String
});

const shipmentSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  origin: {
    type: addressSchema,
    required: true
  },
  destination: {
    type: addressSchema,
    required: true
  },
  checkpoints: [checkpointSchema],
  currentLocation: {
    type: addressSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'updated', 'created', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'],
    default: 'ready_for_pickup',
    required: true
  },
  estimatedDelivery: {
    type: Date,
    required: true
  },
  history: [{
    location: addressSchema,
    status: {
      type: String,
      required: true
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  customer: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: String,
    // Tax fields for Invoice
    vatNo: String,
    eori: String,
    taxId: String,
    traderType: { type: String, default: 'business' } // business or private
  },
  remarks: String, // Invoice Remarks
  reference: String, // Shipment Reference
  // Physical Parcels (Boxes)
  parcels: [{
    weight: { type: Number, required: true },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    description: String,
    trackingReference: String
  }],
  // Customs Line Items (Content)
  items: [{
    description: String,
    quantity: {
      type: Number,
      min: 1,
      default: 1
    },
    weight: Number, // Net weight per item
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    declaredValue: {
      type: Number,
      default: 0
    },
    hsCode: String,
    sku: String,
    countryOfOrigin: String
  }],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Shipment must belong to a user']
  },
  organization: {
    type: mongoose.Schema.ObjectId,
    ref: 'Organization',
    index: true
  },
  labelUrl: String,
  awbUrl: String,
  invoiceUrl: String,
  dhlTrackingNumber: String,
  // Link back to the Pickup Request
  pickupRequest: {
    type: mongoose.Schema.ObjectId,
    ref: 'PickupRequest'
  },
  carrierCreatedAt: {
    type: Date
  },
  dhlConfirmed: {
    type: Boolean,
    default: false
  },
  dhlTrackingNumber: String, // Keep existing field

  price: Number,
  costPrice: Number, // Original DHL price before markup
  markup: {
    type: Number,
    default: 0 // Percentage markup applied
  },
  currency: {
    type: String,
    default: 'KWD'
  },
  incoterm: {
    type: String,
    enum: ['DAP', 'DDP'],
    default: 'DAP'
  },
  exportReason: {
    type: String,
    default: 'Sale'
  },
  shipmentType: {
    type: String,
    enum: ['documents', 'package'],
    default: 'package'
  },
  packagingType: {
    type: String, // 'user', 'dhl_box', etc.
    default: 'user'
  },
  serviceCode: { type: String, default: 'P' }, // Carrier service code selected (e.g. 'P' for Express Worldwide)
  plannedDate: Date, // Scheduled date for shipping
  dangerousGoods: {
    contains: { type: Boolean, default: false },
    code: String, // UN Code
    description: String,
    hazardClass: String, // e.g. "3"
    packingGroup: String, // e.g. "II"
    properShippingName: String, // e.g. "Paint"
    declaration: String,
    serviceCode: String, // DHL Service Code (e.g. HC, HV)
    contentId: String, // DHL Content ID (e.g. 901, 967)
    customDescription: String, // Detailed description for payload
    dryIceWeight: Number // Net weight for UN1845
  },
  // Public tracking settings
  allowPublicLocationUpdate: {
    type: Boolean,
    default: false // When true, receivers can update destination via public link
  },
  allowPublicInfoUpdate: {
    type: Boolean,
    default: false // When true, receivers can update delivery notes/instructions
  },
  // Invoice & Custom Fields (DHL)
  gstPaid: { type: Boolean, default: false },
  payerOfVat: { type: String, enum: ['shipper', 'receiver'], default: 'receiver' },
  palletCount: { type: Number, default: 0 },
  packageMarks: String,
  receiverReference: String,
  shipperAccount: String, // Optional override
  labelSettings: {
    format: { type: String, enum: ['pdf', 'zpl'], default: 'pdf' },
    signatureName: String,
    signatureTitle: String
  },
  paid: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
  if (!point1 || !point2) return 0;
  // Placeholder - implementation in controller
  return 0;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

const Shipment = mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
