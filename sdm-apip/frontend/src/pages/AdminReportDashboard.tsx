import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LabelList,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, Users, Award, Filter, Search,
    ChevronLeft, ChevronRight, FileText, FileSpreadsheet,
    Star, UserCheck, Eye, X, History, ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import reportService, { DashboardData, AssessmentDetailRow, ReportFilter, UserReportRow } from '../services/reportService';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import RoleBadge from '../components/RoleBadge';

// Indonesian month names
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Get the frequency max months for a period
const frequencyMonths = (frequency: string): number => {
    switch (frequency) {
        case 'monthly': return 1;
        case 'quarterly': return 3;
        case 'semi_annual': return 6;
        case 'annual': return 12;
        default: return 1;
    }
};

// Given a period's start_date and an assessment_month (1-based relative),
// return the real calendar month name in Bahasa Indonesia.
// We parse the date string directly (YYYY-MM-DD) to avoid JS Date UTC↔local timezone pitfalls.
const resolveMonthName = (period: AssessmentPeriod, assessmentMonth: number): string => {
    // Extract month from "YYYY-MM-DD..." — always 0-indexed
    const startMonthIndex = parseInt(period.start_date.substring(5, 7), 10) - 1;
    const realMonthIndex = (startMonthIndex + (assessmentMonth - 1)) % 12;
    return BULAN_ID[realMonthIndex];
};

// Build deduplicated list of { label, value } for dropdown from all periods
interface MonthOption {
    label: string;      // e.g. "April (Triwulan 1)"
    value: number;      // assessment_month integer sent to backend
    periodId: number;
}
const buildMonthOptions = (periods: AssessmentPeriod[]): MonthOption[] => {
    const seen = new Set<string>();
    const options: MonthOption[] = [];
    for (const period of periods) {
        const maxMonths = frequencyMonths(period.frequency);
        for (let m = 1; m <= maxMonths; m++) {
            const monthName = resolveMonthName(period, m);
            const key = `${period.id}-${m}`;
            if (!seen.has(key)) {
                seen.add(key);
                options.push({
                    label: `${monthName} (${period.name})`,
                    value: m,
                    periodId: period.id,
                });
            }
        }
    }
    return options;
};

