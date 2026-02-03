import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Grid,
    Card,
    CardContent,
    Button,
    Divider,
    IconButton,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import { financeService, userService, organizationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

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
            await refreshUser(); // Update balance from core user model
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, [pagination.page]);

    const getTransactionIcon = (type) => {
        return type === 'CREDIT'
            ? <ArrowUpwardIcon color="success" fontSize="small" />
            : <ArrowDownwardIcon color="error" fontSize="small" />;
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'SHIPMENT_FEE': return 'primary';
            case 'TOP_UP': return 'success';
            case 'REFUND': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Finance & Credits
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your credit balance and view transaction history
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<AdminPanelSettingsIcon />}
                            onClick={() => setAdminDialogOpen(true)}
                        >
                            Adjust Client Balances
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchLedger}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Admin Adjustment Dialog */}
            <AdminAdjustmentDialog
                open={adminDialogOpen}
                onClose={() => setAdminDialogOpen(false)}
                onSuccess={() => {
                    setAdminDialogOpen(false);
                    fetchLedger();
                }}
            />

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(25, 118, 210, 0.2)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" opacity={0.8}>
                                    {user?.organization ? 'Organization Balance' : 'Available Balance'}
                                </Typography>
                                <AccountBalanceWalletIcon sx={{ opacity: 0.8 }} />
                            </Box>
                            <Typography variant="h3" fontWeight="bold" sx={{ mb: 2 }}>
                                {parseFloat(user?.organization?.balance ?? user?.balance ?? 0).toFixed(3)} KD
                            </Typography>
                            {user?.role === 'client' && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    fullWidth
                                    onClick={() => alert("Payment gateway integration planned for Phase 4. To top up now, please contact: accounts@target-logstics.com")}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                                        backdropFilter: 'blur(4px)',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Top Up Now
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" color="text.secondary">
                                    {user?.organization ? 'Org Credit Limit' : 'Credit Limit'}
                                </Typography>
                                <Chip label="Overdraft" size="small" variant="outlined" />
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                {parseFloat(user?.organization?.creditLimit ?? user?.creditLimit ?? 0).toFixed(3)} KD
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" color="text.secondary">Total Purchasing Power</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="success.main">
                                {(
                                    parseFloat(user?.organization?.balance ?? user?.balance ?? 0) +
                                    parseFloat(user?.organization?.creditLimit ?? user?.creditLimit ?? 0)
                                ).toFixed(3)} KD
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Ledger Table */}
            <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Transaction History</Typography>
                </Box>
                {loading && <LinearProgress />}
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Balance Following</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ledger.length > 0 ? ledger.map((entry) => (
                                <TableRow key={entry._id} hover>
                                    <TableCell>
                                        <Typography variant="body2">{format(new Date(entry.createdAt), 'MMM dd, yyyy')}</Typography>
                                        <Typography variant="caption" color="text.secondary">{format(new Date(entry.createdAt), 'HH:mm')}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{entry.description}</Typography>
                                        {entry.reference && <Typography variant="caption" color="primary">{entry.reference}</Typography>}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {getTransactionIcon(entry.type)}
                                            <Typography variant="body2" fontWeight="bold" color={entry.type === 'CREDIT' ? 'success.main' : 'error.main'}>
                                                {entry.type}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={entry.category.replace('_', ' ')}
                                            size="small"
                                            color={getCategoryColor(entry.category)}
                                            variant="light"
                                            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body1" fontWeight="bold" color={entry.type === 'CREDIT' ? 'success.main' : 'error.main'}>
                                            {entry.type === 'CREDIT' ? '+' : '-'}{entry.amount.toFixed(3)} KD
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={500}>{entry.balanceAfter.toFixed(3)} KD</Typography>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                        <Typography color="text.secondary">No transactions found</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

const AdminAdjustmentDialog = ({ open, onClose, onSuccess }) => {
    const [clients, setClients] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [targetType, setTargetType] = useState('USER'); // 'USER' or 'ORG'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
            setError('Please fill all fields');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await financeService.adjustBalance({
                ...formData,
                amount: parseFloat(formData.amount)
            });
            onSuccess();
        } catch (err) {
            setError(err.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Adjust Client Balance</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Adjustment Target Type</InputLabel>
                                <Select
                                    value={targetType}
                                    label="Adjustment Target Type"
                                    onChange={(e) => {
                                        setTargetType(e.target.value);
                                        setFormData({ ...formData, userId: '' });
                                    }}
                                >
                                    <MenuItem value="USER">Specific User Wallet</MenuItem>
                                    <MenuItem value="ORG">Organization Account (Shared)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>{targetType === 'USER' ? 'Select Client' : 'Select Organization'}</InputLabel>
                                <Select
                                    label={targetType === 'USER' ? 'Select Client' : 'Select Organization'}
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                >
                                    {targetType === 'USER' ? (
                                        clients.map(c => (
                                            <MenuItem key={c._id} value={c._id}>
                                                {c.name} ({c.email}) - Bal: {c.balance?.toFixed(3) || '0.000'} KD
                                                {c.organization && ` [Org: ${c.organization.name}]`}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        organizations.map(o => (
                                            <MenuItem key={o._id} value={o.members?.[0] || ''} disabled={!o.members?.[0]}>
                                                {o.name} - Bal: {o.balance?.toFixed(3) || '0.000'} KD {!o.members?.[0] && '(No members to link transaction)'}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                                {targetType === 'ORG' && (
                                    <Typography variant="caption" sx={{ mt: 0.5, px: 1.5, display: 'block' }}>
                                        Note: Adjusting an Organization will record the transaction against its primary member.
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    label="Type"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <MenuItem value="CREDIT">Add Funds (Credit)</MenuItem>
                                    <MenuItem value="DEBIT">Deduct (Debit)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Amount (KD)"
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </Grid>
                    </Grid>

                    <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <MenuItem value="TOP_UP">TOP_UP</MenuItem>
                            <MenuItem value="REFUND">REFUND</MenuItem>
                            <MenuItem value="ADJUSTMENT">ADJUSTMENT</MenuItem>
                            <MenuItem value="SHIPMENT_FEE">SHIPMENT_FEE</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Description"
                        placeholder="Reason for adjustment..."
                        multiline
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <Box sx={{ px: 2, py: 1 }}><LinearProgress color="inherit" sx={{ width: 100 }} /></Box> : 'Apply Adjustment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FinancePage;
