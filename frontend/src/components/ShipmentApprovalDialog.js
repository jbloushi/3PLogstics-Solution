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
        setFormData(prev => ({
            ...prev,
            dangerousGoods: { ...prev.dangerousGoods, [field]: value }
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
                await shipmentService.submitToDgr(shipment.trackingNumber, bookingCarrier);
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
                    const orgId = shipment.organization || shipment.user?.organization;
                    if (!orgId) return;
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
                            <div style={{ width: '150px' }}>
                                <Select value={bookingCarrier} onChange={e => setBookingCarrier(e.target.value)}>
                                    {availableCarriers.map(c => <option key={c.code} value={c.code} disabled={!c.active}>{c.name}</option>)}
                                    {availableCarriers.length === 0 && <option value="DGR">Default Carrier</option>}
                                </Select>
                            </div>
                        )}

                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmBooking}
                            disabled={loading || (!isClient && !hasFunds)}
                        >
                            {loading ? <Loader size="16px" /> : (isClient ? "Save Changes" : "Confirm & Book")}
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
                                    placeholder="UN Code"
                                    value={formData.dangerousGoods?.code || ''}
                                    onChange={e => handleDGChange('code', e.target.value)}
                                    disabled={!editMode}
                                />
                            </div>
                        )}
                    </div>
                </div>

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
