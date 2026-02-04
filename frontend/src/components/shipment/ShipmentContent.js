import React, { useState } from 'react';
import {
    Box, Typography, Button, Grid, Paper, FormControl,
    InputLabel, Select, MenuItem, Divider, IconButton,
    Tooltip, Alert, TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ParcelCard from './ParcelCard';
import DangerousGoodsPanel from './DangerousGoodsPanel';

const ShipmentContent = ({
    parcels, setParcels,
    items, setItems,
    dangerousGoods, setDangerousGoods,
    packagingType, setPackagingType,
    shipmentType,
    errors
}) => {
    const [expandedParcel, setExpandedParcel] = useState(0);

    const updateParcel = (index, field, val) => {
        const newParcels = [...parcels];
        newParcels[index][field] = val;
        setParcels(newParcels);
    };

    const removeParcel = (index) => {
        if (parcels.length > 1) {
            setParcels(parcels.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, val) => {
        const newItems = [...items];
        newItems[index][field] = val;
        setItems(newItems);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    return (
        <Box>
            {/* Dangerous Goods Section (Conditional Panel) */}
            <DangerousGoodsPanel
                dangerousGoods={dangerousGoods}
                setDangerousGoods={setDangerousGoods}
            />

            <Paper sx={{ p: 3, mb: 3, mt: 2 }} variant="outlined">
                <Typography variant="h6" fontWeight="bold" gutterBottom>1. Physical Packages</Typography>

                <Box mb={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Packaging Type</InputLabel>
                        <Select
                            value={packagingType || 'user'}
                            label="Packaging Type"
                            onChange={(e) => setPackagingType(e.target.value)}
                        >
                            <MenuItem value="user">My Own Packaging</MenuItem>
                            <MenuItem value="CP">Custom Packaging</MenuItem>
                            <MenuItem value="EE">DGR Express Envelope</MenuItem>
                            <MenuItem value="OD">Other DGR Packaging</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Grid container spacing={2}>
                    {parcels.map((parcel, index) => (
                        <Grid item xs={12} key={index}>
                            <ParcelCard
                                parcel={parcel}
                                index={index}
                                expanded={expandedParcel === index}
                                onToggle={() => setExpandedParcel(expandedParcel === index ? -1 : index)}
                                onChange={(field, val) => updateParcel(index, field, val)}
                                onRemove={() => removeParcel(index)}
                                errors={errors}
                            />
                        </Grid>
                    ))}
                </Grid>

                <Button
                    startIcon={<AddIcon />}
                    onClick={() => setParcels([...parcels, { description: '', weight: '', length: '', width: '', height: '', quantity: 1, declaredValue: '' }])}
                    sx={{ mt: 2 }}
                >
                    Add Another Package
                </Button>
            </Paper>

            {/* Customs Items Section */}
            {shipmentType !== 'documents' && (
                <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
                    <Typography variant="h6" fontWeight="bold" gutterBottom>2. Customs Declaration (Items)</Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        List the internal contents of your packages for Customs. The total value must match your commercial invoice.
                    </Alert>

                    {items.map((item, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', bgcolor: 'background.paper', color: 'text.primary' }}>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography fontWeight="bold" color="primary">Item {index + 1}</Typography>
                                <IconButton size="small" onClick={() => removeItem(index)}><DeleteIcon /></IconButton>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth label="Description" value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        error={!!errors[`item${index}desc`]}
                                    />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <TextField
                                        fullWidth type="number" label="Quantity" value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                        error={!!errors[`item${index}qty`]}
                                    />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <TextField
                                        fullWidth type="number" label="Unit Value" value={item.declaredValue}
                                        onChange={(e) => updateItem(index, 'declaredValue', e.target.value)}
                                        error={!!errors[`item${index}val`]}
                                    />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <TextField
                                        select fullWidth label="Curr" value={item.currency || 'KWD'}
                                        onChange={(e) => updateItem(index, 'currency', e.target.value)}
                                    >
                                        <MenuItem value="KWD">KWD</MenuItem>
                                        <MenuItem value="USD">USD</MenuItem>
                                        <MenuItem value="EUR">EUR</MenuItem>
                                        <MenuItem value="SAR">SAR</MenuItem>
                                        <MenuItem value="AED">AED</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        fullWidth type="number" label="Net Weight (kg)" value={item.weight}
                                        onChange={(e) => updateItem(index, 'weight', e.target.value)}
                                        error={!!errors[`item${index}wgt`]}
                                        InputProps={{ endAdornment: <Box ml={1} color="text.secondary">kg</Box> }}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        fullWidth label="HS Code" value={item.hsCode}
                                        onChange={(e) => updateItem(index, 'hsCode', e.target.value)}
                                        error={!!errors[`item${index}hs`]}
                                        placeholder="e.g. 3303.00.00"
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        fullWidth label="Origin" value={item.countryOfOrigin}
                                        onChange={(e) => updateItem(index, 'countryOfOrigin', e.target.value)}
                                        placeholder="KW"
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}

                    <Button startIcon={<AddIcon />} onClick={() => setItems([...items, { description: '', quantity: 1, declaredValue: '', currency: 'KWD', weight: '', hsCode: '', countryOfOrigin: '' }])}>
                        Add Another Item
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default ShipmentContent;
