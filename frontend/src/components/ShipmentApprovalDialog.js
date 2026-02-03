import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Grid, Typography, Box, Stack, Divider,
    TextField, CircularProgress, Alert, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import ReplayIcon from '@mui/icons-material/Replay';
import InfoIcon from '@mui/icons-material/Info';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import AddressPanel from './AddressPanel';
import { shipmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ShipmentApprovalDialog = ({ open, onClose, shipment, onShipmentUpdated }) => {
    const { user } = useAuth();
    const isClient = user?.role === 'client';

    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (shipment) {
            console.log("📦 Dialog Opened. Shipment Data:", shipment);
            // ... (keep logs)

            // Deep copy and ensure arrays exist
            const data = JSON.parse(JSON.stringify(shipment));
            if (!data.parcels) data.parcels = []; // Fallback empty
            if (!data.items) data.items = [];
            if (!data.incoterm) data.incoterm = 'DAP';
            if (!data.currency) data.currency = 'KWD';
            if (!data.dangerousGoods) data.dangerousGoods = { contains: false };

            setFormData(data);
            // Auto-enable edit mode for clients if they are opening this
            setEditMode(isClient);
            setError(null);
        }
    }, [shipment, open, isClient]);

    const handleAddressChange = (type, newData) => {
        setFormData(prev => ({
            ...prev,
            [type]: newData
        }));
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
        // Basic validation before booking
        if (!formData.origin.streetLines?.[0] && !formData.origin.formattedAddress) return "Sender Address missing";
        if (!formData.destination.streetLines?.[0] && !formData.destination.formattedAddress) return "Receiver Address missing";
        if (!formData.items || formData.items.length === 0) return "No parcels defined";
        return null;
    };

    const handleConfirmBooking = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!isClient && !window.confirm("Are you sure you want to book this shipment with DHL? This action cannot be undone.")) return;

        setLoading(true);
        setError(null);
        try {
            // 1. Update details
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, {
                origin: formData.origin,
                destination: formData.destination,
                parcels: formData.parcels,
                items: formData.items,
                incoterm: formData.incoterm,
                currency: formData.currency,
                dangerousGoods: formData.dangerousGoods,
                // If client edits a draft, keep it draft unless they explicitly submit.
                // If they edit a pending/exception/ready/updated shipment, mark as 'updated' for staff review.
                status: (isClient && shipment.status === 'draft') ? 'draft' : 'updated'
            });

            // 2. Book with DHL (ONLY IF NOT CLIENT)
            if (!isClient) {
                await shipmentService.submitToDhl(shipment.trackingNumber);
            }

            onShipmentUpdated();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Operation Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        const reason = prompt("Please enter reason for requesting changes:");
        if (!reason) return;

        setLoading(true);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, {
                status: 'draft',
                description: `Changes Requested: ${reason}`
            });
            onShipmentUpdated();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFlagReview = async () => {
        const reason = prompt("Enter note for the client (Flags as 'Exception/Review'):");
        if (!reason) return;

        setLoading(true);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, {
                status: 'exception',
                description: `Flagged for Review: ${reason}`
            });
            onShipmentUpdated();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm("Are you sure you want to REJECT and CANCEL this shipment?")) return;

        setLoading(true);
        try {
            await shipmentService.updateShipmentDetails(shipment.trackingNumber, {
                status: 'cancelled',
                description: 'Shipment Rejected by Staff'
            });
            onShipmentUpdated();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!shipment || !formData) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6">{isClient ? "Edit Shipment Details" : `Approve Shipment: ${shipment.trackingNumber}`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {isClient ? "Update your shipment details before processing." : "Review details before Carrier Booking"}
                    </Typography>
                </Box>
                <Box>
                    <Button
                        startIcon={editMode ? <CloseIcon /> : <EditIcon />}
                        onClick={() => setEditMode(!editMode)}
                        sx={{ mr: 2 }}
                    >
                        {editMode ? "Stop Editing" : "Edit Details"}
                    </Button>
                    <IconButton onClick={onClose}><CloseIcon /></IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {/* Status/History Note Display */}
                {isClient && shipment.history?.length > 0 && (
                    ['exception', 'draft', 'pending', 'updated'].includes(shipment.status)
                ) && (
                        <Alert severity={shipment.status === 'exception' ? 'error' : 'info'} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {shipment.status === 'exception' ? 'Attention Needed:' : 'Latest Activity:'}
                            </Typography>
                            <Typography variant="body2">
                                {shipment.history[shipment.history.length - 1].description}
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(shipment.history[shipment.history.length - 1].timestamp).toLocaleString()}
                                </Typography>
                            </Typography>
                        </Alert>
                    )}

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Grid container spacing={3}>
                    {/* ... (Address Panels - same) */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom color="primary">SHIPPER</Typography>
                        <AddressPanel
                            type="sender"
                            value={formData.origin}
                            onChange={(val) => handleAddressChange('origin', val)}
                            readOnly={!editMode}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom color="primary">RECEIVER</Typography>
                        <AddressPanel
                            type="receiver"
                            value={formData.destination}
                            onChange={(val) => handleAddressChange('destination', val)}
                            readOnly={!editMode}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }}>SHIPMENT CONFIGURATION</Divider>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <TextField
                                    select
                                    label="Incoterm"
                                    fullWidth size="small"
                                    value={formData.incoterm || 'DAP'}
                                    onChange={(e) => handleGlobalChange('incoterm', e.target.value)}
                                    disabled={!editMode}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="DAP">DAP (Delivered at Place)</option>
                                    <option value="DDP">DDP (Duty Paid)</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <TextField
                                    select
                                    label="Currency"
                                    fullWidth size="small"
                                    value={formData.currency || 'KWD'}
                                    onChange={(e) => handleGlobalChange('currency', e.target.value)}
                                    disabled={!editMode}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="KWD">KWD (KD)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} md={6} display="flex" gap={2} alignItems="center">
                                <Typography variant="body2">Dangerous Goods:</Typography>
                                <Button
                                    variant={formData.dangerousGoods?.contains ? "contained" : "outlined"}
                                    color={formData.dangerousGoods?.contains ? "error" : "inherit"}
                                    size="small"
                                    onClick={() => handleDGChange('contains', !formData.dangerousGoods?.contains)}
                                    disabled={!editMode}
                                >
                                    {formData.dangerousGoods?.contains ? "YES (Hazardous)" : "NO"}
                                </Button>
                                {formData.dangerousGoods?.contains && (
                                    <TextField
                                        label="UN Code" size="small"
                                        value={formData.dangerousGoods?.code || ''}
                                        onChange={(e) => handleDGChange('code', e.target.value)}
                                        disabled={!editMode}
                                    />
                                )}
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }}>PARCELS (Physical)</Divider>
                        {formData.parcels.map((parcel, i) => (
                            <Box key={i} display="flex" gap={2} mb={1} alignItems="center">
                                <Typography variant="body2" sx={{ width: 30 }}>#{i + 1}</Typography>
                                <TextField
                                    label="Desc" size="small" fullWidth
                                    value={parcel.description || ''}
                                    onChange={(e) => handleParcelChange(i, 'description', e.target.value)}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="Weight (kg)" size="small" sx={{ width: 100 }}
                                    type="number"
                                    value={parcel.weight}
                                    onChange={(e) => handleParcelChange(i, 'weight', parseFloat(e.target.value))}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="L" size="small" sx={{ width: 70 }} type="number"
                                    value={parcel.dimensions?.length || parcel.length}
                                    onChange={(e) => handleParcelChange(i, 'length', parseFloat(e.target.value))}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="W" size="small" sx={{ width: 70 }} type="number"
                                    value={parcel.dimensions?.width || parcel.width}
                                    onChange={(e) => handleParcelChange(i, 'width', parseFloat(e.target.value))}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="H" size="small" sx={{ width: 70 }} type="number"
                                    value={parcel.dimensions?.height || parcel.height}
                                    onChange={(e) => handleParcelChange(i, 'height', parseFloat(e.target.value))}
                                    disabled={!editMode}
                                />
                            </Box>
                        ))}
                        {/* Optional: Add Button logic could go here, omitting for brevity */}
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }}>ITEMS (Customs)</Divider>
                        {formData.items.map((item, i) => (
                            <Box key={i} display="flex" gap={2} mb={1} alignItems="center">
                                <Typography variant="body2" sx={{ width: 30 }}>#{i + 1}</Typography>
                                <TextField
                                    label="Description" size="small" fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="Qty" size="small" sx={{ width: 80 }}
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(i, 'quantity', parseInt(e.target.value))}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="Value" size="small" sx={{ width: 100 }}
                                    type="number"
                                    value={item.declaredValue}
                                    onChange={(e) => handleItemChange(i, 'declaredValue', parseFloat(e.target.value))}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="HS Code" size="small" sx={{ width: 100 }}
                                    value={item.hsCode || ''}
                                    onChange={(e) => handleItemChange(i, 'hsCode', e.target.value)}
                                    disabled={!editMode}
                                />
                                <TextField
                                    label="Origin" size="small" sx={{ width: 70 }}
                                    value={item.countryOfOrigin || 'CN'}
                                    onChange={(e) => handleItemChange(i, 'countryOfOrigin', e.target.value)}
                                    disabled={!editMode}
                                />
                            </Box>
                        ))}
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1}>
                    {!isClient && (
                        <>
                            <Button
                                color="error"
                                startIcon={<BlockIcon />}
                                onClick={handleReject}
                                disabled={loading}
                            >
                                Reject
                            </Button>
                            <Button
                                color="warning"
                                startIcon={<ReplayIcon />}
                                onClick={handleRequestChanges}
                                disabled={loading}
                            >
                                Request Changes
                            </Button>
                            <Button
                                color="info"
                                startIcon={<InfoIcon />}
                                onClick={handleFlagReview}
                                disabled={loading}
                            >
                                Flag for Review
                            </Button>
                        </>
                    )}
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                    {(shipment.price || (user && isClient)) && (
                        <Box sx={{ mr: 2, textAlign: 'right' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                <AccountBalanceWalletIcon fontSize="small" color={((isClient ? user?.balance : shipment.user?.balance) + (isClient ? user?.creditLimit : shipment.user?.creditLimit)) < (formData.price || shipment.price) ? "error" : "success"} />
                                <Typography variant="caption" fontWeight="bold" color={((isClient ? user?.balance : shipment.user?.balance) + (isClient ? user?.creditLimit : shipment.user?.creditLimit)) < (formData.price || shipment.price) ? "error.main" : "success.main"}>
                                    {isClient ? "Your Balance: " : `${shipment.user?.name || 'User'}'s Balance: `}
                                    {((isClient ? user?.balance : shipment.user?.balance) || 0).toFixed(3)} KD
                                </Typography>
                            </Box>
                            <Typography variant="h6" fontWeight="bold">
                                Total: {parseFloat(formData.price || shipment.price || 0).toFixed(3)} KD
                            </Typography>
                        </Box>
                    )}
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={isClient ? "primary" : "success"}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (isClient ? <EditIcon /> : <VerifiedIcon />)}
                        onClick={handleConfirmBooking}
                        disabled={loading || (!isClient && ((shipment.user?.balance || 0) + (shipment.user?.creditLimit || 0)) < (formData.price || shipment.price))}
                    >
                        {isClient ? "Save Changes" : (editMode ? "Save & Book DHL" : "Confirm & Book DHL")}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default ShipmentApprovalDialog;
