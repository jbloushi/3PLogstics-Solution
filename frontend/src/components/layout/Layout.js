import React from 'react';
import { Box, Container } from '@mui/material'; // Keeping for structural utility in public layout
import { Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Header, Sidebar } from '../../ui'; // New UI components
import theme from '../../theme';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

// Icons
import HomeIcon from '@mui/icons-material/Home';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptIcon from '@mui/icons-material/Receipt';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BusinessIcon from '@mui/icons-material/Business';

const Layout = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Navigation Configuration
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon fontSize="small" />, path: '/dashboard' },
    { id: 'analytics', label: 'Analytics', icon: <AssessmentIcon fontSize="small" />, path: '/analytics', disabled: true },
    { id: 'calendar', label: 'Calendar', icon: <CalendarMonthIcon fontSize="small" />, path: '/calendar', disabled: true },
    { id: 'shipments', label: 'Shipments', icon: <LocalShippingIcon fontSize="small" />, path: '/shipments' },
    // { id: 'tracking', label: 'Tracking', icon: <MapIcon fontSize="small" />, path: '/tracking', disabled: true },
    { id: 'warehouse', label: 'Warehouse', icon: <WarehouseIcon fontSize="small" />, path: '/warehouse', disabled: true },
    { id: 'fleets', label: 'Fleets', icon: <DirectionsBusIcon fontSize="small" />, path: '/fleets', disabled: true },
    { id: 'address-book', label: 'Address Book', icon: <MenuBookIcon fontSize="small" />, path: '/address-book' },
    { id: 'finance', label: 'Finance', icon: <AccountBalanceWalletIcon fontSize="small" />, path: '/finance', staffOnly: true },

    // Admin/Staff Sections
    { id: 'users', label: 'Users', icon: <PersonIcon fontSize="small" />, path: '/admin/users', adminOnly: true },
    { id: 'organizations', label: 'Organizations', icon: <BusinessIcon fontSize="small" />, path: '/admin/organizations', staffOnly: true },
    { id: 'drivers', label: 'Drivers', icon: <PersonIcon fontSize="small" />, path: '/drivers', disabled: true },
  ];

  // Filter Items based on Role
  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.staffOnly && !['admin', 'staff'].includes(user?.role)) return false;
    if (item.restricted && user?.role === 'driver') return false;
    return true;
  });

  // Determine Active Item
  const getActiveItem = () => {
    const path = location.pathname;
    const found = filteredItems.find(item => path.startsWith(item.path));
    return found ? found.id : 'dashboard';
  };

  if (!isAuthenticated) {
    // Public Layout Usage
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {/* Reuse new Header, it handles public state gracefully-ish */}
          <Header />
          <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
            <Container maxWidth="xl">
              <Outlet />
            </Container>
          </Box>
          <Footer />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      {/* Global CSS Variables wrapper if needed, but imported in index.js usually. 
                 Assuming App.js imports tokens.css */}
      <Box sx={{ display: 'flex', bgcolor: 'var(--bg-primary)', minHeight: '100vh' }}>
        <Sidebar
          user={user}
          items={filteredItems}
          activeItem={getActiveItem()}
        />

        <Box sx={{
          flexGrow: 1,
          marginLeft: 'var(--sidebar-width)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0 // Flexbox overflow fix
        }}>
          <Header />

          <Box component="main" sx={{
            flexGrow: 1,
            p: 4,
            maxWidth: '1600px', // Limit width for large screens
            width: '100%',
            margin: '0 auto'
          }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
