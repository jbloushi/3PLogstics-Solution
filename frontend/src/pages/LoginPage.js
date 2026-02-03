import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Link,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Checkbox,
    FormControlLabel,
    Collapse,
    Fade
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { styled } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Premium Gradient Background
const FullPageGradient = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.palette.mode === 'dark'
        ? `radial-gradient(circle at 15% 50%, ${theme.palette.primary.dark}33 0%, transparent 25%),
           radial-gradient(circle at 85% 30%, ${theme.palette.secondary.dark}33 0%, transparent 25%),
           linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
        : `radial-gradient(circle at 15% 50%, ${theme.palette.primary.light}22 0%, transparent 25%),
           radial-gradient(circle at 85% 30%, ${theme.palette.secondary.light}22 0%, transparent 25%),
           linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`,
    backgroundSize: 'cover',
    padding: theme.spacing(2)
}));

// Frosted Glass Card
const LoginCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(5),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.2)', // Deep diffuse shadow
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(30, 41, 59, 0.7)'
        : 'rgba(255, 255, 255, 0.8)',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-4px)'
    }
}));

const BrandLogo = styled(Box)(({ theme }) => ({
    width: 64,
    height: 64,
    borderRadius: 16,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
    color: '#fff',
    boxShadow: `0 8px 16px ${theme.palette.primary.main}66`
}));

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showDevOptions, setShowDevOptions] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { login, loading, error, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // Check for Dev Environment (Vite or Node)
    const isDev = process.env.NODE_ENV === 'development' || process.env.REACT_APP_IS_DEV === 'true';

    // If authenticated, redirect
    React.useEffect(() => {
        if (isAuthenticated && user) {
            navigate(user.role === 'driver' ? '/driver/pickup' : '/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    const handleLogin = async (emailInput, passInput) => {
        try {
            const loggedInUser = await login(emailInput, passInput);
            navigate(loggedInUser.role === 'driver' ? '/driver/pickup' : '/dashboard');
        } catch (err) {
            // Error handled by helper
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleLogin(email, password);
    };

    return (
        <FullPageGradient>
            <Container maxWidth="xs" disableGutters>
                <Fade in={true} timeout={800}>
                    <LoginCard elevation={0}>
                        {/* Brand Header */}
                        <BrandLogo>
                            <LockOutlinedIcon fontSize="large" />
                        </BrandLogo>

                        <Typography variant="h4" gutterBottom fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>
                            Solution Name
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                            Secure access for authorized personnel
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Email Address"
                                autoComplete="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                InputProps={{
                                    sx: { borderRadius: 3 }
                                }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                InputProps={{
                                    sx: { borderRadius: 3 },
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                <FormControlLabel
                                    control={<Checkbox value="remember" color="primary" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
                                    label={<Typography variant="body2" color="text.secondary">Remember me</Typography>}
                                />
                                <Link component={RouterLink} to="/forgot-password" variant="body2" fontWeight="600" color="primary" sx={{ textDecoration: 'none' }}>
                                    Forgot password?
                                </Link>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                sx={{ mt: 4, mb: 3, py: 1.5, borderRadius: 50, fontSize: '1rem', fontWeight: 'bold' }}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                            </Button>

                            {/* Dev Options Toggle */}
                            {isDev && (
                                <Box mt={2}>
                                    <Button
                                        fullWidth
                                        size="small"
                                        startIcon={<DeveloperModeIcon fontSize="small" />}
                                        onClick={() => setShowDevOptions(!showDevOptions)}
                                        sx={{ color: 'text.secondary', opacity: 0.7 }}
                                    >
                                        {showDevOptions ? 'Hide Developer Options' : 'Developer Options'}
                                    </Button>

                                    <Collapse in={showDevOptions}>
                                        <Box mt={2} p={2} bgcolor="background.paper" borderRadius={2} border={1} borderColor="divider">
                                            <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight="bold">
                                                QUICK LOGIN (DEV ONLY)
                                            </Typography>
                                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                                                {['admin', 'staff', 'client', 'driver'].map((role) => (
                                                    <Button
                                                        key={role}
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => handleLogin(`${role}@demo.com`, 'password123')}
                                                        sx={{ justifyContent: 'flex-start', textTransform: 'capitalize' }}
                                                    >
                                                        {role}
                                                    </Button>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Collapse>
                                </Box>
                            )}
                        </Box>
                    </LoginCard>
                </Fade>
            </Container>
        </FullPageGradient>
    );
};

export default LoginPage;
