import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, Grid,
    Card, CardContent, Chip, useTheme,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    LinearProgress, Button, alpha
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useShipment } from '../context/ShipmentContext';
import PageHeader from '../components/common/PageHeader';
import AIInsightsCard from '../components/common/AIInsightsCard';
import StatusPill from '../components/common/StatusPill';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/SkeletonLoader';

const StatCard = ({ title, value, icon, color, trend }) => {
    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: alpha(color, 0.1),
                zIndex: 0
            }} />
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" fontWeight="600" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
                        <Typography variant="h3" fontWeight="800" sx={{ mb: 1 }}>{value}</Typography>
                        {trend && (
                            <Chip
                                label={trend}
                                size="small"
                                sx={{
                                    bgcolor: trend.includes('+') ? alpha('#4caf50', 0.1) : alpha('#f44336', 0.1),
                                    color: trend.includes('+') ? 'success.main' : 'error.main',
                                    fontWeight: 'bold',
                                    borderRadius: 1,
                                    height: 24
                                }}
                            />
                        )}
                    </Box>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: 3,
                        boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
                        bgcolor: color,
                        color: '#fff'
                    }}>
                        {React.cloneElement(icon, { fontSize: "medium" })}
                    </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">vs previous period</Typography>
            </CardContent>
        </Card>
    );
};

