import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipment } from '../context/ShipmentContext';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,

  Paper,
  Card,
  CardContent,
  Grid,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  FormHelperText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  alpha,
  useTheme
} from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { throttle } from 'lodash';
import LocationIcon from '@mui/icons-material/LocationOn';
import RouteIcon from '@mui/icons-material/Route';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';

// Common country codes for phone numbers
const countryCodes = [
  { code: '+1', country: 'US/Canada/Puerto Rico' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+7', country: 'Russia/Kazakhstan' },
  { code: '+61', country: 'Australia' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
  { code: '+34', country: 'Spain' },
  { code: '+82', country: 'South Korea' },
  { code: '+62', country: 'Indonesia' },
  { code: '+90', country: 'Turkey' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+971', country: 'UAE' },
  { code: '+965', country: 'Kuwait' },
  { code: '+20', country: 'Egypt' },
  { code: '+27', country: 'South Africa' },
  { code: '+92', country: 'Pakistan' },
  { code: '+234', country: 'Nigeria' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+63', country: 'Philippines' },
  { code: '+84', country: 'Vietnam' },
  { code: '+98', country: 'Iran' },
  { code: '+66', country: 'Thailand' },
  { code: '+95', country: 'Myanmar' },
  { code: '+251', country: 'Ethiopia' },
  { code: '+243', country: 'DR Congo' },
  { code: '+48', country: 'Poland' },
  { code: '+380', country: 'Ukraine' },
  { code: '+213', country: 'Algeria' },
  { code: '+249', country: 'Sudan' },
  { code: '+54', country: 'Argentina' },
  { code: '+256', country: 'Uganda' },
  { code: '+964', country: 'Iraq' },
  { code: '+212', country: 'Morocco' },
  { code: '+998', country: 'Uzbekistan' },
  { code: '+60', country: 'Malaysia' },
  { code: '+51', country: 'Peru' },
  { code: '+58', country: 'Venezuela' },
  { code: '+93', country: 'Afghanistan' },
  { code: '+233', country: 'Ghana' },
  { code: '+244', country: 'Angola' },
  { code: '+225', country: 'Ivory Coast' },
  { code: '+977', country: 'Nepal' },
  { code: '+254', country: 'Kenya' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+40', country: 'Romania' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+46', country: 'Sweden' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+30', country: 'Greece' },
  { code: '+351', country: 'Portugal' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+36', country: 'Hungary' },
];

// Use backend proxy for geocoding (avoids CORS issues)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Search addresses via backend proxy
const searchAddress = async (query) => {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(`${API_URL}/geocode/autocomplete?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!data.success || !data.data) {
      console.warn('Geocode API response:', data.error || 'No results');
      return [];
    }

    return data.data.map(item => ({
      id: item.placeId,
      place_id: item.placeId,
      description: item.description,
      mainText: item.mainText,
      secondaryText: item.secondaryText
    }));
  } catch (error) {
    console.error('Error searching address:', error);
    return [];
  }
};

// Get full place details (coordinates, parsed address) via backend proxy
// Get full place details (coordinates, parsed address) via backend proxy
const getPlaceDetails = async (placeId) => {
  if (!placeId) return null;

  try {
    const response = await fetch(`${API_URL}/geocode/details/${placeId}`);
    const data = await response.json();

    if (!data.success) {
      console.warn('Place details error:', data.error);
      return null;
    }

    return data.data; // { formattedAddress, coordinates, city, postalCode, countryCode, etc. }
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
};

const steps = ['Shipment Details', 'Customer Information', 'Items'];

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone validation regex - more flexible for international formats
const phoneRegex = /^[0-9\s\-()]{5,15}$/;

const CreateShipmentPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { createShipment } = useShipment();
  const { user } = useAuth(); // Get current user
  const isStaff = ['staff', 'admin'].includes(user?.role);

  const [formData, setFormData] = useState({
    userId: '', // For staff to select sender
    origin: {
      address: '',
      coordinates: [0, 0],
      addressDetails: '',
    },
    destination: {
      address: '',
      coordinates: [0, 0],
      addressDetails: '',
    },
    checkpoints: [],
    customer: {
      name: '',
      email: '',
      phone: '',
      phoneCountryCode: '+1',
      vatNo: '',
      eori: '',
      taxId: '',
    },
    items: [
      {
        description: '',
        quantity: 1,
        weight: 0,
        dimensions: { length: 0, width: 0, height: 0 },
      },
    ],
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: 'ready_for_pickup',
  });

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [originPredictions, setOriginPredictions] = useState([]);
  const [destinationPredictions, setDestinationPredictions] = useState([]);
  const [checkpointPredictions, setCheckpointPredictions] = useState([]);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(null);

  // Fetch clients if staff
  React.useEffect(() => {
    if (isStaff) {
      const fetchClients = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/auth/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (data.success) {
            setClients(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch clients', error);
        }
      };
      fetchClients();
    }
  }, [isStaff]);

  // Throttled function to fetch place predictions
  const fetchPredictions = useMemo(
    () => throttle(async (query, field) => {
      if (query.length < 3) return;
      const predictions = await searchAddress(query);
      if (field === 'origin') setOriginPredictions(predictions);
      else if (field === 'destination') setDestinationPredictions(predictions);
      else if (field === 'checkpoint') setCheckpointPredictions(predictions);
    }, 300),
    []
  );

  // Auto-fill sender info when Staff selects a client
  React.useEffect(() => {
    if (isStaff && formData.userId && clients.length > 0) {
      const client = clients.find(c => c._id === formData.userId);
      if (client) {
        // Find default address or first address
        const defaultAddr = client.addresses?.find(a => a.isDefault) || client.addresses?.[0];

        let shouldUpdate = false;
        const newFormData = { ...formData };

        // Update Origin Address if available
        if (defaultAddr) {
          const addressStr = `${defaultAddr.streetLines?.[0] || ''}, ${defaultAddr.city || ''} ${defaultAddr.postalCode || ''}, ${defaultAddr.countryCode || ''}`.replace(/^, /, '').replace(/, $/, '').replace(/, ,/g, ',');
          if (addressStr.length > 5 && newFormData.origin.address !== addressStr) {
            newFormData.origin.address = addressStr;
            newFormData.origin.city = defaultAddr.city || '';
            newFormData.origin.postalCode = defaultAddr.postalCode || '';
            newFormData.origin.countryCode = defaultAddr.countryCode || '';
            shouldUpdate = true;
          }
        }

        // Update Customer Info
        if (client.name && newFormData.customer.name !== client.name) {
          newFormData.customer.name = client.name;
          shouldUpdate = true;
        }
        if (client.email && newFormData.customer.email !== client.email) {
          newFormData.customer.email = client.email;
          shouldUpdate = true;
        }
        if (client.phone && newFormData.customer.phone !== client.phone) {
          newFormData.customer.phone = client.phone;
          shouldUpdate = true;
        }

        // Tax IDs
        const carrierConfig = client.carrierConfig || {};
        if (carrierConfig.vatNo && newFormData.customer.vatNo !== carrierConfig.vatNo) {
          newFormData.customer.vatNo = carrierConfig.vatNo;
          shouldUpdate = true;
        }
        if (carrierConfig.eori && newFormData.customer.eori !== carrierConfig.eori) {
          newFormData.customer.eori = carrierConfig.eori;
          shouldUpdate = true;
        }
        if (carrierConfig.taxId && newFormData.customer.taxId !== carrierConfig.taxId) {
          newFormData.customer.taxId = carrierConfig.taxId;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          setFormData(newFormData);
          enqueueSnackbar(`Auto-filled details for ${client.name}`, { variant: 'info' });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.userId, clients, isStaff]);

  // Client Autofill (Own Profile)
  React.useEffect(() => {
    if (!isStaff && user && !formData.customer.name) {
      const defaultAddr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
      const newFormData = { ...formData };

      if (defaultAddr) {
        const addressStr = `${defaultAddr.streetLines?.[0] || ''}, ${defaultAddr.city || ''} ${defaultAddr.postalCode || ''}, ${defaultAddr.countryCode || ''}`.replace(/^, /, '').replace(/, $/, '').replace(/, ,/g, ',');
        if (addressStr.length > 5) {
          newFormData.origin.address = addressStr;
          newFormData.origin.city = defaultAddr.city || '';
          newFormData.origin.postalCode = defaultAddr.postalCode || '';
          newFormData.origin.countryCode = defaultAddr.countryCode || '';
        }
      }
      newFormData.customer.name = user.name || '';
      newFormData.customer.email = user.email || '';
      if (user.phone) newFormData.customer.phone = user.phone;

      // Tax IDs
      const carrierConfig = user.carrierConfig || {};
      if (carrierConfig.vatNo) newFormData.customer.vatNo = carrierConfig.vatNo;
      if (carrierConfig.eori) newFormData.customer.eori = carrierConfig.eori;
      if (carrierConfig.taxId) newFormData.customer.taxId = carrierConfig.taxId;

      setFormData(newFormData);
    }
  }, [isStaff, user]);

  // Autosave
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('shipment_wizard_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.userId === user?._id) {
          setFormData(prev => ({ ...prev, ...parsed.data }));
          if (parsed.step) setCurrentStep(parsed.step);
          enqueueSnackbar('Restored your unfinished draft', { variant: 'info' });
        }
      } catch (e) { console.error(e); }
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      localStorage.setItem('shipment_wizard_draft', JSON.stringify({
        userId: user._id,
        data: formData,
        step: currentStep,
        timestamp: Date.now()
      }));
    }
  }, [formData, currentStep, user]);

  // Handle address input change
  const handleAddressChange = (field, value, index = null) => {
    if (field === 'checkpoint' && index !== null) {
      setFormData(prev => {
        const updatedCheckpoints = [...prev.checkpoints];
        updatedCheckpoints[index] = { ...updatedCheckpoints[index], location: { ...updatedCheckpoints[index].location, address: value } };
        return { ...prev, checkpoints: updatedCheckpoints };
      });
      setActiveCheckpointIndex(index);
      if (!value.trim()) { setCheckpointPredictions([]); return; }
      fetchPredictions(value, 'checkpoint');
      return;
    }
    setFormData(prev => ({ ...prev, [field]: { ...prev[field], address: value } }));
    if (!value.trim()) {
      if (field === 'origin') setOriginPredictions([]);
      else if (field === 'destination') setDestinationPredictions([]);
      return;
    }
    fetchPredictions(value, field);
  };

  // Handle place selection
  const handlePlaceSelect = async (field, place, index = null) => {
    // Fetch full details
    const details = await getPlaceDetails(place.place_id);

    // Fallback if details fail
    const address = details?.formattedAddress || place.description;
    const coordinates = details?.coordinates || place.coordinates;
    const city = details?.city || '';
    const postalCode = details?.postalCode || '';
    const countryCode = details?.countryCode || '';

    // For checkpoints
    if (field === 'checkpoint' && index !== null) {
      setFormData(prev => {
        const updatedCheckpoints = [...prev.checkpoints];
        updatedCheckpoints[index] = {
          ...updatedCheckpoints[index],
          location: {
            ...updatedCheckpoints[index].location,
            address: address,
            coordinates: coordinates,
            city, postalCode, countryCode
          }
        };
        return {
          ...prev,
          checkpoints: updatedCheckpoints
        };
      });

      // Clear predictions
      setCheckpointPredictions([]);
      return;
    }

    // For origin and destination
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        address: address,
        coordinates: coordinates,
        city,
        postalCode,
        countryCode
      }
    }));

    // Clear predictions
    if (field === 'origin') setOriginPredictions([]);
    else if (field === 'destination') setDestinationPredictions([]);
  };

  // Format address display with country highlighting
  const formatAddressDisplay = (place) => {
    const isIndian = place.country === 'India';
    return (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {place.description}
        </Typography>
        <Typography
          variant="caption"
          color={isIndian ? 'primary.main' : 'text.secondary'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: isIndian ? 500 : 400
          }}
        >
          {place.country}
        </Typography>
      </Box>
    );
  };

  // Handle country code change
  const handleCountryCodeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        phoneCountryCode: e.target.value
      }
    }));
  };

  // Get full phone number with country code
  const getFullPhoneNumber = () => {
    if (!formData.customer.phone) return '';
    return `${formData.customer.phoneCountryCode} ${formData.customer.phone}`;
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // Origin validation - only require address text, not coordinates (for manual entry)
      if (!formData.origin.address) {
        newErrors.origin = 'Origin address is required';
      }

      // Destination validation - only require address text
      if (!formData.destination.address) {
        newErrors.destination = 'Destination address is required';
      }

      // Checkpoint validation
      const checkpointErrors = [];
      formData.checkpoints.forEach((checkpoint, index) => {
        const cpErrors = {};

        if (!checkpoint.name) {
          cpErrors.name = 'Checkpoint name is required';
        }

        if (!checkpoint.location.address) {
          cpErrors.address = 'Checkpoint address is required';
        }

        if (Object.keys(cpErrors).length > 0) {
          checkpointErrors[index] = cpErrors;
        }
      });

      if (checkpointErrors.length > 0) {
        newErrors.checkpoints = checkpointErrors;
      }
    } else if (step === 2) {
      if (!formData.customer.name.trim()) {
        newErrors.customerName = 'Customer name is required';
      }

      // Enhanced email validation
      if (!formData.customer.email.trim()) {
        newErrors.customerEmail = 'Email is required';
      } else if (!emailRegex.test(formData.customer.email)) {
        newErrors.customerEmail = 'Please enter a valid email address';
      }

      // Phone validation (optional but validated if provided)
      if (formData.customer.phone.trim() && !phoneRegex.test(formData.customer.phone)) {
        newErrors.customerPhone = 'Please enter a valid phone number (digits, spaces, and dashes only)';
      }
    } else if (step === 3) {
      if (Array.isArray(formData.items)) {
        formData.items.forEach((item, index) => {
          if (!item.description.trim()) {
            newErrors[`item-${index}-description`] = 'Item description is required';
          }
          if (item.quantity <= 0) {
            newErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0';
          }
        });
      } else {
        newErrors.items = 'Items data is invalid';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const parts = name.split('.');

      // Handle items array specifically
      if (parts[0] === 'items') {
        const index = parseInt(parts[1]);
        const field = parts[2];

        // Make a copy of the current items array to avoid mutation issues
        const updatedItems = Array.isArray(formData.items)
          ? [...formData.items]
          : [{
            description: '',
            quantity: 1,
            weight: 0,
            dimensions: { length: 0, width: 0, height: 0 },
          }];

        // Ensure the item at this index exists
        if (!updatedItems[index]) {
          updatedItems[index] = {
            description: '',
            quantity: 1,
            weight: 0,
            dimensions: { length: 0, width: 0, height: 0 },
          };
        }

        // Handle dimensions separately
        if (field === 'dimensions.length' || field === 'dimensions.width' || field === 'dimensions.height') {
          const dimField = field.split('.')[1];
          updatedItems[index].dimensions = {
            ...updatedItems[index].dimensions,
            [dimField]: parseFloat(value) || 0,
          };
        } else {
          // Handle regular fields
          updatedItems[index][field] = field === 'quantity' || field === 'weight'
            ? parseFloat(value) || 0
            : value;
        }

        // Update the form data with the new items array
        setFormData(prev => ({
          ...prev,
          items: updatedItems,
        }));

        return;
      }

      // Handle nested objects like customer.name, origin.address, etc.
      const [parent, child] = parts;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));

      // Clear validation errors when field is edited
      if (errors[`${parent}${child.charAt(0).toUpperCase() + child.slice(1)}`]) {
        setErrors(prev => ({
          ...prev,
          [`${parent}${child.charAt(0).toUpperCase() + child.slice(1)}`]: ''
        }));
      }
    } else {
      // Handle top-level fields
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Fix the handleAddItem function to ensure it works correctly
  const handleAddItem = () => {
    // Use a safer approach to add items that works even if items is not an array
    setFormData(prev => {
      // Ensure items is an array before adding to it
      const currentItems = Array.isArray(prev.items) ? prev.items : [];

      return {
        ...prev,
        items: [
          ...currentItems,
          {
            description: '',
            quantity: 1, // Fix: Ensure new items start with quantity 1
            weight: 0,
            dimensions: {
              length: 0,
              width: 0,
              height: 0,
            },
          },
        ],
      };
    });

    // Log for debugging
    console.log('Item added');
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;

    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Add a checkpoint
  const handleAddCheckpoint = () => {
    setFormData(prev => ({
      ...prev,
      checkpoints: [
        ...prev.checkpoints,
        {
          name: `Checkpoint ${prev.checkpoints.length + 1}`,
          location: {
            address: '',
            coordinates: [0, 0],
            addressDetails: '' // Additional field for manual address details
          },
          estimatedArrival: null,
          notes: ''
        }
      ]
    }));
  };

  // Remove a checkpoint
  const handleRemoveCheckpoint = (index) => {
    setFormData(prev => {
      const updatedCheckpoints = [...prev.checkpoints];
      updatedCheckpoints.splice(index, 1);

      // Rename checkpoints
      const renamedCheckpoints = updatedCheckpoints.map((cp, i) => ({
        ...cp,
        name: `Checkpoint ${i + 1}`
      }));

      return {
        ...prev,
        checkpoints: renamedCheckpoints
      };
    });
  };

  // Update checkpoint field
  const handleCheckpointChange = (index, field, value) => {
    setFormData(prev => {
      const updatedCheckpoints = [...prev.checkpoints];

      if (field === 'name' || field === 'notes') {
        updatedCheckpoints[index] = {
          ...updatedCheckpoints[index],
          [field]: value
        };
      } else if (field === 'estimatedArrival') {
        updatedCheckpoints[index] = {
          ...updatedCheckpoints[index],
          [field]: value
        };
      } else if (field === 'location.addressDetails') {
        updatedCheckpoints[index] = {
          ...updatedCheckpoints[index],
          location: {
            ...updatedCheckpoints[index].location,
            addressDetails: value
          }
        };
      }

      return {
        ...prev,
        checkpoints: updatedCheckpoints
      };
    });
  };

  const handleSubmit = async (e, status = 'ready_for_pickup') => {
    if (e && e.preventDefault) e.preventDefault();

    // Validate all steps
    let isValid = true;

    // Validate Step 1 (Sender Selection for Staff)
    if (currentStep === 1) {
      if (isStaff && !formData.userId) {
        setErrors(prev => ({ ...prev, userId: 'Please select a sender' }));
        isValid = false;
      }
    }

    for (let step = 1; step <= steps.length; step++) {
      if (!validateStep(step)) {
        isValid = false;
        setCurrentStep(step);
        break;
      }
    }

    if (!isValid) {
      enqueueSnackbar('Please correct the errors before submitting', { variant: 'error' });
      return;
    }

    setLoading(true);

    try {
      // Format the data for API
      const shipmentData = {
        origin: {
          coordinates: formData.origin.coordinates,
          address: formData.origin.address + (formData.origin.addressDetails ? `, ${formData.origin.addressDetails}` : '')
        },
        destination: {
          coordinates: formData.destination.coordinates,
          address: formData.destination.address + (formData.destination.addressDetails ? `, ${formData.destination.addressDetails}` : '')
        },
        checkpoints: formData.checkpoints.map(checkpoint => ({
          name: checkpoint.name,
          location: {
            coordinates: checkpoint.location.coordinates,
            address: checkpoint.location.address + (checkpoint.location.addressDetails ? `, ${checkpoint.location.addressDetails}` : '')
          },
          estimatedArrival: checkpoint.estimatedArrival,
          notes: checkpoint.notes
        })),
        customer: {
          name: formData.customer.name,
          email: formData.customer.email,
          phone: getFullPhoneNumber(),
          vatNo: formData.customer.vatNo,
          eori: formData.customer.eori,
          taxId: formData.customer.taxId
        },
        items: formData.items.map(item => ({
          description: item.description,
          quantity: parseInt(item.quantity, 10),
          weight: parseFloat(item.weight),
          dimensions: {
            length: parseFloat(item.dimensions.length),
            width: parseFloat(item.dimensions.width),
            height: parseFloat(item.dimensions.height)
          }
        })),
        estimatedDelivery: formData.estimatedDelivery,
        userId: formData.userId, // Pass selected sender ID
        status: status // Use status from argument
      };

      const response = await createShipment(shipmentData);

      enqueueSnackbar('Shipment created successfully!', { variant: 'success' });

      // Clear local draft
      localStorage.removeItem('shipment_wizard_draft');

      // Navigate to tracking page with the new tracking number
      if (response && response.data && response.data.trackingNumber) {
        navigate(`/tracking/${response.data.trackingNumber}`);
      } else if (response && response.trackingNumber) {
        navigate(`/tracking/${response.trackingNumber}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      enqueueSnackbar(error.message || 'Failed to create shipment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {isStaff && (
              <Box mb={4}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Sender Information (Staff Only)
                </Typography>
                <Card sx={{ borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
                  <CardContent sx={{ p: 3 }}>
                    <FormControl fullWidth error={!!errors.userId}>
                      <InputLabel>Select Client / Sender</InputLabel>
                      <Select
                        name="userId"
                        value={formData.userId}
                        label="Select Client / Sender"
                        onChange={handleInputChange}
                      >
                        {clients.map(client => (
                          <MenuItem key={client._id} value={client._id}>
                            {client.name} ({client.email})
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.userId && <FormHelperText>{errors.userId}</FormHelperText>}
                    </FormControl>
                  </CardContent>
                </Card>
              </Box>
            )}
            {renderStep1()}
          </>
        );
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  // Customer Information Step
  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'medium' }}>
        Customer Information
      </Typography>

      <Card sx={{ mb: 4, borderRadius: 2, borderLeft: '4px solid #2196f3' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: '#2196f3' }} />
            Contact Details
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Name"
                name="customer.name"
                value={formData.customer.name}
                onChange={handleInputChange}
                error={!!errors.customerName}
                helperText={errors.customerName}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                name="customer.email"
                value={formData.customer.email}
                onChange={handleInputChange}
                error={!!errors.customerEmail}
                helperText={errors.customerEmail}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              {!errors.customerEmail && (
                <FormHelperText>
                  Format: example@domain.com
                </FormHelperText>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <FormControl sx={{ width: '40%', mt: 2 }}>
                  <InputLabel id="country-code-label">Country Code</InputLabel>
                  <Select
                    labelId="country-code-label"
                    value={formData.customer.phoneCountryCode}
                    onChange={handleCountryCodeChange}
                    label="Country Code"
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    }}
                  >
                    {countryCodes.map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        {country.code} ({country.country})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Phone Number"
                  name="customer.phone"
                  value={formData.customer.phone}
                  onChange={handleInputChange}
                  error={!!errors.customerPhone}
                  helperText={errors.customerPhone || "Enter digits, spaces, and dashes only"}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {!errors.customerPhone && formData.customer.phone && (
                <FormHelperText>
                  Full number: {getFullPhoneNumber()}
                </FormHelperText>
              )}
            </Grid>

            {/* Tax IDs */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                Tax & Customs (Optional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="VAT Number"
                    name="customer.vatNo"
                    value={formData.customer.vatNo}
                    onChange={handleInputChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="EORI Number"
                    name="customer.eori"
                    value={formData.customer.eori}
                    onChange={handleInputChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tax ID"
                    name="customer.taxId"
                    value={formData.customer.taxId}
                    onChange={handleInputChange}
                    margin="dense"
                  />
                </Grid>
              </Grid>
            </Grid>

          </Grid>

        </CardContent>
      </Card >
    </Box >
  );

  // Items Step
  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'medium' }}>
        Shipment Items
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon sx={{ mr: 1, color: '#f44336' }} />
          Items in Shipment
        </Typography>

        <Button
          variant="outlined"
          color="error"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
        >
          Add Item
        </Button>
      </Box>

      {Array.isArray(formData.items) ? formData.items.map((item, index) => (
        <Card
          key={index}
          sx={{
            mb: 3,
            position: 'relative',
            borderRadius: 2,
            borderLeft: '4px solid #f44336'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {formData.items.length > 1 && (
              <IconButton
                size="small"
                onClick={() => handleRemoveItem(index)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'error.main',
                }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            )}

            <Typography variant="subtitle2" color="text.secondary" mb={2} sx={{ fontWeight: 'bold' }}>
              Item {index + 1}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name={`items.${index}.description`}
                  value={item.description}
                  onChange={handleInputChange}
                  error={!!errors[`item-${index}-description`]}
                  helperText={errors[`item-${index}-description`]}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  name={`items.${index}.quantity`}
                  value={item.quantity}
                  onChange={handleInputChange}
                  error={!!errors[`item-${index}-quantity`]}
                  helperText={errors[`item-${index}-quantity`]}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  type="number"
                  name={`items.${index}.weight`}
                  value={item.weight}
                  onChange={handleInputChange}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Dimensions (cm)
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Length"
                      type="number"
                      name={`items.${index}.dimensions.length`}
                      value={item.dimensions.length}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Width"
                      type="number"
                      name={`items.${index}.dimensions.width`}
                      value={item.dimensions.width}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Height"
                      type="number"
                      name={`items.${index}.dimensions.height`}
                      value={item.dimensions.height}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

          </CardContent>
        </Card>
      )) : (
        <Typography color="error">
          No items available. Please go back and try again.
        </Typography>
      )}
    </Box >
  );

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'medium' }}>
        Shipment Route
      </Typography>

      {/* Origin Address */}
      {/* Origin Address */}
      <Card sx={{ mb: 4, borderRadius: 2, borderLeft: '4px solid #3f51b5' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <LocationIcon sx={{ mr: 1, color: '#3f51b5' }} />
            Origin Address
          </Typography>
          <TextField
            fullWidth
            label="Search for origin address"
            value={formData.origin.address}
            onChange={(e) => handleAddressChange('origin', e.target.value)}
            error={!!errors.origin}
            helperText={errors.origin}
            sx={{ mb: 1 }}
          />
          {originPredictions.length > 0 && (
            <Paper elevation={3} sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
              <List>
                {originPredictions.map((place) => (
                  <ListItem
                    button
                    key={place.id}
                    onClick={() => handlePlaceSelect('origin', place)}
                  >
                    <ListItemText
                      primary={formatAddressDisplay(place)}
                      secondary={place.country}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          <TextField
            fullWidth
            label="Additional Address Details (optional)"
            name="origin.addressDetails"
            value={formData.origin.addressDetails}
            onChange={handleInputChange}
            placeholder="Apartment, suite, unit, building, floor, etc."
            margin="normal"
          />
        </CardContent>
      </Card>

      {/* Checkpoints */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <RouteIcon sx={{ mr: 1, color: '#9c27b0' }} />
            Checkpoints (Optional)
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddCheckpoint}
            variant="outlined"
            color="secondary"
            size="small"
          >
            Add Checkpoint
          </Button>
        </Box>

        {formData.checkpoints.map((checkpoint, index) => (
          <Card key={index} sx={{ mb: 2, borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Checkpoint {index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveCheckpoint(index)}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Checkpoint Name"
                    value={checkpoint.name}
                    onChange={(e) => handleCheckpointChange(index, 'name', e.target.value)}
                    error={!!errors.checkpoints?.[index]?.name}
                    helperText={errors.checkpoints?.[index]?.name}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Estimated Arrival Date"
                    type="date"
                    value={checkpoint.estimatedArrival ? new Date(checkpoint.estimatedArrival).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleCheckpointChange(index, 'estimatedArrival', e.target.value ? new Date(e.target.value) : null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Search for checkpoint address"
                    value={checkpoint.location.address}
                    onChange={(e) => handleAddressChange('checkpoint', e.target.value, index)}
                    error={!!errors.checkpoints?.[index]?.address}
                    helperText={errors.checkpoints?.[index]?.address}
                  />
                  {activeCheckpointIndex === index && checkpointPredictions.length > 0 && (
                    <Paper elevation={3} sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                      <List>
                        {checkpointPredictions.map((place) => (
                          <ListItem
                            button
                            key={place.id}
                            onClick={() => handlePlaceSelect('checkpoint', place, index)}
                          >
                            <ListItemText
                              primary={formatAddressDisplay(place)}
                              secondary={place.country}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}
                  <TextField
                    fullWidth
                    label="Additional Address Details (optional)"
                    value={checkpoint.location.addressDetails || ''}
                    onChange={(e) => handleCheckpointChange(index, 'location.addressDetails', e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    margin="normal"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    value={checkpoint.notes}
                    onChange={(e) => handleCheckpointChange(index, 'notes', e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>

            </CardContent>
          </Card>
        ))}
      </Box >

      {/* Destination Address */}
      <Card sx={{ mb: 4, borderRadius: 2, borderLeft: '4px solid #4caf50' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <LocationIcon sx={{ mr: 1, color: '#4caf50' }} />
            Destination Address
          </Typography>
          <TextField
            fullWidth
            label="Search for destination address"
            value={formData.destination.address}
            onChange={(e) => handleAddressChange('destination', e.target.value)}
            error={!!errors.destination}
            helperText={errors.destination}
            sx={{ mb: 1 }}
          />
          {destinationPredictions.length > 0 && (
            <Paper elevation={3} sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
              <List>
                {destinationPredictions.map((place) => (
                  <ListItem
                    button
                    key={place.id}
                    onClick={() => handlePlaceSelect('destination', place)}
                  >
                    <ListItemText
                      primary={formatAddressDisplay(place)}
                      secondary={place.country}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          <TextField
            fullWidth
            label="Additional Address Details (optional)"
            name="destination.addressDetails"
            value={formData.destination.addressDetails}
            onChange={handleInputChange}
            placeholder="Apartment, suite, unit, building, floor, etc."
            margin="normal"
          />
        </CardContent>
      </Card>

      {/* Estimated Delivery Date */}
      <Card sx={{ mb: 4, borderRadius: 2, borderLeft: '4px solid #ff9800' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CalendarIcon sx={{ mr: 1, color: '#ff9800' }} />
            Estimated Delivery Date
          </Typography>
          <TextField
            fullWidth
            type="date"
            value={formData.estimatedDelivery ? new Date(formData.estimatedDelivery).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange({
              target: {
                name: 'estimatedDelivery',
                value: e.target.value ? new Date(e.target.value) : null
              }
            })}
            InputLabelProps={{ shrink: true }}
            error={!!errors.estimatedDelivery}
            helperText={errors.estimatedDelivery}
          />

        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Create New Shipment"
        description="Follow the steps below to schedule a new delivery."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Shipments', href: '/shipments' },
          { label: 'Create', href: '/create-shipment' }
        ]}
      />

      <Card sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', overflow: 'visible' }}>
        <CardContent sx={{ p: { xs: 2, sm: 5 } }}>

          {/* Stepper */}
          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={currentStep - 1} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <form onSubmit={handleSubmit}>
            {/* Step Content */}
            <Box sx={{ minHeight: '50vh' }}>
              {renderStep()}
            </Box>

            {/* Navigation Buttons */}
            <Box mt={4} display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={currentStep === 1 || loading}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              <Box>
                {currentStep < steps.length ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    disabled={loading}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next
                  </Button>
                ) : (
                  <Box>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={(e) => handleSubmit(e, 'draft')}
                      disabled={loading}
                      sx={{ mr: 2 }}
                      startIcon={<AssignmentIcon />}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={loading}
                      endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
                    >
                      {loading ? 'Creating...' : 'Create Shipment'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateShipmentPage;
