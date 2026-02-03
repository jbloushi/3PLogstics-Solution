import React from 'react';
import {
    Box, Typography, Grid, Paper, FormControl,
    InputLabel, Select, MenuItem, TextField, FormControlLabel,
    Switch, Divider, Alert
} from '@mui/material';

const ShipmentBilling = ({
    exportReason, setExportReason,
    invoiceRemarks, setInvoiceRemarks,
    incoterm, setIncoterm,
    gstPaid, setGstPaid,
    payerOfVat, setPayerOfVat,
    shipperAccount, setShipperAccount, // New Field
    labelFormat, setLabelFormat, // New Field
    signatureName, setSignatureName, // New Field
    signatureTitle, setSignatureTitle, // New Field
    palletCount, setPalletCount,
    packageMarks, setPackageMarks,
    errors
}) => {
    return (
        <Box>
            {/* 1. Commercial Invoice Data */}
            <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
                <Typography variant="h6" fontWeight="bold" gutterBottom>1. Commercial Invoice Details</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Reason for Export</InputLabel>
                            <Select
                                value={exportReason}
                                label="Reason for Export"
                                onChange={(e) => setExportReason(e.target.value)}
                            >
                                <MenuItem value="sale">Sale</MenuItem>
                                <MenuItem value="gift">Gift</MenuItem>
                                <MenuItem value="sample">Sample</MenuItem>
                                <MenuItem value="return">Return</MenuItem>
                                <MenuItem value="repair">Repair</MenuItem>
                                <MenuItem value="personal">Personal Effects</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth size="small"
                            label="Invoice Remarks"
                            value={invoiceRemarks}
                            onChange={(e) => setInvoiceRemarks(e.target.value)}
                            placeholder="Visible on Commercial Invoice"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth size="small"
                            label="Signature Name"
                            value={signatureName}
                            onChange={(e) => setSignatureName(e.target.value)}
                            placeholder="Name for Invoice Signature"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth size="small"
                            label="Signature Title"
                            value={signatureTitle}
                            onChange={(e) => setSignatureTitle(e.target.value)}
                            placeholder="e.g. Logistics Manager"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* 2. Duties, Taxes & Billing */}
            <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
                <Typography variant="h6" fontWeight="bold" gutterBottom>2. Duties, Taxes & Billing</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Incoterm (Who pays duties?)</InputLabel>
                            <Select
                                value={incoterm}
                                label="Incoterm (Who pays duties?)"
                                onChange={(e) => setIncoterm(e.target.value)}
                            >
                                <MenuItem value="DAP">DAP (Receiver pays duties)</MenuItem>
                                <MenuItem value="DDP">DDP (Shipper pays duties)</MenuItem>
                                <MenuItem value="EXW">EXW (Ex Works)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Payer of VAT/GST</InputLabel>
                            <Select
                                value={payerOfVat}
                                label="Payer of VAT/GST"
                                onChange={(e) => setPayerOfVat(e.target.value)}
                            >
                                <MenuItem value="receiver">Receiver</MenuItem>
                                <MenuItem value="shipper">Shipper</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth size="small"
                            label="Shipper Account Number (Optional)"
                            value={shipperAccount}
                            onChange={(e) => setShipperAccount(e.target.value)}
                            placeholder="Overwrite default account if needed"
                            helperText="Leave blank to use system default"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} display="flex" alignItems="center">
                        <FormControlLabel
                            control={<Switch checked={gstPaid} onChange={(e) => setGstPaid(e.target.checked)} />}
                            label="GST/VAT already paid?"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* 3. Output Configuration */}
            <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
                <Typography variant="h6" fontWeight="bold" gutterBottom>3. Output & Operations</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Label Format</InputLabel>
                            <Select
                                value={labelFormat}
                                label="Label Format"
                                onChange={(e) => setLabelFormat(e.target.value)}
                            >
                                <MenuItem value="pdf">PDF (Common)</MenuItem>
                                <MenuItem value="zpl">ZPL (Thermal Printers)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth size="small" type="number" label="Pallet Count"
                            value={palletCount} onChange={(e) => setPalletCount(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth size="small" label="Package Marks"
                            value={packageMarks} onChange={(e) => setPackageMarks(e.target.value)}
                            placeholder="e.g. Fragile / Up"
                        />
                    </Grid>
                </Grid>
            </Paper>

            <Alert severity="info">
                Please verify all billing details. Incorrect Incoterms may result in refused shipments or unexpected charges for the receiver.
            </Alert>
        </Box>
    );
};

export default ShipmentBilling;
