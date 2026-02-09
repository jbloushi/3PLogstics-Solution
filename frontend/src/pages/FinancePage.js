import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { financeService, organizationService, shipmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    PageHeader,
    Card,
    Button,
    Input,
    Select,
    Modal,
    TableWrapper,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    StatusPill,
    Alert,
    Loader
} from '../ui';

// --- Styled Components ---

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
`;

const StatCard = styled.div`
    background: ${props => props.$gradient ? 'linear-gradient(135deg, #00d9b8 0%, #00b398 100%)' : 'var(--bg-secondary)'};
    color: ${props => props.$gradient ? 'white' : 'var(--text-primary)'};
    padding: 24px;
    border-radius: 16px;
    border: 1px solid ${props => props.$gradient ? 'transparent' : 'var(--border-color)'};
    position: relative;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
`;

const StatValue = styled.div`
    font-size: 32px;
    font-weight: 800;
    margin-top: 8px;
    color: ${props => props.$highlight ? 'var(--accent-primary)' : 'inherit'};
    
    span {
        font-size: 16px;
        font-weight: 600;
        opacity: 0.7;
    }
`;

const StatLabel = styled.div`
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
`;

const TransactionIcon = styled.div`
    color: ${props => props.$type === 'CREDIT' ? 'var(--accent-success)' : 'var(--accent-error)'};
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
`;

const AllocationGrid = styled.div`
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 24px;
    margin-top: 24px;
    align-items: start;

    @media (max-width: 1024px) {
        grid-template-columns: 1fr;
    }
`;

const ListCard = styled(Card)`
    display: flex;
    flex-direction: column;
    height: 600px;
    overflow: hidden;
`;

const ListHeader = styled.div`
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ScrollableList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px;
`;

const ListItem = styled.div`
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    background: ${props => props.$selected ? 'var(--accent-primary-transparent)' : 'transparent'};
    border: 1px solid ${props => props.$selected ? 'var(--accent-primary)' : 'var(--border-color)'};
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
        border-color: var(--accent-primary);
        background: var(--bg-tertiary);
    }

    ${props => props.$disabled && `
        opacity: 0.6;
        cursor: not-allowed;
        text-decoration: line-through;
        background: var(--bg-tertiary);
        &:hover {
            border-color: var(--border-color);
        }
    `}
`;

const FilterRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0 16px 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary);
`;

const ItemInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ItemTitle = styled.div`
    font-weight: 700;
    font-size: 14px;
    color: var(--text-primary);
`;

const ItemSub = styled.div`
    font-size: 12px;
    color: var(--text-secondary);
`;

