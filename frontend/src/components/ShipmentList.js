import React, { useCallback, useEffect, useState } from 'react';
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

const ResultsMeta = styled.div`
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 12px;
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
  display: grid;
  gap: 16px;
`;

const CounterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const CounterCard = styled.button`
  background: var(--bg-secondary);
  border: 1px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
  padding: 18px 20px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  display: grid;
  gap: 6px;

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.$color};
    box-shadow: 0 4px 20px -5px ${props => `${props.$color}33`};
  }
`;

const CounterLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CounterValue = styled.span`
  font-family: 'Outfit', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
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

const ACTIVE_STATUSES = ['created', 'in_transit', 'out_for_delivery'];
const PENDING_STATUSES = ['draft', 'pending', 'updated', 'ready_for_pickup', 'picked_up'];

const STATUS_GROUP_MAP = {
  all: undefined,
  pending: PENDING_STATUSES,
  active: ACTIVE_STATUSES,
  delivered: ['delivered']
};

const DEBOUNCE_MS = 350;

const ShipmentList = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const ITEMS_PER_PAGE = 10;

  // Menu State (Replaces Custom ActionMenu)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);

  // Approval State
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedShipmentForApproval, setSelectedShipmentForApproval] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Data
  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const statusIn = STATUS_GROUP_MAP[viewMode];
      const response = await shipmentService.getAllShipments({
        page,
        limit: ITEMS_PER_PAGE,
        summary: true,
        ...(statusIn ? { statusIn: statusIn.join(',') } : {}),
        ...(debouncedSearchQuery ? { q: debouncedSearchQuery } : {})
      });

      setShipments(response?.data || []);
      setPagination(response?.pagination || { total: 0, page: 1, limit: ITEMS_PER_PAGE, pages: 1 });
    } catch (err) {
      console.error('Fetch error:', err);
      setShipments([]);
      setPagination({ total: 0, page: 1, limit: ITEMS_PER_PAGE, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, page, viewMode]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShipments();
    }
  }, [fetchShipments, isAuthenticated]);

  const totalPages = Math.max(pagination.pages || 1, 1);
  const hasFilters = Boolean(searchQuery) || viewMode !== 'all';

  const getVisiblePages = () => {
    const maxVisiblePages = 7;
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    const adjustedStart = Math.max(1, end - maxVisiblePages + 1);

    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  };

  const visiblePages = getVisiblePages();
  const counters = [
    { id: 'all', label: 'All', count: viewMode === 'all' ? pagination.total : '—', color: '#00d9b8' },
    { id: 'pending', label: 'Pending', count: viewMode === 'pending' ? pagination.total : '—', color: '#fbbf24' },
    { id: 'active', label: 'In Transit (Active)', count: viewMode === 'active' ? pagination.total : '—', color: '#34d399' },
    { id: 'delivered', label: 'Delivered', count: viewMode === 'delivered' ? pagination.total : '—', color: '#38bdf8' },
  ];

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
      <CounterGrid>
        {counters.map(counter => (
          <CounterCard
            key={counter.id}
            type="button"
            $active={viewMode === counter.id}
            $color={counter.color}
            onClick={() => { setViewMode(counter.id); setPage(1); }}
          >
            <CounterLabel>{counter.label}</CounterLabel>
            <CounterValue>{counter.count}</CounterValue>
          </CounterCard>
        ))}
      </CounterGrid>

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
          <ResultsMeta>
            <span>
              Showing {shipments.length} of {pagination.total} shipments
            </span>
            {hasFilters && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setViewMode('all');
                  setPage(1);
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Clear filters
              </Button>
            )}
          </ResultsMeta>
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
              ) : shipments.map(shipment => (
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
              {!loading && shipments.length === 0 && (
                <Tr>
                  <Td colSpan="6" style={{ padding: 0 }}>
                    <EmptyState>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No shipments found</div>
                      <div>Try adjusting your filters or search terms.</div>
                      {hasFilters && (
                        <div>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSearchQuery('');
                              setViewMode('all');
                              setPage(1);
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      )}
                    </EmptyState>
                  </Td>
                </Tr>
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
            {visiblePages[0] > 1 && (
              <>
                <PageBtn onClick={() => setPage(1)}>1</PageBtn>
                {visiblePages[0] > 2 && <span style={{ padding: '0 6px', color: 'var(--text-secondary)' }}>…</span>}
              </>
            )}
            {visiblePages.map(p => (
              <PageBtn key={p} $active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
            ))}
            {visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span style={{ padding: '0 6px', color: 'var(--text-secondary)' }}>…</span>}
                <PageBtn onClick={() => setPage(totalPages)}>{totalPages}</PageBtn>
              </>
            )}
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
