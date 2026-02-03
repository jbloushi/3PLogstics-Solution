import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShipment } from '../context/ShipmentContext';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ShipmentDetails from '../components/ShipmentDetails';

const TrackingPage = () => {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const fetchedRef = useRef(false);

  const {
    shipment,
    loading,
    error,
    getShipment,
    updateShipmentLocation,
    getRouteDistance,
  } = useShipment();

  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            let errorMessage = 'Unable to retrieve your location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access was denied';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable';
                break;
              case error.TIMEOUT:
                errorMessage = 'The request to get location timed out';
                break;
              default:
                errorMessage = 'An unknown error occurred';
            }
            reject(new Error(errorMessage));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  }, []);

  // Update location with current position
  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      setLocationError(null);

      // Get current location
      const position = await getCurrentLocation();

      // Use a geocoding service to get address from coordinates
      // For now, we'll just use the coordinates as the address
      const address = `Lat: ${position.latitude.toFixed(6)}, Lng: ${position.longitude.toFixed(6)}`;

      // Update shipment location
      await updateShipmentLocation(trackingNumber, {
        coordinates: [position.longitude, position.latitude],
        address,
        status: 'in_transit',
        description: 'Location updated by user',
      });

      // Refresh shipment data
      await getShipment(trackingNumber);

      // Refresh route distance data
      await getRouteDistance(trackingNumber);

    } catch (error) {
      console.error('Error updating location:', error);
      setLocationError(error.message);
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Fetch shipment data on component mount or when tracking number changes
  useEffect(() => {
    if (!trackingNumber) return;

    // Reset ref when tracking number changes to allow re-fetch
    fetchedRef.current = false;

    const fetchShipmentData = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      try {
        await getShipment(trackingNumber);
      } catch (error) {
        console.error('Error fetching shipment:', error);
      }
    };

    fetchShipmentData();
  }, [trackingNumber, getShipment]);

  if (loading && !shipment) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </Container>
    );
  }

  if (!shipment && !loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Shipment not found or data is loading...
        </Alert>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Home
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.open(`${process.env.REACT_APP_API_URL}/shipments/${shipment.trackingNumber}/label`, '_blank')}
          >
            Print Label
          </Button>
        </Box>

        <Typography variant="h3" component="h1" gutterBottom fontWeight="900" sx={{
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          textFillColor: 'transparent',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          mb: 0.5
        }}>
          Shipment Tracking
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={4} sx={{ fontWeight: 500 }}>
          Tracking Number: <Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>{shipment.trackingNumber}</Box>
        </Typography>

        <Grid container spacing={3}>
          {/* Shipment Details Section */}
          <Grid item xs={12}>
            <ShipmentDetails
              shipment={shipment}
              onUpdateLocation={handleUpdateLocation}
              updatingLocation={updatingLocation}
              locationError={locationError}
            />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TrackingPage;
