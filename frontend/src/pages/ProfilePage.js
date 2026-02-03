import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Grid, Paper, Button,
    Box, Alert, Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import AddressBookManager from '../components/AddressBookManager';
import AddressPanel from '../components/AddressPanel';

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    // Default Profile State (from CarrierConfig + Default Address)
    const [shipperProfile, setShipperProfile] = useState({});
    const [loading, setLoading] = useState(false);

    // Initialize State
    useEffect(() => {
        if (user) {
            // Find default address or use carrier config basics
            const defaultAddress = user.addresses?.find(a => a.isDefault) || {};

            setShipperProfile({
                ...defaultAddress,
                // Override with User/CarrierConfig specifics if present -> logic: Profile is master
                company: user.company || defaultAddress.company || '',
                contactPerson: user.name || defaultAddress.contactPerson || '',
                phone: user.phone || defaultAddress.phone || '',
                // Compliance fields from carrierConfig if not in address
                vatNumber: user.carrierConfig?.vatNo || defaultAddress.vatNumber || '',
                eoriNumber: user.carrierConfig?.eori || defaultAddress.eoriNumber || '',
                taxId: user.carrierConfig?.taxId || defaultAddress.taxId || '',
                traderType: user.carrierConfig?.traderType || defaultAddress.traderType || 'business',
                reference: user.carrierConfig?.defaultReference || defaultAddress.reference || ''
            });
        }
    }, [user]);

    const handleProfileChange = (newData) => {
        setShipperProfile(newData);
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Update User Basic Info & Carrier Config
            const profilePayload = {
                name: shipperProfile.contactPerson,
                phone: shipperProfile.phone,
                company: shipperProfile.company,
                carrierConfig: {
                    preferredCarrier: user.carrierConfig?.preferredCarrier || 'DHL',
                    taxId: shipperProfile.taxId,
                    eori: shipperProfile.eoriNumber,
                    vatNo: shipperProfile.vatNumber,
                    traderType: shipperProfile.traderType,
                    defaultReference: shipperProfile.reference
                }
            };

            // 2. Update/Create Default Address
            // Filter out existing default addresses to replace/update logic
            let currentAddresses = [...(user.addresses || [])];

            // If we have an ID for the current profile (it was loaded from DB), update it
            // Otherwise, check if there is an existing default and update it, OR create new
            const existingDefaultIndex = currentAddresses.findIndex(a => a.isDefault);

            const newAddressObj = {
                ...shipperProfile,
                label: 'Default Shipper Profile',
                isDefault: true,
                _id: existingDefaultIndex !== -1 ? currentAddresses[existingDefaultIndex]._id : undefined
            };

            if (existingDefaultIndex !== -1) {
                currentAddresses[existingDefaultIndex] = newAddressObj;
            } else {
                currentAddresses.push(newAddressObj);
            }

            profilePayload.addresses = currentAddresses;

            await axios.patch('/api/users/profile', profilePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            enqueueSnackbar('Shipper Profile Updated Successfully', { variant: 'success' });
            await refreshUser();
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Failed to update profile', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                My Profile
            </Typography>
            <Grid container spacing={4}>
                {/* Left: Default Shipper Profile */}
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box p={3} flexGrow={1}>
                            <AddressPanel
                                type="sender"
                                titleOverride="Shipper Details / Address (Default)"
                                value={shipperProfile}
                                onChange={handleProfileChange}
                            />
                        </Box>
                        <Divider />
                        <Box p={3} bgcolor="#f9fafb">
                            <Alert severity="info" sx={{ mb: 2 }}>
                                This information will be used to <strong>autofill the "Shipper" section</strong> when you create a new shipment.
                            </Alert>
                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                onClick={handleSaveProfile}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Default Shipper Profile'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right: Address Book (Receivers) */}
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <AddressBookManager />
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ProfilePage;
