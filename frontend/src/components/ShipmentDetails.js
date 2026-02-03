import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TrackingTimeline from './TrackingTimeline';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Grid,
  Autocomplete,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Divider,
  Stack,
  Alert
} from '@mui/material';

// Icons
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  LocalShipping as TruckIcon,
  MyLocation as MyLocationIcon,
  Search as SearchIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Description as DescriptionIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  AttachMoney as AttachMoneyIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

import { useShipment } from '../context/ShipmentContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LocationPicker from './LocationPicker';
import ShipmentApprovalDialog from './ShipmentApprovalDialog'; // Re-using for full edits if needed

// --- Constants & Helpers ---

const countries = [
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  // ... (Add more if needed, or keeping it short for brevity in rewrite)
];

const statusIcons = {
  draft: <ScheduleIcon />,
  pending: <ScheduleIcon />,
  updated: <ScheduleIcon />,
  created: <InventoryIcon />,
  ready_for_pickup: <InventoryIcon />,
  picked_up: <TruckIcon />,
  in_transit: <TruckIcon />,
  out_for_delivery: <TruckIcon />,
  delivered: <CheckCircleIcon />,
  exception: <ErrorIcon />,
};

const statusColors = {
  draft: 'default',
  pending: 'warning',
  updated: 'warning',
  created: 'info',
  ready_for_pickup: 'warning',
  picked_up: 'info',
  in_transit: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  exception: 'error',
};

