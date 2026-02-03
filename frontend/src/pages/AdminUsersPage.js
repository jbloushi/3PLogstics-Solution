import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, IconButton, Chip, Box, FormControl, InputLabel, Select, MenuItem, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { useSnackbar } from 'notistack';
import { userService } from '../services/api';
import UserManagementDialog from '../components/admin/UserManagementDialog';

const AdminUsersPage = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Filter State
    const [roleFilter, setRoleFilter] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await userService.getUsers(roleFilter);
            setUsers(res.data);
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Failed to load users', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await userService.deleteUser(id);
            enqueueSnackbar('User deleted', { variant: 'success' });
            fetchUsers();
        } catch (error) {
            enqueueSnackbar('Failed to delete user', { variant: 'error' });
        }
    };

    const handleSave = async (userData) => {
        try {
            console.log('Saving user data:', userData);
            if (userData._id) {
                // Update
                const res = await userService.updateUser(userData._id, userData);
                console.log('Update response:', res);
                enqueueSnackbar('User updated successfully', { variant: 'success' });
            } else {
                // Create
                await userService.createUser(userData);
                enqueueSnackbar('User created successfully', { variant: 'success' });
            }
            setOpenDialog(false);
            fetchUsers();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Failed to save user';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setOpenDialog(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        setOpenDialog(true);
    };

    const renderMarkupInfo = (user) => {
        const m = user.markup;
        if (!m) return <Chip label="Def" size="small" variant="outlined" />;
        if (m.type === 'PERCENTAGE') return <Chip label={`${m.percentageValue}%`} size="small" color="primary" variant="outlined" />;
        if (m.type === 'FLAT') return <Chip label={`${m.flatValue} KWD`} size="small" color="info" variant="outlined" />;
        return <Chip label={`${m.percentageValue}% + ${m.flatValue}K`} size="small" color="secondary" variant="outlined" />;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">User Management</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                    Add New User
                </Button>
            </Box>

            <Paper sx={{ mb: 3, p: 2 }}>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Filter by Role</InputLabel>
                        <Select value={roleFilter} label="Filter by Role" onChange={(e) => setRoleFilter(e.target.value)}>
                            <MenuItem value="">All Roles</MenuItem>
                            <MenuItem value="client">Client</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="driver">Driver</MenuItem>
                        </Select>
                    </FormControl>
                    <Button variant="outlined" onClick={fetchUsers}>Refresh</Button>
                </Box>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name & Contact</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Organization</TableCell>
                            <TableCell>Config</TableCell>
                            <TableCell>Markup</TableCell>
                            <TableCell>Balance</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user._id}>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">{user.name}</Typography>
                                    <Typography variant="caption" display="block">{user.email}</Typography>
                                    <Typography variant="caption" color="text.secondary">{user.phone}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        color={user.role === 'admin' ? 'error' : user.role === 'staff' ? 'warning' : 'default'}
                                        variant="filled"
                                    />
                                </TableCell>
                                <TableCell>
                                    {user.organization ? (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <BusinessIcon fontSize="small" color="action" />
                                            <Typography variant="body2">{user.organization.name}</Typography>
                                        </Box>
                                    ) : (
                                        <Typography variant="caption" color="text.disabled">Solo Account</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {user.carrierConfig?.preferredCarrier && (
                                        <Chip label={user.carrierConfig.preferredCarrier} size="small" sx={{ fontSize: '0.7rem' }} />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {renderMarkupInfo(user)}
                                </TableCell>
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        color={user.balance < 0 ? 'error.main' : 'success.main'}
                                        fontWeight="bold"
                                    >
                                        {user.balance?.toFixed(3)} KWD
                                    </Typography>
                                    <Typography variant="caption">Limit: {user.creditLimit}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="Edit User & Config">
                                        <IconButton size="small" onClick={() => handleEdit(user)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(user._id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <UserManagementDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                user={editingUser}
                onSave={handleSave}
            />
        </Container>
    );
};

export default AdminUsersPage;
