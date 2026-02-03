import React from 'react';
import { Container, Button, Box, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ShipmentList from '../components/ShipmentList';
import PageHeader from '../components/common/PageHeader';
import AIInsightsCard from '../components/common/AIInsightsCard';

// Example Static Insights for now (as requested: static/rule-based)
const SHIPMENT_INSIGHTS = [
    { type: 'warning', message: '3 shipments explicitly delayed due to weather in CreateShipment region.' },
    { type: 'success', message: 'On-time delivery rate is up 12% this week.' },
    { type: 'info', message: 'You have 5 shipments ready for pickup today.' }
];

const ShipmentsPage = () => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
            {/* 1. Header with Title + Single CTA */}
            <PageHeader
                title="Shipments"
                description="Manage consignment lifecycle, track deliveries, and handle exceptions."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Shipments', href: '/shipments' }
                ]}
                action={
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/create-shipment')}
                        sx={{
                            borderRadius: 50,
                            px: 3,
                            fontWeight: 'bold',
                            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.3)'
                        }}
                    >
                        New Shipment
                    </Button>
                }
            />

            {/* 6. AI Insights (Beta) */}
            <Box mb={4}>
                <AIInsightsCard insights={SHIPMENT_INSIGHTS} />
            </Box>

            {/* Main List (includes KPI Strip and Toolbar) */}
            <ShipmentList />
        </Container>
    );
};

export default ShipmentsPage;
