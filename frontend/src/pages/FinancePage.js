import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { financeService, userService, organizationService } from '../services/api';
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

    const fetchLedger = async () => {
        try {
            setLoading(true);
            const response = await financeService.getLedger({ page: pagination.page });
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
        fetchLedger();
    }, [pagination.page]);

    const getCategoryPill = (category) => {
        const style = {
            'SHIPMENT_FEE': 'info',
            'TOP_UP': 'success',
            'REFUND': 'warning',
            'ADJUSTMENT': 'neutral'
        };
        return <StatusPill status={style[category] || 'neutral'} text={category.replace('_', ' ')} />;
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
                    <Button variant="secondary" onClick={fetchLedger}>
                        Refresh
                    </Button>
                }
            />

            <StatsGrid>
                <StatCard $gradient>
                    <div>
                        <StatLabel>{user?.organization ? 'Organization Balance' : 'Available Balance'}</StatLabel>
                        <StatValue>
                            {parseFloat(user?.organization?.balance ?? user?.balance ?? 0).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Credit Limit</StatLabel>
                        <StatValue>
                            {parseFloat(user?.organization?.creditLimit ?? user?.creditLimit ?? 0).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>

                <StatCard>
                    <div>
                        <StatLabel>Total Purchasing Power</StatLabel>
                        <StatValue $highlight>
                            {(
                                parseFloat(user?.organization?.balance ?? user?.balance ?? 0) +
                                parseFloat(user?.organization?.creditLimit ?? user?.creditLimit ?? 0)
                            ).toFixed(3)} <span>KD</span>
                        </StatValue>
                    </div>
                </StatCard>
            </StatsGrid>

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
                                            <TransactionIcon $type={entry.type}>
                                                {entry.type === 'CREDIT' ? '+' : '-'} {entry.amount.toFixed(3)}
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
                    fetchLedger();
                }}
            />
        </div>
    );
};

// --- Sub-component: Dialog ---

const AdminAdjustmentDialog = ({ open, onClose, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [clients, setClients] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [targetType, setTargetType] = useState('USER'); // 'USER' or 'ORG'
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        userId: '',
        type: 'CREDIT',
        amount: '',
        category: 'TOP_UP',
        description: ''
    });

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                try {
                    const [clientRes, orgRes] = await Promise.all([
                        userService.getClients(),
                        organizationService.getOrganizations()
                    ]);
                    setClients(clientRes.data);
                    setOrganizations(orgRes.data);
                } catch (err) {
                    console.error('Failed to fetch balance adjustment targets:', err);
                }
            };
            fetchData();
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!formData.userId || !formData.amount || !formData.description) {
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
            title="Adjust Client Balance"
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
                    label="Target Type"
                    value={targetType}
                    onChange={(e) => {
                        setTargetType(e.target.value);
                        setFormData({ ...formData, userId: '' });
                    }}
                >
                    <option value="USER">Specific User Wallet</option>
                    <option value="ORG">Organization Account (Shared)</option>
                </Select>

                <Select
                    label={targetType === 'USER' ? 'Select Client' : 'Select Organization'}
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                >
                    <option value="">-- Select Target --</option>
                    {targetType === 'USER' ? (
                        clients.map(c => (
                            <option key={c._id} value={c._id}>
                                {c.name} - {c.email} (Bal: {c.balance?.toFixed(3)})
                            </option>
                        ))
                    ) : (
                        organizations.map(o => (
                            <option key={o._id} value={o.members?.[0] || ''} disabled={!o.members?.[0]}>
                                {o.name} (Bal: {o.balance?.toFixed(3)})
                            </option>
                        ))
                    )}
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
                    <option value="TOP_UP">TOP_UP</option>
                    <option value="REFUND">REFUND</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                    <option value="SHIPMENT_FEE">SHIPMENT_FEE</option>
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