const AllocationFooter = styled.div`
    padding: 16px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const FinancePage = () => {
    const { user, refreshUser } = useAuth();
    const { enqueueSnackbar } = useSnackbar();
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, total: 0 });
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [overview, setOverview] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'manual', reference: '', notes: '' });
    const [shipments, setShipments] = useState([]);
    const [selectedPaymentId, setSelectedPaymentId] = useState('');
    const [selectedShipmentIds, setSelectedShipmentIds] = useState([]);
    const [shipmentSearch, setShipmentSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allocationLoading, setAllocationLoading] = useState(false);

    const fetchLedger = React.useCallback(async (orgId) => {
        try {
            setLoading(true);
            const response = await financeService.getLedger({ page: pagination.page, orgId });
            setLedger(response.data || []);
            setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
            await refreshUser();
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, refreshUser]);

    // Reset pagination and clear ALL selections/data when organization changes
    useEffect(() => {
        if (!selectedOrgId) return;
        console.log('--- Organization Reset Triggers ---', selectedOrgId);
        setPagination(prev => ({ ...prev, page: 1 }));
        setLedger([]);
        setPayments([]);
        setShipments([]);
        setSelectedPaymentId('');
        setSelectedShipmentIds([]);
    }, [selectedOrgId]);

    const currentOrgName = selectedOrgId === 'none'
        ? 'Solo Shippers (Unorganized)'
        : organizations.find(o => o._id === selectedOrgId)?.name || 'Selected Organization';

    const isFirstOrgLoad = React.useRef(true);

    useEffect(() => {
        const loadOrganizations = async () => {
            console.log('Loading organizations list for role:', user?.role);
            if (user?.role === 'admin' || user?.role === 'staff') {
                try {
                    const response = await organizationService.getOrganizations();
                    const orgs = response.data || [];
                    setOrganizations(orgs);
                    console.log('Organizations loaded:', orgs.length);

                    // Only auto-select on first load to avoid overwriting user choice
                    if (isFirstOrgLoad.current && !selectedOrgId) {
                        console.log('Auto-selecting "Solo Shippers" (Initial)');
                        setSelectedOrgId('none');
                        isFirstOrgLoad.current = false;
                    }
                } catch (error) {
                    console.error('Failed to fetch organizations:', error);
                }
            } else if (user?.organization?._id) {
                console.log('Setting user constant org:', user.organization._id);
                setSelectedOrgId(user.organization._id);
            }
        };

        loadOrganizations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, user?.role, user?.organization?._id]); // selectedOrgId intentionally omitted as we handle it via Ref

    const loadFinance = React.useCallback(async () => {
        console.log('loadFinance triggered for org:', selectedOrgId);
        if (!selectedOrgId) {
            console.log('No orgId selected, skipping load');
            return;
        }

        try {
            setLoading(true);
            if (user?.role === 'admin' || user?.role === 'staff') {
                console.log('Fetching detailed finance data for Admin/Staff...');
                const [ledgerRes, overviewRes, paymentsRes, shipmentsRes] = await Promise.all([
                    financeService.getLedger({ page: pagination.page, orgId: selectedOrgId }),
                    financeService.getOrganizationOverview(selectedOrgId),
                    financeService.listPayments(selectedOrgId),
                    shipmentService.getAllShipments({ organization: selectedOrgId, limit: 200 }) // Fetch more for manual list, no paid filter
                ]);

                console.log('[DEBUG] API Responses:', {
                    ledger: (ledgerRes.data || []).length,
                    payments: (paymentsRes.data || []).length,
                    shipments: (shipmentsRes.data || []).length
                });

                setLedger(ledgerRes.data || []);
                setPagination(prev => ({ ...prev, total: ledgerRes.pagination?.total || 0 }));
                setOverview(overviewRes.data);

                const unappliedPayments = (paymentsRes.data || []).filter(p => p.status !== 'APPLIED');
                setPayments(unappliedPayments);
                setShipments(shipmentsRes.data || []);
            } else {
                console.log('Fetching Client-side finance data...');
                await fetchLedger(selectedOrgId);
                const balanceResponse = await financeService.getBalance();
                setOverview({
                    balance: balanceResponse.data?.balance || 0,
                    creditLimit: balanceResponse.data?.creditLimit || 0,
                    availableCredit: balanceResponse.data?.availableCredit || 0,
                    unappliedCash: balanceResponse.data?.unappliedCash || 0,
                    totalUnpaid: 0,
                    agingBuckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
                });
            }
        } catch (err) {
            console.error('CRITICAL: Load finance failed:', err);
        } finally {
            setLoading(false);
            console.log('Finance loading state cleared');
        }
    }, [selectedOrgId, pagination.page, user?.role, fetchLedger]);

    useEffect(() => {
        loadFinance();
    }, [loadFinance]);

    const getCategoryPill = (category) => {
        const style = {
            'SHIPMENT_CHARGE': 'info',
            'PAYMENT': 'success',
            'REVERSAL': 'warning',
            'ADJUSTMENT': 'neutral',
            'ALLOCATION': 'info'
        };
        const status = style[category] || 'neutral';
        return <StatusPill status={status} />;
    };

    const handlePostPayment = async () => {
        if (!paymentForm.amount) return;
        try {
            await financeService.postPayment(selectedOrgId, {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount)
            });
            enqueueSnackbar('Payment posted successfully', { variant: 'success' });
            setPaymentForm({ amount: '', method: 'manual', reference: '', notes: '' });
            loadFinance();
        } catch (error) {
            enqueueSnackbar('Failed to post payment', { variant: 'error' });
        }
    };

    const handleAllocateFifo = async () => {
        try {
            await financeService.allocatePaymentsFifo(selectedOrgId);
            enqueueSnackbar('FIFO Allocation completed', { variant: 'success' });
            await loadFinance();
        } catch (error) {
            enqueueSnackbar('Failed to allocate FIFO', { variant: 'error' });
        }
    };

    const handleManualAllocation = async () => {
        if (!selectedPaymentId || selectedShipmentIds.length === 0) {
            enqueueSnackbar('Please select a payment and at least one shipment', { variant: 'warning' });
            return;
        }

        const payment = payments.find(p => p._id === selectedPaymentId);
        if (!payment) {
            enqueueSnackbar('Selected payment not found', { variant: 'error' });
            return;
        }

        // Calculate unapplied amount safely
        const totalAllocated = parseFloat(payment.allocatedAmount || 0);
        const unappliedAmount = parseFloat(payment.amount) - totalAllocated;

        console.log('Manual Allocation Debug:', {
            paymentId: selectedPaymentId,
            shipmentIds: selectedShipmentIds,
            amount: unappliedAmount,
            paymentAmount: payment.amount,
            totalAllocated
        });

        if (unappliedAmount <= 0) {
            enqueueSnackbar('This payment has no remaining balance to allocate', { variant: 'warning' });
            return;
        }

        setAllocationLoading(true);
        try {
            const response = await financeService.allocatePaymentManual(selectedOrgId, {
                paymentId: selectedPaymentId,
                shipmentIds: selectedShipmentIds,
                amount: unappliedAmount
            });
            console.log('Allocation Response:', response);
            enqueueSnackbar('Payment allocated successfully', { variant: 'success' });
            setSelectedShipmentIds([]);
            // Don't clear selectedPaymentId if funds might remain
            await loadFinance();
        } catch (error) {
            console.error('Allocation Error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to allocate payment';
            enqueueSnackbar(errorMsg, { variant: 'error' });
        } finally {
            setAllocationLoading(false);
        }
    };

    const toggleShipmentSelection = (shipment) => {
        if (shipment.paid) return;
        setSelectedShipmentIds(prev =>
            prev.includes(shipment._id) ? prev.filter(i => i !== shipment._id) : [...prev, shipment._id]
        );
    };

    const filteredShipments = shipments
        .filter(s => {
            const matchesSearch = (s.trackingNumber || '').toLowerCase().includes(shipmentSearch.toLowerCase()) ||
                (s.origin?.contactPerson || '').toLowerCase().includes(shipmentSearch.toLowerCase()) ||
                (s.receiver?.contactPerson || '').toLowerCase().includes(shipmentSearch.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'paid') matchesStatus = s.paid;
            else if (statusFilter === 'unpaid') matchesStatus = !s.paid && (s.totalPaid || 0) === 0;
            else if (statusFilter === 'partial') matchesStatus = !s.paid && (s.totalPaid || 0) > 0;

            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || new Date(s.createdAt) >= start) &&
                (!end || new Date(s.createdAt) <= end);

            return matchesSearch && matchesStatus && matchesDate;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const selectedPayment = payments.find(p => p._id === selectedPaymentId);
    const selectedShipmentsTotal = shipments
        .filter(s => selectedShipmentIds.includes(s._id))
        .reduce((sum, s) => sum + (s.paid ? 0 : (s.remainingBalance !== undefined ? s.remainingBalance : (s.pricingSnapshot?.totalPrice || s.price || 0) - (s.totalPaid || 0))), 0);

    const summary = overview || {
        balance: 0,
        creditLimit: 0,
        availableCredit: 0,
        unappliedCash: 0,
        totalUnpaid: 0,
        agingBuckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    };

    return (
        <div>
            <PageHeader
                title="Finance & Credits"
                description="Manage your wallet, view transaction history, and track your spending."
                action={
                    (user?.role === 'admin' || user?.role === 'staff') && (
                        <Button variant="outline" onClick={() => setAdminDialogOpen(true)}>
                            Adjust Balances
                        </Button>
                    )
                }
                secondaryAction={
                    <Button variant="secondary" onClick={() => loadFinance()}>
                        Refresh
                    </Button>
                }
            />

            {(user?.role === 'admin' || user?.role === 'staff') && (
                <Card style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ minWidth: '240px' }}>
                            <Select
                                label="Organization"
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                            >
                                <option value="none" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                    Solo Shippers (Unorganized)
                                </option>
                                {organizations.map((org) => (
                                    <option key={org._id} value={org._id}>{org.name}</option>
                                ))}
                            </Select>
                        </div>
                        <Alert severity="info" style={{ margin: 0 }}>
                            All balances are derived from the organization ledger. Payments can remain unapplied until allocated.
                        </Alert>
                    </div>
                </Card>
            )}

            <StatsGrid>
                <StatCard $gradient>
                    <div>
                        <StatLabel>Outstanding Balance</StatLabel>
                        <StatValue>
                            {loading ? <Loader /> : `${parseFloat(summary.balance).toFixed(3)}`} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Unapplied Cash</StatLabel>
                        <StatValue $highlight>
                            {loading ? <Loader /> : `${parseFloat(summary.unappliedCash).toFixed(3)}`} <span>KD</span>
                        </StatValue>
                        <ItemSub style={{ marginTop: '8px' }}>Available funds for allocation</ItemSub>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Available Credit</StatLabel>
                        <StatValue>
                            {loading ? <Loader /> : `${parseFloat(summary.availableCredit).toFixed(3)}`} <span>KD</span>
                        </StatValue>
                        <ItemSub style={{ marginTop: '8px' }}>Limit: {summary.creditLimit.toFixed(3)} KD</ItemSub>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Total Unpaid Shipments</StatLabel>
                        <StatValue>
                            {parseFloat(summary.totalUnpaid).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <StatLabel>Aging Buckets</StatLabel>
                            <StatValue style={{ fontSize: '18px', display: 'flex', gap: '16px', marginTop: '12px' }}>
                                <div><div style={{ fontSize: '10px', opacity: 0.7 }}>0–30</div>{summary.agingBuckets['0-30'].toFixed(3)}</div>
                                <div><div style={{ fontSize: '10px', opacity: 0.7 }}>31–60</div>{summary.agingBuckets['31-60'].toFixed(3)}</div>
                                <div><div style={{ fontSize: '10px', opacity: 0.7 }}>61–90</div>{summary.agingBuckets['61-90'].toFixed(3)}</div>
                                <div><div style={{ fontSize: '10px', opacity: 0.7 }}>90+</div>{summary.agingBuckets['90+'].toFixed(3)}</div>
                            </StatValue>
                        </div>
                    </div>
                </StatCard>
            </StatsGrid>

            {(user?.role === 'admin' || user?.role === 'staff') && (
                <>
                    <Card title={`Posting Payment: ${currentOrgName}`} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                            <Input
                                label="Amount (KD)"
                                type="number"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            />
                            <Input
                                label="Reference / Receipt #"
                                value={paymentForm.reference}
                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                            />
                            <Select
                                label="Method"
                                value={paymentForm.method}
                                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                            >
                                <option value="manual">Manual Entry</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="knet">K-Net</option>
                            </Select>
                            <Input
                                label="Internal Notes"
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="primary" onClick={handlePostPayment} disabled={!paymentForm.amount}>
                                    Post Payment
                                </Button>
                                <Button variant="secondary" onClick={handleAllocateFifo} title="Apply available funds to oldest shipments first">
                                    FIFO Allocate
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <h3 style={{ margin: '32px 0 16px 0', fontSize: '20px', fontWeight: 800 }}>
                        Manual Allocation: {currentOrgName}
                    </h3>

                    <AllocationGrid>
                        {/* LEFT: Payment Selection */}
                        <ListCard>
                            <ListHeader>
                                <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
                                    1. Select Payment
                                </div>
                            </ListHeader>
                            <ScrollableList>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader /></div>
                                ) : payments.length > 0 ? payments.map(p => (
                                    <ListItem
                                        key={p._id}
                                        $selected={selectedPaymentId === p._id}
                                        onClick={() => setSelectedPaymentId(p._id)}
                                    >
                                        <ItemInfo>
                                            <ItemTitle>{p.reference || 'No Reference'}</ItemTitle>
                                            <ItemSub>
                                                {format(new Date(p.postedAt || p.createdAt), 'MMM dd, yyyy')} • {p.method}
                                            </ItemSub>
                                        </ItemInfo>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '15px' }}>
                                                {(p.amount - (p.allocatedAmount || 0)).toFixed(3)} KD
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                Total: {p.amount.toFixed(3)} KD
                                            </div>
                                        </div>
                                    </ListItem>
                                )) : (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No unapplied payments found
                                    </div>
                                )}
                            </ScrollableList>
                        </ListCard>

                        {/* RIGHT: Shipment Selection */}
                        <ListCard>
                            <ListHeader>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
                                        2. Select Shipments ({selectedShipmentIds.length})
                                    </div>
                                    <div style={{ width: '250px' }}>
                                        <Input
                                            placeholder="Search tracking, sender..."
                                            value={shipmentSearch}
                                            onChange={(e) => setShipmentSearch(e.target.value)}
                                            style={{ margin: 0 }}
                                        />
                                    </div>
                                </div>
                            </ListHeader>
                            <FilterRow>
                                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                    <Input
                                        type="date"
                                        label="From"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ margin: 0, fontSize: '11px' }}
                                    />
                                    <Input
                                        type="date"
                                        label="To"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={{ margin: 0, fontSize: '11px' }}
                                    />
                                </div>
                                <div style={{ minWidth: '150px' }}>
                                    <Select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        style={{ margin: 0, height: '38px', fontSize: '12px' }}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="unpaid">Unpaid Only</option>
                                        <option value="partial">Partial Only</option>
                                        <option value="paid">Paid Only</option>
                                    </Select>
                                </div>
                            </FilterRow>
                            <ScrollableList>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader /></div>
                                ) : filteredShipments.length > 0 ? filteredShipments.map(s => (
                                    <ListItem
                                        key={s._id}
                                        $selected={selectedShipmentIds.includes(s._id)}
                                        $disabled={s.paid}
                                        onClick={() => toggleShipmentSelection(s)}
                                    >
                                        <ItemInfo>
                                            <ItemTitle>{s.trackingNumber}</ItemTitle>
                                            <ItemSub>
                                                {format(new Date(s.createdAt), 'MMM dd, yyyy')} • From: {s.origin?.contactPerson}
                                            </ItemSub>
                                        </ItemInfo>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, fontSize: '15px' }}>
                                                {(s.paid ? 0 : (s.remainingBalance !== undefined ? s.remainingBalance : (s.pricingSnapshot?.totalPrice || s.price || 0) - (s.totalPaid || 0))).toFixed(3)} KD
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                Total: {(s.pricingSnapshot?.totalPrice || s.price || 0).toFixed(3)} KD
                                            </div>
                                            <div style={{
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: s.paid ? 'var(--accent-success)' : ((s.totalPaid || 0) > 0.001 ? '#ffb300' : 'var(--text-secondary)')
                                            }}>
                                                {s.paid ? 'PAID' : ((s.totalPaid || 0) > 0.001 ? 'PARTIAL' : 'UNPAID')}
                                            </div>
                                            {(s.totalPaid || 0) > 0 && !s.paid && (
                                                <div style={{ fontSize: '9px', opacity: 0.7 }}>
                                                    Paid: {(s.totalPaid || 0).toFixed(3)}
                                                </div>
                                            )}
                                        </div>
                                    </ListItem>
                                )) : (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No shipments found for criteria
                                    </div>
                                )}
                            </ScrollableList>
                            <AllocationFooter>
                                <div style={{ fontSize: '14px' }}>
                                    {selectedPayment && (
                                        <span>Allocating From: <strong>Current Balance ({selectedPayment.amount.toFixed(3)} KD)</strong></span>
                                    )}
                                    {selectedShipmentsTotal > 0 && (
                                        <span style={{ marginLeft: '16px' }}>Total To Pay: <strong>Current Outstanding ({selectedShipmentsTotal.toFixed(3)} KD)</strong></span>
                                    )}
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleManualAllocation}
                                    disabled={!selectedPaymentId || selectedShipmentIds.length === 0 || allocationLoading}
                                >
                                    {allocationLoading ? 'Allocating...' : 'Confirm Allocation'}
                                </Button>
                            </AllocationFooter>
                        </ListCard>
                    </AllocationGrid>
                </>
            )}
            <Card title="Transaction History" style={{ marginTop: '24px' }}>
                <TableWrapper>
                    <Table>
                        <Thead>
                            <Tr>
                                <Th>Date & Time</Th>
                                <Th>Description</Th>
                                <Th>Category</Th>
                                <Th style={{ textAlign: 'right' }}>Amount</Th>
                                <Th style={{ textAlign: 'right' }}>Balance After</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {loading ? (
                                <Tr><Td colSpan={5} style={{ textAlign: 'center' }}><Loader /></Td></Tr>
                            ) : ledger.length > 0 ? ledger.map((entry) => (
                                <Tr key={entry._id}>
                                    <Td>
                                        <div style={{ fontWeight: '500' }}>{format(new Date(entry.createdAt), 'MMM dd, yyyy')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                            {format(new Date(entry.createdAt), 'HH:mm')}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div style={{ maxWidth: '300px' }}>{entry.description}</div>
                                        {entry.reference && (
                                            <span style={{
                                                fontSize: '10px',
                                                background: 'var(--bg-tertiary)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                REF: {entry.reference}
                                            </span>
                                        )}
                                    </Td>
                                    <Td>{getCategoryPill(entry.category)}</Td>
                                    <Td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <TransactionIcon $type={entry.entryType}>
                                                {entry.entryType === 'CREDIT' ? '+' : '-'} {entry.amount.toFixed(3)}
                                            </TransactionIcon>
                                        </div>
                                    </Td>
                                    <Td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                        {entry.balanceAfter.toFixed(3)} KD
                                    </Td>
                                </Tr>
                            )) : (
                                <Tr><Td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No transactions found</Td></Tr>
                            )}
                        </Tbody>
                    </Table>
                </TableWrapper>
            </Card>

            <AdminAdjustmentDialog
                open={adminDialogOpen}
                onClose={() => setAdminDialogOpen(false)}
                onSuccess={() => {
                    setAdminDialogOpen(false);
                    if (selectedOrgId) {
                        fetchLedger(selectedOrgId);
                    }
                }}
            />
        </div >
    );
};

// --- Sub-component: Dialog ---

const AdminAdjustmentDialog = ({ open, onClose, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        organizationId: '',
        type: 'CREDIT',
        amount: '',
        category: 'ADJUSTMENT',
        description: ''
    });

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                try {
                    const orgRes = await organizationService.getOrganizations();
                    setOrganizations(orgRes.data);
                } catch (err) {
                    console.error('Failed to fetch balance adjustment targets:', err);
                }
            };
            fetchData();
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!formData.organizationId || !formData.amount || !formData.description) {
            enqueueSnackbar('Please fill all fields', { variant: 'error' });
            return;
        }
        setLoading(true);
        try {
            await financeService.adjustBalance({
                ...formData,
                amount: parseFloat(formData.amount)
            });
            enqueueSnackbar('Balance adjusted successfully', { variant: 'success' });
            onSuccess();
        } catch (err) {
            enqueueSnackbar(err.message || 'Operation failed', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Adjust Organization Balance"
            width="600px"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Processing...' : 'Apply Adjustment'}
                    </Button>
                </>
            }
        >
            <div style={{ display: 'grid', gap: '16px' }}>
                <Select
                    label="Select Organization"
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                >
                    <option value="">-- Select Target --</option>
                    {organizations.map(o => (
                        <option key={o._id} value={o._id}>
                            {o.name}
                        </option>
                    ))}
                </Select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Select
                        label="Adjustment Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="CREDIT">Add Funds (Credit)</option>
                        <option value="DEBIT">Deduct (Debit)</option>
                    </Select>

                    <Input
                        label="Amount (KD)"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                </div>

                <Select
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="REVERSAL">REVERSAL</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                    <option value="SHIPMENT_CHARGE">SHIPMENT_CHARGE</option>
                </Select>

                <Input
                    label="Description"
                    placeholder="Reason for adjustment..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>
        </Modal>
    );
};

export default FinancePage;
