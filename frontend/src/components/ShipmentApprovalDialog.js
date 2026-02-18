import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { financeService, shipmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, AddressPanel, Input, Select, Alert, Loader } from '../ui';

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
    @media(min-width: 768px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const SectionHeader = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 24px 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;

    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-color);
    }
`;

const Row = styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    align-items: center;
`;

const DG_PRESETS = [
    { label: 'Manual Entry', code: '', serviceCode: '', contentId: '', hazardClass: '', properShippingName: '', packingGroup: 'II' },
    { label: 'Perfumes (UN1266) Passenger/Cargo', code: '1266', serviceCode: 'HE', contentId: '910', hazardClass: '3', properShippingName: 'PERFUMERY PRODUCTS', packingGroup: 'II' },
    { label: 'Perfumes (UN1266) Cargo Only', code: '1266', serviceCode: 'HE', contentId: '911', hazardClass: '3', properShippingName: 'PERFUMERY PRODUCTS', packingGroup: 'II' },
    { label: 'Lithium Ion Batteries (UN3481 PI967)', code: '3481', serviceCode: 'HV', contentId: '967', hazardClass: '9', properShippingName: 'LITHIUM ION BATTERIES CONTAINED IN EQUIPMENT', packingGroup: 'II' },
    { label: 'Consumer Commodity (ID8000)', code: '8000', serviceCode: 'HK', contentId: '700', hazardClass: '9', properShippingName: 'CONSUMER COMMODITY', packingGroup: 'II' },
    { label: 'Dry Ice (UN1845)', code: '1845', serviceCode: 'HC', contentId: '901', hazardClass: '9', properShippingName: 'DRY ICE', packingGroup: 'III' }
];

const IndexCircle = styled.div`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
`;

