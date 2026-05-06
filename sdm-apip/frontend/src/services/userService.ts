import api from './api';
import { ApiResponse, PaginatedResponse, User } from '../types';

// Dapatkan semua pengguna dengan paginasi
export const getAllUsers = async (
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    status: string = '',
    sortBy: string = 'created_at',
    order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>('/admin/users', {
        params: { page, per_page: perPage, search, status, sort_by: sortBy, order },
    });
    return response.data;
};

// Dapatkan pengguna berdasarkan ID
export const getUserById = async (id: number): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`);
    return response.data.data!.user;
};

// Perbarui status pengguna
export const updateUserStatus = async (id: number, status: string): Promise<User> => {
    const response = await api.patch<ApiResponse<User>>(`/admin/users/${id}/status`, { status });
    return response.data.data!;
};

// Perbarui peran pengguna
export const updateUserRole = async (id: number, role_id: number): Promise<User> => {
    const response = await api.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role_id });
    return response.data.data!;
};

// Hapus pengguna
export const deleteUser = async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
};

// Admin nonaktifkan MFA pengguna
export const adminDisableMFA = async (id: number): Promise<void> => {
    await api.post(`/admin/users/${id}/mfa/disable`);
};

// Ekspor sebagai objek bawaan untuk kompatibilitas
export const userService = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    adminDisableMFA
};

export default userService;
