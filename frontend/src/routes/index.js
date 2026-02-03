import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TrackingPage from '../pages/TrackingPage';
import CreateShipmentPage from '../pages/CreateShipmentPage';
import DhlShipmentWizard from '../pages/DhlShipmentWizard';
import ShipmentWizardV2 from '../pages/ShipmentWizardV2';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import SettingsPage from '../pages/SettingsPage';
import ProfilePage from '../pages/ProfilePage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminOrganizationsPage from '../pages/AdminOrganizationsPage';
import PublicLocationPage from '../pages/PublicLocationPage';
import { useAuth } from '../context/AuthContext';

import DashboardPage from '../pages/DashboardPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import DriverPickupPage from '../pages/DriverPickupPage';
import WarehouseScanPage from '../pages/WarehouseScanPage';
import InConstructionPage from '../pages/InConstructionPage';
import FinancePage from '../pages/FinancePage';



const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If user doesn't have required role, redirect to their default page
    if (user?.role === 'driver') {
      return <Navigate to="/driver/pickup" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RedirectToShipment = () => {
  const { trackingNumber } = useParams();
  return <Navigate to={`/shipment/${trackingNumber}`} replace />;
};

const AppRoutes = () => {
  return (

    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />

        <Route path="admin/organizations" element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminOrganizationsPage />
          </ProtectedRoute>
        } />

        <Route path="shipments" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <ShipmentsPage />
          </ProtectedRoute>
        } />

        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />

        {/* Protected Client/Staff Routes */}
        <Route path="create" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <ShipmentWizardV2 />
          </ProtectedRoute>
        } />

        {/* Correct mapping for 'New Shipment' button in ShipmentsPage */}
        <Route path="create-shipment" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <ShipmentWizardV2 />
          </ProtectedRoute>
        } />

        {/* Legacy DHL wizard at /create-legacy */}
        <Route path="create-legacy" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <DhlShipmentWizard />
          </ProtectedRoute>
        } />

        {/* Old create page */}
        <Route path="create-old" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <CreateShipmentPage />
          </ProtectedRoute>
        } />

        <Route path="tracking/:trackingNumber" element={<RedirectToShipment />} />
        <Route path="shipment/:trackingNumber" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <TrackingPage />
          </ProtectedRoute>
        } />

        {/* Driver Tools */}
        <Route path="driver/pickup" element={
          <ProtectedRoute allowedRoles={['driver', 'admin', 'staff']}>
            <DriverPickupPage />
          </ProtectedRoute>
        } />

        {/* Warehouse Tools */}
        <Route path="warehouse/scan" element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <WarehouseScanPage />
          </ProtectedRoute>
        } />

        {/* Public Routes */}
        <Route path="track/:trackingNumber" element={<PublicLocationPage />} />
        <Route path="track/:trackingNumber/location" element={<PublicLocationPage />} />
        <Route path="shipments/:trackingNumber" element={<RedirectToShipment />} />

        {/* Placeholder Routes for Premium UI Demo */}
        <Route path="analytics" element={<InConstructionPage title="Analytics" description="Advanced reporting and fleet insights coming soon." />} />
        <Route path="calendar" element={<InConstructionPage title="Calendar" description="Schedule pickups and view delivery timelines." />} />
        <Route path="warehouse" element={<InConstructionPage title="Warehouse Management" description="Inventory and storage controls." />} />
        <Route path="fleets" element={<InConstructionPage title="Fleet Management" description="Vehicle tracking and maintenance logs." />} />
        <Route path="drivers" element={<InConstructionPage title="Driver Management" description="Manage driver profiles and assignments." />} />
        <Route path="finance" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <FinancePage />
          </ProtectedRoute>
        } />
        <Route path="billing" element={<Navigate to="/finance" replace />} />

        {/* Messages & Notifications */}
        <Route path="messages" element={<InConstructionPage title="Messages" description="Communication center." />} />
        <Route path="notifications" element={<InConstructionPage title="Notifications" description="System alerts and updates." />} />

        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client', 'driver']}>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'client']}>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="privacy" element={<div>Privacy Policy - Coming Soon</div>} />
        <Route path="terms" element={<div>Terms of Service - Coming Soon</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;


