import api from './api';
import {
    ApiResponse,
    PaginatedResponse,
    SDM,
    SDMCreateRequest,
    SDMUpdateRequest,
    DashboardStats,
} from '../types';

// Get all SDM with pagination
export const getAllSDM = async (
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    sortBy: string = 'created_at',
    order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<SDM>> => {
    const response = await api.get<PaginatedResponse<SDM>>('/admin/sdm', {
        params: { page, per_page: perPage, search, sort_by: sortBy, order },
    });
    return response.data;
};

// Get SDM by ID
export const getSDMById = async (id: number): Promise<SDM> => {
    const response = await api.get<ApiResponse<SDM>>(`/admin/sdm/${id}`);
    return response.data.data!;
};

// Create SDM
export const createSDM = async (data: SDMCreateRequest): Promise<SDM> => {
    const response = await api.post<ApiResponse<SDM>>('/admin/sdm', data);
    return response.data.data!;
};

// Update SDM
export const updateSDM = async (id: number, data: SDMUpdateRequest): Promise<SDM> => {
    const response = await api.put<ApiResponse<SDM>>(`/admin/sdm/${id}`, data);
    return response.data.data!;
};

// Delete SDM
export const deleteSDM = async (id: number): Promise<void> => {
    await api.delete(`/admin/sdm/${id}`);
};

// Get Dashboard Stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/sdm/stats');
    return response.data.data!;
};

// Import SDM from Excel
export const importSDM = async (file: File): Promise<{ success_count: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<{ success_count: number; errors: string[] }>>('/admin/sdm/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data!;
};
