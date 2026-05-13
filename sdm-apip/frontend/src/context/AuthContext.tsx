import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, AssessmentPeriod } from '../types';
import { superAdminLogin as authSuperAdminLogin, ssoLogin as authSsoLogin } from '../services/authService';
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
        // Periksa token yang ada saat dimuat
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        // Tangani pengalihan SSO dari penyedia OIDC (token sementara via URL)
        const urlParams = new URLSearchParams(window.location.search);
        const ssoToken = urlParams.get('sso_token');
        if (ssoToken) {
            // Simpan token, bersihkan URL segera (hindari token muncul di history)
            localStorage.setItem('token', ssoToken);
            setToken(ssoToken);
            window.history.replaceState({}, document.title, window.location.pathname);

            // Ambil profil untuk mendapatkan data user
            import('../services/authService').then(({ getProfile }) => {
                getProfile().then(data => {
                    if (data.user) {
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        toast.success('Login SSO berhasil!', { id: 'auth-toast' });
                    }
                }).catch(() => {
                    // Token tidak valid, bersihkan
                    localStorage.removeItem('token');
                    setToken(null);
                    toast.error('Sesi SSO tidak valid. Silakan login ulang.', { id: 'auth-toast' });
                });
            });
            setLoading(false);
            return;
        }

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));

            // Segarkan profil secara diam-diam untuk memastikan data (seperti nama) diperbarui
            import('../services/authService').then(({ getProfile }) => {
                getProfile().then(data => {
                    if (data.user) {
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                }).catch(() => {
                    // Jika gagal validasi profil, biarkan silent refresh yang menangani
                    console.warn('Profile refresh failed, silent token refresh will handle it.');
                });
            });
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

    const login = async (_nip: string, _password: string, _totp?: string) => {
        // Login manual dinonaktifkan — sistem hanya menggunakan SSO
        // Endpoint /auth/login sudah ditutup di backend
        toast.error('Login manual tidak tersedia. Gunakan tombol SSO.', { id: 'auth-toast' });
        throw new Error('MANUAL_LOGIN_DISABLED');
    };

    const superAdminLogin = async (username: string, password: string, totp?: string) => {
        try {
            const response = await authSuperAdminLogin({ username, password, totp });

            if (response.requires_mfa) {
                return response;
            }

            // Simpan token dan pengguna
            if (response.token && response.user) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                setToken(response.token);
                setUser(response.user);
                toast.success('Admin login berhasil!', { id: 'auth-toast' });
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || 'Admin login gagal';
            toast.error(message, { id: 'auth-toast' });
            throw error;
        }
    };

    const logout = async () => {
        try {
            await import('../services/authService').then(({ logoutUser }) => logoutUser());
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        toast.success('Logout berhasil', { id: 'auth-toast' });
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const ssoLogin = async (email: string) => {
        try {
            const response = await authSsoLogin(email);

            if (response.token && response.user) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                setToken(response.token);
                setUser(response.user);
                toast.success('Login SSO berhasil!', { id: 'auth-toast' });
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || 'Login SSO gagal. Pastikan email terdaftar.';
            toast.error(message, { id: 'auth-toast' });
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        isAdmin: user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super admin',
        isSuperAdmin: user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super admin',
        login,
        ssoLogin,
        superAdminLogin,
        logout,
        updateUser,
        loading,
        activePeriod,
        refreshActivePeriod: fetchActivePeriod
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
