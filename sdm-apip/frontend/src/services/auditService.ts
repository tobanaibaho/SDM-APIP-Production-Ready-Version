import api from './api';
import { PaginatedResponse } from '../types';

export interface AuditLog {
    id: number;
    user_id?: number;
    user?: {
        name?: string;
        nip?: string;
        email: string;
    };
    action: string;
    target_user_id?: number;
    target_user?: {
        name?: string;
        nip?: string;
        email: string;
    };
    ip_address: string;
    user_agent?: string;
    status: string;
    details?: string;
    created_at: string;
}

export const getAllAuditLogs = async (
    page: number = 1,
    limit: number = 10,
    action: string = '',
    status: string = '',
    userId?: number
): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
        params: { page, limit, action, status, user_id: userId },
    });
    return response.data;
};

const auditService = {
    getAllAuditLogs
};

export default auditService;
