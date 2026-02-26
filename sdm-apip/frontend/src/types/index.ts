// API Response types
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    pagination: Pagination;
}

export interface Pagination {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
}

// User types
export interface User {
    id: number;
    nip: string;
    username: string;
    email: string;
    name?: string;
    foto?: string;
    jabatan?: string;
    role: string;
    status: string;
    mfa_enabled: boolean;
    last_login_at?: string;
    last_activity_at?: string;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    nip?: string;
    username?: string;
    password: string;
    totp?: string;
}

export interface LoginResponse {
    token?: string;
    refreshToken?: string;
    user?: User;
    requires_mfa?: boolean;
}

export interface MFASetupResponse {
    secret: string;
    qr_url: string;
}

export interface RegisterRequest {
    nip: string;
    email: string;
}

export interface SetPasswordRequest {
    token: string;
    otp: string;
    password: string;
    confirm_password: string;
}

export interface VerifyEmailRequest {
    token: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    otp: string;
    new_password: string;
    confirm_password: string;
}

export interface VerifyOTPRequest {
    otp: string;
}

// SDM types
export interface SDM {
    id: number;
    nip: string;
    nama: string;
    email: string;
    jabatan: string;
    pangkat_golongan: string;
    pendidikan: string;
    nomor_hp: string;
    unit_kerja: string;
    foto?: string;
    created_at: string;
    updated_at: string;
}

export interface SDMCreateRequest {
    nip: string;
    nama: string;
    email: string;
    jabatan?: string;
    pangkat_golongan?: string;
    pendidikan?: string;
    nomor_hp?: string;
    unit_kerja?: string;
}

export interface SDMUpdateRequest {
    nama?: string;
    email?: string;
    jabatan?: string;
    pangkat_golongan?: string;
    pendidikan?: string;
    nomor_hp?: string;
    unit_kerja?: string;
}

// Group types
export interface Group {
    id: number;
    name: string;
    description: string;
    user_count?: number;
    user_role?: string;
    created_at: string;
    is_archived?: boolean;
}

export interface GroupMember {
    id: number;
    nip: string;
    name: string;
    email: string;
    jabatan: string;
    unit_kerja: string;
    role: string;
    group_role: string;
    foto?: string;
}

export interface GroupDetail {
    group: Group;
    members: GroupMember[];
    global_evaluators?: any[];
}

// Stats types
export interface DashboardStats {
    total_sdm: number;
    total_users: number;
    active_users: number;
    pending_users: number;
    total_groups: number;
    active_period: boolean;
    active_period_name: string;
    unit_kerja_dist: UnitKerjaStats[];
    assessment_progress: AssessmentProgress;
    group_progress: GroupProgress[];
    never_login_users: NeverLoginUser[];
    monthly_trend: MonthlyTrend[];
}

export interface UnitKerjaStats {
    unit_kerja: string;
    count: number;
}

export interface AssessmentProgress {
    period_name: string;
    months_required: number;
    total_required: number;
    total_submitted: number;
    completion_pct: number;
}

export interface GroupProgress {
    group_id: number;
    group_name: string;
    required: number;
    submitted: number;
    pct: number;
}

export interface NeverLoginUser {
    user_id: number;
    nip: string;
    nama: string;
    jabatan: string;
    joined_at: string;
}

export interface MonthlyTrend {
    month: string;  // 'YYYY-MM'
    count: number;
}

export interface AssessmentPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

// Auth context types
export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    login: (nip: string, password: string, totp?: string) => Promise<LoginResponse>;
    superAdminLogin: (username: string, password: string, totp?: string) => Promise<LoginResponse>;
    logout: () => void;
    updateUser: (user: User) => void;
    loading: boolean;
    activePeriod: AssessmentPeriod | null;
    refreshActivePeriod: () => Promise<void>;
}

// Assessment Relation types (Hybrid Approach)
export interface AssessmentRelation {
    id: number;
    period_id: number;
    group_id?: number;
    evaluator_id: number;
    target_user_id: number;
    relation_type: 'Atasan' | 'Peer' | 'Bawahan';    // Perspektif penilai
    target_position: 'Atasan' | 'Peer' | 'Bawahan';  // Posisi target dalam tim
    evaluator?: User;
    target_user?: User;
    created_at: string;
}

export interface CreateRelationRequest {
    period_id: number;
    group_id?: number;
    evaluator_id: number;
    target_user_id: number;
    relation_type: 'Atasan' | 'Peer' | 'Bawahan';
    target_position: 'Atasan' | 'Peer' | 'Bawahan';
}

export interface GroupRelationItem {
    evaluator_id: number;
    target_user_id: number;
    relation_type: 'Atasan' | 'Peer' | 'Bawahan';
    target_position: 'Atasan' | 'Peer' | 'Bawahan';
}

export interface BulkCreateRelationsRequest {
    period_id: number;
    group_id: number;
    relations: GroupRelationItem[];
}

// Peer Assessment types
export interface PeerAssessment {
    id: number;
    evaluator_id: number;
    target_user_id: number;
    group_id?: number;
    period_id: number;
    relation_type: string;    // Perspektif penilai
    target_position: string;  // Posisi target dalam tim
    assessment_month: number;
    berorientasi_pelayanan: number;
    akuntabel: number;
    kompeten: number;
    harmonis: number;
    loyal: number;
    adaptif: number;
    kolaboratif: number;
    comment?: string;
    evaluator?: User;
    target_user?: User;
    created_at: string;
}

export interface SubmitAssessmentRequest {
    target_user_id: number;
    group_id?: number;
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
