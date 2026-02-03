import React from 'react';
import {
    Grid, Paper, Typography, TextField, FormControl,
    InputLabel, Select, MenuItem, FormControlLabel,
    Switch, Box
} from '@mui/material';
import AddressPanel from '../AddressPanel';

const ShipmentSetup = ({
    sender, setSender,
    receiver, setReceiver,
    shipmentType, setShipmentType,
    plannedDate, setPlannedDate,
    pickupRequired, setPickupRequired,
    errors,
    isStaff, clients, selectedClient, onClientChange
}) => {
    return (
        <Grid container spacing={3}>
            {/* Top Bar: Service Configuration */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 1, border: '1px solid #e0e0e0', bgcolor: 'background.paper' }}>
                    <Grid container spacing={3} alignItems="center">
                        {/* Staff Client Selector */}
                        {isStaff && (
                            <Grid item xs={12}>
                                <FormControl fullWidth size="small" sx={{ bgcolor: '#e8f5e9' }}>
                                    <InputLabel>Create Shipment For (Client)</InputLabel>
                                    <Select
                                        value={selectedClient}
                                        label="Create Shipment For (Client)"
                                        onChange={(e) => onClientChange(e.target.value)}
                                    >
                                        <MenuItem value="">
                                            <em>Myself (Staff/Admin)</em>
                                        </MenuItem>
                                        {clients && clients.map((client) => (
                                            <MenuItem key={client._id} value={client._id}>
                                                {client.name} {client.organization ? `(${client.organization.name})` : ''} - {client.email}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Shipment Type</InputLabel>
                                <Select
                                    value={shipmentType}
                                    label="Shipment Type"
                                    onChange={(e) => setShipmentType(e.target.value)}
                                >
                                    <MenuItem value="package">Package (Dutiable)</MenuItem>
                                    <MenuItem value="documents">Documents (Non-Dutiable)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Planned Ship Date"
                                type="date"
                                size="small"
                                value={plannedDate}
                                onChange={(e) => setPlannedDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={pickupRequired}
                                        onChange={(e) => setPickupRequired(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">Pickup Required?</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {pickupRequired ? 'Driver will collect' : 'I will drop off'}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>

            {/* Left Column: Sender (Shipper) */}
            <Grid item xs={12} md={6}>
                <Box height="100%">
                    <AddressPanel
                        type="sender"
                        value={sender}
                        onChange={setSender}
                        errors={errors}
                        onCopy={() => setReceiver({ ...sender })}
                        title="Shipper (From)"
                        isStaff={isStaff}
                    />
                </Box>
            </Grid>

            {/* Right Column: Receiver (Consignee) */}
            <Grid item xs={12} md={6}>
                <Box height="100%">
                    <AddressPanel
                        type="receiver"
                        value={receiver}
                        onChange={setReceiver}
                        errors={errors}
                        title="Receiver (To)"
                        isStaff={isStaff}
                    />
                </Box>
            </Grid>
        </Grid>
    );
};

export default ShipmentSetup;
