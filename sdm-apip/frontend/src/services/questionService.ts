import api from './api';

export interface Question {
    id: number;
    indicator: string;
    text: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateQuestionRequest {
    indicator: string;
    text: string;
}

export interface UpdateQuestionRequest {
    indicator?: string;
    text?: string;
    is_active?: boolean;
}

export const questionService = {
    // Admin & User
    getQuestions: async (all: boolean = false) => {
        const query = all ? '?all=true' : '';
        // If the URL is accessed from Admin, we use /admin/questions, else /user/questions
        // Wait, to keep it simple, since we injected it in both sides, we can just use the role context or provide specific methods
        return api.get(`/admin/questions${query}`);
    },

    getQuestionsForUser: async () => {
        return api.get('/user/questions');
    },

    createQuestion: async (data: CreateQuestionRequest) => {
        return api.post('/admin/questions', data);
    },

    updateQuestion: async (id: number, data: UpdateQuestionRequest) => {
        return api.put(`/admin/questions/${id}`, data);
    },

    deleteQuestion: async (id: number) => {
        return api.delete(`/admin/questions/${id}`);
    },

    importQuestionsExcel: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/admin/questions/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    downloadTemplate: () => {
        // Build a simple CSV template for users to fill in
        const header = 'Indikator,Pertanyaan\n';
        const example = [
            'Akuntabel,Pegawai ini bertanggung jawab atas pekerjaan yang diberikan',
            'Loyal,Pegawai ini selalu mengutamakan kepentingan instansi',
            'Kompeten,Pegawai ini mampu menyelesaikan tugas dengan hasil yang baik',
        ].join('\n');
        const blob = new Blob(['\uFEFF' + header + example], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_kuesioner_berakhlak.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
};