const getPredikat = (score: number) => {
    if (score >= 110) return { label: 'Sangat Baik', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (score >= 90) return { label: 'Baik', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
    if (score >= 70) return { label: 'Cukup', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    if (score >= 50) return { label: 'Kurang', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
    return { label: 'Sangat Kurang', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
};


const AdminReportDashboard: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [userReports, setUserReports] = useState<UserReportRow[]>([]);
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
    const [activeTab, setActiveTab] = useState<'analytics' | 'users'>('users');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState<ReportFilter>({
        sort_by: 'peer_assessments.created_at',
        order: 'DESC',
        page: 1,
        page_size: 10
    });
    const [showFilters, setShowFilters] = useState(false);

    // User Detail Selection
    const [selectedUser, setSelectedUser] = useState<UserReportRow | null>(null);
    const [selectedUserDetails, setSelectedUserDetails] = useState<{ received: AssessmentDetailRow[] }>({
        received: []
    });
    const [detailLoading, setDetailLoading] = useState(false);

    // Load all periods once on mount to build month name options
    useEffect(() => {
        assessmentService.getAllPeriods()
            .then(data => {
                setPeriods(data || []);
                setMonthOptions(buildMonthOptions(data || []));
            })
            .catch(() => { /* silent – filter still works with numbers */ });
    }, []);

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalyticsData();
        } else {
            fetchUserListData();
        }
    }, [filter, page, activeTab]);


    const fetchAnalyticsData = async () => {
        try {
            const dash = await reportService.getDashboard(filter);
            setDashboardData(dash || null);
        } catch (error) {
            toast.error('Gagal mengambil data analitik');
        }
    };

    const fetchUserListData = async () => {
        try {
            const res = await reportService.getUsers({ ...filter, page });
            setUserReports(res?.data || []);
            setTotal(res?.total || 0);
        } catch (error) {
            toast.error('Gagal mengambil daftar pegawai');
        }
    };

    const handleUserClick = async (user: UserReportRow) => {
        setSelectedUser(user);
        setDetailLoading(true);
        try {
            const received = await reportService.getDetails({
                user_id: user.user_id,
                page: 1,
                page_size: 100,
                assessment_month: filter.assessment_month,
                start_date: filter.start_date,
                end_date: filter.end_date,
            });
            setSelectedUserDetails({
                received: received?.data || []
            });
        } catch (error) {
            toast.error('Gagal memuat detail penilaian');
        } finally {
            setDetailLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > Math.ceil(total / (filter.page_size || 10))) return;
        setPage(newPage);
    };

    const handleExportExcel = async () => {
        toast.promise(reportService.exportExcel(filter), {
            loading: 'Menyiapkan Excel...',
            success: 'Excel berhasil diunduh',
            error: 'Gagal mengunduh Excel'
        });
    };

    const handleExportPDF = async () => {
        toast.promise(reportService.exportPDF(filter), {
            loading: 'Menyiapkan PDF...',
            success: 'PDF berhasil diunduh',
            error: 'Gagal mengunduh PDF'
        });
    };

    const StatsCard = ({ title, value, icon: Icon, color }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-3xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 flex items-center gap-4"
        >
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-600 text-sm font-bold">{title}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
            </div>
        </motion.div>
    );

    return (
        <Layout
            title="Dashboard Laporan"
            subtitle="Analisis performa pegawai dan ringkasan penilaian."
        >
            <div className="space-y-8">

                {/* Tab Switcher & Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={18} />
                            Monitor Pegawai
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <TrendingUp size={18} />
                            Analisis Statistik
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer gap-2 mr-2 group" title="Sertakan data dari Grup/Pegawai yang dihapus (Arsip)">
                            <div className="relative">
                                <input type="checkbox" id="includeArchived" name="includeArchived" className="sr-only" checked={filter.include_archived || false} onChange={(e) => setFilter({ ...filter, include_archived: e.target.checked })} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${filter.include_archived ? 'bg-red-500' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${filter.include_archived ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm font-bold text-slate-500 hidden sm:block">Arsip Data</span>
                        </label>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all shadow-sm font-bold text-sm"
                        >
                            <Filter size={18} />
                            Filter
                        </button>
                        <div className="flex items-center gap-2 bg-indigo-600 p-1 rounded-xl shadow-lg shadow-indigo-200">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-indigo-700 rounded-lg transition-all text-sm font-bold"
                            >
                                <FileText size={18} />
                                PDF
                            </button>
                            <div className="w-[1px] h-6 bg-indigo-400 opacity-30"></div>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-indigo-700 rounded-lg transition-all text-sm font-bold"
                            >
                                <FileSpreadsheet size={18} />
                                Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 block">Cari Pegawai</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            id="searchReport"
                                            name="searchReport"
                                            placeholder="Nama atau NIP..."
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                            value={filter.search || ''}
                                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 block">Pilih Bulan Penilaian</label>
                                    <select
                                        id="assessmentMonth"
                                        name="assessmentMonth"
                                        className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        value={filter.assessment_month || ''}
                                        onChange={(e) => setFilter({ ...filter, assessment_month: e.target.value ? Number(e.target.value) : undefined })}
                                    >
                                        <option value="">Semua Bulan (Rekap)</option>
                                        {monthOptions.length > 0 ? (
                                            monthOptions.map((opt, idx) => (
                                                <option key={`${opt.periodId}-${opt.value}-${idx}`} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))
                                        ) : (
                                            // Fallback: nama bulan kalender jika periode belum dimuat
                                            BULAN_ID.map((nama, i) => (
                                                <option key={i + 1} value={i + 1}>{nama}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 block">Mulai Tanggal</label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        name="startDate"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        value={filter.start_date || ''}
                                        onChange={(e) => setFilter({ ...filter, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 block">Akhir Tanggal</label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        name="endDate"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        value={filter.end_date || ''}
                                        onChange={(e) => setFilter({ ...filter, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeTab === 'analytics' ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatsCard title="Total Penilaian" value={dashboardData?.summary?.total_assessments || 0} icon={FileText} color="bg-indigo-600" />
                            <StatsCard title="Rata-rata Nilai" value={dashboardData?.summary?.average_score?.toFixed(2) || '0.00'} icon={TrendingUp} color="bg-emerald-600" />
                            <StatsCard title="Skor Tertinggi" value={dashboardData?.summary?.highest_score?.toFixed(2) || '0.00'} icon={Award} color="bg-amber-600" />
                            <StatsCard title="User Dinilai" value={dashboardData?.summary?.total_users || 0} icon={Users} color="bg-purple-600" />
                        </div>

                        {/* Charts Row 1 — Trend + Radar */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* Area Chart — Tren Performa */}
                            <div className="lg:col-span-3 bg-white/70 backdrop-blur-3xl p-7 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <TrendingUp className="text-indigo-500" size={18} />
                                            Tren Performa
                                        </h3>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Rata-rata skor 6 bulan terakhir</p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100">Live Data</span>
                                </div>
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={dashboardData?.performance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 120]} tickCount={7} />
                                        <Tooltip
                                            contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                                            labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}
                                            formatter={(v: any) => [`${Number(v).toFixed(2)}`, 'Skor Rata-rata']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fill="url(#trendGrad)" dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Radar Chart — BerAKHLAK */}
                            <div className="lg:col-span-2 bg-white/70 backdrop-blur-3xl p-7 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <Star className="text-amber-500" size={18} />
                                        Analisis BerAKHLAK
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Skor rata-rata per indikator (0–100)</p>
                                </div>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart
                                        layout="vertical"
                                        data={dashboardData?.category_breakdown}
                                        margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                                    >
                                        <defs>
                                            <linearGradient id="berakhlakGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#c084fc" />
                                                <stop offset="100%" stopColor="#db2777" />
                                            </linearGradient>
                                        </defs>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis 
                                            dataKey="category" 
                                            type="category" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 800 }} 
                                            width={150}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(219, 39, 119, 0.05)' }}
                                            contentStyle={{ background: 'rgba(15,23,42,0.95)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: 13, fontWeight: 700, padding: '12px 18px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
                                            itemStyle={{ color: '#fbcfe8' }}
                                            formatter={(v: any) => [`${Number(v).toFixed(2)}`, 'Skor Rata-rata']}
                                        />
                                        <Bar 
                                            dataKey="average" 
                                            fill="url(#berakhlakGrad)" 
                                            radius={[0, 12, 12, 0]} 
                                            maxBarSize={24}
                                            background={{ fill: '#f1f5f9', radius: 12 }}
                                            animationDuration={1500}
                                        >
                                            <LabelList 
                                                dataKey="average" 
                                                position="right" 
                                                formatter={(v: any) => Number(v).toFixed(1)} 
                                                style={{ fill: '#db2777', fontSize: 12, fontWeight: 900 }} 
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Charts Row 2 — Top & Low BarCharts side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* TOP Performers Bar */}
                            <div className="bg-white/70 backdrop-blur-3xl p-7 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <Award size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">🏆 Top 5 Performa Terbaik</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">Pegawai dengan skor tertinggi</p>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        layout="vertical"
                                        data={(dashboardData?.top_performers || []).map((p, i) => ({ name: p.name.split(' ').slice(0, 2).join(' '), score: Number(p.score.toFixed(1)), rank: i + 1 }))}
                                        margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#34d399" />
                                            </linearGradient>
                                        </defs>
                                        <XAxis type="number" domain={[0, 120]} tickCount={5} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} width={90} />
                                        <Tooltip
                                            contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: 12, fontWeight: 700 }}
                                            formatter={(v: any) => [`${v}`, 'Skor']}
                                            cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                                        />
                                        <Bar dataKey="score" fill="url(#topGrad)" radius={[0, 8, 8, 0]} maxBarSize={28}>
                                            <LabelList dataKey="score" position="right" style={{ fill: '#10b981', fontSize: 11, fontWeight: 900 }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* LOW Performers Bar */}
                            <div className="bg-white/70 backdrop-blur-3xl p-7 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                                        <TrendingUp size={16} className="rotate-180" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">⚡ Perlu Perhatian Khusus</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">Pegawai dengan skor terendah</p>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        layout="vertical"
                                        data={(dashboardData?.low_performers || []).map((p, i) => ({ name: p.name.split(' ').slice(0, 2).join(' '), score: Number(p.score.toFixed(1)), rank: i + 1 }))}
                                        margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="lowGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#f43f5e" />
                                                <stop offset="100%" stopColor="#fb7185" />
                                            </linearGradient>
                                        </defs>
                                        <XAxis type="number" domain={[0, 120]} tickCount={5} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} width={90} />
                                        <Tooltip
                                            contentStyle={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: 12, fontWeight: 700 }}
                                            formatter={(v: any) => [`${v}`, 'Skor']}
                                            cursor={{ fill: 'rgba(244,63,94,0.05)' }}
                                        />
                                        <Bar dataKey="score" fill="url(#lowGrad)" radius={[0, 8, 8, 0]} maxBarSize={28}>
                                            <LabelList dataKey="score" position="right" style={{ fill: '#f43f5e', fontSize: 11, fontWeight: 900 }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                            <div className="space-y-6">
                                {/* Title + counter */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Monitor Penilaian Pegawai</h3>
                                        <p className="text-sm text-slate-500 mt-1">Pantau siapa saja yang sudah dinilai dan siapa yang melakukan penilaian.</p>
                                    </div>
                                    <div className="shrink-0 bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 whitespace-nowrap shadow-sm">
                                        Total: {total} Pegawai
                                    </div>
                                </div>
                                
                                <div className="h-px bg-slate-100" />

                                {/* Predicate Legend (FULL WIDTH ROW) */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Panduan Range Predikat</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm font-black">
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors w-full">
                                            <span className="bg-emerald-50 text-emerald-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">&ge; 110</span>
                                            <span className="px-4 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Sangat Baik</span>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors w-full">
                                            <span className="bg-blue-50 text-blue-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">90 – 109.9</span>
                                            <span className="px-4 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Baik</span>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors w-full">
                                            <span className="bg-amber-50 text-amber-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">70 – 89.9</span>
                                            <span className="px-4 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Cukup</span>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors w-full">
                                            <span className="bg-orange-50 text-orange-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">50 – 69.9</span>
                                            <span className="px-4 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Kurang</span>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors w-full">
                                            <span className="bg-red-50 text-red-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">&lt; 50</span>
                                            <span className="px-4 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Sangat Kurang</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4">Pegawai (NIP)</th>
                                        <th className="px-8 py-4">Peran</th>
                                        <th className="px-8 py-4 text-center">Nilai Akhir & Predikat</th>
                                        <th className="px-8 py-4 text-center">Dinilai</th>
                                        <th className="px-8 py-4 text-center">Menilai</th>
                                        <th className="px-8 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {userReports.map((user) => (
                                        <tr key={user.user_id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <button
                                                    onClick={() => handleUserClick(user)}
                                                    className="text-left font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                                                >
                                                    {user.name}
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.nip}</p>
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                {(() => {
                                                    const role = user.jabatan?.toLowerCase().includes('inspektur') ? 'Inspektur' : (user.group_role || 'Anggota');
                                                    return <RoleBadge role={role} />;
                                                })()}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="text-sm font-black text-slate-900">{user.average_score.toFixed(2)}</div>
                                                    {user.average_score > 0 ? (
                                                        <span className={`inline-flex px-2.5 py-1 rounded text-[10px] font-black border tracking-wider shadow-sm uppercase ${getPredikat(user.average_score).bg} ${getPredikat(user.average_score).color}`}>
                                                            {getPredikat(user.average_score).label}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">N/A</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black ${user.assessments_received > 0 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                                                    <ClipboardCheck size={14} /> {user.assessments_received} Kali
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black ${user.assessments_given > 0 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                                                    <UserCheck size={14} /> {user.assessments_given} Kali
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => handleUserClick(user)}
                                                        className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
                                                    >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {userReports.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center">
                                                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-slate-400 font-bold">Data pegawai tidak ditemukan.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* User List Pagination */}
                        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className={`flex items-center gap-2 px-6 py-2.5 bg-white border rounded-xl text-sm font-bold transition-all shadow-sm ${page === 1 ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:scale-105 active:scale-95'}`}
                            >
                                <ChevronLeft size={18} /> Sebelumnya
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Halaman</span>
                                <span className="h-8 w-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg font-black shadow-lg shadow-indigo-100">{page}</span>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Dari {Math.ceil(total / (filter.page_size || 10)) || 1}</span>
                            </div>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= Math.ceil(total / (filter.page_size || 10))}
                                className={`flex items-center gap-2 px-6 py-2.5 bg-white border rounded-xl text-sm font-bold transition-all shadow-sm ${page >= Math.ceil(total / (filter.page_size || 10)) ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:scale-105 active:scale-95'}`}
                            >
                                Selanjutnya <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* User Detail Modal */}
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {selectedUser && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed top-0 left-0 w-screen h-screen z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                                >
                                    <div className="px-10 py-8 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                                {selectedUser.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white">{selectedUser.name}</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300">{selectedUser.nip}</span>
                                                    {(() => {
                                                        const role = selectedUser.jabatan?.toLowerCase().includes('inspektur') ? 'Inspektur' : (selectedUser.group_role || 'Anggota');
                                                        return <RoleBadge role={role} />;
                                                    })()}
                                                    <span className="text-xs font-bold text-slate-400">Inspektorat</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedUser(null)}
                                            className="h-12 w-12 rounded-2xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                        {detailLoading ? (
                                            <div className="flex flex-col items-center justify-center h-64">
                                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-600 mb-4"></div>
                                                <p className="text-slate-400 font-bold">Memuat detail penilaian...</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Summary for Modal */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col items-center text-center">
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Skor Rerata Keseluruhan</p>
                                                        <div className="text-4xl font-black text-indigo-900 leading-none">{selectedUser.average_score.toFixed(2)}</div>
                                                        {selectedUser.average_score > 0 ? (
                                                            <div className={`mt-3 inline-flex px-4 py-1.5 rounded-xl text-xs font-black border tracking-wider shadow-sm ${getPredikat(selectedUser.average_score).bg} ${getPredikat(selectedUser.average_score).color}`}>
                                                                {getPredikat(selectedUser.average_score).label}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3 inline-flex px-4 py-1.5 rounded-xl text-xs font-black border border-slate-200 bg-slate-50 text-slate-400">
                                                                Belum Ada
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Penilaian Diberikan</p>
                                                        <div className="text-3xl font-black text-emerald-900">{selectedUser.assessments_given}</div>
                                                    </div>
                                                    <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Penilaian Diterima</p>
                                                        <div className="text-3xl font-black text-amber-900">{selectedUser.assessments_received}</div>
                                                    </div>
                                                </div>

                                                {/* Detailed History Table in Modal */}
                                                <div className="space-y-6">
                                                    <h4 className="flex items-center gap-2 text-xl font-black text-slate-900">
                                                        <History size={22} className="text-indigo-600" />
                                                        Rincian Penilaian BerAKHLAK
                                                    </h4>

                                                    <div className="space-y-6">
                                                        {selectedUserDetails.received
                                                            .slice()
                                                            .sort((a: any, b: any) => a.assessment_month - b.assessment_month)
                                                            .map((row: any) => (
                                                                <motion.div
                                                                    key={row.id}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                                                >
                                                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                                                <UserCheck size={20} />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-slate-900">Penilai: {row.evaluator_name}</p>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                                        {(() => {
                                                                                            // Resolve real calendar month using period_id from assessment row
                                                                                            const period = periods.find(p => p.id === row.period_id);
                                                                                            if (period) {
                                                                                                return resolveMonthName(period, row.assessment_month);
                                                                                            }
                                                                                            // Fallback: gunakan nama bulan kalender langsung
                                                                                            return BULAN_ID[(row.assessment_month - 1) % 12];
                                                                                        })()}
                                                                                    </span>
                                                                                    <p className="text-[10px] text-slate-400 font-medium">{new Date(row.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rerata Skor</span>
                                                                            <span className="text-lg font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">{row.average_score.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-6">
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                                                                            {[
                                                                                { label: 'Berorientasi Pelayanan', value: row.berorientasi_pelayanan },
                                                                                { label: 'Akuntabel', value: row.akuntabel },
                                                                                { label: 'Kompeten', value: row.kompeten },
                                                                                { label: 'Harmonis', value: row.harmonis },
                                                                                { label: 'Loyal', value: row.loyal },
                                                                                { label: 'Adaptif', value: row.adaptif },
                                                                                { label: 'Kolaboratif', value: row.kolaboratif },
                                                                            ].map((indicator, idx) => (
                                                                                <div key={idx} className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-8 flex items-center justify-center mb-2 px-1">
                                                                                        {indicator.label}
                                                                                    </p>
                                                                                    <div className="flex gap-0.5 mb-1.5">
                                                                                        {[1, 2, 3, 4, 5].map(star => {
                                                                                            const filledStars = Math.round((indicator.value / 100) * 5);
                                                                                            return (
                                                                                                <Star
                                                                                                    key={star}
                                                                                                    size={10}
                                                                                                    className={star <= filledStars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                                                                                />
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                    <span className="text-sm font-black text-slate-700">{indicator.value}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                                <ClipboardCheck size={12} /> Komentar & Feedback
                                                                            </p>
                                                                            <p className="text-sm text-slate-600 italic leading-relaxed">
                                                                                "{row.comment || 'Tidak ada komentar tambahan.'}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}

                                                        {selectedUserDetails.received.length === 0 && (
                                                            <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                                                <History size={48} className="mx-auto text-slate-200 mb-4" />
                                                                <h5 className="text-lg font-bold text-slate-400">Belum Ada Riwayat</h5>
                                                                <p className="text-sm text-slate-400">User ini belum menerima penilaian dari rekan manapun.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Range Guide in Modal */}
                                                <div className="mt-6 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div>
                                                            <h5 className="text-lg font-black text-slate-900">Panduan Range Predikat</h5>
                                                            <p className="text-sm text-slate-400 mt-0.5 font-bold">Acuan skor untuk penentuan predikat hasil evaluasi 360.</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm font-black">
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                                                                <span className="bg-emerald-50 text-emerald-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">&ge; 110</span>
                                                                <span className="px-3 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Sangat Baik</span>
                                                            </div>
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                                                                <span className="bg-blue-50 text-blue-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">90 – 109.9</span>
                                                                <span className="px-3 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Baik</span>
                                                            </div>
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                                                                <span className="bg-amber-50 text-amber-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">70 – 89.9</span>
                                                                <span className="px-3 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Cukup</span>
                                                            </div>
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                                                                <span className="bg-orange-50 text-orange-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">50 – 69.9</span>
                                                                <span className="px-3 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Kurang</span>
                                                            </div>
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                                                                <span className="bg-red-50 text-red-700 w-28 py-2.5 text-center shrink-0 border-r border-slate-100 font-mono tracking-tighter shadow-inner text-sm font-black">&lt; 50</span>
                                                                <span className="px-3 text-slate-700 uppercase tracking-widest text-xs font-black flex-1">Sangat Kurang</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

            </div>
        </Layout>
    );
};

export default AdminReportDashboard;
