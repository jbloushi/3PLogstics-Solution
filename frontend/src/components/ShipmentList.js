import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { shipmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TableWrapper, Table, Thead, Tbody, Tr, Th, Td, Button, Input, StatusPill } from '../ui';
import { generateWaybillPDF } from '../utils/pdfGenerator';
import ShipmentApprovalDialog from './ShipmentApprovalDialog';
import { Menu, MenuItem, Divider, ListItemIcon, ListItemText } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// --- Styled Components ---

const Toolbar = styled.div`
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
`;

const Tab = styled.div`
  padding: 12px 4px;
  cursor: pointer;
  font-weight: ${props => props.$active ? '600' : '500'};
  color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
  border-bottom: 2px solid ${props => props.$active ? 'var(--accent-primary)' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: var(--text-primary);
  }
`;

const CountBadge = styled.span`
  background: ${props => props.$active ? 'rgba(0, 217, 184, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
`;

const PaginationContainer = styled.div`
  padding: 16px;
  display: flex;
  justify-content: center;
  gap: 8px;
  background: var(--bg-secondary);
  border-radius: 0 0 16px 16px;
`;

const PageBtn = styled.button`
  background: ${props => props.$active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.$active ? '#0a0e1a' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.$active ? 'var(--accent-primary)' : 'var(--border-color)'};
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 600;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary);
    color: ${props => props.$active ? '#0a0e1a' : 'var(--accent-primary)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ShipmentList = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('active');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Menu State (Replaces Custom ActionMenu)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);

  // Approval State
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedShipmentForApproval, setSelectedShipmentForApproval] = useState(null);

  // Fetch Data
  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await shipmentService.getAllShipments();
      setShipments(Array.isArray(response) ? response : (response?.data || []));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchShipments();
  }, [isAuthenticated]);

  // Filter Logic
  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
      // View Mode
      if (viewMode === 'active' && !['created', 'in_transit', 'out_for_delivery'].includes(shipment.status)) return false;
      if (viewMode === 'pending' && !['draft', 'pending', 'updated', 'ready_for_pickup', 'picked_up'].includes(shipment.status)) return false;
      if (viewMode === 'delivered' && shipment.status !== 'delivered') return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          shipment.trackingNumber?.toLowerCase().includes(q) ||
          shipment.customer?.name?.toLowerCase().includes(q) ||
          shipment.destination?.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [shipments, viewMode, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE);
  const currentShipments = filteredShipments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Handlers
  const handleMenuOpen = (event, shipment) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveShipment(shipment);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveShipment(null);
  };

  const handleDownloadLabel = async () => {
    if (activeShipment) {
      await generateWaybillPDF(activeShipment);
    }
    handleMenuClose();
  };

  const handleOpenPdf = (url) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
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
        console.error('Error opening PDF data URI:', e);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!activeShipment) return;
    if (window.confirm("Delete this shipment?")) {
      await shipmentService.deleteShipment(activeShipment.trackingNumber);
      fetchShipments();
    }
    handleMenuClose();
  };

  const handleApproveEdit = () => {
    setSelectedShipmentForApproval(activeShipment);
    setApprovalDialogOpen(true);
    handleMenuClose();
  };

  return (
    <div>
      {/* Tabs */}
      <FilterTabs>
        {[
          { id: 'active', label: 'Active', count: shipments.filter(s => ['created', 'in_transit', 'out_for_delivery'].includes(s.status)).length },
          { id: 'pending', label: 'Pending', count: shipments.filter(s => ['draft', 'pending', 'updated', 'ready_for_pickup'].includes(s.status)).length },
          { id: 'delivered', label: 'Delivered', count: shipments.filter(s => s.status === 'delivered').length },
          { id: 'all', label: 'All', count: shipments.length }
        ].map(tab => (
          <Tab
            key={tab.id}
            $active={viewMode === tab.id}
            onClick={() => { setViewMode(tab.id); setPage(1); }}
          >
            {tab.label}
            <CountBadge $active={viewMode === tab.id}>{tab.count}</CountBadge>
          </Tab>
        ))}
      </FilterTabs>

      {/* List Container */}
      <div style={{ borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        {/* Search Bar */}
        <Toolbar>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <Input
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Toolbar>

        <TableWrapper style={{ border: 'none', borderRadius: 0 }}>
          <Table>
            <Thead>
              <Tr>
                <Th>Tracking Info</Th>
                <Th>Route</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Est. Delivery</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan="6" style={{ textAlign: 'center' }}>Loading...</Td></Tr>
              ) : currentShipments.map(shipment => (
                <Tr
                  key={shipment._id}
                  onClick={() => navigate(`/shipment/${shipment.trackingNumber}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{shipment.trackingNumber}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{shipment.serviceCode || 'Standard'}</div>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600' }}>{shipment.origin?.city}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>→</span>
                      <span style={{ fontWeight: '600' }}>{shipment.destination?.city}</span>
                    </div>
                  </Td>
                  <Td>
                    <div>{shipment.customer?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{shipment.customer?.phone}</div>
                  </Td>
                  <Td><StatusPill status={shipment.status} /></Td>
                  <Td>{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : '—'}</Td>
                  <Td style={{ textAlign: 'right' }}>
                    <Button
                      variant="secondary"
                      onClick={(e) => handleMenuOpen(e, shipment)}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Actions
                    </Button>
                  </Td>
                </Tr>
              ))}
              {!loading && currentShipments.length === 0 && (
                <Tr><Td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No shipments found.</Td></Tr>
              )}
            </Tbody>
          </Table>
        </TableWrapper>

        {/* Mui Menu for Actions (Portaled to prevent clipping) */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            style: {
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              minWidth: '180px'
            }
          }}
        >
          <MenuItem onClick={handleDownloadLabel}>
            <ListItemIcon><DescriptionIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></ListItemIcon>
            <ListItemText>Label</ListItemText>
          </MenuItem>

          {activeShipment && (user?.role === 'admin' || user?.role === 'staff') && (
            <div>
              <Divider sx={{ my: 0.5, borderColor: 'var(--border-color)', opacity: 0.5 }} />
              <div style={{ padding: '4px 16px', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.7 }}>
                {activeShipment.carrier?.toUpperCase() || 'CARRIER'}
              </div>

              <MenuItem
                disabled={!activeShipment.labelUrl}
                onClick={() => handleOpenPdf(activeShipment.labelUrl)}
              >
                <ListItemIcon><LocalShippingIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></ListItemIcon>
                <ListItemText>AWB / Label</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={!activeShipment.invoiceUrl}
                onClick={() => handleOpenPdf(activeShipment.invoiceUrl)}
              >
                <ListItemIcon><ReceiptIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></ListItemIcon>
                <ListItemText>Invoice</ListItemText>
              </MenuItem>
              {['pending', 'draft', 'updated', 'ready_for_pickup', 'picked_up'].includes(activeShipment.status) && (
                <MenuItem onClick={handleApproveEdit}>
                  <ListItemIcon><CheckCircleIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></ListItemIcon>
                  <ListItemText>Approve / Edit</ListItemText>
                </MenuItem>
              )}
            </div>
          )}

          {activeShipment && ['pending', 'draft'].includes(activeShipment.status) && (
            <div>
              <Divider sx={{ my: 0.5, borderColor: 'var(--border-color)', opacity: 0.5 }} />
              <MenuItem onClick={handleDelete} sx={{ color: 'var(--accent-error)' }}>
                <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'var(--accent-error)' }} /></ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </div>
          )}
        </Menu>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationContainer>
            <PageBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>&lt;</PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <PageBtn key={p} $active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>&gt;</PageBtn>
          </PaginationContainer>
        )}
      </div>

      <ShipmentApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        shipment={selectedShipmentForApproval}
        onShipmentUpdated={() => {
          setApprovalDialogOpen(false);
          fetchShipments();
        }}
      />
    </div>
  );
};

export default ShipmentList;