const formatStatus = (status) => {
  if (!status) return '';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- Sub-Components ---

const InfoRow = ({ label, value, icon }) => (
  <Box display="flex" alignItems="center" mb={1.5}>
    {icon && <Box color="text.secondary" mr={1.5} display="flex">{icon}</Box>}
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="500">
        {value || 'N/A'}
      </Typography>
    </Box>
  </Box>
);

const AddressBlock = ({ title, data }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
    <CardContent>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom textTransform="uppercase" letterSpacing={1}>
        {title}
      </Typography>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {data?.contactPerson || data?.name || 'N/A'}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        {data?.company}
      </Typography>
      <Box display="flex" alignItems="flex-start" gap={1} mt={2}>
        <LocationIcon fontSize="small" color="action" />
        <Box>
          <Typography variant="body2" fontWeight="500">
            {data?.formattedAddress || data?.address}
          </Typography>
          {data?.city && <Typography variant="caption" color="textSecondary">{data.city}, {data.country}</Typography>}
        </Box>
      </Box>
      {(data?.phone || data?.email) && (
        <Box mt={2}>
          {data.phone && <Typography variant="caption" display="block">📞 {data.phone}</Typography>}
          {data.email && <Typography variant="caption" display="block">✉️ {data.email}</Typography>}
        </Box>
      )}
    </CardContent>
  </Card>
);


// --- Main Component ---

const ShipmentDetails = ({ shipment, onUpdateLocation, updatingLocation, locationError }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    updateShipmentStatus,
    updateLocationManually,
    deleteShipment,
    getRouteDistance,
    getShipment
  } = useShipment();

  // Role Logic
  const role = user?.role || 'public';
  const isClient = role === 'client';
  const isDriver = role === 'driver';
  const isStaff = ['staff', 'admin'].includes(role);
  const isOwner = shipment?.user === user?._id || shipment?.user?._id === user?._id;
  const canEdit = isStaff || (isClient && ['draft', 'pending', 'exception', 'updated', 'ready_for_pickup'].includes(shipment.status));

  // Tab State
  const [activeTab, setActiveTab] = useState(0);

  // Dialog States
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogData, setStatusDialogData] = useState({ status: '', description: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [manualLocationDialogOpen, setManualLocationDialogOpen] = useState(false);
  const [manualLocationData, setManualLocationData] = useState({
    coordinates: [0, 0],
    address: '',
    status: '',
    description: ''
  });
  const [updatingManualLocation, setUpdatingManualLocation] = useState(false);

  // Maps/Address States
  const [addressInput, setAddressInput] = useState('');
  const [addressOptions, setAddressOptions] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Approval Dialog (Reuse for Editing Details)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  // --- Handlers ---

  const handleStatusUpdate = async () => {
    try {
      setUpdatingStatus(true);
      await updateShipmentStatus(shipment.trackingNumber, {
        status: statusDialogData.status,
        description: statusDialogData.description
      });
      setStatusDialogOpen(false);
      // Refresh? Context usually handles it.
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleManualLocationUpdateAction = async () => {
    try {
      setUpdatingManualLocation(true);
      await updateLocationManually(shipment.trackingNumber, manualLocationData);
      setManualLocationDialogOpen(false);
      if (getShipment) getShipment(shipment.trackingNumber);
    } catch (err) {
      alert('Failed to update location: ' + err.message);
    } finally {
      setUpdatingManualLocation(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this shipment permanently?')) {
      try {
        await deleteShipment(shipment.trackingNumber);
        navigate('/shipments');
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };


  const handleOpenPdf = (dataUrl) => {
    if (!dataUrl) return;

    // Check if it's already a blob or http url
    if (dataUrl.startsWith('http') || dataUrl.startsWith('blob')) {
      window.open(dataUrl, '_blank');
      return;
    }

    // Convert Base64 Data URI to Blob to bypass "Not allowed to navigate top frame to data URL"
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error("PDF Open Error:", e);
      // Fallback
      window.open(dataUrl, '_blank');
    }
  };

  // --- Render ---

  if (!shipment) return <CircularProgress />;

  const progress = (() => {
    if (shipment.status === 'delivered') return 100;
    // Simple Calc based on status if coords missing
    if (shipment.status === 'created') return 10;
    if (shipment.status === 'picked_up') return 30;
    if (shipment.status === 'in_transit') return 60;
    if (shipment.status === 'out_for_delivery') return 90;
    return 0;
    // (Could use geocalc but status is safer fallback)
  })();

  return (
    <Box>
      {/* 1. HEADER */}
      <Paper elevation={0} sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: `linear-gradient(to right, ${theme.palette.background.paper}, ${alpha(theme.palette.primary.main, 0.02)})`
      }}>
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -0.5 }}>
                {shipment.trackingNumber}
              </Typography>
              <Chip
                icon={statusIcons[shipment.status]}
                label={formatStatus(shipment.status)}
                color={statusColors[shipment.status]}
                sx={{ px: 1, fontWeight: 'bold' }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              Created: {new Date(shipment.createdAt).toLocaleDateString()} • Owner: {shipment.user?.name || 'Unknown'}
            </Typography>
          </Grid>

          <Grid item>
            <Stack direction="row" spacing={1}>
              {/* Staff Actions */}
              {isStaff && (
                <>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setApprovalDialogOpen(true)}>
                    Edit
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleDelete}>
                    Delete
                  </Button>
                </>
              )}
              {/* Client Edit (Restricted) */}
              {isClient && canEdit && (
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setApprovalDialogOpen(true)}>
                  Edit Details
                </Button>
              )}

              {/* Driver Actions */}
              {isDriver && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<TruckIcon />}
                  onClick={() => {
                    setStatusDialogData({ status: shipment.status, description: '' });
                    setStatusDialogOpen(true);
                  }}
                >
                  Update Status
                </Button>
              )}

              {/* Common Actions */}
              {shipment.labelUrl && (
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => handleOpenPdf(shipment.labelUrl)}>
                  Label
                </Button>
              )}
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/track/${shipment.trackingNumber}`);
                alert('Link copied!');
              }}>
                Share
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* 2. LEFT COLUMN: TABS & CONTENT (70%) */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}
            >
              <Tab label="Overview" icon={<InfoIcon fontSize="small" />} iconPosition="start" />
              <Tab label="Parcels" icon={<InventoryIcon fontSize="small" />} iconPosition="start" />
              <Tab label="Activity" icon={<TimelineIcon fontSize="small" />} iconPosition="start" />
              <Tab label="Documents" icon={<DescriptionIcon fontSize="small" />} iconPosition="start" />
              {/* Management Tab for Staff Only */}
              {isStaff && <Tab label="Management" icon={<AttachMoneyIcon fontSize="small" />} iconPosition="start" />}
            </Tabs>

            {/* TAB 0: OVERVIEW */}
            <TabPanel value={activeTab} index={0}>
              {/* Progress Bar */}
              {['in_transit', 'out_for_delivery', 'picked_up'].includes(shipment.status) && (
                <Box mb={4}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" fontWeight="bold">Delivery Progress</Typography>
                    <Typography variant="caption" fontWeight="bold">{progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <AddressBlock title="Origin (Sender)" data={shipment.origin} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <AddressBlock title="Destination (Recipient)" data={shipment.destination} />
                </Grid>
              </Grid>

              <Box mt={4}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Shipment Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <InfoRow label="Service Type" value={shipment.serviceType || 'Standard'} icon={<TruckIcon fontSize="small" />} />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <InfoRow label="Total Pieces" value={shipment.items?.length || 0} icon={<InventoryIcon fontSize="small" />} />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <InfoRow label="Total Weight" value={`${shipment.totalWeight || 0} kg`} />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <InfoRow label="Dimensions" value={shipment.items?.[0] ? `${shipment.items[0].length}x${shipment.items[0].width}x${shipment.items[0].height} cm` : 'N/A'} />
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* TAB 1: PARCELS */}
            <TabPanel value={activeTab} index={1}>
              <List>
                {shipment.items?.map((item, i) => (
                  <ListItem key={i} divider sx={{ px: 0 }}>
                    <ListItemIcon>
                      <InventoryIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.description}
                      secondary={`Weight: ${item.weight}kg • Vol: ${item.length}x${item.width}x${item.height}cm`}
                    />
                    <Chip label={`Qty: ${item.quantity}`} size="small" />
                  </ListItem>
                ))}
                {shipment.items?.length === 0 && <Typography color="textSecondary">No items found.</Typography>}
              </List>
            </TabPanel>

            {/* TAB 2: ACTIVITY */}
            <TabPanel value={activeTab} index={2}>
              <TrackingTimeline history={shipment.history || []} currentStatus={shipment.status} />
            </TabPanel>

            {/* TAB 3: DOCUMENTS */}
            <TabPanel value={activeTab} index={3}>
              <Grid container spacing={2}>
                {shipment.labelUrl && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <ListItem button onClick={() => handleOpenPdf(shipment.labelUrl)}>
                        <ListItemIcon><DescriptionIcon color="error" /></ListItemIcon>
                        <ListItemText primary="Shipping Label (PDF)" secondary="Click to download" />
                      </ListItem>
                    </Card>
                  </Grid>
                )}
                {shipment.invoiceUrl && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <ListItem button onClick={() => handleOpenPdf(shipment.invoiceUrl)}>
                        <ListItemIcon><DescriptionIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Commercial Invoice" secondary="Pro forma invoice" />
                      </ListItem>
                    </Card>
                  </Grid>
                )}
                {/* Placeholder for POD */}
                {isStaff && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <ListItem>
                        <ListItemIcon><UploadIcon /></ListItemIcon>
                        <ListItemText primary="Proof of Delivery" secondary="No POD uploaded yet" />
                        <Button size="small">Upload</Button>
                      </ListItem>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </TabPanel>

            {/* TAB 4: MANAGEMENT (Staff Only) */}
            {isStaff && (
              <TabPanel value={activeTab} index={4}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="Cost Price" value={`$${shipment.costPrice || 0}`} icon={<AttachMoneyIcon color="error" />} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="Sales Price" value={`$${shipment.price || 0}`} icon={<AttachMoneyIcon color="success" />} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Internal Notes (Not visible to client)</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" color="textSecondary">
                        {shipment.internalNotes || 'No internal notes found.'}
                      </Typography>
                      <Button size="small" startIcon={<EditIcon />} sx={{ mt: 1 }}>Edit Notes</Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<MyLocationIcon />}
                      onClick={() => setManualLocationDialogOpen(true)}
                    >
                      Update Location Manually
                    </Button>
                  </Grid>
                </Grid>
              </TabPanel>
            )}
          </Paper>
        </Grid>

        {/* 3. RIGHT COLUMN: MAP (30%) */}
        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ height: 500, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
            {/* Map Overlay Info */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
              <Paper sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: 3 }}>
                <Box sx={{ bgcolor: 'primary.light', p: 1, borderRadius: '50%', color: 'primary.main' }}>
                  <LocationIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="textSecondary" display="block">CURRENT LOCATION</Typography>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {shipment.currentLocation?.address || shipment.origin?.city || 'Processing Center'}
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* The Map */}
            <Box height="100%" bgcolor="#f3f4f6">
              <LocationPicker
                initialLocation={{
                  coordinates: shipment.currentLocation?.coordinates || shipment.origin?.coordinates || [0, 0],
                  latitude: shipment.currentLocation?.coordinates?.[1] || shipment.origin?.coordinates?.[1] || 0,
                  longitude: shipment.currentLocation?.coordinates?.[0] || shipment.origin?.coordinates?.[0] || 0
                }}
                readonly={true}
                height="100%"
              />
            </Box>

            {/* Driver Action Overlay */}
            {isDriver && (
              <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={onUpdateLocation} // Use the prop passed from TrackingPage
                  startIcon={<MyLocationIcon />}
                  sx={{ boxShadow: 3 }}
                >
                  Share Live Location
                </Button>
              </Box>
            )}
          </Card>
        </Grid>

      </Grid>

      {/* Dialogs */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusDialogData.status}
              onChange={(e) => setStatusDialogData({ ...statusDialogData, status: e.target.value })}
            >
              <MenuItem value="picked_up">Picked Up</MenuItem>
              <MenuItem value="in_transit">In Transit</MenuItem>
              <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="exception">Exception</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            value={statusDialogData.description}
            onChange={(e) => setStatusDialogData({ ...statusDialogData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained" disabled={updatingStatus}>Update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manualLocationDialogOpen} onClose={() => setManualLocationDialogOpen(false)}>
        {/* Simple Manual Location Form reuse or simplfied */}
        <DialogTitle>Update Location</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            value={manualLocationData.address}
            onChange={(e) => setManualLocationData({ ...manualLocationData, address: e.target.value })}
          />
          <Typography variant="caption">Use map picker in full edit mode for precise coords.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualLocationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleManualLocationUpdateAction} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Full Edit Dialog - Reuse existing Approval Dialog */}
      {approvalDialogOpen && (
        <ShipmentApprovalDialog
          open={approvalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          shipment={shipment}
          onConfirm={() => {
            setApprovalDialogOpen(false);
            if (getShipment) getShipment(shipment.trackingNumber);
          }}
        />
      )}

    </Box>
  );
};

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} role="tabpanel">
    {value === index && (
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    )}
  </div>
);

export default ShipmentDetails;
