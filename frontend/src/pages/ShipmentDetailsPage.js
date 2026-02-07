import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useShipment } from '../context/ShipmentContext';
import { useAuth } from '../context/AuthContext';
import {
    PageHeader,
    Button,
    StatusPill,
    Loader,
    Alert,
    Tabs,
    Tab
} from '../ui';
import ShipmentApprovalDialog from '../components/ShipmentApprovalDialog';
import TrackingTimeline from '../components/TrackingTimeline';

// --- Styled Components ---

const HeroSection = styled.div`
    background: linear-gradient(135deg, #1e2538 0%, #1a2035 100%);
    border-left: 4px solid var(--accent-primary);
    border-radius: 12px;
    padding: 32px;
    margin-bottom: 24px;
    box-shadow: -4px 0 20px 2px rgba(0, 217, 184, 0.15);
`;

const TrackingId = styled.div`
    font-family: 'Outfit', sans-serif;
    font-size: 40px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
`;

const ShipmentMeta = styled.div`
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: var(--text-secondary);

    span {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    strong {
        color: var(--text-primary);
    }
`;

const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 380px;
    gap: 24px;

    @media (max-width: 1200px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const InfoCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 20px;

    svg {
        width: 16px;
        height: 16px;
    }
`;

const PartyName = styled.div`
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
`;

const PartyType = styled.div`
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 16px;
`;

const DetailRow = styled.div`
    margin: 12px 0;
    font-size: 14px;
    line-height: 1.6;
`;

const ContactInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-size: 13px;

    svg {
        width: 14px;
        height: 14px;
        color: var(--accent-error);
    }
`;

const MapContainer = styled.div`
    grid-column: 3;
    grid-row: 1 / 3;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;

    @media (max-width: 1200px) {
        grid-column: 1 / -1;
        grid-row: auto;
    }
`;

const MapHeader = styled.div`
    padding: 16px 20px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const LocationBadge = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const LocationName = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
`;

const MapPlaceholder = styled.div`
    width: 100%;
    height: 520px;
    background: linear-gradient(135deg, #1a2035 0%, #141929 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 14px;
`;

const MapWrapper = styled.div`
    height: 520px;
    width: 100%;
`;

const TrackingLink = styled.a`
    color: var(--accent-primary);
    font-weight: 600;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
`;

const DetailsCard = styled.div`
    grid-column: 1 / 3;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;

    @media (max-width: 1200px) {
        grid-column: 1 / -1;
    }
`;

const DetailsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

    @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const DetailItem = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
`;

const DetailIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: rgba(0, 217, 184, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const DetailContent = styled.div`
    flex: 1;
`;

const DetailContentLabel = styled.div`
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
`;

const DetailContentValue = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
`;

const SectionCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
    }

    th {
        color: var(--text-secondary);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;

const EmptyState = styled.div`
    padding: 24px;
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    color: var(--text-secondary);
    text-align: center;
`;

// --- Main Component ---

const ShipmentDetailsPage = () => {
    const { trackingNumber } = useParams();
    const navigate = useNavigate();
    const fetchedRef = useRef(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [approvalOpen, setApprovalOpen] = useState(false);

    const { user } = useAuth();

    const {
        shipment,
        loading,
        error,
        getShipment,
    } = useShipment();

    const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const { isLoaded: isMapLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleMapsApiKey || '',
        libraries: ['places']
    });

    // Fetch shipment data on component mount
    useEffect(() => {
        if (!trackingNumber) return;
        fetchedRef.current = false;

        const fetchShipmentData = async () => {
            if (fetchedRef.current) return;
            fetchedRef.current = true;
            try {
                await getShipment(trackingNumber);
            } catch (error) {
                console.error('Error fetching shipment:', error);
            }
        };

        fetchShipmentData();
    }, [trackingNumber, getShipment]);

    if (loading && !shipment) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader size="48px" />
            </div>
        );
    }

    if (error || (!shipment && !loading)) {
        return (
            <div style={{ maxWidth: '800px', margin: '40px auto' }}>
                <Alert type="error" title="Error">
                    {error || 'Shipment not found.'}
                </Alert>
                <div style={{ marginTop: '24px' }}>
                    <Button variant="primary" onClick={() => navigate('/shipments')}>
                        Back to Shipments
                    </Button>
                </div>
            </div>
        );
    }

    const sender = shipment.origin || shipment.sender || {};
    const receiver = shipment.destination || shipment.receiver || {};
    const parcels = shipment.parcels || [];
    const items = shipment.items || [];
    const documents = shipment.documents || [];
    const totalWeight = parcels.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
    const totalPieces = parcels.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
    const isStaff = user?.role === 'admin' || user?.role === 'staff';
    const isClient = user?.role === 'client';
    const approvalStatuses = ['pending', 'draft', 'updated', 'ready_for_pickup', 'picked_up'];
    const clientEditableStatuses = ['draft', 'pending', 'updated'];
    const canApprove = isStaff && approvalStatuses.includes(shipment.status);
    const canEdit = isClient && clientEditableStatuses.includes(shipment.status);
    const carrierTrackingNumber = shipment.carrierShipmentId || shipment.dhlTrackingNumber;
    const carrierCode = (shipment.carrier || shipment.carrierCode || 'DGR').toUpperCase();
    const carrierTrackingUrl = carrierTrackingNumber && (carrierCode === 'DGR' || carrierCode === 'DHL')
        ? `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${carrierTrackingNumber}`
        : null;
    const currentLocation = shipment.currentLocation || shipment.location || sender;
    const currentLocationLabel = currentLocation?.formattedAddress || currentLocation?.city || sender?.city || 'Unknown';

    const resolveCoordinates = (location) => {
        if (!location) return null;
        if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
            return { lat: location.coordinates[1], lng: location.coordinates[0] };
        }
        if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
            return { lat: location.latitude, lng: location.longitude };
        }
        return null;
    };

    const mapCenter = resolveCoordinates(currentLocation)
        || resolveCoordinates(receiver)
        || resolveCoordinates(sender);

    return (
        <div>
            <PageHeader
                title="Shipment Details"
                description={`Tracking Number: ${shipment.trackingNumber}`}
                action={
                    <>
                        {canEdit && (
                            <Button variant="secondary" onClick={() => setApprovalOpen(true)}>
                                Edit Shipment
                            </Button>
                        )}
                        {canApprove && (
                            <Button variant="secondary" onClick={() => setApprovalOpen(true)}>
                                Approve Shipment
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL}/shipments/${shipment.trackingNumber}/label`, '_blank')}
                        >
                            Print Label
                        </Button>
                    </>
                }
                secondaryAction={
                    <Button variant="secondary" onClick={() => navigate('/shipments')}>
                        Back to List
                    </Button>
                }
            />

            <HeroSection>
                <TrackingId>
                    {shipment.trackingNumber}
                    <StatusPill status={shipment.status} />
                </TrackingId>
                <ShipmentMeta>
                    <span>Created: <strong>{new Date(shipment.createdAt).toLocaleDateString()}</strong></span>
                    <span>Owner: <strong>{shipment.user?.name || 'Unknown'}</strong></span>
                </ShipmentMeta>
            </HeroSection>

            <Tabs>
                <Tab
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                >
                    Overview
                </Tab>
                <Tab
                    active={activeTab === 'parcels'}
                    onClick={() => setActiveTab('parcels')}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                >
                    Parcels
                </Tab>
                <Tab
                    active={activeTab === 'activity'}
                    onClick={() => setActiveTab('activity')}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                >
                    Activity
                </Tab>
                <Tab
                    active={activeTab === 'documents'}
                    onClick={() => setActiveTab('documents')}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                >
                    Documents
                </Tab>
                <Tab
                    active={activeTab === 'management'}
                    onClick={() => setActiveTab('management')}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                >
                    Management
                </Tab>
            </Tabs>

            {activeTab === 'overview' && (
                <ContentGrid>
                    {/* Origin Card */}
                    <InfoCard>
                        <CardHeader>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            ORIGIN (SENDER)
                        </CardHeader>
                        <PartyName>{sender.contactPerson || sender.company || 'N/A'}</PartyName>
                        <PartyType>{sender.company || 'Individual'}</PartyType>
                        <DetailRow>
                            <strong>{sender.streetLines?.[0] || sender.formattedAddress || 'N/A'}</strong><br />
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {sender.city || 'N/A'}{sender.state || sender.stateOrProvinceCode ? `, ${sender.state || sender.stateOrProvinceCode}` : ''} {sender.postalCode || ''}, {sender.countryCode || ''}
                            </span>
                        </DetailRow>
                        <ContactInfo>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {sender.phone || 'N/A'}
                        </ContactInfo>
                        <ContactInfo>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {sender.email || 'N/A'}
                        </ContactInfo>
                    </InfoCard>

                    {/* Destination Card */}
                    <InfoCard>
                        <CardHeader>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            DESTINATION (RECIPIENT)
                        </CardHeader>
                        <PartyName>{receiver.contactPerson || receiver.company || 'N/A'}</PartyName>
                        <PartyType>{receiver.company || 'Individual'}</PartyType>
                        <DetailRow>
                            <strong>{receiver.streetLines?.[0] || receiver.formattedAddress || 'N/A'}</strong><br />
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {receiver.city || 'N/A'}{receiver.state || receiver.stateOrProvinceCode ? `, ${receiver.state || receiver.stateOrProvinceCode}` : ''} {receiver.postalCode || ''}, {receiver.countryCode || ''}
                            </span>
                        </DetailRow>
                        <ContactInfo>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {receiver.phone || 'N/A'}
                        </ContactInfo>
                        <ContactInfo>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {receiver.email || 'N/A'}
                        </ContactInfo>
                    </InfoCard>

                    {/* Map Container */}
                    <MapContainer>
                        <MapHeader>
                            <div>
                                <LocationBadge>CURRENT LOCATION</LocationBadge>
                                <LocationName>{currentLocationLabel}</LocationName>
                            </div>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </MapHeader>
                        {!googleMapsApiKey && (
                            <MapPlaceholder>
                                Google Maps API key not configured.
                            </MapPlaceholder>
                        )}
                        {googleMapsApiKey && !mapCenter && (
                            <MapPlaceholder>
                                No coordinates available for this shipment.
                            </MapPlaceholder>
                        )}
                        {googleMapsApiKey && mapCenter && (
                            <MapWrapper>
                                {isMapLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={mapCenter}
                                        zoom={12}
                                        options={{
                                            streetViewControl: false,
                                            mapTypeControl: false,
                                            fullscreenControl: true,
                                            gestureHandling: 'greedy'
                                        }}
                                    >
                                        <Marker position={mapCenter} />
                                    </GoogleMap>
                                ) : (
                                    <MapPlaceholder>Loading map...</MapPlaceholder>
                                )}
                            </MapWrapper>
                        )}
                    </MapContainer>

                    {/* Shipment Details Card */}
                    <DetailsCard>
                        <CardHeader style={{ marginBottom: '24px' }}>
                            Shipment Details
                        </CardHeader>
                        <DetailsGrid>
                            <DetailItem>
                                <DetailIcon>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </DetailIcon>
                                <DetailContent>
                                    <DetailContentLabel>Service Type</DetailContentLabel>
                                    <DetailContentValue>{shipment.serviceCode || 'Standard'}</DetailContentValue>
                                </DetailContent>
                            </DetailItem>

                            <DetailItem>
                                <DetailIcon>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </DetailIcon>
                                <DetailContent>
                                    <DetailContentLabel>Total Pieces</DetailContentLabel>
                                    <DetailContentValue>{totalPieces}</DetailContentValue>
                                </DetailContent>
                            </DetailItem>

                            <DetailItem>
                                <DetailIcon>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                </DetailIcon>
                                <DetailContent>
                                    <DetailContentLabel>Total Weight</DetailContentLabel>
                                    <DetailContentValue>{totalWeight.toFixed(2)} kg</DetailContentValue>
                                </DetailContent>
                            </DetailItem>

                            <DetailItem>
                                <DetailIcon>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </DetailIcon>
                                <DetailContent>
                                    <DetailContentLabel>Dimensions</DetailContentLabel>
                                    <DetailContentValue style={{ fontSize: '13px' }}>
                                        {parcels[0] ? `${parcels[0].dimensions?.length || 0}×${parcels[0].dimensions?.width || 0}×${parcels[0].dimensions?.height || 0} cm` : 'N/A'}
                                    </DetailContentValue>
                                </DetailContent>
                            </DetailItem>

                            {isStaff && (
                                <>
                                    <DetailItem>
                                        <DetailIcon>
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
                                            </svg>
                                        </DetailIcon>
                                        <DetailContent>
                                            <DetailContentLabel>Carrier Tracking #</DetailContentLabel>
                                            <DetailContentValue>{carrierTrackingNumber || 'Not assigned'}</DetailContentValue>
                                        </DetailContent>
                                    </DetailItem>
                                    <DetailItem>
                                        <DetailIcon>
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 010 5.656m1.414-7.07a6 6 0 010 8.484m-9.9-1.414a4 4 0 010-5.656m-1.414 7.07a6 6 0 010-8.484M12 12h.01" />
                                            </svg>
                                        </DetailIcon>
                                        <DetailContent>
                                            <DetailContentLabel>Carrier Tracking Link</DetailContentLabel>
                                            <DetailContentValue>
                                                {carrierTrackingUrl ? (
                                                    <TrackingLink href={carrierTrackingUrl} target="_blank" rel="noreferrer">
                                                        Open Tracking
                                                    </TrackingLink>
                                                ) : (
                                                    'Not available'
                                                )}
                                            </DetailContentValue>
                                        </DetailContent>
                                    </DetailItem>
                                </>
                            )}
                        </DetailsGrid>
                    </DetailsCard>
                </ContentGrid>
            )}

            {activeTab === 'parcels' && (
                <div>
                    <SectionCard>
                        <SectionTitle>Parcels</SectionTitle>
                        {parcels.length === 0 ? (
                            <EmptyState>No parcels recorded for this shipment yet.</EmptyState>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Description</th>
                                        <th>Weight (kg)</th>
                                        <th>Dimensions (cm)</th>
                                        <th>Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parcels.map((parcel, index) => (
                                        <tr key={`${parcel.trackingReference || parcel.description || 'parcel'}-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{parcel.description || 'Parcel'}</td>
                                            <td>{Number(parcel.weight || 0).toFixed(2)}</td>
                                            <td>
                                                {parcel.dimensions
                                                    ? `${parcel.dimensions.length || 0}×${parcel.dimensions.width || 0}×${parcel.dimensions.height || 0}`
                                                    : 'N/A'}
                                            </td>
                                            <td>{parcel.trackingReference || shipment.reference || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </SectionCard>

                    <SectionCard>
                        <SectionTitle>Items / Contents</SectionTitle>
                        {items.length === 0 ? (
                            <EmptyState>No line items recorded for this shipment yet.</EmptyState>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Value</th>
                                        <th>HS Code</th>
                                        <th>Origin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={`${item.sku || item.description || 'item'}-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{item.description || 'Item'}</td>
                                            <td>{item.quantity || 1}</td>
                                            <td>
                                                {item.declaredValue != null ? `${item.declaredValue} ${shipment.currency || ''}` : '—'}
                                            </td>
                                            <td>{item.hsCode || '—'}</td>
                                            <td>{item.countryOfOrigin || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </SectionCard>
                </div>
            )}

            {activeTab === 'activity' && (
                <div style={{ padding: '24px' }}>
                    <TrackingTimeline history={shipment.history || []} currentStatus={shipment.status} />
                </div>
            )}

            {activeTab === 'documents' && (
                <div>
                    <SectionCard>
                        <SectionTitle>Generated Documents</SectionTitle>
                        {documents.length === 0 && !shipment.labelUrl && !shipment.invoiceUrl ? (
                            <EmptyState>No documents are available yet.</EmptyState>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Format</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr key={`${doc.type}-${doc.createdAt || doc.url}`}>
                                            <td>{doc.type}</td>
                                            <td>{doc.format || 'pdf'}</td>
                                            <td>
                                                {doc.url ? (
                                                    <TrackingLink href={doc.url} target="_blank" rel="noreferrer">
                                                        View
                                                    </TrackingLink>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {shipment.labelUrl && (
                                        <tr>
                                            <td>Label</td>
                                            <td>pdf</td>
                                            <td>
                                                <TrackingLink href={shipment.labelUrl} target="_blank" rel="noreferrer">
                                                    View
                                                </TrackingLink>
                                            </td>
                                        </tr>
                                    )}
                                    {shipment.invoiceUrl && (
                                        <tr>
                                            <td>Invoice</td>
                                            <td>pdf</td>
                                            <td>
                                                <TrackingLink href={shipment.invoiceUrl} target="_blank" rel="noreferrer">
                                                    View
                                                </TrackingLink>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </SectionCard>
                </div>
            )}

            {activeTab === 'management' && (
                <div>
                    <SectionCard>
                        <SectionTitle>Shipment Settings</SectionTitle>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Setting</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Public Location Updates</td>
                                    <td>{shipment.allowPublicLocationUpdate ? 'Enabled' : 'Disabled'}</td>
                                </tr>
                                <tr>
                                    <td>Public Info Updates</td>
                                    <td>{shipment.allowPublicInfoUpdate ? 'Enabled' : 'Disabled'}</td>
                                </tr>
                                <tr>
                                    <td>Incoterm</td>
                                    <td>{shipment.incoterm || '—'}</td>
                                </tr>
                                <tr>
                                    <td>Export Reason</td>
                                    <td>{shipment.exportReason || '—'}</td>
                                </tr>
                                <tr>
                                    <td>Reference</td>
                                    <td>{shipment.reference || '—'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </SectionCard>
                </div>
            )}

            <ShipmentApprovalDialog
                open={approvalOpen}
                onClose={() => setApprovalOpen(false)}
                shipment={shipment}
                onShipmentUpdated={() => {
                    setApprovalOpen(false);
                    getShipment(shipment.trackingNumber);
                }}
            />
        </div>
    );
};

export default ShipmentDetailsPage;
