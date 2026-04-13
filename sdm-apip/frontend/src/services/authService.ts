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

// Update Profile
export const updateProfile = async (data: { email?: string; nomor_hp?: string; foto?: string }): Promise<{ user: User; sdm: SDM }> => {
    const response = await api.put<ApiResponse<{ user: User; sdm: SDM }>>('/user/profile', data);
    return response.data.data!;
};

// Logout (Clear HttpOnly Cookie)
export const logoutUser = async (): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/logout');
};

// Admin Login
export const superAdminLogin = async (data: any): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/super-admin/login', data);
    return response.data.data!;
};

// Admin Forgot Password
export const superAdminForgotPassword = async (username: string): Promise<string | undefined> => {
    const response = await api.post<ApiResponse<{ debug_token?: string }>>('/auth/super-admin/forgot-password', { username });
    return response.data.data?.debug_token;
};

// Admin Reset Password via Token (dengan password baru pilihan admin)
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


// Change Password (Universal for both User and Admin)
export const changePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
}, isAdmin: boolean = false): Promise<void> => {
    const endpoint = isAdmin ? '/admin/change-password' : '/user/change-password';
    await api.post<ApiResponse<null>>(endpoint, data);
};

// Register
export const register = async (data: RegisterRequest): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/auth/register', data);
    return response.data.data;
};

// Resend Verification
export const resendVerification = async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/resend-verification', { email });
};

// Verify Email
export const verifyEmail = async (token: string, otp: string): Promise<{ user_id: number }> => {
    const response = await api.post<ApiResponse<{ token: string; user_id: number }>>('/auth/verify-email', { token, otp });
    return response.data.data!;
};

// Set Password
export const setPassword = async (data: SetPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/set-password', data);
};

// Forgot Password
export const forgotPassword = async (email: string): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/auth/forgot-password', { email });
    return response.data.data;
};

// Reset Password
export const resetPassword = async (data: any): Promise<void> => {
    await api.post<ApiResponse<null>>('/auth/reset-password', data);
};

// Get Profile
export const getProfile = async (): Promise<{ user: User; sdm: SDM }> => {
    const response = await api.get<ApiResponse<{ user: User; sdm: SDM }>>('/user/profile');
    return response.data.data!;
};

// Check Email Health
export const checkEmailHealth = async (): Promise<any> => {
    const response = await api.get('/health/email');
    return response.data;
};

// MFA Methods
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
