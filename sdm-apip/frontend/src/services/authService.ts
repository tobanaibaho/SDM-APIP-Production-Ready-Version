import api from './api';
import {
    ApiResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SetPasswordRequest,
    User,
    SDM,
} from '../types';

// Login
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data.data!;
};

// SSO Login (Mock)
export const ssoLogin = async (nip: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/sso/callback', { nip });
    return response.data.data!;
};

// Perbarui Profil
export const updateProfile = async (data: { email?: string; nomor_hp?: string; foto?: string }): Promise<{ user: User; sdm: SDM }> => {
    const response = await api.put<ApiResponse<{ user: User; sdm: SDM }>>('/user/profile', data);
    return response.data.data!;
};

// Logout (Hapus Cookie HttpOnly)
export const logoutUser = async (): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/logout');
};

// Admin Login
export const superAdminLogin = async (data: any): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/super-admin/login', data);
    return response.data.data!;
};

// Lupa Kata Sandi Admin
export const superAdminForgotPassword = async (username: string): Promise<string | undefined> => {
    const response = await api.post<ApiResponse<{ debug_token?: string }>>('/auth/super-admin/forgot-password', { username });
    return response.data.data?.debug_token;
};

// Reset Kata Sandi Admin via Token (dengan kata sandi baru pilihan admin)
export const superAdminResetToDefault = async (
    token: string,
    newPassword: string,
    confirmPassword: string
): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/super-admin/reset-to-default', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
    });
};


// Ubah Kata Sandi (Universal untuk Pengguna dan Admin)
export const changePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
}, isAdmin: boolean = false): Promise<void> => {
    const endpoint = isAdmin ? '/admin/change-password' : '/user/change-password';
    await api.post<ApiResponse<null>>(endpoint, data);
};

// Daftar
export const register = async (data: RegisterRequest): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/auth/register', data);
    return response.data.data;
};

// Kirim Ulang Verifikasi
export const resendVerification = async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/resend-verification', { email });
};

// Verifikasi Email
export const verifyEmail = async (token: string, otp: string): Promise<{ user_id: number }> => {
    const response = await api.post<ApiResponse<{ token: string; user_id: number }>>('/auth/verify-email', { token, otp });
    return response.data.data!;
};

// Tetapkan Kata Sandi
export const setPassword = async (data: SetPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/set-password', data);
};

// Lupa Kata Sandi
export const forgotPassword = async (email: string): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/auth/forgot-password', { email });
    return response.data.data;
};

// Reset Kata Sandi
export const resetPassword = async (data: any): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/reset-password', data);
};

// Dapatkan Profil
export const getProfile = async (): Promise<{ user: User; sdm: SDM }> => {
    const response = await api.get<ApiResponse<{ user: User; sdm: SDM }>>('/user/profile');
    return response.data.data!;
};

// Cek Kesehatan Email
export const checkEmailHealth = async (): Promise<any> => {
    const response = await api.get('/health/email');
    return response.data;
};

// Metode MFA
export interface MFASetupResponse {
    secret: string;
    qr_url: string;
}

export const setupMFA = async (): Promise<MFASetupResponse> => {
    const response = await api.get<ApiResponse<MFASetupResponse>>('/auth/mfa/setup');
    return response.data.data!;
};

export const enableMFA = async (otp: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/mfa/enable', { otp });
};

export const disableMFA = async (): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/mfa/disable');
};
