import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, AssessmentPeriod } from '../types';
import { login as authLogin, superAdminLogin as authSuperAdminLogin } from '../services/authService';
import assessmentService from '../services/assessmentService';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [activePeriod, setActivePeriod] = useState<AssessmentPeriod | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (token && user) {
            fetchActivePeriod();
        }
    }, [token, user]);

    const fetchActivePeriod = async () => {
        try {
            const period = await assessmentService.getActivePeriod();
            setActivePeriod(period);
        } catch (error) {
            console.error('Failed to fetch active period:', error);
        }
    };

    const login = async (nip: string, password: string, totp?: string) => {
        try {
            const response = await authLogin({ nip, password, totp });

            if (response.requires_mfa) {
                return response;
            }

            // Store token and user
            if (response.token && response.user) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                setToken(response.token);
                setUser(response.user);
                toast.success('Login berhasil!');
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || 'Login gagal';
            toast.error(message);
            throw error;
        }
    };

    const superAdminLogin = async (username: string, password: string, totp?: string) => {
        try {
            const response = await authSuperAdminLogin({ username, password, totp });

            if (response.requires_mfa) {
                return response;
            }

            // Store token and user
            if (response.token && response.user) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                setToken(response.token);
                setUser(response.user);
                toast.success('Admin login berhasil!');
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || 'Admin login gagal';
            toast.error(message);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        toast.success('Logout berhasil');
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        isAdmin: user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super admin',
        isSuperAdmin: user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super admin',
        login,
        superAdminLogin,
        logout,
        updateUser,
        loading,
        activePeriod,
        refreshActivePeriod: fetchActivePeriod
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
