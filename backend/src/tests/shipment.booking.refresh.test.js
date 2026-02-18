const ShipmentBookingService = require('../services/ShipmentBookingService');
const Shipment = require('../models/shipment.model');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const CarrierFactory = require('../services/CarrierFactory');
const financeLedgerService = require('../services/financeLedger.service');

jest.mock('../models/shipment.model');
jest.mock('../models/user.model');
jest.mock('../models/organization.model');
jest.mock('../services/CarrierFactory');
jest.mock('../services/financeLedger.service');
jest.mock('../services/CarrierDocumentService', () => ({
  uploadDocument: jest.fn()
}));

describe('ShipmentBookingService booking flow hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('refreshes expired/missing pricing snapshot and books successfully', async () => {
    const bookingAttempts = [];
    const shipment = {
      _id: 'shipment-1',
      trackingNumber: 'TRK-123',
      user: 'user-1',
      organization: 'org-1',
      carrierCode: 'DGR',
      serviceCode: 'P',
      origin: { countryCode: 'KW' },
      destination: { countryCode: 'SA' },
      pricingSnapshot: null,
      bookingAttempts,
      documents: [],
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: 'shipment-1',
        user: 'user-1',
        origin: { countryCode: 'KW' },
        destination: { countryCode: 'SA' },
        serviceCode: 'P'
      })
    };

    const freshShipment = {
      _id: 'shipment-1',
      bookingAttempts,
      documents: [],
      pricingSnapshot: { totalPrice: 11.5 },
      trackingNumber: 'TRK-123',
      save: jest.fn().mockResolvedValue(true)
    };

    Shipment.findOne.mockResolvedValue(shipment);
    Shipment.findById.mockResolvedValue(freshShipment);
    Shipment.updateOne.mockResolvedValue({});

    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'user-1',
        organization: { _id: 'org-1' },
        markup: { type: 'PERCENTAGE', percentageValue: 15, flatValue: 0 }
      })
    });

    Organization.findById.mockResolvedValue({
      _id: 'org-1',
      creditLimit: 100,
      allowedCarriers: ['DGR'],
      markup: { type: 'PERCENTAGE', percentageValue: 10, flatValue: 0 }
    });

    financeLedgerService.getOrganizationBalance.mockResolvedValue(0);
    financeLedgerService.createLedgerEntry.mockResolvedValue({ _id: 'led-1' });

    const createShipment = jest.fn().mockResolvedValue({ trackingNumber: 'DGR123' });
    const getRates = jest.fn().mockResolvedValue([
      { serviceCode: 'P', totalPrice: 10, currency: 'KWD', optionalServices: [] }
    ]);

    CarrierFactory.getAvailableCarriers.mockReturnValue([{ code: 'DGR' }]);
    CarrierFactory.getAdapter.mockReturnValue({ createShipment, getRates });

    const result = await ShipmentBookingService.bookShipment('TRK-123', 'DGR');

    expect(getRates).toHaveBeenCalled();
    expect(createShipment).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(shipment.pricingSnapshot).toBeTruthy();
  });

  test('rejects disallowed carrier with 403', async () => {
    const shipment = {
      _id: 'shipment-2',
      trackingNumber: 'TRK-999',
      user: 'user-2',
      organization: 'org-2',
      carrierCode: 'DGR',
      serviceCode: 'P',
      pricingSnapshot: { expiresAt: new Date(Date.now() + 100000), totalPrice: 10 },
      bookingAttempts: [],
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({ user: 'user-2', origin: {}, destination: {} })
    };

    Shipment.findOne.mockResolvedValue(shipment);

    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'user-2', organization: { _id: 'org-2' } })
    });

    Organization.findById.mockResolvedValue({
      _id: 'org-2',
      creditLimit: 100,
      allowedCarriers: ['FEDEX']
    });

    CarrierFactory.getAvailableCarriers.mockReturnValue([{ code: 'DGR' }, { code: 'FEDEX' }]);

    await expect(ShipmentBookingService.bookShipment('TRK-999', 'DGR')).rejects.toMatchObject({
      statusCode: 403
    });
  });
});
