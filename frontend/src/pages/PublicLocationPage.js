import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box, Container, Typography, Card, CardContent, Button, Alert, CircularProgress,
    Divider, Stack, Grid, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GoogleAddressInput from '../components/GoogleAddressInput';
import LocationPicker from '../components/LocationPicker';
import TrackingTimeline from '../components/TrackingTimeline';
import { format } from 'date-fns';

const phoneCodes = [
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
];

const countries = [
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PublicLocationPage = () => {
    const { trackingNumber } = useParams();
    const [shipment, setShipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [updating, setUpdating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [userMode, setUserMode] = useState('view'); // 'view' | 'update'

    // Fetch shipment data
    useEffect(() => {
        const fetchShipment = async () => {
            try {
                const response = await fetch(`${API_URL}/shipments/public/${trackingNumber}`);
                const data = await response.json();

                if (data.success) {
                    setShipment(data.data);
                } else {
                    const errorMsg = typeof data.error === 'object' ?
                        (data.error.message || JSON.stringify(data.error)) :
                        (data.error || 'Failed to load shipment');
                    setError(errorMsg);
                }
            } catch (err) {
                setError('Network error. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchShipment();
    }, [trackingNumber]);

    const [addressData, setAddressData] = useState({
        formattedAddress: '',
        streetLines: ['', ''],
        city: '',
        state: '',
        postalCode: '',
        countryCode: '',
        country: '',

        unitNumber: '',
        buildingName: '',
        landmark: '',
        deliveryNotes: '',

        coordinates: null
    });

    // Helper: Reverse Geocode (Lat/Lng -> Address Fields)
    const reverseGeocode = async (lat, lng) => {
        if (!window.google || !window.google.maps) return;
        const geocoder = new window.google.maps.Geocoder();

        try {
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results[0]) {
                const result = response.results[0];
                const components = result.address_components;

                let city = '', countryCode = '', postalCode = '', state = '';
                let streetName = '', streetNumber = '';

                components.forEach(component => {
                    const types = component.types;
                    if (types.includes('locality')) city = component.long_name;
                    if (types.includes('country')) countryCode = component.short_name;
                    if (types.includes('postal_code')) postalCode = component.long_name;
                    if (types.includes('administrative_area_level_1')) state = component.long_name;
                    if (types.includes('route')) streetName = component.long_name;
                    if (types.includes('street_number')) streetNumber = component.long_name;
                });

                setAddressData(prev => ({
                    ...prev,
                    formattedAddress: result.formatted_address,
                    streetLines: [`${streetNumber} ${streetName}`.trim(), prev.streetLines?.[1] || ''],
                    city: city || prev.city,
                    state: state || prev.state,
                    postalCode: postalCode || prev.postalCode,
                    countryCode: countryCode || prev.countryCode,
                    country: result.address_components.find(c => c.types.includes('country'))?.long_name || prev.country,
                    coordinates: [lng, lat]
                }));
            }
        } catch (err) {
            console.error("Reverse geocoding failed", err);
        }
    };

    const handleAddressSelect = (data) => {
        const newData = { ...data };
        // GoogleAddressInput returns structured data, ensuring coordinates
        if (!newData.coordinates && newData.latitude !== undefined && newData.longitude !== undefined) {
            newData.coordinates = [newData.longitude, newData.latitude];
        }

        // Preserve existing unit/details if any (though usually empty on new search)
        // Ensure array structure for streetLines
        if (!Array.isArray(newData.streetLines)) {
            newData.streetLines = [newData.formattedAddress || '', ''];
        }

        setAddressData(prev => ({
            ...prev,
            ...newData
        }));
    };

    const handleLocationPickerChange = (location) => {
        // Update coordinates immediately
        setAddressData(prev => ({
            ...prev,
            coordinates: [location.lng, location.lat]
        }));
        // Then reverse geocode to update address fields
        reverseGeocode(location.lat, location.lng);
    };

    const handleFieldChange = (field, value) => {
        setAddressData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async () => {
        if (!addressData) return;

        setUpdating(true);
        try {
            const response = await fetch(`${API_URL}/shipments/public/${trackingNumber}/location`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coordinates: addressData.coordinates,
                    address: addressData.formattedAddress, // Matched with backend expectation
                    streetLines: addressData.streetLines,
                    city: addressData.city,
                    state: addressData.state,
                    postalCode: addressData.postalCode,
                    countryCode: addressData.countryCode,
                    country: addressData.country,

                    unitNumber: addressData.unitNumber,
                    buildingName: addressData.buildingName,
                    landmark: addressData.landmark,
                    deliveryNotes: addressData.deliveryNotes
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(true);
            } else {
                const errorMsg = typeof data.error === 'object' ?
                    (data.error.message || JSON.stringify(data.error)) :
                    (data.error || 'Failed to update location');
                setError(errorMsg);
            }
        } catch (err) {
            setError('Failed to submit location update');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (success) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <Card sx={{ p: 5, borderRadius: 4 }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Location Confirmed!
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                        Thank you for updating your delivery location. <br />
                        Your driver has been notified.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        Tracking Number: {trackingNumber}
                    </Typography>
                    <Button
                        variant="outlined"
                        sx={{ mt: 3 }}
                        onClick={() => window.location.reload()}
                    >
                        Refresh Status
                    </Button>
                </Card>
            </Container>
        );
    }

    // Main Shipment View (Handles both View and Update modes)
    if (shipment) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Grid container spacing={3}>
                    {/* Left Column: Map & Search (Only visible in Update Mode) */}
                    {userMode === 'update' && (
                        <Grid item xs={12} md={8}>
                            <Card sx={{ p: 3, borderRadius: 2, overflow: 'hidden' }}>
                                <Typography variant="h6" gutterBottom>Update Delivery Location</Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Search for your specific address or precise location.
                                </Typography>

                                <Box mb={3}>
                                    <GoogleAddressInput
                                        label="Search for a place or address..."
                                        onChange={handleAddressSelect}
                                    />
                                </Box>

                                <LocationPicker
                                    initialLocation={addressData?.coordinates ? { lat: addressData.coordinates[1], lng: addressData.coordinates[0] } : (shipment?.currentLocation || shipment?.destination)}
                                    onLocationChange={handleLocationPickerChange}
                                />

                                <Box mt={3}>
                                    <Grid container spacing={2}>



                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                        </Grid>

                                        {/* Street Address */}
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Street Address"
                                                value={addressData.streetLines?.[0] || ''}
                                                onChange={(e) => handleFieldChange('streetLines', [e.target.value, addressData.streetLines?.[1] || ''])}
                                            />
                                        </Grid>

                                        {/* Unit & Building */}
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="Unit / Floor"
                                                value={addressData.unitNumber || ''}
                                                onChange={(e) => handleFieldChange('unitNumber', e.target.value)}
                                                placeholder="Apt 5, Floor 3"
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="Building Name"
                                                value={addressData.buildingName || ''}
                                                onChange={(e) => handleFieldChange('buildingName', e.target.value)}
                                            />
                                        </Grid>

                                        {/* City & State */}
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="City"
                                                value={addressData.city || ''}
                                                onChange={(e) => handleFieldChange('city', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="State / Province"
                                                value={addressData.state || ''}
                                                onChange={(e) => handleFieldChange('state', e.target.value)}
                                            />
                                        </Grid>

                                        {/* Postal & Country */}
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="Postal Code"
                                                value={addressData.postalCode || ''}
                                                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <FormControl fullWidth>
                                                <InputLabel>Country</InputLabel>
                                                <Select
                                                    value={addressData.countryCode || 'KW'}
                                                    label="Country"
                                                    onChange={(e) => handleFieldChange('countryCode', e.target.value)}
                                                >
                                                    {countries.map(c => (
                                                        <MenuItem key={c.code} value={c.code}>
                                                            {c.flag} {c.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        {/* Landmark */}
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Landmark / Delivery Notes"
                                                value={addressData.landmark || addressData.deliveryNotes || ''}
                                                onChange={(e) => handleFieldChange('landmark', e.target.value)}
                                                placeholder="Near mosque, behind mall..."
                                                multiline
                                                rows={2}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Box mt={3} display="flex" gap={2}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setUserMode('view')}
                                        fullWidth
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmit}
                                        disabled={!addressData || updating}
                                        fullWidth
                                    >
                                        {updating ? 'Updating...' : 'Confirm Location'}
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    )}

                    {/* Right Column: Shipment Details (Full width in View Mode, Sidebar in Update Mode) */}
                    <Grid item xs={12} md={userMode === 'update' ? 4 : 12}>
                        <Card sx={{ p: 4, borderRadius: 2, height: '100%' }}>
                            <Box textAlign="center" mb={3}>
                                <LocationOnIcon color="primary" sx={{ fontSize: 50, mb: 1 }} />
                                <Typography variant="h5" fontWeight="bold">
                                    Shipment Status
                                </Typography>
                                <Typography color="text.secondary">
                                    {trackingNumber}
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Destination Country</Typography>
                                    <Typography variant="h6">
                                        {shipment.destination?.country || shipment.destination?.countryCode || 'N/A'}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            {/* Tracking Timeline */}
                            <Box sx={{ mb: 4 }}>
                                <TrackingTimeline history={shipment.history} currentStatus={shipment.status} />
                            </Box>

                            {/* Action Button (Only visible in View Mode) */}
                            {userMode === 'view' && shipment.allowPublicLocationUpdate !== false && (
                                <Box mt={3} textAlign="center">
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Are you at the delivery location now?
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<MyLocationIcon />}
                                        onClick={() => setUserMode('update')}
                                        fullWidth
                                    >
                                        Update Location
                                    </Button>
                                </Box>
                            )}
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        );
    }

    return null;
};

export default PublicLocationPage;