const AnalyticsRow = () => {
    const theme = useTheme();
    return (
        <Grid container spacing={3} mb={4}>
            {/* Shipment Statistics Widget */}
            <Grid item xs={12} md={8}>
                <Card sx={{ height: '100%', p: 3 }}>
                    <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                        <Typography variant="h6" fontWeight="bold">Shipment Activity</Typography>
                        <Chip label="Last 8 Months" size="small" variant="outlined" sx={{ borderRadius: 2 }} />
                    </Box>
                    <Box sx={{ height: 260, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', px: 2, pb: 2 }}>
                        {/* Mock Bar Chart - Fluid Motion */}
                        {[65, 59, 80, 81, 56, 55, 40, 70].map((h, i) => (
                            <Box key={i} display="flex" flexDirection="column" alignItems="center" width="10%" sx={{ height: '100%', justifyContent: 'flex-end' }}>
                                <Box sx={{
                                    width: '100%',
                                    maxWidth: 24,
                                    height: `${h}%`,
                                    background: i % 2 === 0
                                        ? `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.4)} 100%)`
                                        : `linear-gradient(180deg, ${theme.palette.primary.light} 0%, ${alpha(theme.palette.primary.light, 0.3)} 100%)`,
                                    borderRadius: '12px',
                                    transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        opacity: 0.8,
                                        transform: 'scaleY(1.05)'
                                    }
                                }} />
                                <Typography variant="caption" sx={{ mt: 1.5, fontWeight: 600, color: 'text.secondary' }}>
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i]}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Card>
            </Grid>
            {/* Shipping Measure/Revenue Widget */}
            <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', p: 3, position: 'relative', overflow: 'visible' }}>
                    <Typography variant="h6" fontWeight="bold" mb={4}>Net Revenue</Typography>

                    {/* Decorative Elements */}
                    <Box sx={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderRadius: '50%', background: theme.palette.success.main, filter: 'blur(40px)', opacity: 0.15 }} />

                    <Box sx={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Mock Gauge */}
                        <Box sx={{
                            width: 220,
                            height: 110,
                            bgcolor: alpha(theme.palette.text.secondary, 0.1),
                            borderRadius: '110px 110px 0 0',
                            position: 'absolute',
                            top: 20
                        }}>
                            <Box sx={{
                                width: 220,
                                height: 110,
                                background: `conic-gradient(from 180deg at 50% 100%, ${theme.palette.success.main} 0deg, ${theme.palette.warning.main} 140deg, transparent 140deg)`,
                                borderRadius: '110px 110px 0 0',
                                opacity: 0.8,
                                maskImage: 'radial-gradient(circle at 50% 100%, transparent 65%, black 66%)'
                            }} />
                        </Box>
                        <Box sx={{ textAlign: 'center', zIndex: 2, mt: 8 }}>
                            <Typography variant="h3" fontWeight="800" sx={{ letterSpacing: '-0.02em' }}>473k KD</Typography>
                            <Typography variant="subtitle2" color="textSecondary">81% of Annual Goal</Typography>
                        </Box>
                    </Box>
                    <Box mt={3}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="caption" fontWeight="600">Q1 Target</Typography>
                            <Typography variant="caption" color="text.secondary">60% Completed</Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={60}
                            sx={{ borderRadius: 4, height: 8, bgcolor: alpha(theme.palette.success.main, 0.1), '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'success.main' } }}
                        />
                    </Box>
                </Card>
            </Grid>
        </Grid>
    );
};

const RecentShipmentsTable = ({ shipments, loading }) => {
    const navigate = useNavigate();

    if (loading) return <TableSkeleton rows={5} />;

    const rows = shipments?.slice(0, 5) || [];

    return (
        <Card sx={{ overflow: 'visible' }}>
            <Box p={3} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight="bold">Recent Shipments</Typography>
                    <Typography variant="body2" color="text.secondary">Latest orders updated</Typography>
                </Box>
                <Button variant="text" size="small" endIcon={<TrendingUpIcon />} onClick={() => navigate('/shipments')}>
                    View All
                </Button>
            </Box>

            {rows.length === 0 ? (
                <Box p={4} display="flex" justifyContent="center">
                    <EmptyState
                        title="No active shipments"
                        description="Your dashboard looks a bit empty. Create your first shipment to get started!"
                        icon={<LocalShippingIcon />}
                        action={<Button variant="contained" onClick={() => navigate('/create-shipment')}>Create Shipment</Button>}
                    />
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tracking #</TableCell>
                                <TableCell>Origin / Destination</TableCell>
                                <TableCell>Est. Delivery</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow
                                    key={row.trackingNumber}
                                    hover
                                    onClick={() => navigate(`/shipment/${row.trackingNumber}`)}
                                    sx={{ cursor: 'pointer' }}
                                ><TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        #{row.trackingNumber}
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="600">{row.origin?.city || 'Obs.'} → {row.destination?.city || 'Dest.'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.customer?.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString() : '—'}</TableCell>
                                    <TableCell>{(Math.random() * 50 + 5).toFixed(3)} KD</TableCell> {/* Mock Price */}
                                    <TableCell>
                                        <StatusPill status={row.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Card>
    );
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { shipments, loading, fetchAllShipments } = useShipment();
    const [mockInsights, setMockInsights] = useState([]);

    useEffect(() => {
        fetchAllShipments();
        // Simulating AI loading
        setTimeout(() => {
            setMockInsights([
                { type: 'warning', message: 'Shipment #TRK-8821 is delayed in Customs.', impact: 'High Risk' },
                { type: 'opportunity', message: 'Optimize Route A -> B to save 15% fuel.', impact: 'Cost Saving' }
            ]);
        }, 2000);
    }, [fetchAllShipments]);

    // Calculate stats
    const stats = {
        total: shipments?.length || 0,
        pending: shipments?.filter(s => ['pending', 'ready_for_pickup'].includes(s.status)).length || 0,
        inTransit: shipments?.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length || 0,
        delivered: shipments?.filter(s => s.status === 'delivered').length || 0
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <PageHeader
                title="Dashboard"
                description="Welcome back, here's your operational overview."
                action={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/create-shipment')}
                    >
                        New Shipment
                    </Button>
                }
            />

            {/* KPI Stats */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Shipments"
                        value={stats.total}
                        icon={<LocalShippingIcon />}
                        color={theme.palette.primary.main}
                        trend="+12%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Delivered"
                        value={stats.delivered}
                        icon={<CheckCircleIcon />}
                        color={theme.palette.success.main}
                        trend="+5%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Pending Orders"
                        value={stats.pending}
                        icon={<PendingActionsIcon />}
                        color={theme.palette.warning.main}
                        trend="-2%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="In Transit"
                        value={stats.inTransit}
                        icon={<TrendingUpIcon />}
                        color={theme.palette.info.main}
                        trend="+8%"
                    />
                </Grid>
            </Grid>

            {/* AI Widget */}
            <Box mb={4}>
                <AIInsightsCard insights={mockInsights} loading={loading} />
            </Box>

            {/* Analytics */}
            <AnalyticsRow />

            {/* Recent Shipments */}
            <RecentShipmentsTable shipments={shipments} loading={loading} />
        </Container>
    );
};

export default DashboardPage;
