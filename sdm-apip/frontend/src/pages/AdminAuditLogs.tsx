import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatAbsoluteTime } from '../hooks/useRelativeTime';
import Layout from '../components/Layout';
import { getAllAuditLogs, AuditLog } from '../services/auditService';
import { Pagination } from '../types';
import { motion } from 'framer-motion';
import {
    Activity,
    Shield,
    RotateCcw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Terminal,
    AlertCircle,
    CheckCircle2,
    Monitor,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // tick every 30s to refresh relative timestamps
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, statusFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await getAllAuditLogs(page, 15, actionFilter, statusFilter);
            setLogs(response.data || []);
            setPagination(response.pagination);
        } catch (error) {
            toast.error('Gagal memuat log audit');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500/30';
            case 'failed':
                return 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500/30';
            case 'pending':
                return 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500/30';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-100 ring-slate-500/30';
        }
    };

    const getActionLabel = (action: string) => {
        return action.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <Layout
            title="Sistem Log & Keamanan"
            subtitle="Rekaman jejak digital dan monitoring aktivitas krusial sistem secara real-time."
        >
            <div className="space-y-8 animate-fade-in">
                {/* ═══════════════════════════════════════════
                    Bento Header Stats
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-4 bg-white/70 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mb-6">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Aktivitas Terinci</p>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{pagination?.total_items || 0} <span className="text-sm font-bold text-slate-400">Events</span></h3>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-4 bg-white/70 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                            <Shield size={120} />
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm mb-6">
                            <Shield size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Security Perimeter</p>
                            <h3 className="text-4xl font-black text-indigo-600 tracking-tight">ENCRYPTED</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-4 bg-white/70 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm mb-6">
                            <Monitor size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Sesi Aktif Terpantau</p>
                            <h3 className="text-4xl font-black text-emerald-600 tracking-tight">PROTECTED</h3>
                        </div>
                    </motion.div>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white/70 backdrop-blur-3xl p-5 rounded-[2.2rem] border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
                    <div className="relative flex-1 group">
                        <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <select
                            id="action-filter"
                            name="actionFilter"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Semua Aktivitas</option>
                            <option value="login">Login</option>
                            <option value="login_failed">Login Gagal</option>
                            <option value="user_update">Update User</option>
                            <option value="role_change">Perubahan Role</option>
                            <option value="status_change">Perubahan Status</option>
                            <option value="admin_reset">Admin Reset</option>
                            <option value="password_change">Ganti Password</option>
                            <option value="period_lock">Sistem Lock Periode</option>
                            <option value="period_update">Update Periode</option>
                            <option value="assessment_submit">Submit Penilaian</option>
                        </select>
                    </div>

                    <div className="relative w-full md:w-64 group">
                        <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <select
                            id="status-filter"
                            name="statusFilter"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Semua Status</option>
                            <option value="success">✓ Berhasil</option>
                            <option value="failed">✕ Gagal</option>
                            <option value="pending">⋯ Proses</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { setActionFilter(''); setStatusFilter(''); setPage(1); }}
                        className="h-14 w-14 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition-all rounded-2xl border border-slate-100 shadow-sm"
                        title="Reset Filter"
                    >
                        <RotateCcw size={22} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Logs Table Glass Bento */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-white/40">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-48">Audit Timestamp</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Initiator / Actor</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action Event</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System Details</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Network Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-8 py-10"><div className="h-5 bg-slate-100 rounded-full w-full opacity-50"></div></td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Terminal size={64} className="text-slate-400" />
                                                <p className="text-lg font-black text-slate-900 tracking-tight italic">Encryption sequence ready. No logs detected.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all duration-300 group cursor-default">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-[13px] font-black text-indigo-700 cursor-help"
                                                    title={formatAbsoluteTime(log.created_at)}
                                                >
                                                    {formatRelativeTime(log.created_at)}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-500 font-mono mt-1 uppercase tracking-tight opacity-70">
                                                    {new Date(log.created_at).toLocaleTimeString('id-ID', { hour12: false })} · {new Date(log.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-slate-200">
                                                    {log.user?.email ? log.user.email[0].toUpperCase() : 'S'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-slate-900 truncate max-w-[150px]">
                                                        {log.user?.name || log.user?.email || 'SYSTEM AUTOMATION'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 opacity-80">
                                                        {log.user?.nip ? `IP: ${log.user.nip}` : 'KERNEL ACCESS'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-[10px] font-black tracking-[0.15em] border border-slate-200 shadow-sm uppercase group-hover:bg-white transition-colors">
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col max-w-sm">
                                                <p className="text-[11px] font-bold text-slate-600 leading-relaxed font-mono">
                                                    {log.details || '-'}
                                                </p>
                                                {log.target_user && (
                                                    <div className="flex items-center gap-2 mt-2 bg-indigo-50/50 w-fit px-2 py-1 rounded-lg border border-indigo-100">
                                                        <Activity size={10} className="text-indigo-400" />
                                                        <p className="text-[9px] font-black text-indigo-700 uppercase tracking-tight">
                                                            OBJ: {log.target_user.name || log.target_user.email}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${getStatusStyle(log.status)}`}>
                                                {log.status === 'success' ? <CheckCircle2 size={12} strokeWidth={3} /> : <AlertCircle size={12} strokeWidth={3} />}
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-slate-900">
                                                    <Monitor size={14} className="text-indigo-500" />
                                                    <span className="text-[12px] font-black font-mono tracking-tight">{log.ip_address}</span>
                                                </div>
                                                <div className="mt-1.5 text-[10px] text-slate-500 font-bold truncate max-w-[150px] italic opacity-60" title={log.user_agent}>
                                                    {log.user_agent || 'Secured Connection'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Glass */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-8 py-6 border-t border-slate-100/50 flex items-center justify-between bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Halaman {page} / {pagination.total_pages}</span>
                            <div className="flex items-center gap-3">
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                                    disabled={page === 1}
                                    onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronRight size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminAuditLogs;
