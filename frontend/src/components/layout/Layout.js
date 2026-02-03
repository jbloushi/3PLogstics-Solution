import React from 'react';
import { Box, Container, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {isAuthenticated ? (
        // Authenticated Layout (Sidebar + Main Content)
        <Box sx={{ display: 'flex' }}>
          <Sidebar />
          <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <Box sx={{ p: 3, flexGrow: 1, backgroundColor: 'background.default' }}>
              <Outlet />
            </Box>
            {/* Optional Footer for Dashboard */}
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem' }}>
              &copy; 2025 Target Logistics. All rights reserved.
            </Box>
          </Box>
        </Box>
      ) : (
        // Public Layout (Standard)
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: 'background.default',
          }}
        >
          <Header />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              py: 4,
            }}
          >
            <Container maxWidth="xl">
              <Outlet />
            </Container>
          </Box>
          <Footer />
        </Box>
      )}
    </ThemeProvider>
  );
};

export default Layout;
