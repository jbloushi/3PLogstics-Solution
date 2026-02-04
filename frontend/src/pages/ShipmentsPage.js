import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card } from '../ui';
import ShipmentList from '../components/ShipmentList';

const Container = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px;
  min-height: 100vh;
  animation: fadeIn 0.4s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
`;

const OverviewCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
    padding: 20px;
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-3px);
        border-color: ${props => props.$color};
        box-shadow: 0 4px 20px -5px ${props => `${props.$color}33`};
    }
`;

const Count = styled.div`
    font-family: 'Outfit', sans-serif;
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
`;

const Label = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
`;

const StatusOverview = () => {
    const [activeStatus, setActiveStatus] = useState('All');

    // Mock counts for now, or could pass from parent
    const statuses = [
        { label: 'All', count: 124, color: '#00d9b8' },
        { label: 'Pending', count: 12, color: '#fbbf24' },
        { label: 'Picked Up', count: 8, color: '#818cf8' },
        { label: 'In Transit', count: 45, color: '#38bdf8' },
        { label: 'Delivered', count: 56, color: '#34d399' },
        { label: 'Exceptions', count: 3, color: '#f87171' },
    ];

    return (
        <StatusGrid>
            {statuses.map(status => (
                <OverviewCard
                    key={status.label}
                    $color={status.color}
                    $active={activeStatus === status.label}
                    onClick={() => setActiveStatus(status.label)}
                >
                    <Count>{status.count}</Count>
                    <Label>{status.label}</Label>
                </OverviewCard>
            ))}
        </StatusGrid>
    );
};

const ShipmentsPage = () => {
    return (
        <Container>
            <PageHeader
                title="Shipments"
                description="Manage consignment lifecycle, track deliveries, and handle exceptions."
            />

            <StatusOverview />

            <ShipmentList />
        </Container>
    );
};

export default ShipmentsPage;
