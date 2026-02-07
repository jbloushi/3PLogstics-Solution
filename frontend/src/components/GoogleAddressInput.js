import React, { useEffect } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from 'use-places-autocomplete';
import { useJsApiLoader } from '@react-google-maps/api';
import {
    TextField,
    Autocomplete as MuiAutocomplete,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';

const libraries = ['places'];

const GoogleAddressInput = ({
    value = {},
    onChange,
    label = "Search Address (Google)",
    disabled,
    required,
    error,
    helperText
}) => {
    // Validate API key is configured
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    React.useEffect(() => {
        if (!apiKey) {
            console.error(
                '🔴 GOOGLE MAPS API KEY MISSING!\n' +
                'Address autofill will not work.\n' +
                'Set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.\n' +
                'See: https://console.cloud.google.com/google/maps-apis'
            );
        }
    }, [apiKey]);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries
    });

    useEffect(() => {
        if (loadError) {
            console.error("Google Maps API Load Error:", loadError);
        }
    }, [loadError]);

    const {
        ready,
        value: inputValue,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        init
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here */
        },
        debounce: 300,
        defaultValue: value?.formattedAddress || '',
        initOnMount: false
    });

    // Manually initialize when Google Script is loaded
    useEffect(() => {
        if (isLoaded) {
            init();
        }
    }, [isLoaded, init]);

    // Debug API State
    useEffect(() => {
        console.log('🗺️ GoogleAddressInput Debug:', {
            apiKeyPresent: !!apiKey,
            isLoaded,
            ready,
            status,
            inputValue,
            libsLoaded: libraries
        });
    }, [apiKey, isLoaded, ready, status, inputValue]);

    // Sync internal input value only if external value REALLY changes (fixes typing lockout)
    const prevExternalAddress = React.useRef(value?.formattedAddress);

    useEffect(() => {
        if (value?.formattedAddress !== prevExternalAddress.current) {
            // Parent prop changed -> Update input
            if (value?.formattedAddress) {
                setValue(value.formattedAddress, false);
            }
            prevExternalAddress.current = value?.formattedAddress;
        }
    }, [value, setValue]);

    const handleSelect = async (address, placeId) => {
        setValue(address, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);

            // Extract address components
            const components = results[0].address_components;
            let city = '', countryCode = '', postalCode = '', state = '';
            let streetName = '', streetNumber = '';
            let area = '';

            components.forEach(component => {
                const types = component.types;
                if (types.includes('locality')) city = component.long_name;
                if (types.includes('country')) countryCode = component.short_name;
                if (types.includes('postal_code')) postalCode = component.long_name;
                if (types.includes('administrative_area_level_1')) state = component.long_name;
                if (types.includes('route')) streetName = component.long_name;
                if (types.includes('street_number')) streetNumber = component.long_name;
                if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
                    area = component.long_name;
                }
            });

            // Update parent - PRESERVE existing contact info (contactPerson, phone, email)
            const addressData = {
                formattedAddress: address,
                streetLines: [`${streetNumber} ${streetName}`.trim()],
                city,
                state,
                postalCode,
                countryCode,
                area, // Auto-fill area if mapped
                longitude: lng,
                latitude: lat,
                validationStatus: 'CONFIRMED'
            };

            // Merge with existing value to preserve contact fields
            onChange({
                ...value, // Preserve contactPerson, phone, email, company, etc.
                ...addressData
            });
        } catch (error) {
            console.error('Error selecting address:', error);
        }
    };

    return (
        <Box>
            <MuiAutocomplete
                componentsProps={{
                    popper: {
                        style: { zIndex: 10000 } // Fix: Ensure dropdown is above Dialog/Modal (usually 1300)
                    }
                }}
                freeSolo
                disabled={!ready || disabled}
                options={data.map(suggestion => suggestion.place_id)}
                getOptionLabel={(option) => {
                    const suggestion = data.find(d => d.place_id === option);
                    return suggestion ? suggestion.description : inputValue;
                }}
                filterOptions={(x) => x}
                inputValue={inputValue}
                onInputChange={(e, newVal) => {
                    setValue(newVal);
                }}
                onChange={(e, val) => {
                    const suggestion = data.find(d => d.place_id === val);
                    if (suggestion) {
                        handleSelect(suggestion.description, suggestion.place_id);
                    }
                }}
                renderInput={(params) => (
                    <>
                        <TextField
                            {...params}
                            label={label}
                            disabled={!ready || disabled || !apiKey}
                            required={required}
                            error={!!error || !apiKey}
                            helperText={helperText}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                                endAdornment: (
                                    <>
                                        {!ready && <CircularProgress size={20} />}
                                        {params.InputProps.endAdornment}
                                    </>
                                )
                            }}
                        />
                        {(!apiKey || loadError) && (
                            <Box mt={1}>
                                <Alert severity="error">
                                    {loadError ? `Google Maps Error: ${loadError.message}` : "Google Maps API Key is missing. Autofill disabled."}
                                </Alert>
                            </Box>
                        )}
                    </>
                )}
                renderOption={(props, optionId) => {
                    const suggestion = data.find(d => d.place_id === optionId);
                    if (!suggestion) return null;

                    return (
                        <li {...props} key={optionId} style={{ padding: '10px 16px' }}>
                            <Box display="flex" alignItems="center" sx={{ width: '100%' }}>
                                <Box sx={{
                                    mr: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(0, 217, 184, 0.1)',
                                    borderRadius: '50%',
                                    p: 1
                                }}>
                                    <LocationOnIcon sx={{ color: '#00d9b8', fontSize: 20 }} />
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#e0e0e0' }}>
                                        {suggestion.structured_formatting.main_text}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#aaa', display: 'block' }}>
                                        {suggestion.structured_formatting.secondary_text}
                                    </Typography>
                                </Box>
                            </Box>
                        </li>
                    );
                }}

                PaperComponent={(paperProps) => (
                    <Paper {...paperProps} sx={{
                        bgcolor: '#1a1f2e !important',
                        color: '#ffffff !important',
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        border: '1px solid #2a3347',
                        marginTop: '8px',
                        '& .MuiAutocomplete-option[aria-selected="true"]': {
                            bgcolor: 'rgba(0, 217, 184, 0.2) !important',
                        },
                        '& .MuiAutocomplete-option:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.05) !important',
                        }
                    }} />
                )}
            />
            {/* Debug Info */}
            <Typography variant="caption" display="block" sx={{ mt: 1, fontSize: '11px', color: status === 'OK' ? '#00d9b8' : (status === '' ? 'text.secondary' : '#ff4444'), fontWeight: 'bold' }}>
                Status: {status || 'Waiting...'} | Found: {data.length} | Maps Loaded: {isLoaded ? 'Yes' : 'No'} | Ready: {ready ? 'Yes' : 'No'}
            </Typography>
        </Box>
    );
};

export default GoogleAddressInput;
