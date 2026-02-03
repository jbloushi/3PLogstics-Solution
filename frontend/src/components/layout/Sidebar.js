import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Badge,
    useTheme,
    Divider
} from '@mui/material';
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
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 280;

const Sidebar = () => {
    const theme = useTheme();
    const location = useLocation();
    const { user } = useAuth();

    const menuItems = [
        { text: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' },
        { text: 'Analytics', icon: <AssessmentIcon />, path: '/analytics' },
        { text: 'Calendar', icon: <CalendarMonthIcon />, path: '/calendar' },
        { text: 'Shipments', icon: <LocalShippingIcon />, path: '/shipments' },
        { text: 'Tracking', icon: <MapIcon />, path: '/tracking' },
        { text: 'Warehouse', icon: <WarehouseIcon />, path: '/warehouse' },
        { text: 'Fleets', icon: <DirectionsBusIcon />, path: '/fleets' },
        { text: 'Users', icon: <PersonIcon />, path: '/admin/users', adminOnly: true },
        { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations', staffOnly: true },
        { text: 'Address Books', icon: <MenuBookIcon />, path: '/profile', restricted: true }, // Staff/Admin: Org Addresses
        { text: 'Drivers', icon: <PersonIcon />, path: '/drivers', restricted: true }, // Staff/Admin only
        { text: 'Finance & Credits', icon: <AccountBalanceWalletIcon />, path: '/finance', staffOnly: true },
    ];

    const utilityItems = [
        { text: 'Message', icon: <MessageIcon />, path: '/messages', badge: 19 },
        { text: 'Notification', icon: <NotificationsIcon />, path: '/notifications', badge: 5 },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    borderRight: 'none',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: '4px 0 24px rgba(0,0,0,0.02)', // Very subtle shadow
                },
            }}
        >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    src={user?.avatar}
                    alt={user?.name}
                    sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main }}
                >
                    {user?.name?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {user?.name || 'Guest User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {user?.role || 'Visitor'}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mx: 3, opacity: 0.1 }} />

            <Box sx={{ overflow: 'auto', mt: 2, px: 2 }}>
                <List>
                    {menuItems.map((item) => {
                        // Basic role check
                        if (item.restricted && user?.role === 'driver') return null;
                        if (item.adminOnly && user?.role !== 'admin') return null;
                        if (item.staffOnly && !['admin', 'staff'].includes(user?.role)) return null;

                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    component={item.disabled ? 'div' : NavLink}
                                    to={item.disabled ? undefined : item.path}
                                    selected={location.pathname === item.path}
                                    disabled={item.disabled}
                                    sx={{
                                        borderRadius: 3,
                                        color: 'text.secondary',
                                        '&.active': {
                                            backgroundColor: theme.palette.primary.main,
                                            color: theme.palette.primary.contrastText,
                                            '& .MuiListItemIcon-root': {
                                                color: theme.palette.primary.contrastText,
                                            },
                                        },
                                        '&:hover': {
                                            backgroundColor: item.disabled ? 'transparent' : 'action.hover',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontSize: '0.9rem',
                                            fontWeight: location.pathname === item.path ? 600 : 500
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                <Divider sx={{ my: 2, opacity: 0.1 }} />

                <List>
                    {utilityItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                component={item.disabled ? 'div' : NavLink}
                                to={item.disabled ? undefined : item.path}
                                selected={location.pathname === item.path}
                                disabled={item.disabled}
                                sx={{
                                    borderRadius: 3,
                                    color: 'text.secondary',
                                    '&.active': {
                                        backgroundColor: theme.palette.primary.main, // Or a secondary color
                                        color: theme.palette.primary.contrastText,
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                                    <Badge badgeContent={item.badge} color="error" variant="standard" sx={{ '& .MuiBadge-badge': { right: 2, top: 2 } }}>
                                        {item.icon}
                                    </Badge>
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                />
                                {item.badge && (
                                    <Box
                                        sx={{
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            borderRadius: 4,
                                            px: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {item.badge}
                                    </Box>
                                )}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
};

export default Sidebar;
