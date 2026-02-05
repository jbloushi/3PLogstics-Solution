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
    Alert
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

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries
    });

    const {
        ready,
        value: inputValue,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here */
        },
        debounce: 300,
        defaultValue: value?.formattedAddress || '',
        initOnMount: isLoaded
    });

    // Sync internal input value if external value changes significantly
    useEffect(() => {
        if (value?.formattedAddress && value.formattedAddress !== inputValue) {
            setValue(value.formattedAddress, false);
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

            components.forEach(component => {
                const types = component.types;
                if (types.includes('locality')) city = component.long_name;
                if (types.includes('country')) countryCode = component.short_name;
                if (types.includes('postal_code')) postalCode = component.long_name;
                if (types.includes('administrative_area_level_1')) state = component.long_name;
                if (types.includes('route')) streetName = component.long_name;
                if (types.includes('street_number')) streetNumber = component.long_name;
            });

            // Update parent - PRESERVE existing contact info (contactPerson, phone, email)
            const addressData = {
                formattedAddress: address,
                streetLines: [`${streetNumber} ${streetName}`.trim()],
                city,
                state,
                postalCode,
                countryCode,
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
        <MuiAutocomplete
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
                    {!apiKey && (
                        <Box mt={1}>
                            <Alert severity="error">
                                Google Maps API Key is missing. Autofill disabled.
                            </Alert>
                        </Box>
                    )}
                </>
            )}
            renderOption={(props, optionId) => {
                const suggestion = data.find(d => d.place_id === optionId);
                if (!suggestion) return null;

                return (
                    <li {...props} key={optionId}>
                        <Box display="flex" alignItems="center">
                            <LocationOnIcon sx={{ color: 'text.secondary', mr: 2 }} />
                            <Box>
                                <Typography variant="body1">
                                    {suggestion.structured_formatting.main_text}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {suggestion.structured_formatting.secondary_text}
                                </Typography>
                            </Box>
                        </Box>
                    </li>
                );
            }}
        />
    );
};

export default GoogleAddressInput;
