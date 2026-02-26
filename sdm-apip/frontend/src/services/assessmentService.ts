import api from './api';

export interface AssessmentPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    frequency: string;
    is_active: boolean;
}

export interface PeerAssessment {
    id: number;
    evaluator_id: number;
    target_user_id: number;
    group_id: number;
    period_id: number;
    assessment_month: number;
    berorientasi_pelayanan: number;
    akuntabel: number;
    kompeten: number;
    harmonis: number;
    loyal: number;
    adaptif: number;
    kolaboratif: number;
    comment?: string;
    created_at: string;
}

export interface SubmitAssessmentRequest {
    target_user_id: number;
    group_id: number;
    period_id: number;
    assessment_month: number;
    berorientasi_pelayanan: number;
    akuntabel: number;
    kompeten: number;
    harmonis: number;
    loyal: number;
    adaptif: number;
    kolaboratif: number;
    comment?: string;
}

export interface AssessmentSummary {
    period_id: number;
    period_name: string;
    average_score?: number;
    details?: Record<string, number>;
    status?: string;
}

const assessmentService = {
    // Admin Endpoints
    getAllPeriods: async (): Promise<AssessmentPeriod[]> => {
        const response = await api.get('/user/periods');
        return response.data.data;
    },

    createPeriod: async (data: { name: string; start_date: string; end_date: string }): Promise<AssessmentPeriod> => {
        const response = await api.post('/admin/periods', data);
        return response.data.data;
    },

    updatePeriodStatus: async (id: number, isActive: boolean): Promise<void> => {
        await api.patch(`/admin/periods/${id}/status`, { is_active: isActive });
    },

    deletePeriod: async (id: number): Promise<void> => {
        await api.delete(`/admin/periods/${id}`);
    },

    // User Endpoints
    submitAssessment: async (data: SubmitAssessmentRequest): Promise<void> => {
        await api.post('/user/assessments', data);
    },

    getMyResults: async (periodId: number): Promise<AssessmentSummary | null> => {
        const response = await api.get(`/user/assessments/my-results?period_id=${periodId}`);
        return response.data.data;
    },

    getGivenAssessments: async (periodId: number): Promise<PeerAssessment[]> => {
        const response = await api.get(`/user/assessments/given?period_id=${periodId}`);
        return response.data.data;
    },

    getActivePeriod: async (): Promise<AssessmentPeriod | null> => {
        const response = await api.get('/user/assessments/active-period');
        return response.data.data;
    }
};

export default assessmentService;
