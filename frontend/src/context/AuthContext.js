import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const login = async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.post('/api/auth/login', { email, password });

            const { token, data } = res.data;
            localStorage.setItem('token', token);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (userData) => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.post('/api/auth/signup', userData);

            const { token, data } = res.data;
            localStorage.setItem('token', token);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get('/api/users/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Fix: Controller returns { data: userObject }, not { data: { user: userObject } }
            setUser(res.data.data);
        } catch (err) {
            console.error('Load user failed:', err);
            if (err.response && err.response.status === 401) {
                localStorage.removeItem('token');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login,
            signup,
            logout,
            refreshUser: loadUser,
            isAuthenticated: !!user,
            isStaff: user?.role === 'staff' || user?.role === 'admin'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
