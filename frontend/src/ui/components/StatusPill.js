import React from 'react';
import styled from 'styled-components';

const Pill = styled.span`
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    border: 1px solid ${props => props.$border};
`;

const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (['delivered', 'completed', 'paid', 'active', 'success'].includes(s))
        return { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' }; // Green
    if (['pending', 'updated', 'draft', 'processing'].includes(s))
        return { bg: 'rgba(255, 167, 38, 0.15)', color: '#ffa726', border: 'rgba(255, 167, 38, 0.3)' }; // Orange
    if (['in_transit', 'shipped', 'out_for_delivery', 'created', 'picked_up', 'ready_for_pickup', 'scheduled'].includes(s))
        return { bg: 'rgba(66, 165, 245, 0.15)', color: '#42a5f5', border: 'rgba(66, 165, 245, 0.3)' }; // Blue
    if (['exception', 'cancelled', 'failed', 'overdue', 'inactive'].includes(s))
        return { bg: 'rgba(239, 83, 80, 0.15)', color: '#ef5350', border: 'rgba(239, 83, 80, 0.3)' }; // Red
    return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'transparent' };
};

const StatusPill = ({ status, style }) => {
    const colors = getStatusColor(status);
    return (
        <Pill $bg={colors.bg} $color={colors.color} $border={colors.border} style={style}>
            {(status || 'Unknown').replace(/_/g, ' ')}
        </Pill>
    );
};

export default StatusPill;
