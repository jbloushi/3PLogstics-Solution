import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Button,
  InputBase,
  alpha,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import InfoIcon from '@mui/icons-material/Info';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { Chip } from '@mui/material';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius * 4,
  backgroundColor: alpha(theme.palette.common.white, 0.9), // Keeping it distinct
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 1),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
    minWidth: '400px', // Wide search bar
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`, // Space for icon
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8, // Slightly rounded
  padding: theme.spacing(1, 3),
  boxShadow: 'none',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

const Header = () => {
  const theme = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  if (!isAuthenticated) {
    return (
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'text.primary', fontWeight: 700, flexGrow: 1 }}>
            SHIPMENT<Box component="span" sx={{ color: 'primary.main' }}>TRACKER</Box>
          </Typography>
          <Button component={RouterLink} to="/about" startIcon={<InfoIcon />}>About</Button>
          <Button component={RouterLink} to="/contact" startIcon={<ContactSupportIcon />}>Contact</Button>
          <Box sx={{ mx: 1 }} />
          <Button component={RouterLink} to="/login" startIcon={<LoginIcon />} variant="outlined" sx={{ mr: 1 }}>Login</Button>
          <Button component={RouterLink} to="/signup" startIcon={<PersonAddIcon />} variant="contained">Join</Button>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0} // Flat, blends with background
      sx={{
        bgcolor: 'transparent',
        backdropFilter: 'none',
        pt: 2,
        pb: 1,
        // Make sure it sits above/next to content properly? 
        // In the new layout, Header is inside the main content area usually.
      }}
    >
      <Toolbar>
        {/* Search Bar */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search shipment id, tracking number..."
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Credits Display */}
          {user && (
            <Chip
              icon={<AccountBalanceWalletIcon style={{ color: '#2e7d32' }} />}
              label={`${parseFloat(user.balance || 0).toFixed(3)} KD`}
              variant="outlined"
              sx={{
                fontWeight: 700,
                color: 'success.main',
                borderColor: 'success.light',
                bgcolor: alpha(theme.palette.success.main, 0.05),
                px: 1,
                borderRadius: '8px',
                height: '40px',
                '& .MuiChip-label': { fontSize: '1rem' }
              }}
            />
          )}

          {/* New Shipment Button */}
          <ActionButton
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/create" // Route to wizard
          >
            New Shipment
          </ActionButton>

          {/* User Menu */}
          <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
            <Avatar alt={user?.name} src={user?.avatar} />
          </IconButton>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <MenuItem component={RouterLink} to="/settings" onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleCloseUserMenu(); logout(); }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography textAlign="center" color="error">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
