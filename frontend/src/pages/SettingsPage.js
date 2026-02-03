import React, { useState } from 'react';
import {
    Container, Typography, Card, CardContent, Box, Button, TextField,
    Divider, Alert, IconButton, Tooltip, Grid, Tabs, Tab
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ProfilePage from './ProfilePage';

const SettingsPage = () => {
    const { user, isStaff } = useAuth();
    const [activeTab, setActiveTab] = useState(0);

    // API Key State
    const [apiKey, setApiKey] = useState(user?.apiKey || '');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Staff states
    const [clients, setClients] = useState([]);
    const [showStaffPanel, setShowStaffPanel] = useState(false);

    const generateNewKey = async () => {
        try {
            setLoading(true);
            const res = await axios.post('/api/auth/api-key', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setApiKey(res.data.apiKey);
            setSuccess('New API Key generated successfully!');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get('/api/auth/users', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setClients(res.data.data);
            setShowStaffPanel(true);
        } catch (err) {
            console.error(err);
        }
    };

    const updateSurcharge = async (userId, multiplier) => {
        try {
            await axios.patch('/api/auth/surcharge', { userId, multiplier }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSuccess('User surcharge updated!');
            fetchClients();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        setSuccess('API Key copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>Settings</Typography>
                <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab icon={<SettingsIcon />} iconPosition="start" label="General & API" />
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Profile & Addresses" />
                </Tabs>
            </Box>

            {/* TAB 0: General Settings (API Key, etc) */}
            <div role="tabpanel" hidden={activeTab !== 0}>
                {activeTab === 0 && (
                    <Grid container spacing={4}>
                        {/* API Access Section */}
                        <Grid item xs={12} md={7}>
                            <Card sx={{ borderRadius: 4 }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <KeyIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Developer API Access</Typography>
                                    </Box>
                                    <Typography variant="body2" color="textSecondary" mb={3}>
                                        Use this key to integrate TargetLogistics tracking into your own warehouse or e-commerce workflow.
                                    </Typography>

                                    {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                                    <Box display="flex" gap={1}>
                                        <TextField
                                            fullWidth
                                            label="Your API Key"
                                            value={apiKey || 'No key generated yet'}
                                            variant="outlined"
                                            readOnly
                                            InputProps={{
                                                endAdornment: (
                                                    <IconButton onClick={copyToClipboard} disabled={!apiKey}>
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                )
                                            }}
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={generateNewKey}
                                            disabled={loading}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            {apiKey ? 'Regenerate' : 'Generate'}
                                        </Button>
                                    </Box>

                                    <Box mt={4}>
                                        <Typography variant="subtitle2" gutterBottom>Quick Start Example:</Typography>
                                        <Card variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', fontFamily: 'monospace', fontSize: '13px' }}>
                                            <Box component="pre" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                curl -X POST http://api.targetlogistics.com/shipments \<br />
                                                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
                                                &nbsp;&nbsp;-d '{"{\"origin\": \"...\", \"destination\": \"...\"}"}'
                                            </Box>
                                        </Card>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Instructions Section */}
                        <Grid item xs={12} md={5}>
                            <Card sx={{ borderRadius: 4, bgcolor: '#f9fafb' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <SettingsInputComponentIcon color="secondary" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Connection Guide</Typography>
                                    </Box>

                                    <Typography variant="subtitle2" color="primary" mt={2}>1. Map Tracking (Mapbox)</Typography>
                                    <Typography variant="body2" mb={1}>
                                        Get your token from Mapbox.com and add it to <code>.env</code> as:<br />
                                        <code>REACT_APP_MAPBOX_TOKEN=pk.xxx</code>
                                    </Typography>

                                    <Typography variant="subtitle2" color="primary" mt={3}>2. Carrier API (DHL)</Typography>
                                    <Typography variant="body2" mb={1}>
                                        Register at DHL Developer Portal. Add these to backend <code>.env</code>:<br />
                                        <code>DHL_API_KEY=...</code><br />
                                        <code>DHL_API_SECRET=...</code>
                                    </Typography>

                                    <Typography variant="subtitle2" color="primary" mt={3}>3. Auth (WABA/OTP)</Typography>
                                    <Typography variant="body2">
                                        For WhatsApp OTP, link your Chatwoot inbox and provide the <code>CHATWOOT_API_TOKEN</code> in backend settings.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {isStaff && (
                            <Grid item xs={12}>
                                <Card sx={{ borderRadius: 4, borderLeft: '6px solid #4caf50' }}>
                                    <CardContent sx={{ p: 4 }}>
                                        <Typography variant="h6" gutterBottom>Staff Operations Dashboard</Typography>
                                        <Typography variant="body2" mb={2}>
                                            You have elevated permissions to manage all client shipments and carrier surcharges.
                                        </Typography>
                                        {!showStaffPanel ? (
                                            <Button variant="outlined" color="success" onClick={fetchClients}>
                                                Load Client List & Markups
                                            </Button>
                                        ) : (
                                            <Box mt={2}>
                                                <Divider sx={{ mb: 2 }} />
                                                <Typography variant="subtitle1" gutterBottom fontWeight="bold">Active 3PL Clients & Surcharges</Typography>
                                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                                    {clients.map(client => (
                                                        <Grid item xs={12} key={client._id}>
                                                            <ClientMarkupEditor client={client} onUpdate={updateSurcharge} />
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                )}
            </div>

            {/* TAB 1: Profile & Addresses */}
            <div role="tabpanel" hidden={activeTab !== 1}>
                {activeTab === 1 && (
                    <Box mt={2}>
                        <ProfilePage />
                    </Box>
                )}
            </div>
        </Container >
    );
};

// Sub-component for editing markup (to handle individual state)
const ClientMarkupEditor = ({ client, onUpdate }) => {
    // Initial state from client data
    // Normalize backend data to local state
    const initialType = client.markup?.type || 'PERCENTAGE';
    const initialPercentage = client.markup?.percentageValue || client.markup?.value || 15;
    const initialFlat = client.markup?.flatValue || 0;

    const [type, setType] = useState(initialType);
    const [percentage, setPercentage] = useState(initialPercentage);
    const [flat, setFlat] = useState(initialFlat);
    const [unsaved, setUnsaved] = useState(false);

    const handleChangeType = (e) => {
        setType(e.target.value);
        setUnsaved(true);
    };

    const handleSave = () => {
        onUpdate(client._id, {
            type,
            percentageValue: parseFloat(percentage),
            flatValue: parseFloat(flat)
        });
        setUnsaved(false);
    };

    return (
        <Card variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box minWidth={200}>
                    <Typography variant="body1" fontWeight="bold">{client.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{client.email}</Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
                    <TextField
                        select
                        label="Markup Type"
                        value={type}
                        onChange={handleChangeType}
                        size="small"
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 120 }}
                    >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Fixed Amount</option>
                        <option value="COMBINED">Both (Combined)</option>
                    </TextField>

                    {(type === 'PERCENTAGE' || type === 'COMBINED') && (
                        <TextField
                            label="Percentage (%)"
                            type="number"
                            value={percentage}
                            onChange={(e) => { setPercentage(e.target.value); setUnsaved(true); }}
                            size="small"
                            sx={{ width: 100 }}
                        />
                    )}

                    {(type === 'FLAT' || type === 'COMBINED') && (
                        <TextField
                            label="Flat Fee (KD)"
                            type="number"
                            value={flat}
                            onChange={(e) => { setFlat(e.target.value); setUnsaved(true); }}
                            size="small"
                            sx={{ width: 100 }}
                        />
                    )}

                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={!unsaved}
                        sx={{ ml: 'auto' }}
                    >
                        Save
                    </Button>
                </Box>
            </Box>
        </Card>
    );
};

export default SettingsPage;
