import React from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
    Box, Paper, Typography, TextField, Grid, FormControl, InputLabel, Select, MenuItem,
    Divider, IconButton, Tooltip, Collapse, Autocomplete
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddressInput from './AddressInput';

/**
 * Phone country codes with flags - comprehensive list
 */
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

/**
 * Country list - comprehensive list with flags
 */
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

/**
 * AddressPanel Component
 */
// ... imports
// ... existing code ...

// ... existing code ...

const AddressPanel = ({
    type = 'sender',
    value = {},
    onChange,
    errors = {},
    disabled = false,
    onCopy = null,
    // New props for staff context
    isStaff = false,
    titleOverride = null
}) => {
    const [showDetails, setShowDetails] = React.useState(true);
    const { user } = useAuth();
    const [savedAddresses, setSavedAddresses] = React.useState([]);

    const isSender = type === 'sender';
    const title = titleOverride || (isSender ? 'SHIPPER (From)' : 'RECEIVER (To)');
    const icon = isSender ? <LocalShippingIcon /> : <PersonIcon />;
    const color = isSender ? 'primary.main' : 'secondary.main';

    // Fetch addresses on mount
    React.useEffect(() => {
        const fetchAddresses = async () => {
            try {
                const token = localStorage.getItem('token');
                if (isStaff) {
                    // Staff: Fetch all client addresses
                    // We reused the /users endpoint which returns all users. 
                    // Ideally we have a dedicated /addresses endpoint, but let's use /users?role=client for now
                    const res = await axios.get('/api/users', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Flatten addresses with Org info
                    const allAddrs = res.data.data.flatMap(u =>
                        (u.addresses || []).map(a => ({
                            ...a,
                            _ownerName: u.name,
                            _orgName: u.organization?.name || 'Personal'
                        }))
                    );
                    setSavedAddresses(allAddrs);
                } else {
                    // Client: Use own profile addresses
                    // In a real app, we might valididate against latest profile, but user object is handy
                    if (user && user.addresses) {
                        setSavedAddresses(user.addresses.map(a => ({ ...a, _ownerName: 'Me', _orgName: 'My Address Book' })));
                    }
                }
            } catch (err) {
                console.error('Failed to load address book', err);
            }
        };
        fetchAddresses();
    }, [isStaff, user]);

    const handleAddressSelect = (event, selected) => {
        if (!selected) return;
        // Map saved address to form fields
        onChange({
            ...value,
            company: selected.company || '',
            contactPerson: selected.contactPerson || '',
            streetLines: selected.streetLines || [],
            city: selected.city || '',
            state: selected.state || '',
            postalCode: selected.postalCode || '',
            countryCode: selected.countryCode || 'KW',
            phone: selected.phone || '',
            phoneCountryCode: selected.phoneCountryCode || '+965',
            email: selected.email || '',
            // Carry over refs if available
            vatNumber: selected.vatNumber || '',
            eoriNumber: selected.eoriNumber || '',
            taxId: selected.taxId || '',
            traderType: selected.traderType || 'business',
            reference: selected.reference || ''
        });
    };

    const updateField = (field, fieldValue) => {
        onChange({
            ...value,
            [field]: fieldValue
        });
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                borderRadius: 3,
                borderTop: 4,
                borderColor: color,
                height: '100%'
            }}
        >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color }}>{icon}</Box>
                    <Typography variant="h6" fontWeight="bold">{title}</Typography>
                </Box>
                <Box>
                    {onCopy && (
                        <Tooltip title="Copy to Receiver">
                            <IconButton onClick={onCopy} size="small">
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <IconButton onClick={() => setShowDetails(!showDetails)} size="small">
                        {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>
            </Box>

            {/* Address Book Selector */}
            {savedAddresses.length > 0 && (
                <Box mb={2}>
                    <Autocomplete
                        options={savedAddresses}
                        getOptionLabel={(option) => {
                            const orgLabel = isStaff ? `[${option._orgName}] ` : '';
                            return `${orgLabel}${option.label || 'Address'} - ${option.city}, ${option.countryCode}`;
                        }}
                        isOptionEqualToValue={(option, value) => option._id === value._id || option.label === value.label}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            return (
                                <li key={key} {...rest}>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {option.label} {isStaff && <span style={{ color: '#666' }}>({option._orgName})</span>}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {option.formattedAddress || `${option.city}, ${option.countryCode}`}
                                        </Typography>
                                    </Box>
                                </li>
                            );
                        }}
                        onChange={handleAddressSelect}
                        renderInput={(params) => (
                            <TextField {...params} label="📂 Load from Address Book" size="small" fullWidth />
                        )}
                    />
                    <Divider sx={{ my: 2 }} />
                </Box>
            )}

            <Collapse in={showDetails}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Company Name"
                            value={value.company || ''}
                            onChange={(e) => updateField('company', e.target.value)}
                            disabled={disabled}
                            InputProps={{
                                startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Trader Type</InputLabel>
                            <Select
                                value={value.traderType || 'business'}
                                label="Trader Type"
                                onChange={(e) => updateField('traderType', e.target.value)}
                                disabled={disabled}
                            >
                                <MenuItem value="business">Business</MenuItem>
                                <MenuItem value="private">Private / Individual</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Tax ID / EIN"
                            value={value.taxId || ''}
                            onChange={(e) => updateField('taxId', e.target.value)}
                            disabled={disabled}
                            placeholder="Optional"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            label="Contact Person"
                            value={value.contactPerson || ''}
                            onChange={(e) => updateField('contactPerson', e.target.value)}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderContact : errors.receiverContact)}
                            helperText={isSender ? errors.senderContact : errors.receiverContact}
                            InputProps={{
                                startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>

                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel>Code</InputLabel>
                            <Select
                                value={value.phoneCountryCode || '+965'}
                                label="Code"
                                onChange={(e) => updateField('phoneCountryCode', e.target.value)}
                                disabled={disabled}
                            >
                                {phoneCodes.map(c => (
                                    <MenuItem key={c.code} value={c.code}>
                                        {c.flag} {c.code}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={8}>
                        <TextField
                            fullWidth
                            required
                            label="Phone Number"
                            value={value.phone || ''}
                            onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderPhone : errors.receiverPhone)}
                            helperText={isSender ? errors.senderPhone : errors.receiverPhone}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            type="email"
                            label="Email"
                            value={value.email || ''}
                            onChange={(e) => updateField('email', e.target.value)}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderEmail : errors.receiverEmail)}
                            helperText={isSender ? errors.senderEmail : errors.receiverEmail}
                        />
                    </Grid>

                    {/* DHL References and VAT */}
                    <Grid item xs={isSender ? 12 : 6}>
                        <TextField
                            fullWidth
                            label={isSender ? "Shipper Reference" : "Receiver Reference"}
                            value={value.reference || ''}
                            onChange={(e) => updateField('reference', e.target.value)}
                            disabled={disabled}
                            placeholder="e.g. PO-12345"
                            error={!!(isSender ? errors.senderReference : errors.receiverReference)}
                            helperText={isSender ? errors.senderReference : errors.receiverReference}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label={isSender ? "Sender VAT Number" : "Receiver VAT Number"}
                            value={value.vatNumber || ''}
                            onChange={(e) => updateField('vatNumber', e.target.value)}
                            disabled={disabled}
                            placeholder="Required for DHL"
                            error={!!errors.receiverVat} // Only error for Receiver currently or add senderVat error
                            helperText={errors.receiverVat}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="EORI Number"
                            value={value.eoriNumber || ''}
                            onChange={(e) => updateField('eoriNumber', e.target.value)}
                            disabled={disabled}
                            placeholder="For EU Shipments"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid item xs={12}>
                        <AddressInput
                            value={value}
                            onChange={onChange}
                            label="🔍 Start typing address..."
                            required
                            error={!!(isSender ? errors.senderAddress : errors.receiverAddress)}
                            disabled={disabled}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Street Address"
                            value={value.streetLines?.[0] || ''}
                            onChange={(e) => updateField('streetLines', [e.target.value, value.streetLines?.[1] || ''])}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderStreet : errors.receiverStreet)}
                            helperText={isSender ? errors.senderStreet : errors.receiverStreet}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Unit / Floor"
                            value={value.unitNumber || ''}
                            onChange={(e) => updateField('unitNumber', e.target.value)}
                            placeholder="Apt 5, Floor 3"
                            disabled={disabled}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Building Name"
                            value={value.buildingName || ''}
                            onChange={(e) => updateField('buildingName', e.target.value)}
                            disabled={disabled}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Area / Block / District"
                            value={value.area || ''}
                            onChange={(e) => updateField('area', e.target.value)}
                            disabled={disabled}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            required
                            label="City"
                            value={value.city || ''}
                            onChange={(e) => updateField('city', e.target.value)}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderCity : errors.receiverCity)}
                            helperText={isSender ? errors.senderCity : errors.receiverCity}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="State / Province"
                            value={value.state || ''}
                            onChange={(e) => updateField('state', e.target.value)}
                            disabled={disabled}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            required
                            label="Postal Code"
                            value={value.postalCode || ''}
                            onChange={(e) => updateField('postalCode', e.target.value)}
                            disabled={disabled}
                            error={!!(isSender ? errors.senderPostal : errors.receiverPostal)}
                            helperText={isSender ? errors.senderPostal : errors.receiverPostal}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth error={!!(isSender ? errors.senderCountry : errors.receiverCountry)}>
                            <InputLabel>Country</InputLabel>
                            <Select
                                value={value.countryCode || 'KW'}
                                label="Country"
                                onChange={(e) => updateField('countryCode', e.target.value)}
                                disabled={disabled}
                            >
                                {countries.map(c => (
                                    <MenuItem key={c.code} value={c.code}>
                                        {c.flag} {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Landmark / Delivery Notes"
                            value={value.landmark || ''}
                            onChange={(e) => updateField('landmark', e.target.value)}
                            placeholder="Near mosque, behind mall..."
                            multiline
                            rows={2}
                            disabled={disabled}
                        />
                    </Grid>
                </Grid>
            </Collapse>
        </Paper >
    );
};

export default AddressPanel;
