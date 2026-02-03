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
    MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';

const FullPageGradient = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Ultra-smooth mesh gradient for Fluid Motion
    background: theme.palette.mode === 'dark'
        ? `radial-gradient(at 0% 0%, ${theme.palette.primary.dark} 0px, transparent 50%),
           radial-gradient(at 100% 0%, ${theme.palette.secondary.dark} 0px, transparent 50%),
           radial-gradient(at 100% 100%, ${theme.palette.info.dark} 0px, transparent 50%),
           radial-gradient(at 0% 100%, ${theme.palette.success.dark} 0px, transparent 50%),
           ${theme.palette.background.default}`
        : `radial-gradient(at 0% 0%, ${theme.palette.primary.light} 0px, transparent 50%),
           radial-gradient(at 100% 0%, ${theme.palette.secondary.light} 0px, transparent 50%),
           #FDFBF7`, // Cream background
    backgroundSize: '150% 150%',
    padding: theme.spacing(2)
}));

const SignupCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 32,
    width: '100%',
    maxWidth: 450, // Slightly wider for ease
    boxShadow: theme.shadows[2],
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(31, 41, 55, 0.7)'
        : 'rgba(255, 255, 255, 0.8)',
}));

const SignupPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'client'
    });
    const { signup, loading, error, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // If already authenticated, redirect to appropriate page
    React.useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'driver') {
                navigate('/driver/pickup');
            } else {
                navigate('/dashboard');
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(formData);
            navigate('/');
        } catch (err) {
            // Error handled by context
        }
    };

    return (
        <FullPageGradient>
            <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center' }}>
                <SignupCard elevation={0}>
                    <Typography variant="h4" gutterBottom fontWeight="800" color="primary" sx={{ letterSpacing: '-0.02em' }}>
                        Join Us
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 4, textAlign: 'center' }}>
                        Create your 3PL Client Account
                    </Typography>

                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            InputProps={{ sx: { borderRadius: 4 } }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            InputProps={{ sx: { borderRadius: 4 } }}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Account Type"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            margin="normal"
                            InputProps={{ sx: { borderRadius: 4 } }}
                        >
                            <MenuItem value="client">Client (3PL User)</MenuItem>
                            <MenuItem value="staff">Staff (Logistics Operations)</MenuItem>
                        </TextField>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            InputProps={{ sx: { borderRadius: 4 } }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 4, mb: 3, py: 1.5, fontSize: '1.1rem' }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create Account'}
                        </Button>
                        <Box display="flex" justifyContent="center">
                            <Link component={RouterLink} to="/login" variant="subtitle1" underline="hover" fontWeight="bold">
                                {"Already have an account? Log In"}
                            </Link>
                        </Box>
                    </Box>
                </SignupCard>
            </Container>
        </FullPageGradient>
    );
};

export default SignupPage;
