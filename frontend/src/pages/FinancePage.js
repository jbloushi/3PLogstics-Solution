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

const FinancePage = () => {
    const { user, refreshUser } = useAuth();
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
    const [allocationForm, setAllocationForm] = useState({ paymentId: '', shipmentId: '', amount: '' });

    const fetchLedger = async (orgId) => {
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
    };

    useEffect(() => {
        const loadOrganizations = async () => {
            if (user?.role === 'admin' || user?.role === 'staff') {
                try {
                    const response = await organizationService.getOrganizations();
                    setOrganizations(response.data || []);
                    if (!selectedOrgId && response.data?.length) {
                        setSelectedOrgId(response.data[0]._id);
                    }
                } catch (error) {
                    console.error('Failed to fetch organizations:', error);
                }
            } else if (user?.organization?._id) {
                setSelectedOrgId(user.organization._id);
            }
        };

        loadOrganizations();
    }, [user]);

    useEffect(() => {
        if (!selectedOrgId) return;
        const loadFinance = async () => {
            if (user?.role === 'admin' || user?.role === 'staff') {
                await Promise.all([
                    fetchLedger(selectedOrgId),
                    financeService.getOrganizationOverview(selectedOrgId).then((res) => setOverview(res.data)),
                    financeService.listPayments(selectedOrgId).then((res) => setPayments(res.data || [])),
                    shipmentService.getAllShipments().then((res) => {
                        const data = res.data || [];
                        setShipments(data.filter((shipment) => shipment.organization === selectedOrgId));
                    })
                ]);
            } else {
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
        };
        loadFinance();
    }, [selectedOrgId, pagination.page, user?.role]);

    const getCategoryPill = (category) => {
        const style = {
            'SHIPMENT_CHARGE': 'info',
            'PAYMENT': 'success',
            'REVERSAL': 'warning',
            'ADJUSTMENT': 'neutral'
        };
        return <StatusPill status={style[category] || 'neutral'} text={category.replace('_', ' ')} />;
    };

    const handlePostPayment = async () => {
        if (!paymentForm.amount) {
            return;
        }
        try {
            await financeService.postPayment(selectedOrgId, {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount)
            });
            setPaymentForm({ amount: '', method: 'manual', reference: '', notes: '' });
            const response = await financeService.listPayments(selectedOrgId);
            setPayments(response.data || []);
            const overviewResponse = await financeService.getOrganizationOverview(selectedOrgId);
            setOverview(overviewResponse.data);
        } catch (error) {
            console.error('Failed to post payment:', error);
        }
    };

    const handleAllocateFifo = async () => {
        try {
            await financeService.allocatePaymentsFifo(selectedOrgId);
            const response = await financeService.listPayments(selectedOrgId);
            setPayments(response.data || []);
            const overviewResponse = await financeService.getOrganizationOverview(selectedOrgId);
            setOverview(overviewResponse.data);
        } catch (error) {
            console.error('Failed to allocate FIFO:', error);
        }
    };

    const handleManualAllocation = async () => {
        if (!allocationForm.paymentId || !allocationForm.shipmentId || !allocationForm.amount) {
            return;
        }
        try {
            await financeService.allocatePaymentManual(selectedOrgId, {
                ...allocationForm,
                amount: parseFloat(allocationForm.amount)
            });
            setAllocationForm({ paymentId: '', shipmentId: '', amount: '' });
            const response = await financeService.listPayments(selectedOrgId);
            setPayments(response.data || []);
            const overviewResponse = await financeService.getOrganizationOverview(selectedOrgId);
            setOverview(overviewResponse.data);
        } catch (error) {
            console.error('Failed to allocate payment:', error);
        }
    };

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
                    <Button variant="secondary" onClick={() => fetchLedger(selectedOrgId)}>
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
                            {parseFloat(summary.balance).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Credit Limit</StatLabel>
                        <StatValue>
                            {parseFloat(summary.creditLimit).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Available Credit</StatLabel>
                        <StatValue $highlight>
                            {parseFloat(summary.availableCredit).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Unapplied Cash</StatLabel>
                        <StatValue>
                            {parseFloat(summary.unappliedCash).toFixed(3)} <span>KD</span>
                        </StatValue>
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

                <StatCard>
                    <div>
                        <StatLabel>Aging Buckets</StatLabel>
                        <StatValue style={{ fontSize: '18px', display: 'grid', gap: '6px' }}>
                            <div>0–30: {summary.agingBuckets['0-30'].toFixed(3)} KD</div>
                            <div>31–60: {summary.agingBuckets['31-60'].toFixed(3)} KD</div>
                            <div>61–90: {summary.agingBuckets['61-90'].toFixed(3)} KD</div>
                            <div>90+: {summary.agingBuckets['90+'].toFixed(3)} KD</div>
                        </StatValue>
                    </div>
                </StatCard>
            </StatsGrid>

            {(user?.role === 'admin' || user?.role === 'staff') && (
            <Card title="Payments Management">
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <Input
                            label="Payment Amount (KD)"
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        />
                        <Input
                            label="Reference"
                            value={paymentForm.reference}
                            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        />
                        <Select
                            label="Method"
                            value={paymentForm.method}
                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        >
                            <option value="manual">Manual</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                        </Select>
                        <Input
                            label="Notes"
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Button variant="primary" onClick={handlePostPayment} disabled={!paymentForm.amount || !selectedOrgId}>
                            Post Payment
                        </Button>
                        <Button variant="secondary" onClick={handleAllocateFifo} disabled={!selectedOrgId}>
                            Allocate FIFO
                        </Button>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Manual Allocation
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <Select
                                label="Payment"
                                value={allocationForm.paymentId}
                                onChange={(e) => setAllocationForm({ ...allocationForm, paymentId: e.target.value })}
                            >
                                <option value="">Select Payment</option>
                                {payments.map((payment) => (
                                    <option key={payment._id} value={payment._id}>
                                        {payment.reference || payment._id.slice(-6)} • {payment.amount.toFixed(3)} KD • {payment.status}
                                    </option>
                                ))}
                            </Select>
                            <Select
                                label="Shipment"
                                value={allocationForm.shipmentId}
                                onChange={(e) => setAllocationForm({ ...allocationForm, shipmentId: e.target.value })}
                            >
                                <option value="">Select Shipment</option>
                                {shipments.map((shipment) => (
                                    <option key={shipment._id} value={shipment._id}>
                                        {shipment.trackingNumber} • {Number(shipment.pricingSnapshot?.totalPrice || shipment.price || 0).toFixed(3)} KD
                                    </option>
                                ))}
                            </Select>
                            <Input
                                label="Allocation Amount (KD)"
                                type="number"
                                value={allocationForm.amount}
                                onChange={(e) => setAllocationForm({ ...allocationForm, amount: e.target.value })}
                            />
                        </div>
                        <Button variant="outline" onClick={handleManualAllocation} disabled={!allocationForm.paymentId || !allocationForm.shipmentId || !allocationForm.amount}>
                            Allocate Payment
                        </Button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />
                    <TableWrapper>
                        <Table>
                            <Thead>
                                <Tr>
                                    <Th>Date</Th>
                                    <Th>Reference</Th>
                                    <Th>Status</Th>
                                    <Th style={{ textAlign: 'right' }}>Amount</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {payments.length > 0 ? payments.map((payment) => (
                                    <Tr key={payment._id}>
                                        <Td>{format(new Date(payment.postedAt || payment.createdAt), 'MMM dd, yyyy')}</Td>
                                        <Td>{payment.reference || payment._id.slice(-6)}</Td>
                                        <Td><StatusPill status={payment.status === 'APPLIED' ? 'success' : payment.status === 'PARTIALLY_APPLIED' ? 'warning' : 'neutral'} text={payment.status.replace('_', ' ')} /></Td>
                                        <Td style={{ textAlign: 'right' }}>{payment.amount.toFixed(3)} KD</Td>
                                    </Tr>
                                )) : (
                                    <Tr><Td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>No payments posted</Td></Tr>
                                )}
                            </Tbody>
                        </Table>
                    </TableWrapper>
                </div>
            </Card>
            )}

            {/* Ledger Table */}
            <Card title="Transaction History">
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
        </div>
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
