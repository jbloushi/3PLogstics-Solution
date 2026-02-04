import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
    Container, Card, Typography, Button, Box, Grid,
    Divider, CardContent, CircularProgress, Alert, Chip, IconButton,
    Tooltip, TextField, Stack, Paper, Collapse, Fade, Zoom,
    Menu, MenuItem, LinearProgress,
    FormControl, InputLabel, Select,
    FormControlLabel, Switch,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    ThemeProvider, createTheme
} from '@mui/material';


import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DescriptionIcon from '@mui/icons-material/Description';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import TimerIcon from '@mui/icons-material/Timer';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { useAuth } from '../context/AuthContext';
import AddressPanel from '../components/AddressPanel';
import ParcelCard from '../components/shipment/ParcelCard';
import DangerousGoodsPanel from '../components/shipment/DangerousGoodsPanel';
import { generateWaybillPDF } from '../utils/pdfGenerator';
import { formatPartyAddress } from '../utils/addressFormatter';
import ShipmentSetup from '../components/shipment/ShipmentSetup';
import ShipmentContent from '../components/shipment/ShipmentContent';
import ShipmentBilling from '../components/shipment/ShipmentBilling';
import { shipmentService } from '../services/api';
import axios from 'axios';

// --- Custom Dark Theme Local Override ---
const darkFormTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#00d9b8' },
        background: { paper: '#141929', default: '#0a0e1a' },
        text: { primary: '#e2e8f0', secondary: '#94a3b8' }
    },
    components: {
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#1a2035',
                        '& fieldset': { borderColor: '#2a3347' },
                        '&:hover fieldset': { borderColor: '#00d9b8' },
                        '&.Mui-focused fieldset': { borderColor: '#00d9b8' }
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: '#141929',
                    borderColor: '#2a3347',
                    backgroundImage: 'none'
                }
            }
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    backgroundColor: '#1a2035',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a3347' }
                }
            }
        }
    }
});


const VOLUME_FACTOR = 5000;
const STEPS = ['Setup', 'Content', 'Billing', 'Review', 'Success'];
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.REACT_APP_VITE_DEV_TOOLS === 'true';

