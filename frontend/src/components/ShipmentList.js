import React, { useEffect, useState, useMemo } from 'react';
import { shipmentService } from '../services/api';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  IconButton,
  Button,
  Stack,
  Tooltip,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LoginIcon from '@mui/icons-material/Login';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DateRangeIcon from '@mui/icons-material/DateRange';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';

import { useAuth } from '../context/AuthContext';
import StatusPill from './common/StatusPill';
import EmptyState from './common/EmptyState';
import { TableSkeleton } from './common/SkeletonLoader';
import ShipmentsKPIStrip from './ShipmentsKPIStrip';
import { generateWaybillPDF } from '../utils/pdfGenerator';
import ShipmentApprovalDialog from './ShipmentApprovalDialog';

const ITEMS_PER_PAGE = 10;

const ShipmentList = () => {
  const theme = useTheme();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedShipmentForDownload, setSelectedShipmentForDownload] = useState(null);

  // Approval Dialog State
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedShipmentForApproval, setSelectedShipmentForApproval] = useState(null);

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

  const handleDeleteShipment = async (trackingNumber) => {
    if (window.confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) {
      try {
        await shipmentService.deleteShipment(trackingNumber);
        fetchShipments();
      } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete shipment: " + err.message);
      }
    }
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shipmentService.getAllShipments();
      const allShipments = Array.isArray(response) ? response : (response?.data || []);
      setShipments(allShipments);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError(err.message || 'Failed to fetch shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchShipments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // View Mode State
  const [viewMode, setViewMode] = useState('active'); // 'active', 'pending', 'delivered', 'all'

  // Filtering Logic
  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
      // 1. View Mode Filter
      if (viewMode === 'active') {
        // Active: Created (Label Gen), In Transit, Out for Delivery
        if (!['created', 'in_transit', 'out_for_delivery'].includes(shipment.status)) return false;
      } else if (viewMode === 'pending') {
        // Pending: Draft, Pending, Exception, Updated, Ready for Pickup
        if (!['draft', 'pending', 'exception', 'updated', 'ready_for_pickup'].includes(shipment.status)) return false;
      } else if (viewMode === 'delivered') {
        if (shipment.status !== 'delivered') return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'exception') {
          if (!['cancelled', 'returned', 'failed_delivery', 'exception'].includes(shipment.status)) return false;
        } else if (statusFilter === 'pending_group') {
          // Group Filter: Draft, Pending, Updated, Ready
          if (!['draft', 'pending', 'updated', 'ready_for_pickup'].includes(shipment.status)) return false;
        } else if (shipment.status !== statusFilter) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTracking = shipment.trackingNumber?.toLowerCase().includes(query);
        const matchesCustomer = shipment.customer?.name?.toLowerCase().includes(query);
        const matchesCity = shipment.destination?.city?.toLowerCase().includes(query);
        return matchesTracking || matchesCustomer || matchesCity;
      }

      return true;
    });
  }, [shipments, statusFilter, searchQuery, viewMode]);

  // Approval Handlers
  const handleApproveClick = (shipment) => {
    setSelectedShipmentForApproval(shipment);
    setApprovalDialogOpen(true);
  };

  const handleApprovalComplete = () => {
    fetchShipments();
    setApprovalDialogOpen(false);
    setSelectedShipmentForApproval(null);
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE);
  const currentShipments = filteredShipments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleDownloadMenuOpen = (event, shipment) => {
    event.stopPropagation();
    setSelectedShipmentForDownload(shipment);
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setAnchorEl(null);
    setSelectedShipmentForDownload(null);
  };

  const handleDownloadLabel = async () => {
    if (selectedShipmentForDownload) {
      await generateWaybillPDF(selectedShipmentForDownload);
    }
    handleDownloadMenuClose();
  };

  const handleDownloadCarrierLabel = async () => {
    if (selectedShipmentForDownload?.labelUrl) {
      handleOpenPdf(selectedShipmentForDownload.labelUrl);
    } else if (selectedShipmentForDownload?.awbUrl) {
      handleOpenPdf(selectedShipmentForDownload.awbUrl);
    } else {
      alert("Carrier Label not available");
    }
    handleDownloadMenuClose();
  };

  const handleDownloadInvoice = async () => {
    if (selectedShipmentForDownload?.invoiceUrl) {
      handleOpenPdf(selectedShipmentForDownload.invoiceUrl);
    } else {
      alert("Commercial Invoice not available");
    }
    handleDownloadMenuClose();
  };

  if (loading) return <TableSkeleton rows={8} />;

  if (!isAuthenticated) return (
    <EmptyState
      title="Login Required"
      description="Please sign in to view your shipments."
      icon={<LoginIcon />}
      action={<Button variant="contained" onClick={() => navigate('/login')}>Login</Button>}
    />
  );

  if (error) return (
    <EmptyState
      title="Error Loading Shipments"
      description={error}
      icon={<LocalShippingIcon />}
      action={<Button onClick={fetchShipments}>Retry</Button>}
    />
  );

  return (
    <Box>
      {/* 2. KPI Strip */}
      <ShipmentsKPIStrip
        shipments={shipments}
        currentFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Tabs */}
      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={viewMode}
          onChange={(e, newValue) => setViewMode(newValue)}
          aria-label="shipment tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={`Active (${shipments.filter(s => ['created', 'in_transit', 'out_for_delivery'].includes(s.status)).length})`}
            value="active"
          />
          <Tab
            label={`Pending (${shipments.filter(s => ['draft', 'pending', 'exception', 'updated', 'ready_for_pickup'].includes(s.status)).length})`}
            value="pending"
          />
          <Tab
            label={`Delivered (${shipments.filter(s => s.status === 'delivered').length})`}
            value="delivered"
          />
          <Tab label="All Shipments" value="all" />
        </Tabs>
      </Box>

      <Card sx={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>

        {/* 3. Toolbar */}
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 300 }}>
            <TextField
              size="small"
              placeholder="Search tracking, customer, city..."
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                sx: { borderRadius: 3 }
              }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<FilterListIcon />} variant="outlined" sx={{ borderRadius: 3 }}>
              Filters
            </Button>
            <Button startIcon={<DateRangeIcon />} variant="outlined" sx={{ borderRadius: 3 }}>
              Date
            </Button>
          </Stack>
        </Box>

        {/* 4. Smart Table */}
        {filteredShipments.length === 0 ? (
          <EmptyState
            title="No Shipments Found"
            description={searchQuery ? "Try adjusting your search filters." : "No shipments match this status."}
            icon={<LocalShippingIcon />}
            action={searchQuery && <Button onClick={() => setSearchQuery('')}>Clear Search</Button>}
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Tracking Info</TableCell>
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Route</TableCell>
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Customer</TableCell>
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Status</TableCell>
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Timeline</TableCell>
                    <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentShipments.map((shipment) => (
                    <TableRow
                      key={shipment.trackingNumber || shipment._id}
                      hover
                      sx={{ cursor: 'pointer', bgcolor: viewMode === 'pending' ? alpha(theme.palette.warning.light, 0.05) : 'inherit' }}
                      onClick={() => navigate(`/shipment/${shipment.trackingNumber}`)}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LocalShippingIcon color={viewMode === 'pending' ? 'warning' : 'primary'} fontSize="small" />
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold" color={viewMode === 'pending' ? 'warning.dark' : 'primary'}>
                              {shipment.trackingNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {shipment.serviceCode || 'Standard'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box>
                            <Typography variant="body2" fontWeight="600">{shipment.origin?.city}</Typography>
                            <Typography variant="caption" display="block">{shipment.origin?.countryCode}</Typography>
                          </Box>
                          <Typography color="text.secondary">→</Typography>
                          <Box>
                            <Typography variant="body2" fontWeight="600">{shipment.destination?.city}</Typography>
                            <Typography variant="caption" display="block">{shipment.destination?.countryCode}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{shipment.customer?.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">{shipment.customer?.phone}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={shipment.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {shipment.estimatedDelivery
                            ? new Date(shipment.estimatedDelivery).toLocaleDateString()
                            : 'Pending'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Est. Delivery</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Docs">
                            <IconButton
                              size="small"
                              onClick={(e) => handleDownloadMenuOpen(e, shipment)}
                              color="default"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Delete Button (Client Only) */}
                          {user?.role === 'client' &&
                            ['pending', 'exception', 'updated', 'ready_for_pickup'].includes(shipment.status) && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleDeleteShipment(shipment.trackingNumber); }}
                                sx={{ mr: 1 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}

                          {(user?.role === 'client' && ['pending', 'exception', 'updated', 'ready_for_pickup'].includes(shipment.status)) ||
                            ((user?.role === 'staff' || user?.role === 'admin') && viewMode === 'pending') ? (
                            <Button
                              variant="contained"
                              color={user?.role === 'client' ? "primary" : "warning"}
                              size="small"
                              sx={{ borderRadius: 4, minWidth: 120 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveClick(shipment);
                              }}
                            >
                              {user?.role === 'client' ? "Edit Details" : "Approve & Book"}
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{ borderRadius: 4, minWidth: 60 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/shipment/${shipment.trackingNumber}`);
                              }}
                            >
                              View
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: `1px solid ${theme.palette.divider}` }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Approval Dialog */}
      <ShipmentApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        shipment={selectedShipmentForApproval}
        onShipmentUpdated={handleApprovalComplete}
      />

      {/* Download Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDownloadMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleDownloadLabel}>
          <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> System Label
        </MenuItem>

        {(user?.role === 'admin' || user?.role === 'staff') && (
          <>
            <Divider />
            <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 'bold' }}>
              Carrier
            </Typography>
            <MenuItem
              onClick={handleDownloadCarrierLabel}
              disabled={!selectedShipmentForDownload?.labelUrl}
            >
              <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Carrier AWB / Label
            </MenuItem>
            <MenuItem
              onClick={handleDownloadInvoice}
              disabled={!selectedShipmentForDownload?.invoiceUrl}
            >
              <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Carrier Invoice
            </MenuItem>
          </>
        )}
      </Menu>

    </Box>
  );
};

export default ShipmentList;