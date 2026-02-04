import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
    Container, Typography, TextField, Button, Box, Grid, Stepper, Step, StepLabel,
    Autocomplete, CircularProgress, MenuItem, Divider, Card, CardContent, IconButton,
    Alert, FormControl, InputLabel, Select, Chip, Radio, RadioGroup,
    FormControlLabel, Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Autosave key for localStorage
const AUTOSAVE_KEY = 'dgr_shipment_wizard_draft';

// Phone country codes with flags - comprehensive list
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

// Country list (GCC + major destinations)
const countries = [
    { code: 'KW', name: 'Kuwait' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'QA', name: 'Qatar' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'OM', name: 'Oman' },
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'CA', name: 'Canada' },
    { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' },
    { code: 'AU', name: 'Australia' },
    { code: 'RU', name: 'Russia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'EG', name: 'Egypt' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'BE', name: 'Belgium' },
    { code: 'PL', name: 'Poland' },
    { code: 'TH', name: 'Thailand' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'KR', name: 'South Korea' },
];

const steps = ['Sender', 'Receiver', 'Parcels', 'Service', 'Review'];

// Initial contact form state - Kuwait defaults
const initialContact = {
    company: '',
    contactPerson: '',
    streetLines: [''],
    city: '',
    postalCode: '',
    countryCode: 'KW',  // Kuwait default
    email: '',
    phone: '',
    phoneCountryCode: '+965',  // Kuwait default
};

// Initial parcel state
const initialParcel = {
    description: '',
    weight: '',
    length: '',
    width: '',
    height: '',
};

// Volume weight factor (DGR uses 5000 for international, 6000 for domestic)
const VOLUME_FACTOR = 5000;

const DgrShipmentWizard = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuth();

    const isStaff = ['staff', 'admin'].includes(user?.role);

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Client/Staff specific state
    const [clients, setClients] = useState([]);           // List of clients for staff
    const [selectedClient, setSelectedClient] = useState(null);  // Staff-selected client
    const [clientAddresses, setClientAddresses] = useState([]); // Selected client's addresses
    const [selectedAddressIdx, setSelectedAddressIdx] = useState(-1); // -1 = new/manual

    // Receiver lookup state
    // eslint-disable-next-line no-unused-vars
    const [receiverLookupPhone, setReceiverLookupPhone] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [savedReceivers, setSavedReceivers] = useState([]);
    const [saveReceiverChecked, setSaveReceiverChecked] = useState(true);

    // Form data
    const [sender, setSender] = useState({ ...initialContact });
    const [receiver, setReceiver] = useState({ ...initialContact });
    const [parcels, setParcels] = useState([{ ...initialParcel }]);
    const [selectedService, setSelectedService] = useState(null);
    const [availableRates, setAvailableRates] = useState([]);
    const [errors, setErrors] = useState({});

    // Load clients list for staff
    useEffect(() => {
        if (isStaff) {
            const fetchClients = async () => {
                try {
                    const response = await fetch(`${API_URL}/auth/clients`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        setClients(data.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch clients:', error);
                }
            };
            fetchClients();
        }
    }, [isStaff]);

    // Auto-fill sender for clients from their profile/default address
    useEffect(() => {
        if (!isStaff && user) {
            // For clients: pre-fill with their profile
            const defaultAddr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
            if (defaultAddr) {
                setSender({
                    company: defaultAddr.company || '',
                    contactPerson: defaultAddr.contactPerson || user.name || '',
                    streetLines: defaultAddr.streetLines || [''],
                    city: defaultAddr.city || '',
                    postalCode: defaultAddr.postalCode || '',
                    countryCode: defaultAddr.countryCode || 'KW',
                    email: defaultAddr.email || user.email || '',
                    phone: defaultAddr.phone || user.phone || '',
                    phoneCountryCode: defaultAddr.phoneCountryCode || '+965',
                });
            } else {
                // No saved address, just use basic profile
                setSender(prev => ({
                    ...prev,
                    contactPerson: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                }));
            }
        }
    }, [isStaff, user]);

    // When staff selects a client, load their addresses
    useEffect(() => {
        if (selectedClient) {
            setClientAddresses(selectedClient.addresses || []);
            // Auto-select default address if exists
            const defaultIdx = selectedClient.addresses?.findIndex(a => a.isDefault);
            if (defaultIdx >= 0) {
                setSelectedAddressIdx(defaultIdx);
                fillSenderFromAddress(selectedClient.addresses[defaultIdx], selectedClient);
            } else if (selectedClient.addresses?.length > 0) {
                setSelectedAddressIdx(0);
                fillSenderFromAddress(selectedClient.addresses[0], selectedClient);
            } else {
                // No addresses, use basic client info
                setSender(prev => ({
                    ...prev,
                    contactPerson: selectedClient.name || '',
                    email: selectedClient.email || '',
                    phone: selectedClient.phone || '',
                }));
            }
        }
    }, [selectedClient]);

    // Helper to fill sender from address
    const fillSenderFromAddress = (addr, client) => {
        setSender({
            company: addr.company || '',
            contactPerson: addr.contactPerson || client?.name || '',
            streetLines: addr.streetLines || [''],
            city: addr.city || '',
            postalCode: addr.postalCode || '',
            countryCode: addr.countryCode || 'KW',
            email: addr.email || client?.email || '',
            phone: addr.phone || client?.phone || '',
            phoneCountryCode: addr.phoneCountryCode || '+965',
        });
    };

    // Lookup receiver by phone
    const lookupReceiver = async (phone) => {
        if (!phone || phone.length < 5) return;
        try {
            const response = await fetch(`${API_URL}/receivers/search?phone=${encodeURIComponent(phone)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success && data.found && data.data) {
                const r = data.data;
                setReceiver({
                    company: r.company || '',
                    contactPerson: r.contactPerson || '',
                    streetLines: r.streetLines || [''],
                    city: r.city || '',
                    postalCode: r.postalCode || '',
                    countryCode: r.countryCode || 'KW',
                    email: r.email || '',
                    phone: r.phone || '',
                    phoneCountryCode: r.phoneCountryCode || '+965',
                });
                enqueueSnackbar('Receiver found and auto-filled!', { variant: 'success' });
            }
        } catch (error) {
            console.error('Receiver lookup error:', error);
        }
    };

    // Load autosaved draft on mount
    useEffect(() => {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                if (draft.sender) setSender(draft.sender);
                if (draft.receiver) setReceiver(draft.receiver);
                if (draft.parcels) setParcels(draft.parcels);
                enqueueSnackbar('Draft restored', { variant: 'info' });
            } catch (e) {
                console.warn('Failed to restore draft', e);
            }
        }
    }, [enqueueSnackbar]);

    // Autosave every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const draft = { sender, receiver, parcels };
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
        }, 5000);
        return () => clearInterval(interval);
    }, [sender, receiver, parcels]);

    // Search addresses via backend proxy
    const searchAddress = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            return;
        }
        setSearchLoading(true);
        try {
            const response = await fetch(`${API_URL}/geocode/autocomplete?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.success) {
                setAddressSuggestions(data.data);
            }
        } catch (error) {
            console.error('Address search error:', error);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // Get place details when user selects an address
    const getPlaceDetails = useCallback(async (placeId) => {
        try {
            const response = await fetch(`${API_URL}/geocode/details/${placeId}`);
            const data = await response.json();
            if (data.success) {
                return data.data;
            }
        } catch (error) {
            console.error('Place details error:', error);
        }
        return null;
    }, []);

    // Handle address selection
    const handleAddressSelect = async (placeId, setter) => {
        const details = await getPlaceDetails(placeId);
        if (details) {
            setter(prev => ({
                ...prev,
                streetLines: [details.formattedAddress.split(',')[0] || ''],
                city: details.city || '',
                postalCode: details.postalCode || '',
                countryCode: details.countryCode || 'US',
            }));
            setAddressSuggestions([]);
        }
    };

    // Calculate volumetric weight
    const calculateVolumetricWeight = (parcel) => {
        const l = parseFloat(parcel.length) || 0;
        const w = parseFloat(parcel.width) || 0;
        const h = parseFloat(parcel.height) || 0;
        return (l * w * h) / VOLUME_FACTOR;
    };

    // Get billable weight (max of actual and volumetric)
    const getBillableWeight = (parcel) => {
        const actual = parseFloat(parcel.weight) || 0;
        const volumetric = calculateVolumetricWeight(parcel);
        return Math.max(actual, volumetric);
    };

    // Total billable weight
    const totalBillableWeight = parcels.reduce((sum, p) => sum + getBillableWeight(p), 0);

    // Add parcel
    const addParcel = () => {
        setParcels([...parcels, { ...initialParcel }]);
    };

    // Remove parcel
    const removeParcel = (index) => {
        if (parcels.length > 1) {
            setParcels(parcels.filter((_, i) => i !== index));
        }
    };

    // Update parcel field
    const updateParcel = (index, field, value) => {
        setParcels(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    // Validate step
    const validateStep = () => {
        const newErrors = {};

        if (activeStep === 0) {
            // Sender validation
            if (!sender.contactPerson) newErrors.senderContact = 'Contact person required';
            if (!sender.streetLines[0]) newErrors.senderStreet = 'Street address required';
            if (!sender.city) newErrors.senderCity = 'City required';
            if (!sender.postalCode) newErrors.senderPostal = 'Postal code required';
            if (!sender.email) newErrors.senderEmail = 'Email required';
            if (!sender.phone) newErrors.senderPhone = 'Phone required';
        } else if (activeStep === 1) {
            // Receiver validation
            if (!receiver.contactPerson) newErrors.receiverContact = 'Contact person required';
            if (!receiver.streetLines[0]) newErrors.receiverStreet = 'Street address required';
            if (!receiver.city) newErrors.receiverCity = 'City required';
            if (!receiver.postalCode) newErrors.receiverPostal = 'Postal code required';
            if (!receiver.email) newErrors.receiverEmail = 'Email required';
            if (!receiver.phone) newErrors.receiverPhone = 'Phone required';
        } else if (activeStep === 2) {
            // Parcels validation
            parcels.forEach((p, i) => {
                if (!p.weight || parseFloat(p.weight) <= 0) newErrors[`parcel${i}Weight`] = 'Weight required';
                if (!p.length || parseFloat(p.length) <= 0) newErrors[`parcel${i}Length`] = 'Length required';
                if (!p.width || parseFloat(p.width) <= 0) newErrors[`parcel${i}Width`] = 'Width required';
                if (!p.height || parseFloat(p.height) <= 0) newErrors[`parcel${i}Height`] = 'Height required';
            });
        } else if (activeStep === 3) {
            if (!selectedService) newErrors.service = 'Please select a shipping service';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Fetch rates from DGR
    const fetchRates = async () => {
        setRatesLoading(true);
        try {
            const payload = {
                sender: {
                    postalCode: sender.postalCode,
                    city: sender.city,
                    countryCode: sender.countryCode,
                },
                receiver: {
                    postalCode: receiver.postalCode,
                    city: receiver.city,
                    countryCode: receiver.countryCode,
                },
                parcels: parcels.map(p => ({
                    weight: parseFloat(p.weight) || 1,
                    length: parseFloat(p.length) || 10,
                    width: parseFloat(p.width) || 10,
                    height: parseFloat(p.height) || 10,
                })),
            };

            const response = await fetch(`${API_URL}/shipments/quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (data.success && data.data) {
                setAvailableRates(data.data);
                if (data.data.length > 0) {
                    setSelectedService(data.data[0]);
                }
            } else {
                enqueueSnackbar('No rates available for this route', { variant: 'warning' });
            }
        } catch (error) {
            console.error('Rate fetch error:', error);
            enqueueSnackbar('Failed to fetch shipping rates', { variant: 'error' });
        } finally {
            setRatesLoading(false);
        }
    };

    // Handle next step
    const handleNext = async () => {
        if (!validateStep()) return;

        if (activeStep === 2) {
            // After parcels, fetch rates
            await fetchRates();
        }

        setActiveStep(prev => prev + 1);
    };

    // Handle back
    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    // Submit shipment
    const handleSubmit = async () => {
        if (!validateStep()) return;

        setLoading(true);
        try {
            const payload = {
                sender: {
                    ...sender,
                    phone: `${sender.phoneCountryCode}${sender.phone}`,
                },
                receiver: {
                    ...receiver,
                    phone: `${receiver.phoneCountryCode}${receiver.phone}`,
                },
                parcels: parcels.map(p => ({
                    description: p.description || 'General Goods',
                    weight: parseFloat(p.weight),
                    length: parseFloat(p.length),
                    width: parseFloat(p.width),
                    height: parseFloat(p.height),
                })),
                serviceCode: selectedService?.serviceCode || 'P',
            };

            const response = await fetch(`${API_URL}/shipments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                // Clear draft
                localStorage.removeItem(AUTOSAVE_KEY);
                enqueueSnackbar('Shipment created successfully!', { variant: 'success' });
                navigate(`/shipments/${data.data.trackingNumber}`);
            } else {
                throw new Error(data.error || 'Failed to create shipment');
            }
        } catch (error) {
            console.error('Submit error:', error);
            enqueueSnackbar(error.message, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Render contact form (for sender/receiver)
    const renderContactForm = (data, setData, prefix) => (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    label="Company Name (Optional)"
                    value={data.company}
                    onChange={(e) => setData(prev => ({ ...prev, company: e.target.value }))}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    required
                    label="Contact Person"
                    value={data.contactPerson}
                    onChange={(e) => setData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    error={!!errors[`${prefix}Contact`]}
                    helperText={errors[`${prefix}Contact`]}
                />
            </Grid>
            <Grid item xs={12}>
                <Autocomplete
                    freeSolo
                    options={addressSuggestions}
                    getOptionLabel={(option) => option.description || option}
                    loading={searchLoading}
                    onInputChange={(_, value) => {
                        setData(prev => ({ ...prev, streetLines: [value] }));
                        searchAddress(value);
                    }}
                    onChange={(_, value) => {
                        if (value?.placeId) {
                            handleAddressSelect(value.placeId, setData);
                        }
                    }}
                    inputValue={data.streetLines[0]}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            required
                            label="Street Address"
                            error={!!errors[`${prefix}Street`]}
                            helperText={errors[`${prefix}Street`]}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {searchLoading ? <CircularProgress size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    fullWidth
                    required
                    label="City"
                    value={data.city}
                    onChange={(e) => setData(prev => ({ ...prev, city: e.target.value }))}
                    error={!!errors[`${prefix}City`]}
                    helperText={errors[`${prefix}City`]}
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    fullWidth
                    required
                    label="Postal Code"
                    value={data.postalCode}
                    onChange={(e) => setData(prev => ({ ...prev, postalCode: e.target.value }))}
                    error={!!errors[`${prefix}Postal`]}
                    helperText={errors[`${prefix}Postal`]}
                />
            </Grid>
            <Grid item xs={12}>
                <FormControl fullWidth>
                    <InputLabel>Country</InputLabel>
                    <Select
                        value={data.countryCode}
                        label="Country"
                        onChange={(e) => setData(prev => ({ ...prev, countryCode: e.target.value }))}
                    >
                        {countries.map(c => (
                            <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email"
                    value={data.email}
                    onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                    error={!!errors[`${prefix}Email`]}
                    helperText={errors[`${prefix}Email`]}
                />
            </Grid>
            <Grid item xs={4}>
                <FormControl fullWidth>
                    <InputLabel>Code</InputLabel>
                    <Select
                        value={data.phoneCountryCode}
                        label="Code"
                        onChange={(e) => setData(prev => ({ ...prev, phoneCountryCode: e.target.value }))}
                    >
                        {phoneCodes.map(c => (
                            <MenuItem key={c.code} value={c.code}>{c.flag} {c.code}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={8}>
                <TextField
                    fullWidth
                    required
                    label="Phone Number"
                    value={data.phone}
                    onChange={(e) => setData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    error={!!errors[`${prefix}Phone`]}
                    helperText={errors[`${prefix}Phone`]}
                />
            </Grid>
        </Grid>
    );

    // Render parcels step
    const renderParcelsStep = () => (
        <Box>
            {parcels.map((parcel, index) => (
                <Card key={index} sx={{ mb: 2, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Parcel {index + 1}
                        </Typography>
                        {parcels.length > 1 && (
                            <IconButton color="error" onClick={() => removeParcel(index)}>
                                <DeleteIcon />
                            </IconButton>
                        )}
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                placeholder="e.g., Electronics, Clothing"
                                value={parcel.description}
                                onChange={(e) => updateParcel(index, 'description', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                required
                                type="number"
                                label="Weight (kg)"
                                value={parcel.weight}
                                onChange={(e) => updateParcel(index, 'weight', e.target.value)}
                                error={!!errors[`parcel${index}Weight`]}
                                InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                required
                                type="number"
                                label="Length (cm)"
                                value={parcel.length}
                                onChange={(e) => updateParcel(index, 'length', e.target.value)}
                                error={!!errors[`parcel${index}Length`]}
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                required
                                type="number"
                                label="Width (cm)"
                                value={parcel.width}
                                onChange={(e) => updateParcel(index, 'width', e.target.value)}
                                error={!!errors[`parcel${index}Width`]}
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                required
                                type="number"
                                label="Height (cm)"
                                value={parcel.height}
                                onChange={(e) => updateParcel(index, 'height', e.target.value)}
                                error={!!errors[`parcel${index}Height`]}
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        </Grid>
                    </Grid>

                    {/* Volume Calculator Display */}
                    <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">Actual Weight</Typography>
                                <Typography variant="body2" fontWeight="bold">{parseFloat(parcel.weight) || 0} kg</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">Volumetric Weight</Typography>
                                <Typography variant="body2" fontWeight="bold">{calculateVolumetricWeight(parcel).toFixed(2)} kg</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">Billable Weight</Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                    {getBillableWeight(parcel).toFixed(2)} kg
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                </Card>
            ))}

            <Button startIcon={<AddIcon />} onClick={addParcel} sx={{ mt: 1 }}>
                Add Another Parcel
            </Button>

            <Divider sx={{ my: 3 }} />

            <Alert severity="info" icon={<CalculateIcon />}>
                <strong>Total Billable Weight: {totalBillableWeight.toFixed(2)} kg</strong>
                <Typography variant="caption" display="block">
                    Volumetric formula: (L × W × H) / {VOLUME_FACTOR}
                </Typography>
            </Alert>
        </Box>
    );

    // Render service selection step
    const renderServiceStep = () => (
        <Box>
            {ratesLoading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Fetching DGR rates...</Typography>
                </Box>
            ) : (availableRates.length === 0) ? (
                <Alert severity="warning">
                    No DGR services available for this route.
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {availableRates.map((rate, index) => (
                        <Grid item xs={12} key={index}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    border: selectedService?.serviceCode === rate.serviceCode ? '2px solid' : '1px solid',
                                    borderColor: selectedService?.serviceCode === rate.serviceCode ? 'primary.main' : 'divider',
                                    bgcolor: selectedService?.serviceCode === rate.serviceCode ? 'primary.50' : 'background.paper'
                                }}
                                onClick={() => setSelectedService(rate)}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="h6" color="primary">{rate.serviceName}</Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                Carrier: {rate.carrierCode} | Estimated Delivery: {rate.deliveryDate ? new Date(rate.deliveryDate).toLocaleDateString() : 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {rate.totalPrice?.toFixed(3)} {rate.currency}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
            {errors.service && <Alert severity="error" sx={{ mt: 2 }}>{errors.service}</Alert>}
        </Box>
    );

    // Render review step
    const renderReviewStep = () => (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom><PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Sender</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography><strong>{sender.contactPerson}</strong></Typography>
                            {sender.company && <Typography color="textSecondary">{sender.company}</Typography>}
                            <Typography>{sender.streetLines[0]}</Typography>
                            <Typography>{sender.city}, {sender.postalCode}</Typography>
                            <Typography>{countries.find(c => c.code === sender.countryCode)?.name}</Typography>
                            <Typography sx={{ mt: 1 }}>{sender.email}</Typography>
                            <Typography>{sender.phoneCountryCode}{sender.phone}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom><PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Receiver</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography><strong>{receiver.contactPerson}</strong></Typography>
                            {receiver.company && <Typography color="textSecondary">{receiver.company}</Typography>}
                            <Typography>{receiver.streetLines[0]}</Typography>
                            <Typography>{receiver.city}, {receiver.postalCode}</Typography>
                            <Typography>{countries.find(c => c.code === receiver.countryCode)?.name}</Typography>
                            <Typography sx={{ mt: 1 }}>{receiver.email}</Typography>
                            <Typography>{receiver.phoneCountryCode}{receiver.phone}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom><InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Parcels ({parcels.length})</Typography>
                            <Divider sx={{ mb: 2 }} />
                            {parcels.map((p, i) => (
                                <Box key={i} display="flex" justifyContent="space-between" py={1}>
                                    <Typography>Parcel {i + 1}: {p.description || 'General Goods'}</Typography>
                                    <Typography>{p.weight}kg • {p.length}×{p.width}×{p.height}cm</Typography>
                                </Box>
                            ))}
                            <Divider sx={{ my: 1 }} />
                            <Typography fontWeight="bold">Total Billable: {totalBillableWeight.toFixed(2)} kg</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card sx={{ bgcolor: 'primary.light' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom><LocalShippingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Selected Service</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h5">{selectedService?.serviceName}</Typography>
                                    {selectedService?.deliveryDate && (
                                        <Typography>Est. Delivery: {new Date(selectedService.deliveryDate).toLocaleDateString()}</Typography>
                                    )}
                                </Box>
                                <Typography variant="h4" color="primary.dark">
                                    {selectedService?.currency} {selectedService?.totalPrice?.toFixed(2)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );

    // Render sender step with staff client selector
    const renderSenderStep = () => (
        <Box>
            {/* Staff: Client Selector */}
            {isStaff && (
                <Box mb={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        As staff, select the client (sender) for this shipment.
                    </Alert>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Select Client</InputLabel>
                        <Select
                            value={selectedClient?._id || ''}
                            label="Select Client"
                            onChange={(e) => {
                                const client = clients.find(c => c._id === e.target.value);
                                setSelectedClient(client);
                            }}
                        >
                            {clients.map(c => (
                                <MenuItem key={c._id} value={c._id}>
                                    {c.name} ({c.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Address selector for selected client */}
                    {selectedClient && clientAddresses.length > 0 && (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Select Address</InputLabel>
                            <Select
                                value={selectedAddressIdx}
                                label="Select Address"
                                onChange={(e) => {
                                    const idx = e.target.value;
                                    setSelectedAddressIdx(idx);
                                    if (idx >= 0 && clientAddresses[idx]) {
                                        fillSenderFromAddress(clientAddresses[idx], selectedClient);
                                    }
                                }}
                            >
                                {clientAddresses.map((addr, idx) => (
                                    <MenuItem key={idx} value={idx}>
                                        {addr.label || 'Address'} - {addr.city} {addr.isDefault && '(Default)'}
                                    </MenuItem>
                                ))}
                                <MenuItem value={-1}>+ New Address</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                    <Divider sx={{ my: 2 }} />
                </Box>
            )}

            {/* Sender form */}
            {renderContactForm(sender, setSender, 'sender')}
        </Box>
    );

    // Render receiver step with phone lookup
    const renderReceiverStep = () => (
        <Box>
            {/* Phone lookup */}
            <Alert severity="info" sx={{ mb: 2 }}>
                Enter mobile number to search for saved receiver
            </Alert>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                    <FormControl fullWidth>
                        <InputLabel>Code</InputLabel>
                        <Select
                            value={receiver.phoneCountryCode}
                            label="Code"
                            onChange={(e) => setReceiver(prev => ({ ...prev, phoneCountryCode: e.target.value }))}
                        >
                            {phoneCodes.map(c => (
                                <MenuItem key={c.code} value={c.code}>{c.flag} {c.code}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={5}>
                    <TextField
                        fullWidth
                        label="Mobile Number"
                        value={receiver.phone}
                        onChange={(e) => setReceiver(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                        onBlur={() => lookupReceiver(receiver.phone)}
                        placeholder="Enter to search..."
                    />
                </Grid>
                <Grid item xs={3}>
                    <Button
                        fullWidth
                        variant="outlined"
                        sx={{ height: '56px' }}
                        onClick={() => lookupReceiver(receiver.phone)}
                    >
                        Search
                    </Button>
                </Grid>
            </Grid>
            <Divider sx={{ mb: 3 }} />

            {/* Receiver form */}
            {renderContactForm(receiver, setReceiver, 'receiver')}

            {/* Save receiver checkbox */}
            <FormControlLabel
                control={
                    <Checkbox
                        checked={saveReceiverChecked}
                        onChange={(e) => setSaveReceiverChecked(e.target.checked)}
                    />
                }
                label="Save this receiver to address book"
                sx={{ mt: 2 }}
            />
        </Box>
    );

    // Get step content
    const getStepContent = () => {
        switch (activeStep) {
            case 0:
                return renderSenderStep();
            case 1:
                return renderReceiverStep();
            case 2:
                return renderParcelsStep();
            case 3:
                return renderServiceStep();
            case 4:
                return renderReviewStep();
            default:
                return 'Unknown step';
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        <LocalShippingIcon sx={{ mr: 2, fontSize: 40, verticalAlign: 'middle' }} />
                        Create DGR Shipment
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                        {user?.email} • Auto-saving draft
                    </Typography>

                    <Stepper activeStep={activeStep} sx={{ my: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Box sx={{ minHeight: 400 }}>
                        {getStepContent()}
                    </Box>

                    <Box display="flex" justifyContent="space-between" mt={4}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                        >
                            Back
                        </Button>

                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSubmit}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                            >
                                {loading ? 'Creating...' : 'Create Shipment'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                disabled={ratesLoading}
                            >
                                {activeStep === 2 ? 'Get Rates' : 'Next'}
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default DgrShipmentWizard;
