import api from './api';
import { ApiResponse, PaginatedResponse, User } from '../types';

// Get all users with pagination
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

// Get user by ID
export const getUserById = async (id: number): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`);
    return response.data.data!.user;
};

// Update user status
export const updateUserStatus = async (id: number, status: string): Promise<User> => {
    const response = await api.patch<ApiResponse<User>>(`/admin/users/${id}/status`, { status });
    return response.data.data!;
};

// Update user role
export const updateUserRole = async (id: number, role_id: number): Promise<User> => {
    const response = await api.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role_id });
    return response.data.data!;
};

// Delete user
export const deleteUser = async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
};

// Admin disable user MFA
export const adminDisableMFA = async (id: number): Promise<void> => {
    await api.post(`/admin/users/${id}/mfa/disable`);
};

// Export as default object for compatibility
export const userService = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    adminDisableMFA
};

export default userService;
