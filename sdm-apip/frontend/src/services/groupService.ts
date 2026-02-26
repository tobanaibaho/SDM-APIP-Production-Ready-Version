import api from './api';
import { ApiResponse, Group, GroupDetail } from '../types';

export const groupService = {
    getAllGroups: async (sortBy: string = 'name', order: 'asc' | 'desc' = 'asc', includeArchived: boolean = false): Promise<Group[]> => {
        const response = await api.get<ApiResponse<Group[]>>('/admin/groups', {
            params: { sort_by: sortBy, order, include_archived: includeArchived }
        });
        return response.data.data || [];
    },

    getGroupById: async (id: number): Promise<GroupDetail> => {
        const response = await api.get<ApiResponse<GroupDetail>>(`/admin/groups/${id}`);
        return response.data.data!;
    },

    createGroup: async (data: { name: string; description: string }): Promise<Group> => {
        const response = await api.post<ApiResponse<Group>>('/admin/groups', data);
        return response.data.data!;
    },

    updateGroup: async (id: number, data: { name?: string; description?: string }): Promise<Group> => {
        const response = await api.put<ApiResponse<Group>>(`/admin/groups/${id}`, data);
        return response.data.data!;
    },

    deleteGroup: async (id: number): Promise<void> => {
        await api.delete(`/admin/groups/${id}`);
    },

    assignUserToGroup: async (groupId: number, userId: number, role: string = 'Anggota'): Promise<void> => {
        await api.post(`/admin/groups/${groupId}/users`, { user_id: userId, role });
    },

    removeUserFromGroup: async (groupId: number, userId: number): Promise<void> => {
        await api.delete(`/admin/groups/${groupId}/users/${userId}`);
    },

    moveUser: async (userId: number, fromGroupId: number, toGroupId: number): Promise<void> => {
        await api.post('/admin/groups/move-user', {
            user_id: userId,
            from_group_id: fromGroupId,
            to_group_id: toGroupId
        });
    },

    // User facing methods
    getMyGroups: async (): Promise<Group[]> => {
        const response = await api.get<ApiResponse<Group[]>>('/user/my-groups');
        return response.data.data || [];
    },

    getGroupDetailForUser: async (id: number): Promise<GroupDetail> => {
        const response = await api.get<ApiResponse<GroupDetail>>(`/user/groups/${id}`);
        return response.data.data!;
    },

    // Relation Management
    getGroupRelations: async (groupId: number, periodId: number): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>(`/admin/groups/${groupId}/relations`, {
            params: { period_id: periodId }
        });
        return response.data.data || [];
    },

    createGroupRelations: async (groupId: number, periodId: number, relations: any[]): Promise<void> => {
        await api.post(`/admin/groups/${groupId}/relations`, {
            period_id: periodId,
            group_id: groupId,
            relations
        });
    },

    // Cross-Group Relation Management
    getCrossGroupRelations: async (periodId: number): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/relations', {
            params: { period_id: periodId }
        });
        return response.data.data || [];
    },

    createCrossGroupRelation: async (data: {
        period_id: number;
        evaluator_id: number;
        target_user_id: number;
        relation_type: string;
        target_position: string;
    }): Promise<void> => {
        await api.post('/admin/relations', data);
    },

    deleteCrossGroupRelation: async (relationId: number): Promise<void> => {
        await api.delete(`/admin/relations/${relationId}`);
    }
};

export default groupService;
