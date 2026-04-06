import api from './api';

export interface ReportFilter {
    start_date?: string;
    end_date?: string;
    group_id?: number;
    unit_kerja?: string;
    user_id?: number;
    search?: string;
    sort_by?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    page_size?: number;
    include_archived?: boolean;
    assessment_month?: number;
}

export interface ReportSummary {
    total_assessments: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    total_users: number;
}

export interface ScoreDistribution {
    range: string;
    count: number;
}

export interface TrendData {
    label: string;
    value: number;
}

export interface CategoryBreakdown {
    category: string;
    average: number;
}

export interface PerformerInfo {
    user_id: number;
    name: string;
    nip: string;
    unit_kerja: string;
    score: number;
}

export interface DashboardData {
    summary: ReportSummary;
    score_distribution: ScoreDistribution[];
    performance_trend: TrendData[];
    category_breakdown: CategoryBreakdown[];
    top_performers: PerformerInfo[];
    low_performers: PerformerInfo[];
}

export interface AssessmentDetailRow {
    id: number;
    period_id: number;
    assessment_month: number;
    date: string;
    evaluator_name: string;
    target_user_name: string;
    target_nip: string;
    group_name: string;
    unit_kerja: string;
    berorientasi_pelayanan: number;
    akuntabel: number;
    kompeten: number;
    harmonis: number;
    loyal: number;
    adaptif: number;
    kolaboratif: number;
    average_score: number;
    comment: string;
}

export interface UserReportRow {
    user_id: number;
    name: string;
    nip: string;
    unit_kerja: string;
    jabatan: string;
    group_role: string;
    assessments_received: number;
    assessments_given: number;
    average_score: number;
}

const reportService = {
    getDashboard: async (filter: ReportFilter): Promise<DashboardData> => {
        const response = await api.get('/admin/reports/dashboard', { params: filter });
        return response.data;
    },

    getDetails: async (filter: ReportFilter): Promise<{ data: AssessmentDetailRow[], total: number }> => {
        const response = await api.get('/admin/reports/details', { params: filter });
        return response.data;
    },

    exportExcel: async (filter: ReportFilter) => {
        const response = await api.get('/admin/reports/export/excel', {
            params: filter,
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report_assessment_${new Date().toISOString()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    exportPDF: async (filter: ReportFilter) => {
        const response = await api.get('/admin/reports/export/pdf', {
            params: filter,
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report_assessment_${new Date().toISOString()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getUnitKerjaOptions: async (): Promise<string[]> => {
        const response = await api.get('/admin/reports/unit-kerja-options');
        return response.data;
    },

    getUsers: async (filter: ReportFilter): Promise<{ data: UserReportRow[], total: number }> => {
        const response = await api.get('/admin/reports/users', { params: filter });
        return response.data;
    }
};

export default reportService;
