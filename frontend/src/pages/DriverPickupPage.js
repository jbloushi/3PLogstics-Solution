import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Container, Card, CardContent, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Divider, Chip } from '@mui/material';
import QrScanner from 'react-qr-scanner';
import { shipmentService } from '../services/api';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../components/common/PageHeader';

const DriverPickupPage = () => {
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)
    const [isScanning, setIsScanning] = useState(true);
    const [readyShipments, setReadyShipments] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReadyShipments = async () => {
        setRefreshing(true);
        try {
            const response = await shipmentService.getAllShipments({ status: 'ready_for_pickup' });
            if (response.success && Array.isArray(response.data)) {
                setReadyShipments(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch ready shipments', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReadyShipments();
    }, []);

    const handleScan = async (data) => {
        if (data && isScanning) {
            setIsScanning(false);
            try {
                const text = data.text || data;
                let trackingNumber = text;
                try {
                    const json = JSON.parse(text);
                    if (json.tracking) trackingNumber = json.tracking;
                } catch (e) {
                    // Not JSON
                }
                console.log('Scanned:', trackingNumber);
                await processPickup(trackingNumber);
            } catch (err) {
                console.error('Scan Error', err);
                setError('Invalid QR Code format');
                setScanResult(null);
                setTimeout(() => setIsScanning(true), 2000);
            }
        }
    };

    const handleError = (err) => {
        console.error(err);
        setError('Camera access error or Permission denied.');
    };

    const processPickup = async (trackingNumber) => {
        setLoading(true);
        setError('');
        setSuccessMsg('');
        setScanResult(trackingNumber);

        try {
            const response = await shipmentService.driverPickupScan(trackingNumber);
            if (response.success) {
                setSuccessMsg(`Shipment ${trackingNumber} Picked Up Successfully!`);
                fetchReadyShipments(); // Refresh list
            } else {
                setError(response.error || 'Failed to update shipment');
            }
        } catch (err) {
            console.error('Pickup Error:', err);
            if (err.response && err.response.status === 404) {
                setError(`Shipment not found: ${trackingNumber}. Ensure it's a valid label.`);
            } else {
                setError(err.message || 'Network or Server Error');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setError('');
        setSuccessMsg('');
        setIsScanning(true);
    };

    const toggleCamera = () => {
        setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <PageHeader
                title="Driver Pickup"
                description="Scan shipment labels to confirm pickup and update status."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Driver Tools', href: '#' },
                    { label: 'Scanner', href: '/driver/pickup' }
                ]}
            />

            <Card sx={{ textAlign: 'center', borderRadius: 4, overflow: 'visible', maxWidth: 600, mx: 'auto', mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
                    )}

                    {successMsg ? (
                        <Box sx={{ py: 8 }}>
                            <Box sx={{
                                position: 'relative',
                                display: 'inline-flex',
                                mb: 3
                            }}>
                                <Box sx={{
                                    position: 'absolute',
                                    inset: -20,
                                    borderRadius: '50%',
                                    bgcolor: (theme) => theme.palette.success.main,
                                    opacity: 0.2,
                                    animation: 'pulse 2s infinite'
                                }} />
                                <TaskAltIcon color="success" sx={{ fontSize: 80 }} />
                            </Box>

                            <Typography variant="h5" color="success.main" gutterBottom fontWeight="800">
                                Pickup Confirmed
                            </Typography>
                            <Typography variant="body1" color="text.secondary" paragraph>
                                {successMsg}
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={resetScanner}
                                sx={{ mt: 2, borderRadius: 50, px: 6 }}
                                autoFocus
                            >
                                Scan Next
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            {/* Scanner Viewport */}
                            <Box sx={{
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: 3,
                                bgcolor: '#000',
                                height: 350,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                                mb: 3
                            }}>
                                {loading && (
                                    <Box sx={{ position: 'absolute', zIndex: 10, bgcolor: 'rgba(0,0,0,0.7)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <CircularProgress color="primary" />
                                        <Typography sx={{ mt: 2, color: 'white', fontWeight: 600 }}>Processing...</Typography>
                                    </Box>
                                )}

                                {isScanning ? (
                                    <QrScanner
                                        delay={300}
                                        onError={handleError}
                                        onScan={handleScan}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        constraints={{
                                            video: { facingMode: cameraFacingMode }
                                        }}
                                    />
                                ) : (
                                    <Typography color="white">Paused</Typography>
                                )}

                                {/* Overlay Elements */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    border: '50px solid rgba(0,0,0,0.6)',
                                    pointerEvents: 'none'
                                }} />
                                <Box sx={{
                                    position: 'absolute',
                                    width: '70%',
                                    height: 250,
                                    border: '2px solid rgba(255, 255, 255, 0.5)',
                                    borderRadius: 2,
                                    boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                                    pointerEvents: 'none'
                                }} />
                                <Box sx={{
                                    position: 'absolute',
                                    width: '80%',
                                    height: '2px',
                                    bgcolor: 'error.main',
                                    top: '50%',
                                    boxShadow: '0 0 8px red',
                                    animation: 'scan 2s infinite ease-in-out'
                                }} />
                                <style>
                                    {`
                                    @keyframes scan {
                                        0% { top: 20%; opacity: 0; }
                                        50% { opacity: 1; }
                                        100% { top: 80%; opacity: 0; }
                                    }
                                    @keyframes pulse {
                                        0% { transform: scale(0.95); opacity: 0.5; }
                                        70% { transform: scale(1.1); opacity: 0; }
                                        100% { transform: scale(0.95); opacity: 0; }
                                    }
                                    `}
                                </style>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<CameraswitchIcon />}
                                onClick={toggleCamera}
                                disabled={loading || !!successMsg}
                                sx={{ borderRadius: 50, px: 3 }}
                            >
                                Switch Camera
                            </Button>

                            {scanResult && !successMsg && !loading && !error && (
                                <Typography variant="caption" display="block" mt={2} color="text.secondary">
                                    Last Scanned: {scanResult}
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* List of Ready Shipments */}
            <Card sx={{ borderRadius: 4, maxWidth: 600, mx: 'auto' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="bold">Ready for Pickup</Typography>
                    <IconButton onClick={fetchReadyShipments} disabled={refreshing}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
                <Divider />
                <List>
                    {readyShipments.length === 0 ? (
                        <Box p={4} textAlign="center">
                            <Typography color="text.secondary">No shipments assigned or ready.</Typography>
                        </Box>
                    ) : (
                        readyShipments.map((shipment) => (
                            <React.Fragment key={shipment.trackingNumber}>
                                <ListItem
                                    button
                                    onClick={() => processPickup(shipment.trackingNumber)} // Manual Override
                                    secondaryAction={
                                        <Chip label="Ready" color="success" size="small" variant="outlined" />
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                            <LocalShippingIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={shipment.trackingNumber}
                                        secondary={`${shipment.origin?.city || 'Origin'} → ${shipment.destination?.city || 'Dest'} (${shipment.parcels?.length || 1} pcs)`}
                                    />
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Card>
        </Container>
    );
};

export default DriverPickupPage;
