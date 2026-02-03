import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, IconButton, Chip, Box, Tooltip, LinearProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BusinessIcon from '@mui/icons-material/Business';
import { useSnackbar } from 'notistack';
import { organizationService, userService } from '../services/api';

const AdminOrganizationsPage = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [orgs, setOrgs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [openMembersDialog, setOpenMembersDialog] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        type: 'BUSINESS',
        balance: 0,
        creditLimit: 0,
        active: true
    });

    const fetchOrgs = useCallback(async () => {
        setLoading(true);
        try {
            const [orgRes, userRes] = await Promise.all([
                organizationService.getOrganizations(),
                userService.getUsers()
            ]);
            setOrgs(orgRes.data || []);
            setUsers(userRes.data || []);
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Failed to load organizations', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    const handleOpenDialog = (org = null) => {
        if (org) {
            setEditingOrg(org);
            setFormData({
                name: org.name || '',
                taxId: org.taxId || '',
                type: org.type || 'BUSINESS',
                balance: org.balance || 0,
                creditLimit: org.creditLimit || 0,
                active: org.active ?? true
            });
        } else {
            setEditingOrg(null);
            setFormData({
                name: '',
                taxId: '',
                type: 'BUSINESS',
                balance: 0,
                creditLimit: 0,
                active: true
            });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        try {
            if (editingOrg) {
                await organizationService.updateOrganization(editingOrg._id, formData);
                enqueueSnackbar('Organization updated', { variant: 'success' });
            } else {
                await organizationService.createOrganization(formData);
                enqueueSnackbar('Organization created', { variant: 'success' });
            }
            setOpenDialog(false);
            fetchOrgs();
        } catch (error) {
            const msg = error.response?.data?.error || 'Failed to save organization';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };


    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Organizations</Typography>
                    <Typography variant="body2" color="text.secondary">Manage business entities, shared balances, and global markups</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    New Organization
                </Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Members</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Balance</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Credit Limit</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orgs.map((org) => (
                            <TableRow key={org._id} hover>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <BusinessIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{org.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">Tax ID: {org.taxId || 'N/A'}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip label={org.type} size="small" variant="light" sx={{ fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <PeopleIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{org.members?.length || 0}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold" color={org.balance < 0 ? 'error.main' : 'success.main'}>
                                        {org.balance?.toFixed(3)} KD
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">{org.creditLimit?.toFixed(3)} KD</Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Box display="flex" justifyContent="center" gap={0.5}>
                                        <Tooltip title="Manage Members">
                                            <IconButton size="small" color="info" onClick={() => {
                                                setEditingOrg(org);
                                                setOpenMembersDialog(true);
                                            }}>
                                                <PeopleIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit Organization">
                                            <IconButton size="small" onClick={() => handleOpenDialog(org)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orgs.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">No organizations found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create New Organization'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Organization Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Tax / EORI ID"
                                value={formData.taxId}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={formData.type}
                                    label="Type"
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <MenuItem value="BUSINESS">Business</MenuItem>
                                    <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                                    <MenuItem value="GOVERNMENT">Government</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalanceWalletIcon fontSize="small" /> Finance Settings
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Initial Balance (KD)"
                                value={formData.balance}
                                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Credit Limit (KD)"
                                value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                            />
                        </Grid>

                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} color="primary">
                        {editingOrg ? 'Save Changes' : 'Create Organization'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Members Management Dialog */}
            <Dialog open={openMembersDialog} onClose={() => setOpenMembersDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Members of {editingOrg?.name}
                    <Typography variant="caption" display="block" color="text.secondary">
                        Users linked to this organization share its balance and markup settings.
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {editingOrg?.members?.map((member) => (
                                <TableRow key={member._id}>
                                    <TableCell sx={{ fontWeight: 500 }}>{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell><Chip label={member.role} size="small" variant="outlined" /></TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={async () => {
                                                try {
                                                    await organizationService.removeMember(editingOrg._id, member._id);
                                                    enqueueSnackbar('Member removed', { variant: 'success' });
                                                    fetchOrgs();
                                                    // Update current editingOrg members in state
                                                    setEditingOrg(prev => ({
                                                        ...prev,
                                                        members: prev.members.filter(m => m._id !== member._id)
                                                    }));
                                                } catch (err) {
                                                    enqueueSnackbar('Failed to remove member', { variant: 'error' });
                                                }
                                            }}
                                        >
                                            Unlink
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!editingOrg?.members || editingOrg.members.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">No members found</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Add Member to Organization</Typography>
                        <Box display="flex" gap={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Select User</InputLabel>
                                <Select
                                    label="Select User"
                                    value=""
                                    onChange={async (e) => {
                                        const userId = e.target.value;
                                        try {
                                            await organizationService.addMember(editingOrg._id, userId);
                                            enqueueSnackbar('Member added', { variant: 'success' });
                                            fetchOrgs();
                                            // Refresh view
                                            const updatedOrgRes = await organizationService.getOrganization(editingOrg._id);
                                            setEditingOrg(updatedOrgRes.data);
                                        } catch (err) {
                                            const msg = err.response?.data?.error || 'Failed to add member';
                                            enqueueSnackbar(msg, { variant: 'error' });
                                        }
                                    }}
                                >
                                    {users
                                        .filter(u => !editingOrg?.members?.some(m => m._id === u._id))
                                        .map(u => (
                                            <MenuItem key={u._id} value={u._id}>
                                                {u.name} ({u.email})
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMembersDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container >
    );
};

export default AdminOrganizationsPage;