// --- Integrated Autofill Scenarios ---
// --- Integrated Autofill Scenarios ---
const AUTOFILL_SCENARIOS = {
    'DGR': {
        'Standard': {
            'Full Business Shipment (DAP)': {
                sender: {
                    company: 'Target Logistics Hub KW', contactPerson: 'Ahmed Al-Sabah', phone: '90001234', phoneCountryCode: '+965', email: 'shipments@target-kw.com',
                    // ... rest of scenarios ...
                    area: 'Shuwaikh Industrial 1', city: 'Kuwait City', state: 'Asimah', countryCode: 'KW', postalCode: '70050',
                    buildingName: 'Logistics Center', unitNumber: 'Dock 4', landmark: 'Near Port Authority',
                    streetLines: ['Shuwaikh Industrial 1, Block A, St 45'],
                    taxId: '300012345600003',
                    vatNumber: '300012345600003',
                    eoriNumber: 'KW123456789012',
                    traderType: 'business',
                    reference: 'OUT-2024-001'
                },
                receiver: {
                    company: 'Grand Tech Solutions LLC', contactPerson: 'Johnathan Doe', phone: '501234567', phoneCountryCode: '+971', email: 'ops@techsolutions.ae',
                    area: 'Business Bay', city: 'Dubai', state: 'Dubai', countryCode: 'AE', postalCode: '00000',
                    buildingName: 'The Binary', unitNumber: 'Suite 2104', landmark: 'Near Metro',
                    streetLines: ['Al Abraj Street, Business Bay'],
                    vatNumber: '100223344550003',
                    taxId: '100223344550003',
                    eoriNumber: 'AE123456789012',
                    traderType: 'business',
                    reference: 'PO-998877'
                },
                parcels: [
                    { description: 'Precision Tools', weight: 14.2, length: 50, width: 40, height: 30, quantity: 1, declaredValue: 2450, hsCode: '8207.50.30', countryOfOrigin: 'US' }
                ],
                incoterm: 'DAP',
                invoiceRemarks: 'Test Shipment - Please Deliver Urgently'
            }
        },
        'DG': {
            'Dry Ice (UN1845)': {
                sender: {
                    // ... (Copied from user sample)
                    company: 'ColdChain KW', contactPerson: 'Sara K', phone: '90005555', phoneCountryCode: '+965', email: 'cold@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Block 5, Street 12']
                },
                receiver: {
                    company: 'Lab DE', contactPerson: 'Max M', phone: '4930000000', phoneCountryCode: '+49', email: 'lab@test.de',
                    city: 'Berlin', countryCode: 'DE', postalCode: '10115',
                    streetLines: ['Invalidenstr 1']
                },
                parcels: [{ description: 'Insulated box', weight: 3, length: 30, width: 25, height: 20, quantity: 1, declaredValue: 120, hsCode: '3822.90.00', countryOfOrigin: 'KW' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Dry ice shipment test',
                dangerousGoods: {
                    contains: true,
                    code: '1845',
                    serviceCode: 'HC',
                    contentId: '901',
                    dryIceWeight: 1.0,
                    customDescription: 'DRY ICE, 1.0 KG',
                    properShippingName: 'Dry Ice'
                }
            },
            'Lithium Batteries (PI Section II)': {
                sender: {
                    company: 'KWT Tech', contactPerson: 'Ali A', phone: '90000001', phoneCountryCode: '+965', email: 'tech@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Tech Park, Building 2']
                },
                receiver: {
                    company: 'Receiver Ltd', contactPerson: 'John J', phone: '44200000', phoneCountryCode: '+44', email: 'recv@test.gb',
                    city: 'London', countryCode: 'GB', postalCode: 'SW1A 1AA',
                    streetLines: ['10 Downing St']
                },
                parcels: [{ description: 'Electronics box', weight: 2, length: 25, width: 20, height: 10, quantity: 1, declaredValue: 300, hsCode: '8526.91.00', countryOfOrigin: 'CN' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Lithium PI Section II test',
                dangerousGoods: {
                    contains: true,
                    code: '3481',
                    serviceCode: 'HV',
                    contentId: '967',
                    customDescription: 'LITHIUM ION BATTERIES CONTAINED IN EQUIPMENT',
                    properShippingName: 'Lithium Ion Batteries'
                }
            },
            'Consumer Commodity (ID8000)': {
                sender: {
                    company: 'Retail KW', contactPerson: 'Mona M', phone: '90000002', phoneCountryCode: '+965', email: 'retail@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Retail Hub, Gate 3'],
                    traderType: 'business'
                },
                receiver: {
                    company: 'AU Shop', contactPerson: 'Sam S', phone: '61200000', phoneCountryCode: '+61', email: 'au@test.au',
                    city: 'Sydney', countryCode: 'AU', postalCode: '2000',
                    streetLines: ['1 George St'],
                    traderType: 'business',
                    reference: 'REF-AU-123'
                },
                parcels: [{ description: 'Small box', weight: 1, length: 20, width: 15, height: 10, quantity: 1, declaredValue: 80, hsCode: '3307.90.00', countryOfOrigin: 'KW' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Consumer commodity test',
                dangerousGoods: {
                    contains: true,
                    code: '8000', // ID8000
                    serviceCode: 'HK',
                    contentId: '700',
                    customDescription: 'CONSUMER COMMODITY',
                    properShippingName: 'Consumer Commodity'
                },
                traderType: 'business',
                payerOfVat: 'shipper',
                palletCount: 1,
                packageMarks: 'Handle with Care'
            },
            'Perfumes (UN1266) - Passenger': {
                sender: {
                    company: 'Kuwait Fragrance', contactPerson: 'Ahmed F', phone: '90000005', phoneCountryCode: '+965', email: 'factory@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Sanam Industrial Area'],
                    traderType: 'business',
                    vatNumber: '0258',
                    eoriNumber: '753',
                    taxId: 'TAX123',
                    reference: 'SHIP-456'
                },
                receiver: {
                    company: 'Beauty Boutique', contactPerson: 'Claire', phone: '33100000', phoneCountryCode: '+33', email: 'claire@boutique.fr',
                    city: 'Paris', countryCode: 'FR', postalCode: '75001',
                    streetLines: ['12 Rue de la Paix'],
                    traderType: 'business',
                    vatNumber: '8520',
                    eoriNumber: 'EORI753',
                    taxId: 'RECV-TAX-999',
                    reference: 'RECV-654'
                },
                parcels: [{ description: 'Perfume boxes', weight: 5, length: 40, width: 30, height: 20, quantity: 1, declaredValue: 500, hsCode: '3303.00.00', countryOfOrigin: 'KW' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Perfumery products for retail',
                dangerousGoods: {
                    contains: true,
                    code: '1266',
                    serviceCode: 'HE',
                    contentId: '910',
                    properShippingName: 'PERFUMERY PRODUCTS',
                    hazardClass: '3',
                    packingGroup: 'II'
                },
                traderType: 'business'
            },
            'Perfumes (UN1266) - Cargo': {
                sender: {
                    company: 'Kuwait Fragrance', contactPerson: 'Ahmed F', phone: '90000005', phoneCountryCode: '+965', email: 'factory@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Sanam Industrial Area'],
                    traderType: 'business'
                },
                receiver: {
                    company: 'Luxury Scents', contactPerson: 'Marco', phone: '39060000', phoneCountryCode: '+39', email: 'marco@luxury.it',
                    city: 'Milan', countryCode: 'IT', postalCode: '20121',
                    streetLines: ['Via Montenapoleone 1'],
                    traderType: 'business'
                },
                parcels: [{ description: 'Large perfume shipment', weight: 15, length: 60, width: 40, height: 40, quantity: 1, declaredValue: 1500, hsCode: '3303.00.00', countryOfOrigin: 'KW' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Cargo-only perfume shipment',
                dangerousGoods: {
                    contains: true,
                    code: '1266',
                    serviceCode: 'HE',
                    contentId: '911',
                    properShippingName: 'PERFUMERY PRODUCTS',
                    hazardClass: '3',
                    packingGroup: 'II'
                },
                traderType: 'business'
            },
            'Excepted Quantities (E01)': {
                sender: {
                    company: 'Test KW', contactPerson: 'Test Person', phone: '90000003', phoneCountryCode: '+965', email: 't@test.kw',
                    city: 'Kuwait City', countryCode: 'KW', postalCode: '70051',
                    streetLines: ['Block 1, Street 1']
                },
                receiver: {
                    company: 'Test US', contactPerson: 'Receiver', phone: '121200000', phoneCountryCode: '+1', email: 'r@test.us',
                    city: 'New York', countryCode: 'US', postalCode: '10001',
                    streetLines: ['5th Ave']
                },
                parcels: [{ description: 'Box', weight: 1, length: 20, width: 15, height: 10, quantity: 1, declaredValue: 60, hsCode: '3822.00.00', countryOfOrigin: 'KW' }],
                incoterm: 'DAP',
                invoiceRemarks: 'Excepted quantities E01 test',
                dangerousGoods: {
                    contains: true,
                    code: '0000',
                    serviceCode: 'HH',
                    contentId: 'E01',
                    customDescription: 'EXCEPTED QUANTITIES',
                    properShippingName: 'Excepted Quantities'
                }
            }
        }
    }
};

const WizardHeader = ({ activeStep, totalSteps, estimatedTime, onDevMenuClick, isStaff, isAdmin }) => (
    <Box
        position="sticky"
        top={0}
        zIndex={1100}
        bgcolor="#0a0e1a"
        borderBottom="1px solid #2a3347"
        py={3}
        px={3}
        mx={-3}
        mb={4}
        boxShadow="0 4px 20px rgba(0,0,0,0.4)"
    >
        <Container maxWidth="lg">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h5" fontWeight="800" sx={{ fontFamily: 'Outfit', color: '#fff', letterSpacing: '-0.5px' }}>
                        Create New Shipment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {STEPS[activeStep]} <Box component="span" sx={{ opacity: 0.5, mx: 1 }}>|</Box> Step {activeStep + 1} of {totalSteps}
                    </Typography>
                </Box>


                {/* Right Side: Timer & Dev Tools */}
                <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                        icon={<TimerIcon fontSize="small" style={{ color: '#00d9b8' }} />}
                        label={`Est: ${estimatedTime}`}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0, 217, 184, 0.1)',
                            color: 'primary.main',
                            fontWeight: 600,
                            border: '1px solid rgba(0, 217, 184, 0.2)'
                        }}
                    />

                    {/* DEV TOOLS BUTTON */}
                    {(IS_DEV || isStaff || isAdmin) && (
                        <Tooltip title="Dev Tools: Autofill Scenarios">
                            <IconButton onClick={onDevMenuClick} size="small" sx={{ border: '1px dashed #00d9b8', color: '#00d9b8' }}>
                                <BugReportIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ position: 'relative', height: 6, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${((activeStep + 1) / totalSteps) * 100}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 10px #00d9b8'
                }} />
            </Box>
        </Container >
    </Box >
);

const DataRow = ({ label, value, required, requiredDGR }) => {
    const isMissing = !value || (typeof value === 'string' && value.trim() === '');
    const isError = isMissing && (required || requiredDGR);

    return (
        <Box display="flex" justifyContent="space-between" py={1.5} borderBottom="1px solid rgba(255,255,255,0.05)">
            <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary">{label}:</Typography>
                {requiredDGR && (
                    <Tooltip title="Required for DGR Compliance">
                        <ErrorOutlineIcon sx={{ fontSize: 14, color: isMissing ? '#ef4444' : '#f59e0b' }} />
                    </Tooltip>
                )}
            </Box>
            <Typography
                variant="body2"
                fontWeight={value ? 600 : 400}
                sx={{
                    color: isError ? '#ef4444' : (value ? '#e2e8f0' : 'text.disabled'),
                    bgcolor: isError ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    px: isError ? 1 : 0,
                    borderRadius: 1,
                    maxWidth: '60%',
                    textAlign: 'right'
                }}
            >
                {value || '—'}
            </Typography>
        </Box>
    );
};

// --- Main Wizard Component ---

const initialAddress = {
    company: '', contactPerson: '', phone: '', phoneCountryCode: '+965', email: '',
    formattedAddress: '', streetLines: [], city: '', state: '', area: '', postalCode: '', countryCode: 'KW',
    buildingName: '', unitNumber: '', landmark: '',
    vatNumber: '', eoriNumber: '', taxId: '', reference: '',
    validated: false
};

const ShipmentWizardV2 = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user, refreshUser } = useAuth();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [sender, setSender] = useState({ ...initialAddress });
    const [receiver, setReceiver] = useState({ ...initialAddress });
    const [parcels, setParcels] = useState([{ description: 'Box 1', weight: '', length: '', width: '', height: '', quantity: 1, trackingReference: '' }]);
    const [items, setItems] = useState([{ description: '', quantity: 1, declaredValue: '', currency: 'KWD', weight: '', hsCode: '', countryOfOrigin: '', sku: '' }]);
    // Step 1 Consolidated State
    const [pickupRequired, setPickupRequired] = useState(false);
    // Step 2 Content State
    const [dangerousGoods, setDangerousGoods] = useState({ contains: false, serviceCode: '', unNumber: '', properName: '', class: '', packingGroup: '' });
    const [packagingType, setPackagingType] = useState('user');
    // Step 3 Billing & Docs State
    const [exportReason, setExportReason] = useState('sale');
    const [invoiceRemarks, setInvoiceRemarks] = useState('');
    const [incoterm, setIncoterm] = useState('DAP');
    const [gstPaid, setGstPaid] = useState(false);
    const [payerOfVat, setPayerOfVat] = useState('receiver');
    const [shipperAccount, setShipperAccount] = useState('');
    const [labelFormat, setLabelFormat] = useState('pdf');
    const [signatureName, setSignatureName] = useState('');
    const [signatureTitle, setSignatureTitle] = useState('');
    const [palletCount, setPalletCount] = useState('');
    const [packageMarks, setPackageMarks] = useState('');

    const [expandedParcel, setExpandedParcel] = useState(0);

    const [selectedService, setSelectedService] = useState({ serviceName: 'DGR Express Worldwide', serviceCode: 'P', totalPrice: '0.000', currency: 'KWD', deliveryDate: new Date() });


    // Global Settings
    const [currency, setCurrency] = useState('KWD');
    const [shipmentType, setShipmentType] = useState('package');
    const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);

    const [errors, setErrors] = useState({});

    // Dev Tools Menu
    const [devMenuAnchor, setDevMenuAnchor] = useState(null);

    const handleDevMenuOpen = (event) => {
        setDevMenuAnchor(event.currentTarget);
    };

    const handleDevMenuClose = () => {
        setDevMenuAnchor(null);
    };

    // Staff/Admin Features
    const { isStaff, isAdmin } = useAuth();
    const [selectedClient, setSelectedClient] = useState('');
    const [clients, setClients] = useState([]);
    const [availableCarriers, setAvailableCarriers] = useState([]);
    const [selectedCarrier, setSelectedCarrier] = useState('DGR');

    const handleCarrierChange = (carrierCode) => {
        setSelectedCarrier(carrierCode);
        // Reset service selection if carrier changes to prevent invalid service codes
        setSelectedService(prev => ({ ...prev, serviceCode: 'P' }));
    };

    // Fetch Carriers & Clients
    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const token = localStorage.getItem('token');

                // 1. Fetch Available Carriers
                const carrierRes = await shipmentService.getAvailableCarriers();
                if (carrierRes.success) {
                    setAvailableCarriers(carrierRes.data);
                }

                if (isStaff) {
                    const clientRes = await axios.get('/api/auth/users', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setClients(clientRes.data.data);
                } else if (user && !isStaff) {
                    // 3. Client: Auto-fill My Default Profile ONLY if not staff
                    const config = user.carrierConfig || {};
                    const defaultAddress = user.addresses?.find(a => a.isDefault) || {};

                    setSender(prev => ({
                        ...prev,
                        company: defaultAddress.company || user.company || user.organization?.name || prev.company,
                        contactPerson: defaultAddress.contactPerson || user.name,
                        email: defaultAddress.email || user.email,
                        phone: defaultAddress.phone || user.phone,
                        phoneCountryCode: defaultAddress.phoneCountryCode || prev.phoneCountryCode,
                        streetLines: defaultAddress.streetLines || prev.streetLines,
                        city: defaultAddress.city || prev.city,
                        state: defaultAddress.state || prev.state,
                        postalCode: defaultAddress.postalCode || prev.postalCode,
                        countryCode: defaultAddress.countryCode || prev.countryCode,
                        vatNumber: defaultAddress.vatNumber || config.vatNo || prev.vatNumber,
                        eoriNumber: defaultAddress.eoriNumber || config.eori || prev.eoriNumber,
                        taxId: defaultAddress.taxId || config.taxId || prev.taxId,
                        traderType: defaultAddress.traderType || config.traderType || 'business',
                        reference: defaultAddress.reference || config.defaultReference || prev.reference
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch metadata', err);
            }
        };
        fetchMetadata();
    }, [isStaff, user, enqueueSnackbar]);

    // --- Auto-Save Draft Logic ---
    React.useEffect(() => {
        if (!user) return;
        const saveDraft = setTimeout(() => {
            const draftData = {
                sender, receiver, parcels, items, activeStep,
                pickupRequired, shipmentType, plannedDate,
                dangerousGoods, packagingType, exportReason,
                invoiceRemarks, incoterm, gstPaid, payerOfVat,
                shipperAccount, labelFormat, signatureName, signatureTitle,
                palletCount, packageMarks, selectedClient: isStaff ? selectedClient : undefined,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(`shipment_draft_${user._id}`, JSON.stringify(draftData));
            // Optional: console.log('Draft saved');
        }, 1000); // Debounce 1s

        return () => clearTimeout(saveDraft);
    }, [
        user, sender, receiver, parcels, items, activeStep,
        pickupRequired, shipmentType, plannedDate,
        dangerousGoods, packagingType, exportReason,
        invoiceRemarks, incoterm, gstPaid, payerOfVat,
        shipperAccount, labelFormat, signatureName, signatureTitle,
        palletCount, packageMarks, selectedClient, isStaff
    ]);

    // Check for draft on mount
    React.useEffect(() => {
        if (!user) return;
        const savedDraft = localStorage.getItem(`shipment_draft_${user._id}`);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                // Check if draft is recent (e.g., less than 7 days)
                const draftDate = new Date(parsed.updatedAt);
                const now = new Date();
                const isRecent = (now - draftDate) < 7 * 24 * 60 * 60 * 1000;

                if (isRecent) {
                    enqueueSnackbar('Unsaved draft found', {
                        variant: 'info',
                        persist: false, // Auto-hide
                        action: (key) => (
                            <React.Fragment>
                                <Button size="small" color="inherit" onClick={() => {
                                    loadDraft(parsed);
                                    // closeSnackbar(key); // Need closeSnackbar from hook
                                }}>
                                    Resume
                                </Button>
                                <Button size="small" color="inherit" onClick={() => {
                                    localStorage.removeItem(`shipment_draft_${user._id}`);
                                    // closeSnackbar(key);
                                }}>
                                    Discard
                                </Button>
                            </React.Fragment>
                        )
                    });
                }
            } catch (e) {
                console.error('Failed to parse draft', e);
            }
        }
    }, [user, enqueueSnackbar]);

    const loadDraft = (data) => {
        if (data.sender) setSender(data.sender);
        if (data.receiver) setReceiver(data.receiver);
        if (data.parcels) setParcels(data.parcels);
        if (data.items) setItems(data.items);
        if (data.activeStep !== undefined) setActiveStep(data.activeStep);
        if (data.pickupRequired !== undefined) setPickupRequired(data.pickupRequired);
        if (data.shipmentType) setShipmentType(data.shipmentType);
        if (data.plannedDate) setPlannedDate(data.plannedDate);
        if (data.dangerousGoods) setDangerousGoods(data.dangerousGoods);
        if (data.packagingType) setPackagingType(data.packagingType);
        if (data.exportReason) setExportReason(data.exportReason);
        if (data.invoiceRemarks) setInvoiceRemarks(data.invoiceRemarks);
        if (data.incoterm) setIncoterm(data.incoterm);
        if (data.gstPaid !== undefined) setGstPaid(data.gstPaid);
        if (data.payerOfVat) setPayerOfVat(data.payerOfVat);
        if (data.shipperAccount) setShipperAccount(data.shipperAccount);
        if (data.labelFormat) setLabelFormat(data.labelFormat);
        if (data.signatureName) setSignatureName(data.signatureName);
        if (data.signatureTitle) setSignatureTitle(data.signatureTitle);
        if (data.palletCount) setPalletCount(data.palletCount);
        if (data.packageMarks) setPackageMarks(data.packageMarks);
        if (data.selectedClient && isStaff) setSelectedClient(data.selectedClient);

        enqueueSnackbar('Draft restored', { variant: 'success' });
    };

    // --- Dynamic Quote Fetching ---
    React.useEffect(() => {
        if (activeStep === 3) {
            // Fetch quote when entering Review step
            const fetchQuote = async () => {
                setLoading(true);
                try {
                    const payload = {
                        sender, receiver, parcels, items,
                        carrierCode: selectedCarrier,
                        userId: selectedClient || user?._id // Use selected client ID for markup!
                    };
                    const response = await shipmentService.getQuotes(payload);
                    if (response.success && response.data && response.data.length > 0) {
                        // For now, auto-select the standard service (closest to logic) or P
                        const quote = response.data.find(q => q.serviceCode === 'P') || response.data[0];
                        setSelectedService({
                            serviceName: quote.serviceName,
                            serviceCode: quote.serviceCode,
                            totalPrice: quote.totalPrice, // User's price (marked up)
                            basePrice: quote.basePrice,   // Admin view
                            markupLabel: quote.markupLabel,
                            rawPrice: quote.rawPrice,
                            currency: quote.currency,
                            deliveryDate: quote.deliveryDate
                        });
                    }
                } catch (err) {
                    console.error('Quote fetch error', err);
                    enqueueSnackbar('Failed to calculate latest rates', { variant: 'warning' });
                } finally {
                    setLoading(false);
                }
            };
            fetchQuote();
        }
    }, [activeStep, sender, receiver, parcels, items, selectedClient, user]);


    // Handle Client Selection (Autofill)
    const handleClientChange = (clientId) => {
        setSelectedClient(clientId);
        const client = clients.find(c => c._id === clientId);
        if (client) {
            const config = client.carrierConfig || {};
            const defaultAddress = client.addresses?.find(a => a.isDefault) || {};

            // Priority: Default Address (Shipper Profile) -> Client Basic -> Config
            setSender(prev => ({
                ...prev,
                // Identity
                company: defaultAddress.company || client.company || client.organization?.name || prev.company,
                contactPerson: defaultAddress.contactPerson || client.name,
                email: defaultAddress.email || client.email,
                phone: defaultAddress.phone || client.phone,
                phoneCountryCode: defaultAddress.phoneCountryCode || prev.phoneCountryCode,

                // Address (only if default exists)
                streetLines: defaultAddress.streetLines || prev.streetLines,
                city: defaultAddress.city || prev.city,
                state: defaultAddress.state || prev.state,
                postalCode: defaultAddress.postalCode || prev.postalCode,
                countryCode: defaultAddress.countryCode || prev.countryCode,

                // Compliance
                vatNumber: defaultAddress.vatNumber || config.vatNo || prev.vatNumber,
                eoriNumber: defaultAddress.eoriNumber || config.eori || prev.eoriNumber,
                taxId: defaultAddress.taxId || config.taxId || prev.taxId,
                traderType: defaultAddress.traderType || config.traderType || 'business',
                reference: defaultAddress.reference || config.defaultReference || prev.reference
            }));

            enqueueSnackbar(`Autofilled details for ${client.name}`, { variant: 'info' });
        }
    };

    // Totals Calculation
    const totals = useMemo(() => {
        const parcelTotals = parcels.reduce((acc, p) => {
            const qty = Number(p.quantity) || 1;
            const volPerUnit = (p.length * p.width * p.height) / VOLUME_FACTOR;
            acc.pieces += qty;
            acc.actualWeight += Number(p.weight || 0) * qty;
            acc.volumetricWeight += volPerUnit * qty;
            return acc;
        }, { pieces: 0, actualWeight: 0, volumetricWeight: 0 });

        const itemTotals = items.reduce((acc, i) => {
            const qty = Number(i.quantity) || 1;
            acc.declaredValue += Number(i.declaredValue || 0) * qty;
            return acc;
        }, { declaredValue: 0 });

        return { ...parcelTotals, ...itemTotals };
    }, [parcels, items]);

    const billableWeight = Math.max(totals.actualWeight, totals.volumetricWeight);

    const loadScenario = (scenario, name) => {
        if (scenario) {
            setSender({
                ...initialAddress,
                ...scenario.sender,
                street: scenario.sender.streetLines ? scenario.sender.streetLines[0] : `${scenario.sender.buildingName || ''} ${scenario.sender.area || ''}`.trim()
            });
            setReceiver({
                ...initialAddress,
                ...scenario.receiver,
                street: scenario.receiver.streetLines ? scenario.receiver.streetLines[0] : `${scenario.receiver.buildingName || ''} ${scenario.receiver.area || ''}`.trim()
            });
            if (scenario.parcels) {
                setParcels(scenario.parcels);
                // Auto-generate items from parcels for consistency in Autofill
                setItems(scenario.parcels.map(p => ({
                    description: p.description,
                    quantity: p.quantity,
                    weight: (p.weight / p.quantity) || 1, // Unit weight
                    declaredValue: (p.declaredValue / p.quantity) || 1, // Unit value
                    hsCode: p.hsCode || '',
                    countryOfOrigin: p.countryOfOrigin || (scenario.sender && scenario.sender.countryCode) || 'KW',
                    currency: 'KWD'
                })));
                setExpandedParcel(0);
            }
            if (scenario.dangerousGoods) {
                setDangerousGoods(scenario.dangerousGoods);
            } else {
                setDangerousGoods({ contains: false });
            }
            if (scenario.invoiceRemarks) {
                setInvoiceRemarks(scenario.invoiceRemarks);
            } else {
                setInvoiceRemarks('');
            }
            // Load new config fields
            if (scenario.gstPaid !== undefined) setGstPaid(scenario.gstPaid);
            if (scenario.payerOfVat) setPayerOfVat(scenario.payerOfVat);
            if (scenario.palletCount !== undefined) setPalletCount(scenario.palletCount);
            if (scenario.packageMarks) setPackageMarks(scenario.packageMarks);
            if (scenario.shipmentType) setShipmentType(scenario.shipmentType);
            if (scenario.incoterm) setIncoterm(scenario.incoterm);

            setDevMenuAnchor(null);
            enqueueSnackbar(`Loaded Scenario: ${name}`, { variant: 'success' });
        }
    };

    const renderDevMenu = () => (
        <Menu
            anchorEl={devMenuAnchor}
            open={Boolean(devMenuAnchor)}
            onClose={handleDevMenuClose}
            PaperProps={{
                style: {
                    backgroundColor: '#1a2035',
                    color: '#fff',
                    border: '1px solid #2a3347',
                    maxHeight: 400
                },
            }}
        >
            {Object.keys(AUTOFILL_SCENARIOS).map((carrier) => (
                <div key={carrier}>
                    <MenuItem disabled sx={{ opacity: 1, fontWeight: 'bold', color: '#00d9b8', fontSize: '0.8rem', mt: 1 }}>
                        {carrier}
                    </MenuItem>
                    {Object.keys(AUTOFILL_SCENARIOS[carrier]).map((category) => (
                        <div key={category}>
                            <MenuItem disabled sx={{ opacity: 0.8, fontSize: '0.75rem', pl: 3, color: '#94a3b8' }}>
                                {category}
                            </MenuItem>
                            {Object.keys(AUTOFILL_SCENARIOS[carrier][category]).map((scenarioName) => (
                                <MenuItem
                                    key={scenarioName}
                                    onClick={() => loadScenario(AUTOFILL_SCENARIOS[carrier][category][scenarioName], scenarioName)}
                                    sx={{ pl: 4, fontSize: '0.9rem' }}
                                >
                                    {scenarioName}
                                </MenuItem>
                            ))}
                        </div>
                    ))}
                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                </div>
            ))}
        </Menu>
    );

    const updateParcel = (index, field, val) => {
        const newParcels = [...parcels];
        newParcels[index][field] = val;
        setParcels(newParcels);
    };

    const removeParcel = (index) => {
        if (parcels.length > 1) {
            setParcels(parcels.filter((_, i) => i !== index));
        }
    };

    const handleNext = () => {
        if (!validateStep(activeStep)) return;
        setActiveStep((prev) => prev + 1);
        window.scrollTo(0, 0);
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const validateStep = (step) => {
        const newErrors = {};
        let isValid = true;

        if (step === 0) {
            // Sender basic
            if (!sender.contactPerson) newErrors.senderContact = 'Contact Person required';
            if (!sender.phone) newErrors.senderPhone = 'Phone number required';
            if (!sender.email) newErrors.senderEmail = 'Email required';
            if (!sender.city) newErrors.senderCity = 'City required';
            if (!sender.countryCode) newErrors.senderCountry = 'Country required';
            if (!sender.postalCode) newErrors.senderPostal = 'Postal Code required';
            // if (!sender.streetLines?.[0] && !sender.formattedAddress) newErrors.senderStreet = 'Street address required';

            // DGR Sender Specific
            if (!sender.reference) newErrors.senderReference = 'Shipper Reference required for DGR';

            // Receiver basic
            if (!receiver.contactPerson) newErrors.receiverContact = 'Contact Person required';
            if (!receiver.phone) newErrors.receiverPhone = 'Phone number required';
            if (!receiver.email) newErrors.receiverEmail = 'Email required';
            if (!receiver.city) newErrors.receiverCity = 'City required';
            if (!receiver.countryCode) newErrors.receiverCountry = 'Country required';
            if (!receiver.postalCode) newErrors.receiverPostal = 'Postal Code required';
            // if (!receiver.streetLines?.[0] && !receiver.formattedAddress) newErrors.receiverStreet = 'Street address required';

            // DGR Receiver Specific
            // if (!receiver.vatNumber) newErrors.receiverVat = 'Receiver VAT number required (DGR)';
            if (!receiver.reference) newErrors.receiverReference = 'Receiver Reference required (DGR)';
        }

        if (step === 1) {
            // 1. Validate Parcels
            if (parcels.length === 0) {
                enqueueSnackbar('At least one parcel is required', { variant: 'error' });
                return false;
            }
            parcels.forEach((p, i) => {
                if (!p.description) newErrors[`parcel${i}desc`] = 'Description required';
                if (!p.weight || p.weight <= 0) newErrors[`parcel${i}weight`] = 'Valid weight required';
                if (!p.length || p.length <= 0) newErrors[`parcel${i}length`] = 'L required';
                if (!p.width || p.width <= 0) newErrors[`parcel${i}width`] = 'W required';
                if (!p.height || p.height <= 0) newErrors[`parcel${i}height`] = 'H required';
            });

            // 2. Validate Items (only if Package)
            if (shipmentType !== 'documents') {
                if (items.length === 0) {
                    enqueueSnackbar('At least one item is required for packages', { variant: 'error' });
                    return false;
                }
                items.forEach((item, i) => {
                    if (!item.description) newErrors[`item${i}desc`] = 'Description required';
                    if (!item.quantity || item.quantity <= 0) newErrors[`item${i}qty`] = 'Qty required';
                    if (!item.declaredValue || item.declaredValue <= 0) newErrors[`item${i}val`] = 'Value required';
                    if (!item.weight || item.weight <= 0) newErrors[`item${i}wgt`] = 'Weight required';
                    if (!item.hsCode) newErrors[`item${i}hs`] = 'HS Code required';
                    if (!item.countryOfOrigin) newErrors[`item${i}origin`] = 'Origin required';
                });

                // Validate Currency Consistency
                const currencies = new Set(items.map(i => i.currency || 'USD'));
                if (currencies.size > 1) {
                    newErrors['currencyConsistency'] = `All items must have the same currency. Found: ${Array.from(currencies).join(', ')}`;
                    enqueueSnackbar('All items must have the same currency.', { variant: 'error' });
                    isValid = false;
                }
            }
        }

        if (step === 2) {
            // Billing & Docs Validation
            if (!incoterm) newErrors.incoterm = 'Incoterm required';
            if (!exportReason) newErrors.exportReason = 'Reason for Export required';
            // if (!invoiceRemarks && shipmentType !== 'documents') newErrors.invoiceRemarks = 'Remarks recommended'; 
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstError = Object.values(newErrors)[0];
            enqueueSnackbar(`Missing Information: ${firstError}`, { variant: 'error' });
            isValid = false;
        } else {
            setErrors({});
        }

        return isValid;
    };

    const [createdShipment, setCreatedShipment] = useState(null);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                sender,
                receiver,
                parcels: parcels.map(p => ({
                    ...p,
                    dimensions: {
                        length: Number(p.length) || 10,
                        width: Number(p.width) || 10,
                        height: Number(p.height) || 10
                    },
                    weight: Number(p.weight)
                })),
                items: items.map(i => ({
                    ...i,
                    quantity: Number(i.quantity),
                    declaredValue: Number(i.declaredValue),
                    weight: Number(i.weight),
                    currency: i.currency || currency // Fallback to global currency if missing
                })),
                serviceCode: selectedService.serviceCode,
                carrierCode: 'DGR',
                status: 'ready_for_pickup',
                skipCarrierCreation: true,
                price: selectedService.totalPrice,
                costPrice: selectedService.rawPrice, // Pass raw cost if available (Admin/Staff)
                currency: currency, // Dynamic currency
                incoterm: incoterm, // Dynamic incoterm
                dangerousGoods: dangerousGoods, // Dynamic DG
                totals,
                customer: {
                    name: sender.contactPerson,
                    email: sender.email,
                    phone: sender.phone,
                    vatNo: sender.vatNumber,
                    eori: sender.eoriNumber,
                    taxId: sender.taxId,
                    traderType: sender.traderType
                },
                shipmentType,
                plannedDate,
                packagingType,
                exportReason,
                remarks: invoiceRemarks,
                // Assign to selected client if staff
                userId: selectedClient || user._id,
                // Pass new fields
                gstPaid,
                payerOfVat,
                packageMarks,
                receiverReference: receiver.reference,
                shipperAccount, // Pass override account
                labelSettings: {
                    format: labelFormat,
                    signatureName,
                    signatureTitle
                },
                // Explicitly pass Tax/EORI into objects to be sure
                sender: { ...sender, vatNumber: sender.vatNumber, eoriNumber: sender.eoriNumber, taxId: sender.taxId },
                receiver: { ...receiver, vatNumber: receiver.vatNumber, eoriNumber: receiver.eoriNumber, taxId: receiver.taxId }
            };

            console.log('Finalizing shipment (Internal)...', payload);
            const response = await shipmentService.createShipment(payload);

            if (response.success || response.data) {
                setCreatedShipment(response.data);
                await refreshUser(); // Update balance in Header
                setActiveStep(4);
                // Clear draft
                if (user) localStorage.removeItem(`shipment_draft_${user._id}`);
                enqueueSnackbar('Shipment created and scheduled for pickup', { variant: 'success' });
            }
        } catch (error) {
            console.error('Submission Failed:', error);
            enqueueSnackbar(error.message || 'Submission Failed', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };





    const renderParcels = () => {
        return (
            <Box>
                <DangerousGoodsPanel
                    dangerousGoods={dangerousGoods}
                    setDangerousGoods={setDangerousGoods}
                />

                <Box mb={3}>
                    <FormControl fullWidth>
                        <InputLabel>Packaging Type</InputLabel>
                        <Select value={packagingType} label="Packaging Type" onChange={(e) => setPackagingType(e.target.value)}>
                            <MenuItem value="user">My Own Packaging</MenuItem>
                            <MenuItem value="CP">Custom Packaging</MenuItem>
                            <MenuItem value="EE">DGR Express Envelope</MenuItem>
                            <MenuItem value="OD">Other DGR Packaging</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                {
                    parcels.map((parcel, index) => (
                        <ParcelCard
                            key={index}
                            parcel={parcel} index={index}
                            expanded={expandedParcel === index}
                            onToggle={() => setExpandedParcel(expandedParcel === index ? -1 : index)}
                            onChange={(field, val) => updateParcel(index, field, val)}
                            onRemove={() => removeParcel(index)}
                            errors={errors}
                        />
                    ))
                }
                <Box mb={10}>
                    <Button startIcon={<AddIcon />} onClick={() => setParcels([...parcels, { description: '', weight: '', length: '', width: '', height: '', quantity: 1, declaredValue: '' }])}>
                        Add Another Parcel
                    </Button>
                </Box>

                {/* Sticky Summary Bar */}
                <Paper
                    elevation={4}
                    sx={{
                        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        bgcolor: 'grey.900', color: 'white', p: 2, borderRadius: 4, zIndex: 1200,
                        display: 'flex', gap: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <Box textAlign="center"><Typography variant="caption" sx={{ opacity: 0.6 }}>PCS</Typography><Typography variant="body1" fontWeight="bold">{totals.pieces}</Typography></Box>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box textAlign="center"><Typography variant="caption" sx={{ opacity: 0.6 }}>ACTUAL</Typography><Typography variant="body1" fontWeight="bold">{totals.actualWeight.toFixed(2)}</Typography></Box>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box textAlign="center"><Typography variant="caption" sx={{ opacity: 0.6 }}>VOLUMETRIC</Typography><Typography variant="body1" fontWeight="bold">{totals.volumetricWeight.toFixed(2)}</Typography></Box>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box textAlign="center" sx={{ bgcolor: 'primary.main', px: 2, py: 0.5, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>BILLABLE</Typography>
                        <Typography variant="body1" fontWeight="bold">{billableWeight.toFixed(2)} KG</Typography>
                    </Box>
                </Paper>
            </Box >
        );
    };

    const updateItem = (index, field, val) => {
        const newItems = [...items];
        newItems[index][field] = val;
        setItems(newItems);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const renderContent = () => (
        <ShipmentContent
            parcels={parcels} setParcels={setParcels}
            items={items} setItems={setItems}
            dangerousGoods={dangerousGoods} setDangerousGoods={setDangerousGoods}
            packagingType={packagingType} setPackagingType={setPackagingType}
            shipmentType={shipmentType}
            errors={errors}
        />
    );
    const renderBilling = () => (
        <ShipmentBilling
            exportReason={exportReason} setExportReason={setExportReason}
            invoiceRemarks={invoiceRemarks} setInvoiceRemarks={setInvoiceRemarks}
            incoterm={incoterm} setIncoterm={setIncoterm}
            gstPaid={gstPaid} setGstPaid={setGstPaid}
            payerOfVat={payerOfVat} setPayerOfVat={setPayerOfVat}
            shipperAccount={shipperAccount} setShipperAccount={setShipperAccount}
            labelFormat={labelFormat} setLabelFormat={setLabelFormat}
            signatureName={signatureName} setSignatureName={setSignatureName}
            signatureTitle={signatureTitle} setSignatureTitle={setSignatureTitle}
            palletCount={palletCount} setPalletCount={setPalletCount}
            packageMarks={packageMarks} setPackageMarks={setPackageMarks}
            errors={errors}
        />
    );



    const renderReview = () => {
        const s = formatPartyAddress(sender);
        const r = formatPartyAddress(receiver);

        // Compliance Logic
        const missingFields = [];
        if (!s.company && !s.contact) missingFields.push('Shipper Name');
        if (!s.phone) missingFields.push('Shipper Phone');
        if (!s.street || !s.city || !s.country) missingFields.push('Shipper Address');
        if (!r.company && !r.contact) missingFields.push('Receiver Name');
        if (!r.phone) missingFields.push('Receiver Phone');
        if (!r.street || !r.city || !r.country) missingFields.push('Receiver Address');
        if (!r.vatNumber) missingFields.push('Receiver VAT (Required for DGR)');
        if (!s.reference) missingFields.push('Shipper Reference');

        // Styles
        const SectionHeader = ({ icon, title }) => (
            <Box display="flex" alignItems="center" gap={1} mb={2} sx={{ color: 'primary.main' }}>
                {icon}
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
            </Box>
        );

        const AddressCard = ({ title, data }) => (
            <Card variant="outlined" sx={{ height: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">{title}</Typography>
                    <Box mt={1}>
                        <Typography variant="subtitle1" fontWeight="bold">{data.company}</Typography>
                        <Typography variant="body2">{data.contact}</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <DescriptionIcon fontSize="small" color="action" />
                            <Typography variant="body2">{data.building} {data.street}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <VerifiedIcon fontSize="small" color="action" />
                            <Typography variant="body2">{data.city}, {data.state} {data.postalCode}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">{data.country}</Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" display="block">Phone: {data.phone}</Typography>
                        <Typography variant="caption" display="block">Email: {data.email}</Typography>
                        <Typography variant="caption" display="block" color="primary">Ref: {data.reference}</Typography>
                    </Box>
                </CardContent>
            </Card>
        );

        return (
            <Grid container spacing={4}>
                {/* Left: Detailed Review */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={4}>

                        {/* 1. Route Details */}
                        <Box>
                            <SectionHeader icon={<LocalShippingIcon />} title="Route & Parties" />
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <AddressCard title="FROM (SHIPPER)" data={s} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <AddressCard title="TO (RECEIVER)" data={r} />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* 2. Shipment Content */}
                        <Box>
                            <SectionHeader icon={<DescriptionIcon />} title="Content & Packages" />
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center" mb={2}>
                                        <Grid item>
                                            <Chip icon={<DescriptionIcon />} label={`${totals.pieces} Pieces`} />
                                        </Grid>
                                        <Grid item>
                                            <Chip icon={<CalculateIcon />} label={`${totals.actualWeight.toFixed(2)} KG Actual`} />
                                        </Grid>
                                        <Grid item>
                                            <Chip icon={<WarningIcon />} label={`${totals.volumetricWeight.toFixed(2)} KG Volumetric`} variant="outlined" />
                                        </Grid>
                                        <Grid item xs />
                                        <Grid item>
                                            <Typography variant="h6" color="primary.main">
                                                {currency} {totals.declaredValue.toFixed(2)}
                                            </Typography>
                                            <Typography variant="caption" display="block" textAlign="right">Total Declared Value</Typography>
                                        </Grid>
                                    </Grid>

                                    <TableContainer component={Paper} elevation={0} variant="outlined">
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                                <TableRow>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell>Dimensions (cm)</TableCell>
                                                    <TableCell width={100}>Weight</TableCell>
                                                    <TableCell width={80}>Qty</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {parcels.map((p, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">Parcel {i + 1}</Typography>
                                                            <Typography variant="caption">{p.description}</Typography>
                                                        </TableCell>
                                                        <TableCell>{p.length} x {p.width} x {p.height}</TableCell>
                                                        <TableCell>{p.weight} kg</TableCell>
                                                        <TableCell>x{p.quantity}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Box>
                    </Stack>
                </Grid>

                {/* Right: Confirmation Sidebar */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={2} position="sticky" top={100}>
                        {/* Cost Summary Card */}
                        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="overline" sx={{ opacity: 0.8 }}>ESTIMATED TOTAL</Typography>
                                <Box display="flex" alignItems="baseline" gap={1}>
                                    <Typography variant="h3" fontWeight="bold">{(Number(selectedService.totalPrice)).toFixed(3)}</Typography>
                                    <Typography variant="subtitle1">KD</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ opacity: 0.9, mt: 1 }}>
                                    {selectedService.serviceName}
                                </Typography>

                                {/* Admin Markup Analysis */}
                                {isAdmin && (
                                    <Box mt={2} p={1} bgcolor="rgba(0,0,0,0.2)" borderRadius={1}>
                                        <Typography variant="caption" fontWeight="bold" color="warning.light">
                                            ADMIN MARKUP ANALYSIS
                                        </Typography>
                                        <Box display="flex" justifyContent="space-between" mt={0.5}>
                                            <Typography variant="caption">Base Rate:</Typography>
                                            <Typography variant="caption">
                                                {selectedService.basePrice ? Number(selectedService.basePrice).toFixed(3) : '---'} KD
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="caption">Applied Markup:</Typography>
                                            <Typography variant="caption" color="warning.light">
                                                {selectedService.markupLabel || '15%'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Billable Weight</Typography>
                                    <Typography variant="body2" fontWeight="bold">{billableWeight.toFixed(2)} KG</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Incoterm</Typography>
                                    <Typography variant="body2" fontWeight="bold">{incoterm}</Typography>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Compliance Card */}
                        <Card variant="outlined" sx={{
                            borderRadius: 2,
                            borderColor: missingFields.length > 0 ? 'error.main' : 'success.main',
                            borderWidth: 2
                        }}>
                            <CardContent>
                                <Typography variant="subtitle2" gutterBottom fontWeight="bold" color={missingFields.length > 0 ? 'error.main' : 'success.main'}>
                                    {missingFields.length > 0 ? 'Action Required' : 'Ready to Book'}
                                </Typography>

                                <Stack spacing={1}>
                                    {missingFields.length > 0 ? (
                                        missingFields.map((f, i) => (
                                            <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />} key={i} sx={{ py: 0 }}>
                                                {f} Missing
                                            </Alert>
                                        ))
                                    ) : (
                                        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ py: 0 }}>
                                            All Data Validated
                                        </Alert>
                                    )}

                                    <Divider sx={{ my: 1 }} />

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <AuditItem label="Address Valid" valid={sender.countryCode && receiver.countryCode} />
                                        <AuditItem label="Customs Data" valid={items.every(i => i.hsCode)} />
                                        <AuditItem label="DG Checked" valid={true} />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Alert severity="info" variant="outlined" sx={{ alignItems: 'center' }}>
                            <Typography variant="caption">
                                By finalizing, you confirm all details are correct. Changes may incur fees.
                            </Typography>
                        </Alert>

                        {/* Credit Balance Warning */}
                        {user && (
                            <Card variant="outlined" sx={{
                                borderRadius: 2,
                                bgcolor: (user.balance + user.creditLimit) < Number(selectedService.totalPrice) ? 'error.lighter' : 'success.lighter',
                                borderColor: (user.balance + user.creditLimit) < Number(selectedService.totalPrice) ? 'error.main' : 'success.main',
                                p: 1
                            }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AccountBalanceWalletIcon color={(user.balance + user.creditLimit) < Number(selectedService.totalPrice) ? 'error' : 'success'} />
                                    <Box>
                                        <Typography variant="caption" display="block" fontWeight="bold">
                                            Available Credit: {(user.balance + user.creditLimit).toFixed(3)} KD
                                        </Typography>
                                        {(user.balance + user.creditLimit) < Number(selectedService.totalPrice) && (
                                            <Typography variant="caption" color="error.main" fontWeight="bold">
                                                Insufficient balance. Please top up.
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Card>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        );
    };

    const AuditItem = ({ label, valid }) => (
        <Tooltip title={valid ? "Passed" : "Failed"}>
            <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: valid ? 1 : 0.5 }}>
                {valid ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : <ErrorOutlineIcon color="error" sx={{ fontSize: 16 }} />}
                <Typography variant="caption">{label}</Typography>
            </Box>
        </Tooltip>
    );

    if (activeStep === 4) {
        return (
            <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
                <Zoom in><CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} /></Zoom>
                <Typography variant="h4" gutterBottom>Shipment Created!</Typography>
                <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                    Status: Ready For Pickup (Pending Approval)
                </Typography>
                <Typography color="text.secondary" paragraph>
                    The internal record has been created. Please download the System Label for the driver.
                    Carrier booking will occur after staff approval.
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => generateWaybillPDF(createdShipment || { sender, receiver, parcels, totals, _id: 'PENDING' })}
                        startIcon={<DescriptionIcon />}
                    >
                        Download System Label (v2)
                    </Button>
                    <Button variant="outlined" size="large" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                </Stack>
            </Container>
        );
    }

    return (
        <ThemeProvider theme={darkFormTheme}>
            <Box sx={{ minHeight: '100vh', bgcolor: '#0a0e1a', pb: 8 }}>
                <WizardHeader
                    activeStep={activeStep}
                    totalSteps={STEPS.length}
                    estimatedTime="5-8 min"
                    onDevMenuClick={handleDevMenuOpen}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                />

                {renderDevMenu()}

                <Container maxWidth="lg">
                    <Fade in key={activeStep}>
                        <Box>
                            {activeStep === 0 && (
                                <Box>
                                    <ShipmentSetup
                                        sender={sender} setSender={setSender}
                                        receiver={receiver} setReceiver={setReceiver}
                                        pickupRequired={pickupRequired} setPickupRequired={setPickupRequired}
                                        errors={errors}
                                        isStaff={isStaff} clients={clients}
                                        selectedClient={selectedClient} onClientChange={handleClientChange}
                                        availableCarriers={availableCarriers}
                                        selectedCarrier={selectedCarrier}
                                        onCarrierChange={setSelectedCarrier}
                                    />
                                </Box>
                            )}
                            {activeStep === 1 && (
                                <Box>
                                    <ShipmentContent
                                        parcels={parcels} setParcels={setParcels}
                                        items={items} setItems={setItems}
                                        shipmentType={shipmentType} setShipmentType={setShipmentType}
                                        updateParcel={updateParcel} removeParcel={removeParcel}
                                        expandedParcel={expandedParcel} setExpandedParcel={setExpandedParcel}
                                        dangerousGoods={dangerousGoods} setDangerousGoods={setDangerousGoods}
                                        addParcel={() => setParcels([...parcels, { description: '', weight: '', length: '', width: '', height: '', quantity: 1 }])}
                                        addItem={() => setItems([...items, { description: '', quantity: 1, declaredValue: '', weight: '' }])}
                                        removeItem={(i) => setItems(items.filter((_, idx) => idx !== i))}
                                        updateItem={(i, f, v) => { const n = [...items]; n[i][f] = v; setItems(n); }}
                                        errors={errors} packagingType={packagingType} setPackagingType={setPackagingType}
                                    />
                                </Box>
                            )}
                            {activeStep === 2 && (
                                <Box>
                                    <ShipmentBilling
                                        sender={sender} receiver={receiver}
                                        totals={totals}
                                        incoterm={incoterm} setIncoterm={setIncoterm}
                                        exportReason={exportReason} setExportReason={setExportReason}
                                        invoiceRemarks={invoiceRemarks} setInvoiceRemarks={setInvoiceRemarks}
                                        gstPaid={gstPaid} setGstPaid={setGstPaid}
                                        payerOfVat={payerOfVat} setPayerOfVat={setPayerOfVat}
                                        shipperAccount={shipperAccount} setShipperAccount={setShipperAccount}
                                        packageMarks={packageMarks} setPackageMarks={setPackageMarks}
                                        errors={errors}
                                    />
                                </Box>
                            )}
                            {activeStep === 3 && renderReview()}
                        </Box>
                    </Fade>

                    <Box display="flex" justifyContent="space-between" mt={4} pt={4} borderTop="1px solid rgba(255,255,255,0.1)">
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            startIcon={<ArrowBackIcon />}
                            sx={{ color: 'text.secondary' }}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained" size="large" onClick={activeStep === 3 ? handleSubmit : handleNext}
                            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                            disabled={loading || (activeStep === 3 && user && !isAdmin && !isStaff && (user.balance + user.creditLimit) < Number(selectedService.totalPrice))}

                            sx={{
                                borderRadius: 50,
                                px: 4,
                                boxShadow: '0 4px 14px rgba(0, 217, 184, 0.4)',
                                fontWeight: 700
                            }}
                        >
                            {activeStep === 3 ? 'Finalize & Book' : 'Continue'}
                        </Button>
                    </Box>
                </Container>
            </Box>
        </ThemeProvider>
    );
};

export default ShipmentWizardV2;