const ShipmentApprovalDialog = ({ open, onClose, shipment, onShipmentUpdated }) => {
    const { user } = useAuth();
    const isClient = user?.role === 'client';

    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [availableCarriers, setAvailableCarriers] = useState([]);
    const [bookingCarrier, setBookingCarrier] = useState('DGR');
    const [selectedDgPreset, setSelectedDgPreset] = useState('Manual Entry');

    useEffect(() => {
        if (shipment) {
            // Deep copy and safe defaults
            const data = JSON.parse(JSON.stringify(shipment));
            if (!data.parcels) data.parcels = [];
            if (!data.items) data.items = [];
            if (!data.incoterm) data.incoterm = 'DAP';
            if (!data.currency) data.currency = 'KWD';
            if (!data.dangerousGoods) data.dangerousGoods = { contains: false };

            setFormData(data);
            setEditMode(isClient); // Auto edit for clients
            setError(null);

            if (!isClient) {
                shipmentService.getAvailableCarriers().then(res => {
                    if (res.success) setAvailableCarriers(res.data);
                }).catch(err => console.error("Carrier Fetch Failed", err));
            }
        }
    }, [shipment, open, isClient]);


    useEffect(() => {
        const loadBookingOptions = async () => {
            if (!open || !shipment || isClient) return;
            setBookingOptionsLoading(true);
            try {
                const response = await shipmentService.getBookingOptions(shipment.trackingNumber, bookingCarrier);
                const optionalServices = response?.data?.optionalServices || [];
                setBookingOptions(optionalServices);
                setSelectedOptionalServiceCodes((prev) => {
                    const allowed = new Set(optionalServices.map((service) => service.serviceCode));
                    return prev.filter((code) => allowed.has(code));
                });
            } catch (err) {
                console.error('Failed to fetch booking options', err);
                setBookingOptions([]);
            } finally {
                setBookingOptionsLoading(false);
            }
        };

        loadBookingOptions();
    }, [open, shipment, bookingCarrier, isClient]);

    const toggleOptionalService = (serviceCode) => {
        setSelectedOptionalServiceCodes((prev) => (
            prev.includes(serviceCode)
                ? prev.filter((code) => code !== serviceCode)
                : [...prev, serviceCode]
        ));
    };

    const handleAddressChange = (type, newData) => {
        setFormData(prev => ({ ...prev, [type]: newData }));
    };

    const handleParcelChange = (index, field, value) => {
        const newParcels = [...formData.parcels];
        newParcels[index] = { ...newParcels[index], [field]: value };
        setFormData(prev => ({ ...prev, parcels: newParcels }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleGlobalChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDGChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev.dangerousGoods };

            if (field === 'contains') {
                next.contains = !!value;
                return { ...prev, dangerousGoods: next };
            }

            if (field === 'serviceCode') {
                next[field] = String(value || '').toUpperCase().slice(0, 2);
                return { ...prev, dangerousGoods: next };
            }

            if (field === 'code' || field === 'contentId') {
                next[field] = String(value || '').replace(/[^0-9]/g, '');
                return { ...prev, dangerousGoods: next };
            }

            next[field] = value;
            return { ...prev, dangerousGoods: next };
        });
    };

    const handleDgPresetChange = (presetLabel) => {
        setSelectedDgPreset(presetLabel);
        const preset = DG_PRESETS.find((p) => p.label === presetLabel);
        if (!preset || preset.label === 'Manual Entry') return;

        setFormData((prev) => ({
            ...prev,
            dangerousGoods: {
                ...prev.dangerousGoods,
                contains: true,
                code: preset.code,
                serviceCode: preset.serviceCode,
                contentId: preset.contentId,
                hazardClass: preset.hazardClass,
                properShippingName: preset.properShippingName,
                packingGroup: preset.packingGroup
            }
        }));
    };

    const validate = () => {
        if (!formData.origin.streetLines?.[0] && !formData.origin.formattedAddress) return "Sender Street Address missing";
        if (!formData.destination.streetLines?.[0] && !formData.destination.formattedAddress) return "Receiver Street Address missing";
        if (!formData.items || formData.items.length === 0) return "No items defined";
        return null;
    };

    const handleConfirmBooking = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!isClient && !window.confirm(`Confirm booking with ${bookingCarrier}?`)) return;

        setLoading(true);
        setError(null);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, {
                origin: formData.origin,
                destination: formData.destination,
                parcels: formData.parcels,
                items: formData.items,
                incoterm: formData.incoterm,
                currency: formData.currency,
                dangerousGoods: formData.dangerousGoods,
                status: (isClient && shipment.status === 'draft') ? 'draft' : 'updated'
            });

            if (!isClient) {
                await shipmentService.submitToDgr(shipment.trackingNumber, bookingCarrier, selectedOptionalServiceCodes);
            }

            onShipmentUpdated();
            // Modal closes via parent callback usually, but here we invoke onClose too just in case
        } catch (err) {
            console.error("Booking Error:", err);
            const msg = err.response?.data?.error || err.message || "Operation Failed";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm("Reject and Cancel shipment?")) return;
        setLoading(true);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, { status: 'cancelled', description: 'Rejected by Staff' });
            onShipmentUpdated();
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const handleFlagReview = async () => {
        const reason = prompt("Enter reason for review:");
        if (!reason) return;
        setLoading(true);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, { status: 'exception', description: `Flagged: ${reason}` });
            onShipmentUpdated();
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const [financeSummary, setFinanceSummary] = useState(null);

    useEffect(() => {
        const loadFinance = async () => {
            if (!shipment) return;
            try {
                if (isClient) {
                    const response = await financeService.getBalance();
                    setFinanceSummary(response.data);
                } else {
                    const orgId = shipment.organization || shipment.user?.organization || 'none';
                    const response = await financeService.getOrganizationOverview(orgId);
                    setFinanceSummary(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch finance summary:', error);
            }
        };

        if (open && shipment) {
            loadFinance();
        }
    }, [shipment, isClient, open]);

    if (!shipment || !formData) return null;

    const totalPrice = parseFloat(formData.price || shipment.price || 0);
    const availableFunds = financeSummary?.availableCredit ?? 0;
    const hasFunds = availableFunds >= totalPrice;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={isClient ? `Edit Shipment #${shipment.trackingNumber}` : `Approve Shipment #${shipment.trackingNumber}`}
            width="1000px"
            footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    {!isClient && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" onClick={handleReject} style={{ color: 'var(--accent-error)' }}>Reject</Button>
                            <Button variant="secondary" onClick={handleFlagReview}>Flag</Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                        {totalPrice > 0 && (
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: hasFunds ? 'var(--text-secondary)' : 'var(--accent-error)' }}>
                                    Bal: {availableFunds.toFixed(3)} KD
                                </div>
                                <div style={{ fontWeight: '700' }}>
                                    Total: {totalPrice.toFixed(3)} KD
                                </div>
                            </div>
                        )}

                        {!isClient && (
                            <>
                                <div style={{ width: '150px' }}>
                                    <Select value={bookingCarrier} onChange={e => setBookingCarrier(e.target.value)}>
                                        {availableCarriers.map(c => <option key={c.code} value={c.code} disabled={!c.active}>{c.name}</option>)}
                                        {availableCarriers.length === 0 && <option value="DGR">Default Carrier</option>}
                                    </Select>
                                </div>
                            </>
                        )}

                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmBooking}
                            disabled={loading || (!isClient && !hasFunds && user?.role === 'client')} // Allow logic: only truly block clients
                        >
                            {loading ? <Loader size="16px" /> : (isClient ? "Save Changes" : (!hasFunds && !isClient ? "⚠ Confirm & Book" : "Confirm & Book"))}
                        </Button>
                    </div>
                </div>
            }
        >
            <div style={{ padding: '0 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <Button variant="secondary" onClick={() => setEditMode(!editMode)}>
                        {editMode ? "Lock Editing" : "Unlock to Edit"}
                    </Button>
                </div>

                {error && <Alert severity="error">{error}</Alert>}

                <TwoCol>
                    <AddressPanel
                        type="sender"
                        titleOverride="SHIPPER (From)"
                        value={formData.origin}
                        onChange={(val) => handleAddressChange('origin', val)}
                        disabled={!editMode}
                    />
                    <AddressPanel
                        type="receiver"
                        titleOverride="RECEIVER (To)"
                        value={formData.destination}
                        onChange={(val) => handleAddressChange('destination', val)}
                        disabled={!editMode}
                    />
                </TwoCol>

                <SectionHeader>Shipment Configuration</SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px' }}>
                    <Select
                        label="Incoterm"
                        value={formData.incoterm}
                        onChange={e => handleGlobalChange('incoterm', e.target.value)}
                        disabled={!editMode}
                    >
                        <option value="DAP">DAP (Delivered at Place)</option>
                        <option value="DDP">DDP (Duty Paid)</option>
                    </Select>
                    <Select
                        label="Currency"
                        value={formData.currency}
                        onChange={e => handleGlobalChange('currency', e.target.value)}
                        disabled={!editMode}
                    >
                        <option value="KWD">KWD</option>
                        <option value="USD">USD</option>
                    </Select>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                        <Button
                            variant={formData.dangerousGoods?.contains ? "primary" : "secondary"}
                            onClick={() => handleDGChange('contains', !formData.dangerousGoods?.contains)}
                            disabled={!editMode}
                            style={formData.dangerousGoods?.contains ? { background: 'var(--accent-error)', borderColor: 'var(--accent-error)' } : {}}
                        >
                            {formData.dangerousGoods?.contains ? "HAZARDOUS" : "Not Hazardous"}
                        </Button>
                        {formData.dangerousGoods?.contains && (
                            <div style={{ flex: 1 }}>
                                <Input
                                    placeholder="UN/ID Code (e.g. 8000, 3481, 1845)"
                                    value={formData.dangerousGoods?.code || ''}
                                    onChange={e => handleDGChange('code', e.target.value)}
                                    disabled={!editMode}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {formData.dangerousGoods?.contains && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                        <Select
                            label="DG Quick Select (Autofill)"
                            value={selectedDgPreset}
                            onChange={e => handleDgPresetChange(e.target.value)}
                            disabled={!editMode}
                        >
                            {DG_PRESETS.map((preset) => (
                                <option key={preset.label} value={preset.label}>{preset.label}</option>
                            ))}
                        </Select>
                        <div></div>
                        <div></div>
                        <Input
                            label="Service Code"
                            placeholder="HK / HV / HE / HC"
                            value={formData.dangerousGoods?.serviceCode || ''}
                            onChange={e => handleDGChange('serviceCode', e.target.value)}
                            disabled={!editMode}
                        />
                        <Input
                            label="Content ID"
                            placeholder="700 / 967 / 910 / 901"
                            value={formData.dangerousGoods?.contentId || ''}
                            onChange={e => handleDGChange('contentId', e.target.value)}
                            disabled={!editMode}
                        />
                        <Input
                            label="Hazard Class"
                            placeholder="3 / 9"
                            value={formData.dangerousGoods?.hazardClass || ''}
                            onChange={e => handleDGChange('hazardClass', e.target.value)}
                            disabled={!editMode}
                        />

                        <Input
                            label="Proper Shipping Name"
                            placeholder="Consumer Commodity / Dry Ice / etc"
                            value={formData.dangerousGoods?.properShippingName || ''}
                            onChange={e => handleDGChange('properShippingName', e.target.value)}
                            disabled={!editMode}
                        />
                        <Select
                            label="Packing Group"
                            value={formData.dangerousGoods?.packingGroup || 'II'}
                            onChange={e => handleDGChange('packingGroup', e.target.value)}
                            disabled={!editMode}
                        >
                            <option value="I">I</option>
                            <option value="II">II</option>
                            <option value="III">III</option>
                        </Select>
                        <Input
                            label="Dry Ice Weight (kg)"
                            type="number"
                            placeholder="Required for 1845"
                            value={formData.dangerousGoods?.dryIceWeight || ''}
                            onChange={e => handleDGChange('dryIceWeight', e.target.value)}
                            disabled={!editMode}
                        />

                        <div style={{ gridColumn: '1 / -1' }}>
                            <Input
                                label="DG Custom Description / Marks"
                                placeholder="Editable carrier description for AWB/value-added service"
                                value={formData.dangerousGoods?.customDescription || ''}
                                onChange={e => handleDGChange('customDescription', e.target.value)}
                                disabled={!editMode}
                            />
                        </div>
                    </div>
                )}

                <SectionHeader>Parcels (Physical)</SectionHeader>
                {formData.parcels.map((parcel, i) => (
                    <Row key={i}>
                        <IndexCircle>{i + 1}</IndexCircle>
                        <div style={{ flex: 2 }}>
                            <Input placeholder="Description" value={parcel.description || ''} onChange={e => handleParcelChange(i, 'description', e.target.value)} disabled={!editMode} />
                        </div>
                        <div style={{ width: '100px' }}>
                            <Input type="number" placeholder="Kg" value={parcel.weight} onChange={e => handleParcelChange(i, 'weight', parseFloat(e.target.value))} disabled={!editMode} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <Input type="number" placeholder="L" value={parcel.dimensions?.length || parcel.length} onChange={e => handleParcelChange(i, 'length', parseFloat(e.target.value))} disabled={!editMode} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <Input type="number" placeholder="W" value={parcel.dimensions?.width || parcel.width} onChange={e => handleParcelChange(i, 'width', parseFloat(e.target.value))} disabled={!editMode} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <Input type="number" placeholder="H" value={parcel.dimensions?.height || parcel.height} onChange={e => handleParcelChange(i, 'height', parseFloat(e.target.value))} disabled={!editMode} />
                        </div>
                    </Row>
                ))}

                <SectionHeader>Items (Customs)</SectionHeader>
                {formData.items.map((item, i) => (
                    <Row key={i}>
                        <IndexCircle>{i + 1}</IndexCircle>
                        <div style={{ flex: 2 }}>
                            <Input placeholder="Item Description" value={item.description} onChange={e => handleItemChange(i, 'description', e.target.value)} disabled={!editMode} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(i, 'quantity', parseInt(e.target.value))} disabled={!editMode} />
                        </div>
                        <div style={{ width: '100px' }}>
                            <Input type="number" placeholder="Value" value={item.declaredValue} onChange={e => handleItemChange(i, 'declaredValue', parseFloat(e.target.value))} disabled={!editMode} />
                        </div>
                        <div style={{ width: '100px' }}>
                            <Input placeholder="HS Code" value={item.hsCode || ''} onChange={e => handleItemChange(i, 'hsCode', e.target.value)} disabled={!editMode} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <Input placeholder="Origin" value={item.countryOfOrigin || 'CN'} onChange={e => handleItemChange(i, 'countryOfOrigin', e.target.value)} disabled={!editMode} />
                        </div>
                    </Row>
                ))}
            </div>
        </Modal>
    );
};

export default ShipmentApprovalDialog;
